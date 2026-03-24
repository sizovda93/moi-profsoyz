import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

// GET — list marketing assets (agent sees published only, admin sees all)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const category = request.nextUrl.searchParams.get('category');
    const isAdmin = user.role === 'admin';

    let query = `SELECT * FROM marketing_assets`;
    const conditions: string[] = [];
    const params: string[] = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`status = 'published'`);
    }

    if (category) {
      conditions.push(`category = $${idx}`);
      params.push(category);
      idx++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY sort_order, created_at`;

    const { rows } = await pool.query(query, params);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/marketing/assets error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST — create new asset (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const { category, type, title, description, body: assetBody, sortOrder, isFeatured, status } = body;

    if (!category || !type || !title || !assetBody) {
      return Response.json({ error: 'category, type, title, body обязательны' }, { status: 400 });
    }

    const validCategories = ['social', 'direct', 'howto', 'scripts'];
    const validTypes = ['post', 'message', 'guide', 'cta'];
    const validStatuses = ['draft', 'published', 'archived'];

    if (!validCategories.includes(category)) {
      return Response.json({ error: `Недопустимая категория: ${category}` }, { status: 400 });
    }
    if (!validTypes.includes(type)) {
      return Response.json({ error: `Недопустимый тип: ${type}` }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO marketing_assets (category, type, title, description, body, sort_order, is_featured, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        category,
        type,
        title,
        description || null,
        assetBody,
        sortOrder ?? 0,
        isFeatured ?? false,
        validStatuses.includes(status) ? status : 'draft',
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('marketing.asset_created', $1, $2)`,
      [user.email, `Asset: ${title} (${category}/${type})`]
    );

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/marketing/assets error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
