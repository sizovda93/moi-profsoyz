import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;

    const { rows } = await pool.query(`
      SELECT lr.*,
        p.full_name as author_name, p.email as author_email, p.phone as author_phone,
        a.division_id,
        ud.name as division_name,
        u.short_name as union_name,
        ap.full_name as answered_by_name
      FROM legal_requests lr
      JOIN profiles p ON p.id = lr.author_id
      LEFT JOIN agents a ON a.user_id = lr.author_id
      LEFT JOIN union_divisions ud ON ud.id = a.division_id
      LEFT JOIN unions u ON u.id = a.union_id
      LEFT JOIN profiles ap ON ap.id = lr.answered_by
      WHERE lr.id = $1
    `, [id]);

    if (rows.length === 0) {
      return Response.json({ error: "Не найдено" }, { status: 404 });
    }

    // Access check: member sees only own
    if (user.role !== "admin" && rows[0].author_id !== user.id) {
      return Response.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    // Load attachments
    const { rows: attachments } = await pool.query(
      `SELECT id, file_name, file_url, file_size, created_at FROM legal_request_attachments WHERE request_id = $1 ORDER BY created_at`,
      [id]
    );

    return Response.json({
      ...toCamelCase(rows[0]),
      attachments: attachments.map((a) => toCamelCase(a)),
    });
  } catch (err) {
    console.error("GET /api/legal-requests/[id] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;

    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.status !== undefined) {
      const valid = ["new", "in_progress", "waiting", "answered", "closed"];
      if (valid.includes(body.status)) {
        fields.push(`status = $${idx}`); values.push(body.status); idx++;
      }
    }

    if (body.answerText !== undefined) {
      fields.push(`answer_text = $${idx}`); values.push(body.answerText.trim()); idx++;
      fields.push(`answered_by = $${idx}`); values.push(user.id); idx++;
      fields.push(`answered_at = now()`);
      // Auto-set status to answered if providing answer
      if (!body.status) {
        fields.push(`status = 'answered'`);
      }
    }

    fields.push(`updated_at = now()`);

    if (fields.length <= 1) {
      return Response.json({ error: "Нет данных" }, { status: 400 });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE legal_requests SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return Response.json({ error: "Не найдено" }, { status: 404 });
    }

    // Notify author about answer/status change
    const authorId = rows[0].author_id;
    if (body.answerText) {
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'success')`,
        [authorId, "Ответ юриста", `На ваш вопрос «${rows[0].subject}» получен ответ`]
      ).catch(() => {});
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error("PATCH /api/legal-requests/[id] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
