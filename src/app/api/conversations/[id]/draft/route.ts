import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { generateDraft } from '@/lib/ai/generate-draft';

type RouteContext = { params: Promise<{ id: string }> };

// POST — generate a draft reply suggestion
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id: conversationId } = await params;

    // Verify conversation exists + ownership for manager
    const { rows: convRows } = await pool.query(
      `SELECT id, manager_id FROM conversations WHERE id = $1`,
      [conversationId]
    );
    if (convRows.length === 0) {
      return Response.json({ error: 'Диалог не найден' }, { status: 404 });
    }
    if (user.role === 'manager' && convRows[0].manager_id !== user.id) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const result = await generateDraft(conversationId, user.id);

    if (!result) {
      return Response.json(
        { error: 'Не удалось сгенерировать ответ. Проверьте, что последнее сообщение от агента.' },
        { status: 422 }
      );
    }

    // Fetch the saved draft
    const { rows: draftRows } = await pool.query(
      `SELECT * FROM message_drafts
       WHERE conversation_id = $1 AND status = 'suggested'
       ORDER BY created_at DESC LIMIT 1`,
      [conversationId]
    );

    return Response.json(toCamelCase(draftRows[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/conversations/[id]/draft error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// PATCH — update draft status (accepted / rejected)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id: conversationId } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['accepted', 'edited', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return Response.json(
        { error: `Допустимые статусы: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify ownership for manager
    if (user.role === 'manager') {
      const { rows: convRows } = await pool.query(
        `SELECT manager_id FROM conversations WHERE id = $1`,
        [conversationId]
      );
      if (convRows.length === 0 || convRows[0].manager_id !== user.id) {
        return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
    }

    const { rows } = await pool.query(
      `UPDATE message_drafts SET status = $1
       WHERE conversation_id = $2 AND status = 'suggested'
       RETURNING *`,
      [status, conversationId]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Нет активного draft' }, { status: 404 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('PATCH /api/conversations/[id]/draft error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
