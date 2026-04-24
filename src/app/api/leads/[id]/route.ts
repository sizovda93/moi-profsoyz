import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { notifyLeadStatusChanged, notifyPayoutCreated } from '@/lib/telegram-notifications';
import { normalizePhone } from '@/lib/phone';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT l.*,
         ag.id as agent_uuid,
         pa.full_name as agent_name,
         pm.full_name as manager_name
       FROM leads l
       LEFT JOIN agents ag ON ag.id = l.assigned_agent_id
       LEFT JOIN profiles pa ON pa.id = ag.user_id
       LEFT JOIN profiles pm ON pm.id = l.assigned_manager_id
       WHERE l.id = $1`,
      [id]
    );
    if (rows.length === 0) return Response.json({ error: 'Не найдено' }, { status: 404 });

    // Агент видит только свои лиды
    if (user.role === 'agent' && rows[0].assigned_agent_id !== user.agentId) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Менеджер видит только лиды, закреплённые за ним
    if (user.role === 'manager' && rows[0].assigned_manager_id !== user.id) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    return Response.json(toCamelCase(rows[0]));
  } catch (err) {
    console.error('GET /api/leads/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    // Загружаем текущий лид
    const existing = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return Response.json({ error: 'Не найдено' }, { status: 404 });
    }
    const lead = existing.rows[0];

    // Агент может менять только свои лиды, и только статус
    if (user.role === 'agent') {
      if (lead.assigned_agent_id !== user.agentId) {
        return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
    }

    // Менеджер может менять только свои закреплённые лиды
    if (user.role === 'manager' && lead.assigned_manager_id !== user.id) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();

    // Block "won" transition while conflict is open
    if (body.status === 'won' && lead.conflict_status === 'open') {
      return Response.json(
        { error: 'Нельзя перевести в «выигран» — есть нерешённый конфликт дублирования' },
        { status: 409 }
      );
    }

    const allowedFields = ['status', 'comment', 'estimated_value', 'assigned_agent_id', 'city', 'full_name', 'phone', 'email', 'source'];
    // Агент может менять только status и comment
    const agentAllowed = ['status', 'comment'];
    // Агент не может ставить финансово значимые статусы
    const agentForbiddenStatuses = ['won', 'lost'];
    if (user.role === 'agent' && body.status && agentForbiddenStatuses.includes(body.status)) {
      return Response.json({ error: 'Агент не может устанавливать статус won/lost' }, { status: 403 });
    }

    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIdx = 1;

    let phoneUpdated = false;
    for (const [key, val] of Object.entries(body)) {
      // camelCase → snake_case
      const snakeKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
      if (!allowedFields.includes(snakeKey)) continue;
      if (user.role === 'agent' && !agentAllowed.includes(snakeKey)) continue;

      sets.push(`${snakeKey} = $${paramIdx}`);
      values.push(val as string | number | null);
      paramIdx++;

      if (snakeKey === 'phone') phoneUpdated = true;
    }

    // Auto-update phone_normalized when phone changes
    if (phoneUpdated && body.phone) {
      sets.push(`phone_normalized = $${paramIdx}`);
      values.push(normalizePhone(body.phone));
      paramIdx++;
    }

    if (sets.length === 0) {
      return Response.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE leads SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    const updated = rows[0];
    const oldStatus = lead.status;
    const newStatus = updated.status;

    // lead_events: смена статуса
    if (oldStatus !== newStatus) {
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'status_changed', $2, $3)`,
        [id, user.email, `${oldStatus} → ${newStatus}`]
      );

      // T1: Telegram notification — статус лида изменён
      if (updated.assigned_agent_id) {
        notifyLeadStatusChanged(updated.assigned_agent_id, updated.full_name, oldStatus, newStatus).catch(() => {});
      }
    }

    // lead_events: переназначение агента
    if (lead.assigned_agent_id !== updated.assigned_agent_id && updated.assigned_agent_id) {
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'agent_reassigned', $2, $3)`,
        [id, user.email, `Агент: ${lead.assigned_agent_id || 'нет'} → ${updated.assigned_agent_id}`]
      );
    }

    // Auto payout при переходе в won
    if (oldStatus !== 'won' && newStatus === 'won' && updated.assigned_agent_id && updated.estimated_value) {
      // Step 1: Get agent info + current tier
      const agentInfo = await pool.query(
        `SELECT a.id, a.tier, p.full_name FROM agents a JOIN profiles p ON p.id = a.user_id WHERE a.id = $1`,
        [updated.assigned_agent_id]
      );

      if (agentInfo.rows.length > 0) {
        const agentTier: string = agentInfo.rows[0].tier || 'base';
        const agentName: string = agentInfo.rows[0].full_name;

        // Step 2: Get commission rate for agent's current tier
        const rateKey = `commission_rate_${agentTier}`;
        const settingsResult = await pool.query(
          "SELECT value FROM settings WHERE key = $1",
          [rateKey]
        );
        // Fallback: try legacy commission_rate, then default 0.25
        let rate: number;
        if (settingsResult.rows.length > 0) {
          rate = parseFloat(settingsResult.rows[0].value);
        } else {
          const fallback = await pool.query("SELECT value FROM settings WHERE key = 'commission_rate'");
          rate = fallback.rows.length > 0 ? parseFloat(fallback.rows[0].value) : 0.25;
        }

        const baseAmount = parseFloat(updated.estimated_value);
        const bonusAmount = 0; // Reserved for future bonus logic
        const payoutAmount = baseAmount * rate + bonusAmount;

        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const description = `Комиссия ${(rate * 100).toFixed(0)}% (${agentTier}) за лид: ${updated.full_name}`;

        // Step 3: Create payout with full snapshot
        await pool.query(
          `INSERT INTO payouts (agent_id, agent_name, amount, period, description,
                                lead_id, lead_name, base_amount, commission_rate, bonus_amount, tier_at_creation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (agent_id, lead_id) DO NOTHING`,
          [
            updated.assigned_agent_id,
            agentName,
            payoutAmount,
            period,
            description,
            updated.id,
            updated.full_name,
            baseAmount,
            rate,
            bonusAmount,
            agentTier,
          ]
        );

        // Step 4: Update total_revenue
        await pool.query(
          `UPDATE agents SET total_revenue = (SELECT COALESCE(SUM(amount),0) FROM payouts WHERE agent_id = $1 AND status IN ('pending','processing','paid'))
           WHERE id = $1`,
          [updated.assigned_agent_id]
        );

        // Step 5: lead_events
        await pool.query(
          `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'payout_created', $2, $3)`,
          [id, user.email, `Выплата: ${payoutAmount.toFixed(2)} ₽ (${(rate * 100).toFixed(0)}%, ${agentTier}). База: ${baseAmount.toFixed(2)} ₽`]
        );

        // Step 6: Telegram notification
        notifyPayoutCreated(updated.assigned_agent_id, payoutAmount, updated.full_name).catch(() => {});

        // Step 7: Auto-upgrade tier (separate from payout creation)
        if (agentTier === 'base') {
          const { rows: wonCount } = await pool.query(
            `SELECT COUNT(*)::int AS cnt FROM leads WHERE assigned_agent_id = $1 AND status = 'won'`,
            [updated.assigned_agent_id]
          );
          if (wonCount[0]?.cnt >= 5) {
            await pool.query(
              `UPDATE agents SET tier = 'silver', updated_at = now() WHERE id = $1 AND tier = 'base'`,
              [updated.assigned_agent_id]
            );
            await pool.query(
              `INSERT INTO audit_logs (action, details) VALUES ('agent.tier_upgraded', $1)`,
              [`Agent ${updated.assigned_agent_id} (${agentName}): base → silver (auto, ${wonCount[0].cnt} won leads)`]
            );
          }
        }
      }
    }

    // Обновляем счётчики агента при смене статуса
    if (oldStatus !== newStatus && updated.assigned_agent_id) {
      await pool.query(
        `UPDATE agents SET
           active_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1 AND status NOT IN ('won','lost')),
           total_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1)
         WHERE id = $1`,
        [updated.assigned_agent_id]
      );
    }

    // Пересчитываем и для старого агента если был переназначен
    if (lead.assigned_agent_id && lead.assigned_agent_id !== updated.assigned_agent_id) {
      await pool.query(
        `UPDATE agents SET
           active_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1 AND status NOT IN ('won','lost')),
           total_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1)
         WHERE id = $1`,
        [lead.assigned_agent_id]
      );
    }

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('lead.updated', $1, $2)`,
      [user.email, `Лид ${id}: ${JSON.stringify(body)}`]
    );

    return Response.json(toCamelCase(updated));
  } catch (err) {
    console.error('PATCH /api/leads/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;

    if (user.role !== 'manager' && user.role !== 'admin') {
      return Response.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Verify this lead belongs to this manager
    if (user.role === 'manager') {
      const { rows } = await pool.query(
        `SELECT id FROM leads WHERE id = $1 AND assigned_manager_id = $2`,
        [id, user.id]
      );
      if (rows.length === 0) {
        return Response.json({ error: 'Обращение не найдено' }, { status: 404 });
      }
    }

    // Delete related records first
    await pool.query(`DELETE FROM lead_events WHERE lead_id = $1`, [id]);
    await pool.query(`DELETE FROM leads WHERE id = $1`, [id]);

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/leads/[id] error:', err);
    return Response.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
