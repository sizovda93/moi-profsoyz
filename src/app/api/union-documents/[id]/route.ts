import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.title !== undefined) { fields.push(`title = $${idx}`); values.push(body.title.trim()); idx++; }
    if (body.description !== undefined) { fields.push(`description = $${idx}`); values.push(body.description?.trim() || null); idx++; }
    if (body.category !== undefined) { fields.push(`category = $${idx}`); values.push(body.category); idx++; }
    if (body.fileName !== undefined) { fields.push(`file_name = $${idx}`); values.push(body.fileName); idx++; }
    if (body.fileUrl !== undefined) { fields.push(`file_url = $${idx}`); values.push(body.fileUrl); idx++; }
    if (body.fileSize !== undefined) { fields.push(`file_size = $${idx}`); values.push(body.fileSize); idx++; }
    if (body.status !== undefined) {
      fields.push(`status = $${idx}`); values.push(body.status); idx++;
      if (body.status === "published") fields.push(`published_at = COALESCE(published_at, now())`);
    }
    fields.push(`updated_at = now()`);

    if (fields.length <= 1) return Response.json({ error: "Нет данных" }, { status: 400 });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE union_documents SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values
    );
    if (rows.length === 0) return Response.json({ error: "Не найдено" }, { status: 404 });
    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error("PATCH /api/union-documents/[id] error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { id } = await params;
    await pool.query(`UPDATE union_documents SET status = 'archived', updated_at = now() WHERE id = $1`, [id]);
    return Response.json({ archived: true });
  } catch (err) {
    console.error("DELETE /api/union-documents/[id] error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
