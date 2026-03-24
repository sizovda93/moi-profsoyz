import pool from "@/lib/db";

export async function GET() {
  try {
    const unions = await pool.query(
      `SELECT id, name, short_name FROM unions WHERE is_active = true ORDER BY name`
    );

    const divisions = await pool.query(
      `SELECT id, union_id, name FROM union_divisions WHERE is_active = true ORDER BY sort_order`
    );

    // Group divisions by union_id
    const divisionsByUnion: Record<string, { id: string; name: string }[]> = {};
    for (const d of divisions.rows) {
      if (!divisionsByUnion[d.union_id]) divisionsByUnion[d.union_id] = [];
      divisionsByUnion[d.union_id].push({ id: d.id, name: d.name });
    }

    const result = unions.rows.map((u) => ({
      id: u.id,
      name: u.name,
      shortName: u.short_name,
      divisions: divisionsByUnion[u.id] || [],
    }));

    return Response.json(result);
  } catch (err) {
    console.error("Unions fetch error:", err);
    // Tables may not exist yet if migration hasn't been applied
    return Response.json([]);
  }
}
