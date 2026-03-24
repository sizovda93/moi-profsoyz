import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    let query = `SELECT p.* FROM payouts p`;
    const params: string[] = [];

    if (user.role === 'agent' && user.agentId) {
      query += ` WHERE p.agent_id = $1`;
      params.push(user.agentId);
    } else if (user.role === 'manager') {
      // Менеджер видит только выплаты агентов, чьи лиды он курирует
      query += ` WHERE p.agent_id IN (
        SELECT DISTINCT l.assigned_agent_id FROM leads l
        WHERE l.assigned_manager_id = $1 AND l.assigned_agent_id IS NOT NULL
      )`;
      params.push(user.id);
    }
    // admin видит все

    query += ` ORDER BY p.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/payouts error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
