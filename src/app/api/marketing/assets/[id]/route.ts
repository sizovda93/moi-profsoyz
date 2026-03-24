import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ id: string }> };

// GET — single asset
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const isAdmin = user.role === 'admin';

    const { rows } = await pool.query(
      isAdmin
        ? `SELECT * FROM marketing_assets WHERE id = $1`
        : `SELECT * FROM marketing_assets WHERE id = $1 AND status = 'published'`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Материал не найден' }, { status: 404 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('GET /api/marketing/assets/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// PATCH — update asset (admin only)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const body = await request.json();

    const allowedFields: Record<string, string> = {
      category: 'category',
      type: 'type',
      title: 'title',
      description: 'description',
      body: 'body',
      sortOrder: 'sort_order',
      isFeatured: 'is_featured',
      status: 'status',
    };

    const sets: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let idx = 1;

    for (const [camelKey, dbCol] of Object.entries(allowedFields)) {
      if (body[camelKey] !== undefined) {
        sets.push(`${dbCol} = $${idx}`);
        values.push(body[camelKey]);
        idx++;
      }
    }

    if (sets.length === 0) {
      return Response.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE marketing_assets SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Материал не найден' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('marketing.asset_updated', $1, $2)`,
      [user.email, `Asset ${id}: ${Object.keys(body).join(', ')}`]
    );

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('PATCH /api/marketing/assets/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// DELETE — archive asset (admin only)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    const { rows } = await pool.query(
      `UPDATE marketing_assets SET status = 'archived', updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Материал не найден' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('marketing.asset_archived', $1, $2)`,
      [user.email, `Asset ${id}: ${rows[0].title}`]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/marketing/assets/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
