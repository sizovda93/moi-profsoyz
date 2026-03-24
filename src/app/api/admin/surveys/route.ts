import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;

    const { rows } = await pool.query(`
      SELECT s.*,
        (SELECT count(*) FROM survey_responses WHERE survey_id = s.id) as response_count,
        (SELECT count(*) FROM survey_questions WHERE survey_id = s.id) as question_count
      FROM surveys s ORDER BY s.created_at DESC
    `);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/admin/surveys error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { user } = auth;

    const { title, description, targetRole, startsAt, endsAt, status, questions } = await request.json();
    if (!title?.trim()) return Response.json({ error: "Название обязательно" }, { status: 400 });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return Response.json({ error: "Добавьте хотя бы один вопрос" }, { status: 400 });
    }

    const st = ["draft", "published", "closed"].includes(status) ? status : "draft";
    const tr = ["all", "agent", "manager"].includes(targetRole) ? targetRole : "all";

    const { rows } = await pool.query(
      `INSERT INTO surveys (title, description, status, target_role, starts_at, ends_at, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title.trim(), description?.trim() || null, st, tr, startsAt || null, endsAt || null, user.id]
    );
    const surveyId = rows[0].id;

    // Insert questions and options
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      if (!q.questionText?.trim()) continue;

      const { rows: qRows } = await pool.query(
        `INSERT INTO survey_questions (survey_id, question_text, question_type, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [surveyId, q.questionText.trim(), q.questionType || "single_choice", qi]
      );
      const questionId = qRows[0].id;

      if (q.options && Array.isArray(q.options)) {
        for (let oi = 0; oi < q.options.length; oi++) {
          const opt = q.options[oi];
          if (!opt?.trim()) continue;
          await pool.query(
            `INSERT INTO survey_options (question_id, option_text, sort_order) VALUES ($1,$2,$3)`,
            [questionId, opt.trim(), oi]
          );
        }
      }
    }

    // Notify target audience about new survey
    if (st === "published") {
      const roleCondition = tr === "all" ? "('agent', 'manager')" : tr === "agent" ? "('agent')" : "('manager')";
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT id, 'Новый опрос', $1, 'warning'
         FROM profiles WHERE status = 'active' AND role IN ${roleCondition}`,
        [`${title.trim()} — пройдите опрос`]
      ).catch(() => {});
    }

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/surveys error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
