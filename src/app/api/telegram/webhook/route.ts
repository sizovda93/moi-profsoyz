import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { sendMessage, validateWebhookSecret } from '@/lib/telegram';
import { touchAgentActivityByProfile } from '@/lib/activity';
import { classifyMessage } from '@/lib/ai/classify-message';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  try {
    // Validate secret
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    if (!validateWebhookSecret(secretHeader)) {
      return new Response('Forbidden', { status: 403 });
    }

    const update = await request.json();
    const message = update.message;
    if (!message || !message.from) {
      return new Response('OK', { status: 200 });
    }

    const telegramUserId: number = message.from.id;
    const chatId: number = message.chat.id;
    const text: string = message.text || '';
    const updateId: string = String(update.update_id);

    // ==================== /start command — linking ====================
    if (text.startsWith('/start ')) {
      const token = text.slice(7).trim();
      if (token) {
        await handleStartCommand(chatId, telegramUserId, message.from, token);
        return new Response('OK', { status: 200 });
      }
    }

    // /start without token
    if (text === '/start') {
      await sendMessage(chatId,
        'Добро пожаловать! Чтобы привязать аккаунт, используйте ссылку из вашего кабинета на платформе.'
      );
      return new Response('OK', { status: 200 });
    }

    // /unlink command
    if (text === '/unlink') {
      await handleUnlink(chatId, telegramUserId);
      return new Response('OK', { status: 200 });
    }

    // ==================== Regular message — inbound ====================
    if (text.trim()) {
      await handleInboundMessage(chatId, telegramUserId, text.trim(), updateId, message.from);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    await pool.query(
      `INSERT INTO audit_logs (action, details, level) VALUES ('telegram.webhook_error', $1, 'error')`,
      [String(err)]
    ).catch(() => {});
    // Always return 200 to Telegram to avoid retries
    return new Response('OK', { status: 200 });
  }
}

// ==================== Handlers ====================

async function handleStartCommand(
  chatId: number,
  telegramUserId: number,
  from: any,
  token: string
) {
  // Find valid token
  const { rows: tokenRows } = await pool.query(
    `SELECT * FROM telegram_link_tokens
     WHERE token = $1 AND used = false AND expires_at > NOW()
     LIMIT 1`,
    [token]
  );

  if (tokenRows.length === 0) {
    await sendMessage(chatId,
      'Ссылка недействительна или истекла. Запросите новую ссылку в кабинете платформы.'
    );
    return;
  }

  const linkToken = tokenRows[0];

  // Check if this telegram_user_id is already linked to another profile
  const { rows: existingBind } = await pool.query(
    `SELECT profile_id FROM telegram_bindings
     WHERE telegram_user_id = $1 AND is_active = true LIMIT 1`,
    [telegramUserId]
  );

  if (existingBind.length > 0 && existingBind[0].profile_id !== linkToken.profile_id) {
    await sendMessage(chatId,
      'Этот Telegram-аккаунт уже привязан к другому пользователю. Сначала отвяжите его командой /unlink.'
    );
    return;
  }

  // Check if profile already has active binding
  const { rows: profileBind } = await pool.query(
    `SELECT id FROM telegram_bindings
     WHERE profile_id = $1 AND is_active = true LIMIT 1`,
    [linkToken.profile_id]
  );

  if (profileBind.length > 0) {
    // Deactivate old binding
    await pool.query(
      `UPDATE telegram_bindings SET is_active = false WHERE id = $1`,
      [profileBind[0].id]
    );
  }

  // Remove stale inactive bindings for this telegram_user_id
  // (the absolute UNIQUE constraint on telegram_user_id would block re-insert)
  await pool.query(
    `DELETE FROM telegram_bindings
     WHERE telegram_user_id = $1 AND is_active = false`,
    [telegramUserId]
  );

  // Create binding
  await pool.query(
    `INSERT INTO telegram_bindings (profile_id, telegram_user_id, telegram_chat_id, telegram_username, telegram_first_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      linkToken.profile_id,
      telegramUserId,
      chatId,
      from.username || null,
      from.first_name || null,
    ]
  );

  // Mark token as used
  await pool.query(
    `UPDATE telegram_link_tokens SET used = true WHERE id = $1`,
    [linkToken.id]
  );

  // Get user name for confirmation
  const { rows: profileRows } = await pool.query(
    `SELECT full_name FROM profiles WHERE id = $1`,
    [linkToken.profile_id]
  );
  const userName = profileRows[0]?.full_name || 'пользователь';

  await sendMessage(chatId,
    `Привязка выполнена! Аккаунт "${userName}" подключён.\n\nТеперь вы будете получать уведомления и сообщения от менеджера прямо в Telegram.\n\nОтключить: /unlink`
  );

  await pool.query(
    `INSERT INTO audit_logs (action, user_email, details)
     VALUES ('telegram.linked', $1, $2)`,
    [
      null,
      `Profile ${linkToken.profile_id} linked to telegram_user_id ${telegramUserId} (@${from.username || 'no_username'})`,
    ]
  );
}

async function handleUnlink(chatId: number, telegramUserId: number) {
  const { rows } = await pool.query(
    `UPDATE telegram_bindings SET is_active = false
     WHERE telegram_user_id = $1 AND is_active = true
     RETURNING profile_id`,
    [telegramUserId]
  );

  if (rows.length === 0) {
    await sendMessage(chatId, 'Ваш Telegram не привязан ни к какому аккаунту.');
    return;
  }

  await sendMessage(chatId, 'Привязка отключена. Вы больше не будете получать уведомления.');

  await pool.query(
    `INSERT INTO audit_logs (action, details)
     VALUES ('telegram.unlinked_via_bot', $1)`,
    [`Profile ${rows[0].profile_id}, telegram_user_id ${telegramUserId}`]
  );
}

async function handleInboundMessage(
  chatId: number,
  telegramUserId: number,
  text: string,
  updateId: string,
  from: any
) {
  // Find binding
  const { rows: bindRows } = await pool.query(
    `SELECT tb.profile_id, tb.last_conversation_id, p.full_name, a.id as agent_id
     FROM telegram_bindings tb
     JOIN profiles p ON p.id = tb.profile_id
     LEFT JOIN agents a ON a.user_id = tb.profile_id
     WHERE tb.telegram_user_id = $1 AND tb.is_active = true
     LIMIT 1`,
    [telegramUserId]
  );

  if (bindRows.length === 0) {
    await sendMessage(chatId,
      'Ваш Telegram не привязан к аккаунту. Привяжите через кабинет платформы.'
    );
    return;
  }

  const binding = bindRows[0];

  // Dedup by external_id
  const { rows: dupCheck } = await pool.query(
    `SELECT id FROM messages WHERE external_id = $1 LIMIT 1`,
    [updateId]
  );
  if (dupCheck.length > 0) return;

  // Find conversation
  let conversationId = binding.last_conversation_id;

  if (conversationId) {
    // Check it's still active
    const { rows: convCheck } = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND status IN ('active', 'waiting')`,
      [conversationId]
    );
    if (convCheck.length === 0) conversationId = null;
  }

  if (!conversationId && binding.agent_id) {
    // Find most recent active conversation for this agent
    const { rows: recentConv } = await pool.query(
      `SELECT id FROM conversations
       WHERE agent_id = $1 AND status IN ('active', 'waiting')
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT 1`,
      [binding.agent_id]
    );
    if (recentConv.length > 0) {
      conversationId = recentConv[0].id;
    }
  }

  if (!conversationId) {
    await sendMessage(chatId,
      'Нет активных диалогов. Дождитесь сообщения от менеджера или откройте платформу.'
    );
    return;
  }

  // Insert message
  const { rows: msgRows } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_type, sender_name, text, channel, external_id, status)
     VALUES ($1, 'agent', $2, $3, 'telegram', $4, 'delivered')
     RETURNING id`,
    [conversationId, binding.full_name, text, updateId]
  );

  // AI classify (fire-and-forget)
  if (msgRows[0]?.id) {
    classifyMessage(msgRows[0].id, text, conversationId, 'telegram', binding.agent_id).catch(() => {});
  }

  // Update conversation
  await pool.query(
    `UPDATE conversations
     SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, channel = 'telegram'
     WHERE id = $2`,
    [text.substring(0, 255), conversationId]
  );

  // Update last_conversation_id on binding
  await pool.query(
    `UPDATE telegram_bindings SET last_conversation_id = $1
     WHERE telegram_user_id = $2 AND is_active = true`,
    [conversationId, telegramUserId]
  );

  // Track agent activity
  touchAgentActivityByProfile(binding.profile_id).catch(() => {});
}
