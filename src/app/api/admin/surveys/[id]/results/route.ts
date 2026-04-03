import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin", "manager");
    if (auth.error) return auth.error;
    const { id } = await params;

    // Survey info
    const { rows: surveyRows } = await pool.query(`SELECT * FROM surveys WHERE id = $1`, [id]);
    if (surveyRows.length === 0) return Response.json({ error: "Не найден" }, { status: 404 });

    // Total responses
    const { rows: countRows } = await pool.query(
      `SELECT count(*) as total FROM survey_responses WHERE survey_id = $1`, [id]
    );

    // Questions with options and vote counts
    const { rows: questions } = await pool.query(`
      SELECT q.id, q.question_text, q.question_type, q.sort_order,
        json_agg(
          json_build_object(
            'id', o.id,
            'optionText', o.option_text,
            'sortOrder', o.sort_order,
            'voteCount', (SELECT count(*) FROM survey_answers sa WHERE sa.option_id = o.id)
          ) ORDER BY o.sort_order
        ) as options
      FROM survey_questions q
      LEFT JOIN survey_options o ON o.question_id = q.id
      WHERE q.survey_id = $1
      GROUP BY q.id
      ORDER BY q.sort_order
    `, [id]);

    return Response.json({
      surveyId: id,
      title: surveyRows[0].title,
      totalResponses: Number(countRows[0].total),
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options.filter((o: { id: string | null }) => o.id !== null),
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/surveys/[id]/results error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
