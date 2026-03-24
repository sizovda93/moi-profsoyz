import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { rows } = await pool.query(
      `SELECT p.id, p.role, p.full_name, p.email, p.phone, p.avatar_url, p.status, p.created_at,
              a.id as agent_id, a.city, a.specialization, a.active_leads, a.total_leads,
              a.total_revenue, a.onboarding_status, a.rating, a.tier, a.manager_id,
              a.gender, a.birth_year, a.profession, a.preferred_messenger,
              pm.full_name as manager_name
       FROM profiles p
       LEFT JOIN agents a ON a.user_id = p.id
       LEFT JOIN profiles pm ON pm.id = a.manager_id
       WHERE p.id = $1`,
      [user.id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Профиль не найден' }, { status: 404 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
