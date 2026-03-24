import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const isAdmin = user.role === "admin";

    const { rows } = await pool.query(`
      SELECT lr.*,
        p.full_name as author_name, p.email as author_email,
        a.division_id,
        ud.name as division_name,
        ap.full_name as answered_by_name,
        (SELECT count(*) FROM legal_request_attachments WHERE request_id = lr.id) as attachment_count
      FROM legal_requests lr
      JOIN profiles p ON p.id = lr.author_id
      LEFT JOIN agents a ON a.user_id = lr.author_id
      LEFT JOIN union_divisions ud ON ud.id = a.division_id
      LEFT JOIN profiles ap ON ap.id = lr.answered_by
      ${isAdmin ? "" : "WHERE lr.author_id = $1"}
      ORDER BY lr.created_at DESC
    `, isAdmin ? [] : [user.id]);

    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/legal-requests error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { subject, category, description, attachments } = await request.json();

    if (!subject?.trim() || !description?.trim()) {
      return Response.json({ error: "Тема и описание обязательны" }, { status: 400 });
    }

    const validCategories = [
      "labor_disputes", "dismissal", "salary", "vacation",
      "labor_safety", "disciplinary", "benefits", "other"
    ];
    const cat = validCategories.includes(category) ? category : "other";

    const { rows } = await pool.query(
      `INSERT INTO legal_requests (author_id, subject, category, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, subject.trim(), cat, description.trim()]
    );

    const newRequest = rows[0];

    // Save attachments if provided
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.fileUrl && att.fileName) {
          await pool.query(
            `INSERT INTO legal_request_attachments (request_id, file_name, file_url, file_size)
             VALUES ($1, $2, $3, $4)`,
            [newRequest.id, att.fileName, att.fileUrl, att.fileSize || null]
          );
        }
      }
    }

    // Notify admins
    const admins = await pool.query(`SELECT id FROM profiles WHERE role = 'admin' AND status = 'active'`);
    for (const admin of admins.rows) {
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
        [admin.id, "Новый вопрос юристу", `${user.fullName}: ${subject.trim()}`]
      ).catch(() => {});
    }

    return Response.json(toCamelCase(newRequest), { status: 201 });
  } catch (err) {
    console.error("POST /api/legal-requests error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
