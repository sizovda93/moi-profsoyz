import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { computeLifecycle } from '@/lib/lifecycle';
import type { UserStatus, OnboardingStatus } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;

    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT a.*, p.full_name, p.email, p.phone, p.avatar_url, p.status as user_status
       FROM agents a
       JOIN profiles p ON p.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );
    if (rows.length === 0) return Response.json({ error: 'Не найдено' }, { status: 404 });

    const row = rows[0];
    const lifecycle = computeLifecycle(
      row.user_status as UserStatus,
      row.onboarding_status as OnboardingStatus,
      row.total_leads
    );

    return Response.json({ ...(toCamelCase(row) as Record<string, unknown>), lifecycle });
  } catch (err) {
    console.error('GET /api/agents/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// PATCH — change agent status (user_status and/or onboarding_status)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const body = await request.json();

    // Load current agent
    const { rows: agentRows } = await pool.query(
      `SELECT a.id, a.user_id, a.onboarding_status, a.total_leads, a.tier, a.manager_id,
              p.status as user_status, p.full_name, p.email
       FROM agents a
       JOIN profiles p ON p.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );
    if (agentRows.length === 0) {
      return Response.json({ error: 'Агент не найден' }, { status: 404 });
    }
    const agent = agentRows[0];

    const changes: string[] = [];

    // Handle user_status change
    if (body.status && body.status !== agent.user_status) {
      const newStatus: string = body.status;
      const validManagerStatuses = ['active', 'inactive'];
      const validAdminStatuses = ['active', 'inactive', 'blocked'];
      const allowed = user.role === 'admin' ? validAdminStatuses : validManagerStatuses;

      if (!allowed.includes(newStatus)) {
        return Response.json(
          { error: `Недопустимый статус: ${newStatus}. Доступные: ${allowed.join(', ')}` },
          { status: 403 }
        );
      }

      await pool.query(
        `UPDATE profiles SET status = $1, updated_at = now() WHERE id = $2`,
        [newStatus, agent.user_id]
      );
      changes.push(`status: ${agent.user_status} → ${newStatus}`);
    }

    // Handle onboarding_status change (admin only, only 'rejected')
    if (body.onboardingStatus && body.onboardingStatus !== agent.onboarding_status) {
      const newOnboarding: string = body.onboardingStatus;

      if (user.role !== 'admin') {
        return Response.json(
          { error: 'Только администратор может менять статус онбординга' },
          { status: 403 }
        );
      }

      if (newOnboarding !== 'rejected') {
        return Response.json(
          { error: 'Допустимое значение: rejected' },
          { status: 400 }
        );
      }

      await pool.query(
        `UPDATE agents SET onboarding_status = $1, updated_at = now() WHERE id = $2`,
        [newOnboarding, id]
      );
      changes.push(`onboarding: ${agent.onboarding_status} → ${newOnboarding}`);
    }

    // Handle tier change
    if (body.tier && body.tier !== agent.tier) {
      const newTier: string = body.tier;
      const validTiers = ['base', 'silver', 'gold'];

      if (!validTiers.includes(newTier)) {
        return Response.json(
          { error: `Недопустимый tier: ${newTier}. Доступные: ${validTiers.join(', ')}` },
          { status: 400 }
        );
      }

      // Manager: only base → silver
      if (user.role === 'manager') {
        if (!(agent.tier === 'base' && newTier === 'silver')) {
          return Response.json(
            { error: 'Менеджер может повысить только base → silver' },
            { status: 403 }
          );
        }
      }
      // Admin: any valid tier (already validated above)

      await pool.query(
        `UPDATE agents SET tier = $1, updated_at = now() WHERE id = $2`,
        [newTier, id]
      );
      changes.push(`tier: ${agent.tier} → ${newTier}`);
    }

    // Handle managerId assignment
    if (body.managerId !== undefined) {
      // "self" shorthand → replace with current user's id
      const rawManagerId = body.managerId === 'self' ? user.id : body.managerId;
      const newManagerId: string | null = rawManagerId || null;

      if (newManagerId) {
        // Validate manager exists and has role 'manager'
        const { rows: mgrCheck } = await pool.query(
          `SELECT id, role FROM profiles WHERE id = $1`,
          [newManagerId]
        );
        if (mgrCheck.length === 0 || mgrCheck[0].role !== 'manager') {
          return Response.json({ error: 'Менеджер не найден' }, { status: 400 });
        }

        // Manager: can only assign self, only if currently NULL
        if (user.role === 'manager') {
          if (newManagerId !== user.id) {
            return Response.json({ error: 'Менеджер может закрепить только себя' }, { status: 403 });
          }
          if (agent.manager_id !== null) {
            return Response.json({ error: 'У агента уже назначен менеджер' }, { status: 403 });
          }
        }
        // Admin: can assign any manager (no restrictions)
      }

      await pool.query(
        `UPDATE agents SET manager_id = $1, updated_at = now() WHERE id = $2`,
        [newManagerId, id]
      );
      changes.push(`manager: ${agent.manager_id || 'none'} → ${newManagerId || 'none'}`);

      // Auto-create conversation between agent and manager
      if (newManagerId) {
        const { rows: existingConv } = await pool.query(
          `SELECT id FROM conversations WHERE agent_id = $1 AND manager_id = $2 AND status != 'closed' LIMIT 1`,
          [id, newManagerId]
        );
        if (existingConv.length === 0) {
          await pool.query(
            `INSERT INTO conversations (agent_id, manager_id, client_name, mode, status)
             VALUES ($1, $2, $3, 'manual', 'active')`,
            [id, newManagerId, agent.full_name]
          );
        }
      }
    }

    // Handle managerContactedAt
    if (body.managerContactedAt === 'now') {
      await pool.query(
        `UPDATE agents SET manager_contacted_at = now() WHERE id = $1`,
        [id]
      );
      changes.push(`manager_contacted_at: now`);
    }

    if (changes.length === 0) {
      return Response.json({ error: 'Нет изменений' }, { status: 400 });
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('agent.status_changed', $1, $2)`,
      [user.email, `Agent ${id} (${agent.full_name}): ${changes.join('; ')}`]
    );

    // Return updated agent with lifecycle
    const { rows: updated } = await pool.query(
      `SELECT a.*, p.full_name, p.email, p.phone, p.avatar_url, p.status as user_status
       FROM agents a
       JOIN profiles p ON p.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );
    const row = updated[0];
    const lifecycle = computeLifecycle(
      row.user_status as UserStatus,
      row.onboarding_status as OnboardingStatus,
      row.total_leads
    );

    return Response.json({ ...(toCamelCase(row) as Record<string, unknown>), lifecycle });
  } catch (err) {
    console.error('PATCH /api/agents/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
