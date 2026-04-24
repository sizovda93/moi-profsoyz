import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { sendMessage as sendTgMessage, getProfileIdByAgentId } from '@/lib/telegram';
import { touchAgentActivityByProfile } from '@/lib/activity';
import { classifyMessage } from '@/lib/ai/classify-message';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const conversation = await pool.query(
      `SELECT c.*,
         pa.full_name as agent_name,
         pm.full_name as manager_name
       FROM conversations c
       LEFT JOIN agents ag ON ag.id = c.agent_id
       LEFT JOIN profiles pa ON pa.id = ag.user_id
       LEFT JOIN profiles pm ON pm.id = c.manager_id
       WHERE c.id = $1`,
      [id]
    );
    if (conversation.rows.length === 0) return Response.json({ error: 'Не найдено' }, { status: 404 });

    // Агент видит только свои диалоги
    if (user.role === 'agent' && conversation.rows[0].agent_id !== user.agentId) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Менеджер видит только закреплённые за ним диалоги
    if (user.role === 'manager' && conversation.rows[0].manager_id !== user.id) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const messages = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    // Add isOwn flag based on sender_type and current user role
    const msgsWithOwn = messages.rows.map((m: Record<string, unknown>) => ({
      ...m,
      is_own: m.sender_type === user.role,
    }));

    const result = { ...conversation.rows[0], messages: msgsWithOwn };
    return Response.json(toCamelCase(result));
  } catch (err) {
    console.error('GET /api/conversations/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    const convResult = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [id]);
    if (convResult.rows.length === 0) {
      return Response.json({ error: 'Диалог не найден' }, { status: 404 });
    }
    const conv = convResult.rows[0];

    if (user.role === 'agent' && conv.agent_id !== user.agentId) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Менеджер может писать только в свои закреплённые диалоги
    if (user.role === 'manager' && conv.manager_id !== user.id) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return Response.json({ error: 'Текст сообщения обязателен' }, { status: 400 });
    }

    const senderType = user.role === 'agent' ? 'agent' : 'manager';

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_name, text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, senderType, user.fullName, text.trim()]
    );

    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [text.trim().substring(0, 255), id]
    );

    // Track agent activity
    if (senderType === 'agent') {
      touchAgentActivityByProfile(user.id).catch(() => {});
    }

    // AI classify (fire-and-forget, agent messages only)
    if (senderType === 'agent') {
      classifyMessage(rows[0].id, text.trim(), id, 'web', conv.agent_id).catch(() => {});
    }

    // T1: Outbound to Telegram — if manager sends and agent has Telegram linked
    if (senderType === 'manager' && conv.agent_id) {
      try {
        const profileId = await getProfileIdByAgentId(conv.agent_id);
        if (profileId) {
          const { rows: bindRows } = await pool.query(
            `SELECT telegram_chat_id FROM telegram_bindings
             WHERE profile_id = $1 AND is_active = true LIMIT 1`,
            [profileId]
          );
          if (bindRows.length > 0) {
            const tgText = text.trim();
            const tgResult = await sendTgMessage(bindRows[0].telegram_chat_id, tgText);

            if (tgResult.ok) {
              // Store external_id and mark conversation channel
              const tgMsgId = (tgResult.result as { message_id?: number })?.message_id;
              if (tgMsgId) {
                await pool.query(
                  `UPDATE messages SET external_id = $1 WHERE id = $2`,
                  [String(tgMsgId), rows[0].id]
                );
              }
              // Update last_conversation_id on binding
              await pool.query(
                `UPDATE telegram_bindings SET last_conversation_id = $1
                 WHERE profile_id = $2 AND is_active = true`,
                [id, profileId]
              );
            }
          }
        }
      } catch (tgErr) {
        // Don't block web response on Telegram errors
        console.error('Telegram outbound error:', tgErr);
      }
    }

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/conversations/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
