import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    if (!user.agentId) {
      return Response.json([]);
    }

    // Get current user's manager
    const { rows: agentRows } = await pool.query(
      `SELECT manager_id FROM agents WHERE id = $1`, [user.agentId]
    );
    if (agentRows.length === 0 || !agentRows[0].manager_id) {
      return Response.json([]);
    }
    const managerId = agentRows[0].manager_id;

    // Get manager name
    const { rows: managerRows } = await pool.query(
      `SELECT full_name FROM profiles WHERE id = $1`, [managerId]
    );
    const managerName = managerRows[0]?.full_name || "Руководитель";

    // Get colleagues assigned to the same manager (excluding self)
    const { rows } = await pool.query(`
      SELECT p.id, p.full_name, p.email, p.phone, p.status,
             a.id as agent_id, a.profession, a.manager_id,
             ud.name as division_name
      FROM agents a
      JOIN profiles p ON p.id = a.user_id
      LEFT JOIN union_divisions ud ON ud.id = a.division_id
      WHERE a.manager_id = $1 AND p.id != $2 AND p.status = 'active'
      ORDER BY p.full_name
    `, [managerId, user.id]);

    return Response.json({
      managerId,
      managerName,
      colleagues: toCamelCase(rows),
    });
  } catch (err) {
    console.error("GET /api/colleagues error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
