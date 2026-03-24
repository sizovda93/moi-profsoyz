import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; divId: string }> }) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { id: unionId, divId } = await params;

    const { name, isActive } = await request.json();

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx}`); values.push(name.trim()); idx++; }
    if (isActive !== undefined) { fields.push(`is_active = $${idx}`); values.push(isActive); idx++; }

    if (fields.length === 0) {
      return Response.json({ error: "Нет данных для обновления" }, { status: 400 });
    }

    values.push(divId, unionId);
    const { rows } = await pool.query(
      `UPDATE union_divisions SET ${fields.join(", ")} WHERE id = $${idx} AND union_id = $${idx + 1} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return Response.json({ error: "Подразделение не найдено" }, { status: 404 });
    }

    return Response.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/admin/unions/[id]/divisions/[divId] error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
