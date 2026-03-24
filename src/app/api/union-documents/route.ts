import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const condition = user.role === "admin" ? "" : "WHERE d.status = 'published'";
    const { rows } = await pool.query(`
      SELECT d.* FROM union_documents d ${condition} ORDER BY d.created_at DESC
    `);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/union-documents error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { user } = auth;

    const { title, description, category, fileName, fileUrl, fileSize, status } = await request.json();
    if (!title?.trim() || !fileUrl) {
      return Response.json({ error: "Название и файл обязательны" }, { status: 400 });
    }

    const st = ["draft", "published", "archived"].includes(status) ? status : "draft";
    const pubAt = st === "published" ? new Date().toISOString() : null;

    const { rows } = await pool.query(
      `INSERT INTO union_documents (title, description, category, file_name, file_url, file_size, status, author_id, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title.trim(), description?.trim() || null, category || "other", fileName, fileUrl, fileSize || null, st, user.id, pubAt]
    );
    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/union-documents error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
