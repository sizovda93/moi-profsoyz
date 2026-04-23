import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const { rows } = await pool.query(
      `SELECT n.*, p.full_name as author_name FROM news n LEFT JOIN profiles p ON p.id = n.author_id WHERE n.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Новость не найдена" }, { status: 404 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error("GET /api/news/[id] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin", "manager");
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.title !== undefined) { fields.push(`title = $${idx}`); values.push(body.title.trim()); idx++; }
    if (body.excerpt !== undefined) { fields.push(`excerpt = $${idx}`); values.push(body.excerpt?.trim() || null); idx++; }
    if (body.content !== undefined) { fields.push(`content = $${idx}`); values.push(body.content.trim()); idx++; }
    if (body.mediaType !== undefined) { fields.push(`media_type = $${idx}`); values.push(body.mediaType); idx++; }
    if (body.mediaUrl !== undefined) { fields.push(`media_url = $${idx}`); values.push(body.mediaUrl || null); idx++; }
    if (body.isFeatured !== undefined) { fields.push(`is_featured = $${idx}`); values.push(body.isFeatured); idx++; }

    if (body.status !== undefined) {
      const validStatuses = ["draft", "published", "archived"];
      if (validStatuses.includes(body.status)) {
        fields.push(`status = $${idx}`); values.push(body.status); idx++;
        // Set published_at on first publish
        if (body.status === "published") {
          fields.push(`published_at = COALESCE(published_at, now())`);
        }
      }
    }

    fields.push(`updated_at = now()`);

    if (fields.length <= 1) {
      return Response.json({ error: "Нет данных для обновления" }, { status: 400 });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE news SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return Response.json({ error: "Новость не найдена" }, { status: 404 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error("PATCH /api/news/[id] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin", "manager");
    if (auth.error) return auth.error;
    const { id } = await params;

    // Archive instead of hard delete
    const { rows } = await pool.query(
      `UPDATE news SET status = 'archived', updated_at = now() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Новость не найдена" }, { status: 404 });
    }

    return Response.json({ archived: true });
  } catch (err) {
    console.error("DELETE /api/news/[id] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
