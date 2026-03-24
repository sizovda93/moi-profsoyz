import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

// GET — check Telegram connection status for current user
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { rows } = await pool.query(
      `SELECT id, telegram_username, telegram_first_name, is_active, linked_at
       FROM telegram_bindings
       WHERE profile_id = $1 AND is_active = true
       LIMIT 1`,
      [user.id]
    );

    if (rows.length === 0) {
      return Response.json({ connected: false });
    }

    return Response.json(toCamelCase({
      connected: true,
      telegram_username: rows[0].telegram_username,
      telegram_first_name: rows[0].telegram_first_name,
      linked_at: rows[0].linked_at,
    }));
  } catch (err) {
    console.error('GET /api/telegram/status error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
