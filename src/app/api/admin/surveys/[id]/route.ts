import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

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
    if (body.description !== undefined) { fields.push(`description = $${idx}`); values.push(body.description?.trim() || null); idx++; }
    if (body.status !== undefined) { fields.push(`status = $${idx}`); values.push(body.status); idx++; }
    if (body.targetRole !== undefined) { fields.push(`target_role = $${idx}`); values.push(body.targetRole); idx++; }
    if (body.startsAt !== undefined) { fields.push(`starts_at = $${idx}`); values.push(body.startsAt || null); idx++; }
    if (body.endsAt !== undefined) { fields.push(`ends_at = $${idx}`); values.push(body.endsAt || null); idx++; }
    fields.push(`updated_at = now()`);

    if (fields.length <= 1) return Response.json({ error: "Нет данных" }, { status: 400 });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE surveys SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values
    );
    if (rows.length === 0) return Response.json({ error: "Не найден" }, { status: 404 });
    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error("PATCH /api/admin/surveys/[id] error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
