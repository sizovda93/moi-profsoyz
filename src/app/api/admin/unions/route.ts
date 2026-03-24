import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function GET() {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;

    const unions = await pool.query(
      `SELECT id, name, short_name, is_active, created_at FROM unions ORDER BY name`
    );

    const divisions = await pool.query(
      `SELECT id, union_id, name, is_active, sort_order FROM union_divisions ORDER BY sort_order`
    );

    const divisionsByUnion: Record<string, { id: string; name: string; isActive: boolean; sortOrder: number }[]> = {};
    for (const d of divisions.rows) {
      if (!divisionsByUnion[d.union_id]) divisionsByUnion[d.union_id] = [];
      divisionsByUnion[d.union_id].push({
        id: d.id,
        name: d.name,
        isActive: d.is_active,
        sortOrder: d.sort_order,
      });
    }

    const result = unions.rows.map((u) => ({
      id: u.id,
      name: u.name,
      shortName: u.short_name,
      isActive: u.is_active,
      createdAt: u.created_at,
      divisions: divisionsByUnion[u.id] || [],
    }));

    return Response.json(result);
  } catch (err) {
    console.error("GET /api/admin/unions error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (auth.error) return auth.error;

    const { name, shortName } = await request.json();
    if (!name || !name.trim()) {
      return Response.json({ error: "Название обязательно" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO unions (name, short_name) VALUES ($1, $2) RETURNING *`,
      [name.trim(), shortName?.trim() || null]
    );

    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/unions error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
