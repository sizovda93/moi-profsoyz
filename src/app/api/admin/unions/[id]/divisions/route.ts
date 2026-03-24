import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;
    const { id: unionId } = await params;

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return Response.json({ error: "Название обязательно" }, { status: 400 });
    }

    // Check union exists
    const unionCheck = await pool.query(`SELECT id FROM unions WHERE id = $1`, [unionId]);
    if (unionCheck.rows.length === 0) {
      return Response.json({ error: "Профсоюз не найден" }, { status: 404 });
    }

    // Get next sort_order
    const maxOrder = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM union_divisions WHERE union_id = $1`,
      [unionId]
    );

    const { rows } = await pool.query(
      `INSERT INTO union_divisions (union_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [unionId, name.trim(), maxOrder.rows[0].next_order]
    );

    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/unions/[id]/divisions error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
