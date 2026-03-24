import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id, read } = await request.json();
    if (!id) return Response.json({ error: 'ID обязателен' }, { status: 400 });

    await pool.query(
      `UPDATE notifications SET read = $1 WHERE id = $2 AND user_id = $3`,
      [read ?? true, id, user.id]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
