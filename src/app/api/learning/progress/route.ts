import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { touchAgentActivityByProfile } from "@/lib/activity";

// GET — current user's learning progress + required-module summary
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    // Completed lessons
    const { rows: completed } = await pool.query(
      `SELECT lesson_slug, completed_at FROM learning_progress WHERE profile_id = $1`,
      [user.id]
    );

    // Required lessons count for user's role
    const { rows: reqRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM learning_lessons l
       JOIN learning_modules m ON m.id = l.module_id
       WHERE m.role = $1 AND m.is_required = true`,
      [user.role]
    );
    const requiredTotal: number = reqRows[0]?.total ?? 0;

    // How many required lessons are completed
    const { rows: reqDoneRows } = await pool.query(
      `SELECT COUNT(*)::int AS done
       FROM learning_progress lp
       JOIN learning_lessons l ON l.slug = lp.lesson_slug
       JOIN learning_modules m ON m.id = l.module_id
       WHERE lp.profile_id = $1 AND m.role = $2 AND m.is_required = true`,
      [user.id, user.role]
    );
    const requiredCompleted: number = reqDoneRows[0]?.done ?? 0;

    return Response.json({
      completedSlugs: completed.map((r) => r.lesson_slug),
      requiredTotal,
      requiredCompleted,
      allRequiredDone: requiredTotal > 0 && requiredCompleted >= requiredTotal,
      onboardingStatus: user.role === "agent" ? (await getOnboardingStatus(user.id)) : null,
    });
  } catch (err) {
    console.error("GET /api/learning/progress error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// POST — mark a lesson as completed
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const slug = body?.slug;
    if (!slug || typeof slug !== "string") {
      return Response.json({ error: "slug обязателен" }, { status: 400 });
    }

    // Verify lesson exists
    const { rows: lessonCheck } = await pool.query(
      `SELECT l.slug FROM learning_lessons l
       JOIN learning_modules m ON m.id = l.module_id
       WHERE l.slug = $1 AND m.role = $2`,
      [slug, user.role]
    );
    if (lessonCheck.length === 0) {
      return Response.json({ error: "Урок не найден" }, { status: 404 });
    }

    // Upsert progress
    await pool.query(
      `INSERT INTO learning_progress (profile_id, lesson_slug)
       VALUES ($1, $2)
       ON CONFLICT (profile_id, lesson_slug) DO NOTHING`,
      [user.id, slug]
    );

    // Auto-update onboarding_status for agents
    let onboardingStatus: string | null = null;
    if (user.role === "agent" && user.agentId) {
      onboardingStatus = await autoUpdateOnboarding(user.id, user.agentId);
    }

    // Track activity
    touchAgentActivityByProfile(user.id).catch(() => {});

    return Response.json({ completed: true, onboardingStatus });
  } catch (err) {
    console.error("POST /api/learning/progress error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────

async function getOnboardingStatus(profileId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT onboarding_status FROM agents WHERE user_id = $1`,
    [profileId]
  );
  return rows[0]?.onboarding_status ?? null;
}

/**
 * Auto-advance onboarding_status based on learning progress.
 * pending → in_progress  (first lesson completed)
 * in_progress → completed (all required modules done)
 */
async function autoUpdateOnboarding(profileId: string, agentId: string): Promise<string> {
  const { rows: agentRows } = await pool.query(
    `SELECT onboarding_status FROM agents WHERE id = $1`,
    [agentId]
  );
  const current = agentRows[0]?.onboarding_status;
  if (!current || current === "completed" || current === "rejected") {
    return current ?? "pending";
  }

  // Count completed lessons
  const { rows: progressRows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM learning_progress WHERE profile_id = $1`,
    [profileId]
  );
  const completedCount = progressRows[0]?.cnt ?? 0;

  if (current === "pending" && completedCount > 0) {
    // First lesson → in_progress
    await pool.query(
      `UPDATE agents SET onboarding_status = 'in_progress', updated_at = now() WHERE id = $1`,
      [agentId]
    );
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('onboarding.in_progress', NULL, $1)`,
      [`Agent ${agentId}: pending → in_progress (first lesson completed)`]
    );
    // Check if all required done in the same call
    return await checkAndCompleteOnboarding(profileId, agentId, "in_progress");
  }

  if (current === "in_progress") {
    return await checkAndCompleteOnboarding(profileId, agentId, current);
  }

  return current;
}

async function checkAndCompleteOnboarding(
  profileId: string,
  agentId: string,
  current: string
): Promise<string> {
  // Count required lessons
  const { rows: reqRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM learning_lessons l
     JOIN learning_modules m ON m.id = l.module_id
     WHERE m.role = 'agent' AND m.is_required = true`
  );
  const requiredTotal = reqRows[0]?.total ?? 0;

  // Count completed required lessons
  const { rows: doneRows } = await pool.query(
    `SELECT COUNT(*)::int AS done
     FROM learning_progress lp
     JOIN learning_lessons l ON l.slug = lp.lesson_slug
     JOIN learning_modules m ON m.id = l.module_id
     WHERE lp.profile_id = $1 AND m.role = 'agent' AND m.is_required = true`,
    [profileId]
  );
  const doneCount = doneRows[0]?.done ?? 0;

  if (requiredTotal > 0 && doneCount >= requiredTotal && current !== "completed") {
    await pool.query(
      `UPDATE agents SET onboarding_status = 'completed', updated_at = now() WHERE id = $1`,
      [agentId]
    );
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('onboarding.completed', NULL, $1)`,
      [`Agent ${agentId}: in_progress → completed (all required modules done, ${doneCount}/${requiredTotal})`]
    );
    return "completed";
  }

  return current;
}
