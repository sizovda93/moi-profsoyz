import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    let query = `SELECT c.*,
       pa.full_name as agent_name,
       pm.full_name as manager_name
     FROM conversations c
     LEFT JOIN agents ag ON ag.id = c.agent_id
     LEFT JOIN profiles pa ON pa.id = ag.user_id
     LEFT JOIN profiles pm ON pm.id = c.manager_id`;
    const params: string[] = [];

    if (user.role === 'agent' && user.agentId) {
      query += ` WHERE c.agent_id = $1`;
      params.push(user.agentId);
    }

    query += ` ORDER BY c.last_message_at DESC`;

    const { rows } = await pool.query(query, params);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/conversations error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
