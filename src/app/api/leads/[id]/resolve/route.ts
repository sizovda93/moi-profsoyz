import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ id: string }> };

const VALID_RESOLUTIONS = ['confirmed_duplicate', 'kept_existing', 'overridden', 'kept_separate'] as const;
type Resolution = typeof VALID_RESOLUTIONS[number];

// PATCH — resolve a conflict on a lead
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const body = await request.json();
    const resolution: string = body.resolution;

    if (!resolution || !VALID_RESOLUTIONS.includes(resolution as Resolution)) {
      return Response.json(
        { error: `Допустимые решения: ${VALID_RESOLUTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Only admin can override ownership
    if (resolution === 'overridden' && user.role !== 'admin') {
      return Response.json(
        { error: 'Только администратор может передать ownership' },
        { status: 403 }
      );
    }

    // Load the lead
    const { rows: leadRows } = await pool.query(
      `SELECT l.*, pa.full_name as agent_name
       FROM leads l
       LEFT JOIN agents ag ON ag.id = l.assigned_agent_id
       LEFT JOIN profiles pa ON pa.id = ag.user_id
       WHERE l.id = $1`,
      [id]
    );
    if (leadRows.length === 0) {
      return Response.json({ error: 'Лид не найден' }, { status: 404 });
    }
    const lead = leadRows[0];

    if (lead.conflict_status !== 'open') {
      return Response.json({ error: 'Нет открытого конфликта на этом лиде' }, { status: 400 });
    }

    const conflictWithId = lead.conflict_with_lead_id;
    if (!conflictWithId) {
      return Response.json({ error: 'Нет связанного конфликтного лида' }, { status: 400 });
    }

    // Load the conflicting lead
    const { rows: existingRows } = await pool.query(
      `SELECT l.*, pa.full_name as agent_name
       FROM leads l
       LEFT JOIN agents ag ON ag.id = l.assigned_agent_id
       LEFT JOIN profiles pa ON pa.id = ag.user_id
       WHERE l.id = $1`,
      [conflictWithId]
    );
    const existingLead = existingRows[0];

    // ─── Apply resolution ────────────────────────────

    if (resolution === 'confirmed_duplicate') {
      // New lead → lost, conflict resolved
      await pool.query(
        `UPDATE leads SET status = 'lost', conflict_status = 'resolved',
         conflict_resolution = 'confirmed_duplicate',
         conflict_resolved_by = $1, conflict_resolved_at = now(), updated_at = now()
         WHERE id = $2`,
        [user.id, id]
      );
      // Events
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'conflict_resolved', $2, $3)`,
        [id, user.email, `Решение: подтверждён дубль. Лид закрыт (lost).`]
      );
      if (existingLead) {
        await pool.query(
          `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'ownership_confirmed', $2, $3)`,
          [conflictWithId, user.email, `Ownership подтверждён по конфликту с лидом ${id}`]
        );
      }
      // Recalc agent counters for new lead's agent
      if (lead.assigned_agent_id) {
        await recalcAgentCounters(lead.assigned_agent_id);
      }
    }

    if (resolution === 'kept_existing') {
      // New lead stays but conflict resolved, existing lead untouched
      await pool.query(
        `UPDATE leads SET conflict_status = 'resolved',
         conflict_resolution = 'kept_existing',
         conflict_resolved_by = $1, conflict_resolved_at = now(), updated_at = now()
         WHERE id = $2`,
        [user.id, id]
      );
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'conflict_resolved', $2, $3)`,
        [id, user.email, `Решение: оставлен текущий owner лида ${conflictWithId}.`]
      );
      if (existingLead) {
        await pool.query(
          `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'ownership_confirmed', $2, $3)`,
          [conflictWithId, user.email, `Ownership подтверждён. Конфликт с лидом ${id} решён.`]
        );
      }
    }

    if (resolution === 'kept_separate') {
      // Both leads stay as independent
      await pool.query(
        `UPDATE leads SET conflict_status = 'resolved',
         conflict_resolution = 'kept_separate',
         conflict_resolved_by = $1, conflict_resolved_at = now(), updated_at = now()
         WHERE id = $2`,
        [user.id, id]
      );
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'conflict_resolved', $2, $3)`,
        [id, user.email, `Решение: лиды ${id} и ${conflictWithId} — разные клиенты.`]
      );
      if (existingLead) {
        await pool.query(
          `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'conflict_resolved', $2, $3)`,
          [conflictWithId, user.email, `Конфликт с лидом ${id} решён: разные клиенты.`]
        );
      }
    }

    if (resolution === 'overridden') {
      // Transfer ownership of existing lead to new lead's agent
      if (!existingLead) {
        return Response.json({ error: 'Конфликтный лид не найден' }, { status: 404 });
      }
      const newAgentId = lead.assigned_agent_id;
      const oldAgentId = existingLead.assigned_agent_id;

      // Update existing lead's agent
      if (newAgentId) {
        await pool.query(
          `UPDATE leads SET assigned_agent_id = $1, updated_at = now() WHERE id = $2`,
          [newAgentId, conflictWithId]
        );
      }
      // Resolve conflict on new lead
      await pool.query(
        `UPDATE leads SET conflict_status = 'resolved',
         conflict_resolution = 'overridden',
         conflict_resolved_by = $1, conflict_resolved_at = now(), updated_at = now()
         WHERE id = $2`,
        [user.id, id]
      );
      // Events
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'conflict_resolved', $2, $3)`,
        [id, user.email, `Решение: ownership передан. Лид ${conflictWithId} переназначен.`]
      );
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'ownership_overridden', $2, $3)`,
        [conflictWithId, user.email,
          `Ownership передан от агента ${oldAgentId || 'N/A'} к ${newAgentId || 'N/A'}. Основание: конфликт с лидом ${id}.`]
      );
      // Recalc counters for both agents
      if (oldAgentId) await recalcAgentCounters(oldAgentId);
      if (newAgentId) await recalcAgentCounters(newAgentId);
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('lead.conflict_resolved', $1, $2)`,
      [user.email, `Лид ${id}: ${resolution}. Конфликт с ${conflictWithId}.`]
    );

    // Return updated lead
    const { rows: updated } = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return Response.json(toCamelCase(updated[0]));
  } catch (err) {
    console.error('PATCH /api/leads/[id]/resolve error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

async function recalcAgentCounters(agentId: string) {
  await pool.query(
    `UPDATE agents SET
       active_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1 AND status NOT IN ('won','lost')),
       total_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1)
     WHERE id = $1`,
    [agentId]
  );
}
