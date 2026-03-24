import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';

export async function GET() {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    // Build scope condition
    const managerCondition = user.role === 'manager' ? 'AND a.manager_id = $1' : '';
    const params = user.role === 'manager' ? [user.id] : [];

    const { rows } = await pool.query(`
      SELECT
        ud.id as division_id,
        ud.name as division_name,
        COUNT(DISTINCT a.id) as member_count,
        COUNT(DISTINCT l.id) as total_appeals,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'new') as new_appeals,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('new', 'won', 'lost')) as active_appeals,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won') as resolved_appeals
      FROM union_divisions ud
      LEFT JOIN agents a ON a.division_id = ud.id ${managerCondition}
      LEFT JOIN leads l ON l.assigned_agent_id = a.id
      WHERE ud.is_active = true
      GROUP BY ud.id, ud.name, ud.sort_order
      ORDER BY ud.sort_order
    `, params);

    return Response.json(rows.map(r => ({
      divisionId: r.division_id,
      divisionName: r.division_name,
      memberCount: Number(r.member_count),
      totalAppeals: Number(r.total_appeals),
      newAppeals: Number(r.new_appeals),
      activeAppeals: Number(r.active_appeals),
      resolvedAppeals: Number(r.resolved_appeals),
    })));
  } catch (err) {
    console.error('GET /api/analytics/divisions error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
