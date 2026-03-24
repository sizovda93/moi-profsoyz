import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const condition = user.role === "admin" ? "" : "WHERE e.status = 'published'";
    const { rows } = await pool.query(`
      SELECT e.*, p.full_name as author_name
      FROM union_events e
      LEFT JOIN profiles p ON p.id = e.author_id
      ${condition}
      ORDER BY e.event_date DESC NULLS LAST, e.created_at DESC
    `);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/union-events error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { user } = auth;

    const { title, excerpt, content, eventDate, mediaType, mediaUrl, status } = await request.json();
    if (!title?.trim() || !content?.trim()) {
      return Response.json({ error: "Заголовок и текст обязательны" }, { status: 400 });
    }

    const st = ["draft", "published", "archived"].includes(status) ? status : "draft";
    const mt = ["image", "video", "none"].includes(mediaType) ? mediaType : "none";
    const pubAt = st === "published" ? new Date().toISOString() : null;

    const { rows } = await pool.query(
      `INSERT INTO union_events (title, excerpt, content, event_date, media_type, media_url, status, author_id, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title.trim(), excerpt?.trim() || null, content.trim(), eventDate || null, mt, mediaUrl || null, st, user.id, pubAt]
    );
    // Notify all active members about new event
    if (st === "published") {
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT id, 'Новое мероприятие', $1, 'success'
         FROM profiles WHERE status = 'active' AND role IN ('agent', 'manager')`,
        [`${title.trim()}`]
      ).catch(() => {});
    }

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/union-events error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
