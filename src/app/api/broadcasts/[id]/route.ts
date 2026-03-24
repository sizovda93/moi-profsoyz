import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET — broadcast detail with recipients
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    // Fetch broadcast
    const { rows: bcRows } = await pool.query(
      `SELECT b.*, p.full_name as sender_name
       FROM broadcasts b
       JOIN profiles p ON p.id = b.sender_id
       WHERE b.id = $1`,
      [id]
    );
    if (bcRows.length === 0) {
      return Response.json({ error: 'Рассылка не найдена' }, { status: 404 });
    }

    const broadcast = bcRows[0];

    // Manager can only see own broadcasts
    if (user.role === 'manager' && broadcast.sender_id !== user.id) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Fetch recipients
    const { rows: recipientRows } = await pool.query(
      `SELECT * FROM broadcast_recipients
       WHERE broadcast_id = $1
       ORDER BY agent_name ASC`,
      [id]
    );

    const result = {
      ...broadcast,
      recipients: recipientRows,
    };

    return Response.json(toCamelCase(result));
  } catch (err) {
    console.error('GET /api/broadcasts/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
