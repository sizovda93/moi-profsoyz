import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

// GET — view learning progress for a specific agent (manager/admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("manager", "admin");
    if (auth.error) return auth.error;

    const { id: agentId } = await params;

    // Get agent's profile_id
    const { rows: agentRows } = await pool.query(
      `SELECT user_id FROM agents WHERE id = $1`,
      [agentId]
    );
    if (agentRows.length === 0) {
      return Response.json({ error: "Агент не найден" }, { status: 404 });
    }
    const profileId = agentRows[0].user_id;

    // Completed lessons
    const { rows: completed } = await pool.query(
      `SELECT lesson_slug, completed_at FROM learning_progress WHERE profile_id = $1`,
      [profileId]
    );

    // Required stats
    const { rows: reqRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM learning_lessons l
       JOIN learning_modules m ON m.id = l.module_id
       WHERE m.role = 'agent' AND m.is_required = true`
    );
    const requiredTotal: number = reqRows[0]?.total ?? 0;

    const { rows: reqDoneRows } = await pool.query(
      `SELECT COUNT(*)::int AS done
       FROM learning_progress lp
       JOIN learning_lessons l ON l.slug = lp.lesson_slug
       JOIN learning_modules m ON m.id = l.module_id
       WHERE lp.profile_id = $1 AND m.role = 'agent' AND m.is_required = true`,
      [profileId]
    );
    const requiredCompleted: number = reqDoneRows[0]?.done ?? 0;

    return Response.json({
      completedSlugs: completed.map((r) => r.lesson_slug),
      requiredTotal,
      requiredCompleted,
      allRequiredDone: requiredTotal > 0 && requiredCompleted >= requiredTotal,
    });
  } catch (err) {
    console.error("GET /api/learning/progress/agent/[id] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
