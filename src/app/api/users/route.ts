import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;

    const { rows } = await pool.query(
      `SELECT p.id, p.role, p.full_name, p.email, p.phone, p.avatar_url, p.status, p.created_at, p.updated_at,
              a.id as agent_id, a.city, a.specialization, a.active_leads, a.total_leads, a.total_revenue,
              a.onboarding_status, a.rating, a.tier, a.manager_id,
              pm.full_name as manager_name
       FROM profiles p
       LEFT JOIN agents a ON a.user_id = p.id
       LEFT JOIN profiles pm ON pm.id = a.manager_id
       ORDER BY p.created_at DESC`
    );
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/users error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
