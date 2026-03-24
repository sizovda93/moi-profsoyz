import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { notifyAgent, getProfileIdByAgentId } from '@/lib/telegram';
import { computeLifecycle } from '@/lib/lifecycle';
import type { UserStatus, OnboardingStatus } from '@/types';

type AudienceType = 'all' | 'active' | 'activated' | 'learning' | 'sleeping' | 'no_telegram' | 'manual';
type Channel = 'web' | 'telegram' | 'both';

/** Build audience query — always scoped to sender's agents */
function buildAudienceQuery(audienceType: AudienceType, senderId: string, manualIds?: string[]) {
  // Base: always only sender's agents
  let query = `
    SELECT a.id as agent_id, a.user_id as profile_id, p.full_name as agent_name,
           p.status as user_status, a.onboarding_status, a.total_leads, a.last_activity_at
    FROM agents a
    JOIN profiles p ON p.id = a.user_id
    LEFT JOIN telegram_bindings tb ON tb.profile_id = p.id AND tb.is_active = true
    WHERE a.manager_id = $1
  `;
  const params: unknown[] = [senderId];

  switch (audienceType) {
    case 'manual':
      if (manualIds && manualIds.length > 0) {
        params.push(manualIds);
        query += ` AND a.id = ANY($${params.length})`;
      }
      break;
    case 'no_telegram':
      query += ` AND tb.id IS NULL`;
      break;
    case 'sleeping':
      query += ` AND (a.last_activity_at < NOW() - INTERVAL '30 days' OR a.last_activity_at IS NULL)`;
      break;
    // active, activated, learning — filter post-query via lifecycle
    default:
      break;
  }

  query += ` GROUP BY a.id, a.user_id, p.full_name, p.status, a.onboarding_status, a.total_leads, a.last_activity_at`;

  return { query, params };
}

// POST — create and send broadcast
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('manager');
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const { title, text, channel, audienceType, agentIds } = body as {
      title?: string;
      text?: string;
      channel?: Channel;
      audienceType?: AudienceType;
      agentIds?: string[];
    };

    // Validate required fields
    if (!text || !text.trim()) {
      return Response.json({ error: 'Текст сообщения обязателен' }, { status: 400 });
    }

    const finalChannel: Channel = ['web', 'telegram', 'both'].includes(channel || '') ? channel! : 'both';
    const finalAudience: AudienceType = [
      'all', 'active', 'activated', 'learning', 'sleeping', 'no_telegram', 'manual'
    ].includes(audienceType || '') ? audienceType! : 'all';

    if (finalAudience === 'manual' && (!agentIds || agentIds.length === 0)) {
      return Response.json({ error: 'Выберите хотя бы одного агента' }, { status: 400 });
    }

    // Fetch audience (always scoped to sender's agents)
    const { query, params } = buildAudienceQuery(finalAudience, user.id, agentIds);
    const { rows: audienceRows } = await pool.query(query, params);

    // Post-filter by lifecycle for active/activated/learning
    let recipients = audienceRows;
    if (['active', 'activated', 'learning'].includes(finalAudience)) {
      recipients = audienceRows.filter((r) => {
        const lc = computeLifecycle(
          r.user_status as UserStatus,
          r.onboarding_status as OnboardingStatus,
          r.total_leads
        );
        switch (finalAudience) {
          case 'active': return lc === 'active';
          case 'activated': return lc === 'activated';
          case 'learning': return lc === 'registered' || lc === 'learning_in_progress';
          default: return true;
        }
      });
    }

    // Clarification #4: empty audience → error, don't create broadcast
    if (recipients.length === 0) {
      return Response.json(
        { error: 'Нет получателей. Проверьте выбранный сегмент — возможно, у вас нет агентов, подходящих под этот фильтр.' },
        { status: 400 }
      );
    }

    // Create broadcast record
    const { rows: [broadcast] } = await pool.query(
      `INSERT INTO broadcasts (sender_id, title, text, channel, audience_type, total_recipients)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.id, title?.trim() || null, text.trim(), finalChannel, finalAudience, recipients.length]
    );

    // Insert recipients
    const recipientValues: string[] = [];
    const recipientParams: unknown[] = [broadcast.id];
    let paramIdx = 2;
    for (const r of recipients) {
      recipientValues.push(`($1, $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
      recipientParams.push(r.agent_id, r.profile_id, r.agent_name);
      paramIdx += 3;
    }
    await pool.query(
      `INSERT INTO broadcast_recipients (broadcast_id, agent_id, profile_id, agent_name)
       VALUES ${recipientValues.join(', ')}`,
      recipientParams
    );

    // Send to each recipient
    let deliveredCount = 0;
    let failedCount = 0;
    const msgText = text.trim();
    // Clarification #5: Telegram text with explicit manager attribution
    const tgText = `📢 Сообщение от менеджера ${user.fullName}:\n\n${title ? `${title.trim()}\n\n` : ''}${msgText}`;
    // Clarification #2: web notification clearly marked as broadcast
    const webTitle = title?.trim() || 'Рассылка от менеджера';

    for (const r of recipients) {
      let webStatus: 'sent' | 'skipped' = 'skipped';
      let tgStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
      let errorDetails: string | null = null;

      // WEB channel
      if (finalChannel === 'web' || finalChannel === 'both') {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, $2, $3, 'broadcast')`,
            [r.profile_id, `📢 ${webTitle}`, msgText]
          );
          webStatus = 'sent';
        } catch (err) {
          webStatus = 'skipped';
          errorDetails = `web: ${String(err)}`;
        }
      }

      // TELEGRAM channel
      if (finalChannel === 'telegram' || finalChannel === 'both') {
        try {
          const sent = await notifyAgent(r.profile_id, tgText);
          tgStatus = sent ? 'sent' : 'skipped'; // skipped = no binding
        } catch (err) {
          tgStatus = 'failed';
          errorDetails = (errorDetails ? errorDetails + '; ' : '') + `tg: ${String(err)}`;
        }
      }

      // Determine delivery outcome
      const anyDelivered =
        (webStatus === 'sent') || (tgStatus === 'sent');
      const anyFailed = tgStatus === 'failed';

      if (anyDelivered) deliveredCount++;
      if (anyFailed && !anyDelivered) failedCount++;

      // Update recipient status
      await pool.query(
        `UPDATE broadcast_recipients
         SET channel_web = $1, channel_tg = $2, error_details = $3
         WHERE broadcast_id = $4 AND agent_id = $5`,
        [webStatus, tgStatus, errorDetails, broadcast.id, r.agent_id]
      );
    }

    // Update broadcast counters
    await pool.query(
      `UPDATE broadcasts SET delivered_count = $1, failed_count = $2 WHERE id = $3`,
      [deliveredCount, failedCount, broadcast.id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('broadcast.sent', $1, $2)`,
      [
        user.email,
        `Broadcast ${broadcast.id}: ${recipients.length} recipients, ${deliveredCount} delivered, ${failedCount} failed, channel=${finalChannel}, audience=${finalAudience}`,
      ]
    );

    // Return broadcast with final counts
    const { rows: [result] } = await pool.query(
      `SELECT * FROM broadcasts WHERE id = $1`,
      [broadcast.id]
    );

    return Response.json(toCamelCase(result), { status: 201 });
  } catch (err) {
    console.error('POST /api/broadcasts error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// GET — list broadcasts (manager: own, admin: all)
export async function GET() {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    let query = `
      SELECT b.*, p.full_name as sender_name
      FROM broadcasts b
      JOIN profiles p ON p.id = b.sender_id
    `;
    const params: string[] = [];

    if (user.role === 'manager') {
      query += ` WHERE b.sender_id = $1`;
      params.push(user.id);
    }

    query += ` ORDER BY b.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/broadcasts error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
