import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;

    const { rows } = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
    );
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/logs error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
