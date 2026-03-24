import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const { rows } = await pool.query(
      `SELECT * FROM lead_events WHERE lead_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/leads/[id]/events error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
