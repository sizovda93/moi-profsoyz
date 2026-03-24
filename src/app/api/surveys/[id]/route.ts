import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;

    const { rows: surveyRows } = await pool.query(
      `SELECT s.*,
        EXISTS(SELECT 1 FROM survey_responses WHERE survey_id = s.id AND user_id = $2) as has_responded
       FROM surveys s WHERE s.id = $1`,
      [id, user.id]
    );
    if (surveyRows.length === 0) return Response.json({ error: "Не найден" }, { status: 404 });

    const { rows: questions } = await pool.query(
      `SELECT q.*, json_agg(json_build_object('id', o.id, 'optionText', o.option_text, 'sortOrder', o.sort_order) ORDER BY o.sort_order) as options
       FROM survey_questions q
       LEFT JOIN survey_options o ON o.question_id = q.id
       WHERE q.survey_id = $1
       GROUP BY q.id
       ORDER BY q.sort_order`,
      [id]
    );

    return Response.json({
      ...toCamelCase(surveyRows[0]),
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        sortOrder: q.sort_order,
        options: q.options.filter((o: { id: string | null }) => o.id !== null),
      })),
    });
  } catch (err) {
    console.error("GET /api/surveys/[id] error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
