import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

const QUERY_WITH_UNIONS = `SELECT p.id, p.role, p.full_name, p.email, p.phone, p.avatar_url, p.status, p.created_at,
        a.id as agent_id, a.city, a.specialization, a.active_leads, a.total_leads,
        a.total_revenue, a.onboarding_status, a.rating, a.tier, a.manager_id,
        a.gender, a.birth_year, a.profession, a.preferred_messenger,
        pm.full_name as manager_name,
        ud.name as division_name,
        u.name as union_name, u.short_name as union_short_name
 FROM profiles p
 LEFT JOIN agents a ON a.user_id = p.id
 LEFT JOIN profiles pm ON pm.id = a.manager_id
 LEFT JOIN union_divisions ud ON ud.id = a.division_id
 LEFT JOIN unions u ON u.id = a.union_id
 WHERE p.id = $1`;

const QUERY_WITHOUT_UNIONS = `SELECT p.id, p.role, p.full_name, p.email, p.phone, p.avatar_url, p.status, p.created_at,
        a.id as agent_id, a.city, a.specialization, a.active_leads, a.total_leads,
        a.total_revenue, a.onboarding_status, a.rating, a.tier, a.manager_id,
        a.gender, a.birth_year, a.profession, a.preferred_messenger,
        pm.full_name as manager_name
 FROM profiles p
 LEFT JOIN agents a ON a.user_id = p.id
 LEFT JOIN profiles pm ON pm.id = a.manager_id
 WHERE p.id = $1`;

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    let rows;
    try {
      const result = await pool.query(QUERY_WITH_UNIONS, [user.id]);
      rows = result.rows;
    } catch {
      // Fallback if unions/union_divisions tables don't exist yet
      const result = await pool.query(QUERY_WITHOUT_UNIONS, [user.id]);
      rows = result.rows;
    }

    if (rows.length === 0) {
      return Response.json({ error: 'Профиль не найден' }, { status: 404 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
