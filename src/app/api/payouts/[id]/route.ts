import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { notifyPayoutStatusChanged } from '@/lib/telegram-notifications';

type RouteContext = { params: Promise<{ id: string }> };

// State machine: допустимые переходы
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'rejected'],
  processing: ['paid', 'rejected'],
  paid: [],      // конечный
  rejected: [],  // конечный
};

// paid можно ставить только admin
const ADMIN_ONLY_STATUSES = ['paid'];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!status) {
      return Response.json({ error: 'Статус обязателен' }, { status: 400 });
    }

    const existing = await pool.query(`SELECT * FROM payouts WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return Response.json({ error: 'Выплата не найдена' }, { status: 404 });
    }

    const payout = existing.rows[0];
    const allowed = ALLOWED_TRANSITIONS[payout.status] || [];

    if (!allowed.includes(status)) {
      return Response.json({
        error: `Недопустимый переход: ${payout.status} → ${status}. Допустимые: ${allowed.join(', ') || 'нет (конечный статус)'}`,
      }, { status: 400 });
    }

    // paid может ставить только admin
    if (ADMIN_ONLY_STATUSES.includes(status) && user.role !== 'admin') {
      return Response.json({ error: 'Только администратор может подтвердить выплату' }, { status: 403 });
    }

    // При rejected обязательна причина
    if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
      return Response.json({ error: 'Причина отклонения обязательна' }, { status: 400 });
    }

    const updates = ['status = $1'];
    const values: (string | null)[] = [status];
    let idx = 2;

    if (status === 'rejected' && rejectionReason) {
      updates.push(`rejection_reason = $${idx}`);
      values.push(rejectionReason.trim());
      idx++;
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE payouts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('payout.status_changed', $1, $2)`,
      [user.email, `Выплата ${id}: ${payout.status} → ${status}${status === 'rejected' ? `, причина: ${rejectionReason}` : ''}`]
    );

    // T1: Telegram notification — выплата одобрена/отклонена
    if (['paid', 'rejected', 'processing'].includes(status)) {
      notifyPayoutStatusChanged(id, status, rejectionReason).catch(() => {});
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('PATCH /api/payouts/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
