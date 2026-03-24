import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';

export async function GET() {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;

    const { rows } = await pool.query(`SELECT key, value FROM settings ORDER BY key`);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return Response.json(settings);
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const allowedKeys = [
      'commission_rate', 'commission_rate_base', 'commission_rate_silver', 'commission_rate_gold',
      'platform_name', 'support_email', 'support_phone',
      'auto_reply_enabled', 'relationship_messages_enabled',
    ];

    const updates: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (!allowedKeys.includes(key)) continue;
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
      updates.push(`${key}=${value}`);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'Нет допустимых настроек для обновления' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('settings.updated', $1, $2)`,
      [user.email, updates.join(', ')]
    );

    // Вернуть актуальные настройки
    const { rows } = await pool.query(`SELECT key, value FROM settings ORDER BY key`);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return Response.json(settings);
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
