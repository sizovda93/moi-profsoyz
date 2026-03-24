import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { computeLifecycle } from '@/lib/lifecycle';
import type { UserStatus, OnboardingStatus } from '@/types';

// GET — operational work queues for manager/admin
export async function GET() {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;

    const [conflicts, agents, telegramBindings, feedback, unassignedLeads] = await Promise.all([
      // Open conflicts
      pool.query(
        `SELECT l.id AS lead_id, l.full_name AS lead_name, l.created_at,
                pa.full_name AS agent_name, a.id AS agent_id
         FROM leads l
         LEFT JOIN agents a ON a.id = l.assigned_agent_id
         LEFT JOIN profiles pa ON pa.id = a.user_id
         WHERE l.conflict_status = 'open'
         ORDER BY l.created_at ASC`
      ),
      // All agents with profile data
      pool.query(
        `SELECT a.id, a.user_id, a.onboarding_status, a.total_leads, a.last_activity_at,
                a.manager_contacted_at, a.created_at AS registered_at, a.tier,
                p.status AS user_status, p.full_name, p.email
         FROM agents a
         JOIN profiles p ON p.id = a.user_id
         WHERE p.status = 'active'
         ORDER BY a.last_activity_at ASC NULLS FIRST`
      ),
      // Telegram connected agents
      pool.query(
        `SELECT DISTINCT profile_id FROM telegram_bindings WHERE is_active = true`
      ),
      // Recent unhandled feedback
      pool.query(
        `SELECT f.id, f.type, f.message, f.created_at, p.full_name AS agent_name
         FROM feedback f
         JOIN profiles p ON p.id = f.profile_id
         WHERE f.handled_at IS NULL
         ORDER BY f.created_at DESC
         LIMIT 20`
      ),
      // Leads without manager
      pool.query(
        `SELECT l.id AS lead_id, l.full_name AS lead_name, l.phone, l.created_at,
                pa.full_name AS agent_name
         FROM leads l
         LEFT JOIN agents a ON a.id = l.assigned_agent_id
         LEFT JOIN profiles pa ON pa.id = a.user_id
         WHERE l.assigned_manager_id IS NULL AND l.status NOT IN ('won', 'lost')
         ORDER BY l.created_at ASC`
      ),
    ]);

    const tgConnected = new Set(telegramBindings.rows.map((r) => r.profile_id));
    const now = Date.now();
    const DAY = 86400000;

    interface QueueItem {
      agentId: string;
      fullName: string;
      email: string;
      lifecycle: string;
      registeredAt: string;
      lastActivityAt: string | null;
      daysSinceActivity: number;
      reason: string;
    }

    // Classify agents into queues
    const newInactive: QueueItem[] = [];
    const stuckLearning: QueueItem[] = [];
    const noFirstLead: QueueItem[] = [];
    const sleeping: QueueItem[] = [];
    const noTelegram: QueueItem[] = [];

    for (const a of agents.rows) {
      const lc = computeLifecycle(
        a.user_status as UserStatus,
        a.onboarding_status as OnboardingStatus,
        a.total_leads
      );

      const lastActivity = a.last_activity_at ? new Date(a.last_activity_at).getTime() : new Date(a.registered_at).getTime();
      const daysSince = Math.floor((now - lastActivity) / DAY);

      const item: QueueItem = {
        agentId: a.id,
        fullName: a.full_name,
        email: a.email,
        lifecycle: lc,
        registeredAt: a.registered_at,
        lastActivityAt: a.last_activity_at,
        daysSinceActivity: daysSince,
        reason: '',
      };

      // Queue: Пропавшие новички — registered, > 3 дней
      if (lc === 'registered' && daysSince >= 3) {
        newInactive.push({ ...item, reason: `Зарегистрирован ${daysSince} дней назад, не начал обучение` });
      }

      // Queue: Застряли на обучении — learning, > 7 дней
      if (lc === 'learning_in_progress' && daysSince >= 7) {
        stuckLearning.push({ ...item, reason: `Обучается ${daysSince} дней, не завершил обязательные модули` });
      }

      // Queue: Активированы без лида — activated, > 7 дней
      if (lc === 'activated' && daysSince >= 7) {
        noFirstLead.push({ ...item, reason: `Обучение завершено, нет лидов уже ${daysSince} дней` });
      }

      // Queue: Спящие — active, > 30 дней без активности
      if (lc === 'active' && daysSince >= 30) {
        sleeping.push({ ...item, reason: `Нет активности ${daysSince} дней` });
      }

      // Queue: Без Telegram — active/activated, TG не подключён
      if ((lc === 'active' || lc === 'activated') && !tgConnected.has(a.user_id)) {
        noTelegram.push({ ...item, reason: `Telegram не подключён` });
      }
    }

    const result = {
      conflicts: conflicts.rows.map((r) => ({
        leadId: r.lead_id,
        leadName: r.lead_name,
        agentName: r.agent_name,
        agentId: r.agent_id,
        createdAt: r.created_at,
      })),
      newInactive,
      stuckLearning,
      noFirstLead,
      sleeping,
      noTelegram,
      recentFeedback: feedback.rows.map((r) => ({
        id: r.id,
        agentName: r.agent_name,
        type: r.type,
        message: r.message,
        createdAt: r.created_at,
      })),
      unassignedLeads: unassignedLeads.rows.map((r) => ({
        leadId: r.lead_id,
        leadName: r.lead_name,
        phone: r.phone,
        agentName: r.agent_name,
        createdAt: r.created_at,
      })),
    };

    return Response.json(result);
  } catch (err) {
    console.error('GET /api/operations/queues error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
