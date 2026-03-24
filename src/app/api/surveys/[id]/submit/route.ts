import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id: surveyId } = await params;

    // Check survey exists and is published
    const { rows: surveyRows } = await pool.query(
      `SELECT id FROM surveys WHERE id = $1 AND status = 'published'`, [surveyId]
    );
    if (surveyRows.length === 0) return Response.json({ error: "Опрос не найден или закрыт" }, { status: 404 });

    // Check not already responded
    const { rows: existing } = await pool.query(
      `SELECT id FROM survey_responses WHERE survey_id = $1 AND user_id = $2`, [surveyId, user.id]
    );
    if (existing.length > 0) return Response.json({ error: "Вы уже прошли этот опрос" }, { status: 400 });

    const { answers } = await request.json();
    // answers: { questionId: string, optionIds: string[] }[]
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return Response.json({ error: "Ответы обязательны" }, { status: 400 });
    }

    // Create response
    const { rows: responseRows } = await pool.query(
      `INSERT INTO survey_responses (survey_id, user_id) VALUES ($1, $2) RETURNING id`,
      [surveyId, user.id]
    );
    const responseId = responseRows[0].id;

    // Save answers
    for (const answer of answers) {
      if (!answer.questionId || !answer.optionIds || !Array.isArray(answer.optionIds)) continue;
      for (const optionId of answer.optionIds) {
        await pool.query(
          `INSERT INTO survey_answers (response_id, question_id, option_id) VALUES ($1, $2, $3)`,
          [responseId, answer.questionId, optionId]
        );
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("POST /api/surveys/[id]/submit error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
