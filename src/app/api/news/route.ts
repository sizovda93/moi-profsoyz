import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    // Admin sees all, others see only published
    const condition = user.role === "admin"
      ? ""
      : "WHERE n.status = 'published'";

    const { rows } = await pool.query(`
      SELECT n.*, p.full_name as author_name
      FROM news n
      LEFT JOIN profiles p ON p.id = n.author_id
      ${condition}
      ORDER BY n.is_featured DESC, n.published_at DESC NULLS LAST, n.created_at DESC
    `);

    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/news error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { user } = auth;

    const { title, excerpt, content, mediaType, mediaUrl, status, isFeatured } = await request.json();

    if (!title?.trim() || !content?.trim()) {
      return Response.json({ error: "Заголовок и текст обязательны" }, { status: 400 });
    }

    const validStatuses = ["draft", "published", "archived"];
    const newsStatus = validStatuses.includes(status) ? status : "draft";
    const validMediaTypes = ["image", "video", "none"];
    const newsMediaType = validMediaTypes.includes(mediaType) ? mediaType : "none";

    const publishedAt = newsStatus === "published" ? new Date().toISOString() : null;

    const { rows } = await pool.query(
      `INSERT INTO news (title, excerpt, content, media_type, media_url, status, is_featured, author_id, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title.trim(), excerpt?.trim() || null, content.trim(), newsMediaType, mediaUrl || null, newsStatus, isFeatured || false, user.id, publishedAt]
    );

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/news error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
