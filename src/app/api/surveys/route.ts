import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { rows } = await pool.query(`
      SELECT s.*,
        (SELECT count(*) FROM survey_responses WHERE survey_id = s.id) as response_count,
        (SELECT count(*) FROM survey_questions WHERE survey_id = s.id) as question_count,
        EXISTS(SELECT 1 FROM survey_responses WHERE survey_id = s.id AND user_id = $1) as has_responded
      FROM surveys s
      WHERE s.status = 'published'
        AND (s.target_role = 'all' OR s.target_role = $2)
        AND (s.starts_at IS NULL OR s.starts_at <= now())
        AND (s.ends_at IS NULL OR s.ends_at >= now())
      ORDER BY s.created_at DESC
    `, [user.id, user.role]);

    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/surveys error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
