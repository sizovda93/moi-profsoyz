import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

// GET — list feedback (manager/admin)
export async function GET() {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;

    const { rows } = await pool.query(
      `SELECT f.*, p.full_name, p.email,
              ph.full_name AS handled_by_name
       FROM feedback f
       JOIN profiles p ON p.id = f.profile_id
       LEFT JOIN profiles ph ON ph.id = f.handled_by
       ORDER BY f.created_at DESC
       LIMIT 100`
    );

    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/feedback error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST — agent submits feedback
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const { type, message } = body;

    if (!type || !message || !message.trim()) {
      return Response.json({ error: 'Тип и сообщение обязательны' }, { status: 400 });
    }

    const validTypes = ['onboarding', 'platform', 'suggestion', 'problem'];
    if (!validTypes.includes(type)) {
      return Response.json({ error: `Допустимые типы: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO feedback (profile_id, type, message) VALUES ($1, $2, $3) RETURNING *`,
      [user.id, type, message.trim()]
    );

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
