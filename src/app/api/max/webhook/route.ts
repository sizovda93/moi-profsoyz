import { NextRequest } from 'next/server';
import pool from '@/lib/db';

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const MAX_API_URL = 'https://platform-api.max.ru';

async function sendMaxMessage(chatId: number, text: string) {
  const res = await fetch(`${MAX_API_URL}/messages?chat_id=${chatId}`, {
    method: 'POST',
    headers: {
      'Authorization': MAX_BOT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  return res.ok;
}

export async function POST(request: NextRequest) {
  try {
    // Webhook secret — передаётся в query при регистрации у MAX (?secret=xxx)
    const expectedSecret = process.env.MAX_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = request.nextUrl.searchParams.get('secret');
      if (providedSecret !== expectedSecret) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('MAX webhook: MAX_WEBHOOK_SECRET not set in production');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = await request.json();
    const updateType = body.update_type;

    // bot_started — user clicked deep link
    if (updateType === 'bot_started') {
      const payload = body.payload; // link token
      const user = body.user;
      const chatId = body.chat_id;

      if (!payload || !user) {
        return Response.json({ ok: true });
      }

      // Find token
      const { rows: tokenRows } = await pool.query(
        `SELECT profile_id FROM max_link_tokens
         WHERE token = $1 AND used = false AND expires_at > NOW()
         LIMIT 1`,
        [payload]
      );

      if (tokenRows.length === 0) {
        await sendMaxMessage(chatId, 'Ссылка недействительна или истекла. Запросите новую в профиле на платформе.');
        return Response.json({ ok: true });
      }

      const profileId = tokenRows[0].profile_id;

      // Mark token as used
      await pool.query(
        `UPDATE max_link_tokens SET used = true WHERE token = $1`,
        [payload]
      );

      // Deactivate old bindings
      await pool.query(
        `UPDATE max_bindings SET is_active = false WHERE profile_id = $1`,
        [profileId]
      );

      // Create binding
      await pool.query(
        `INSERT INTO max_bindings (profile_id, max_user_id, max_chat_id, max_username, max_first_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [profileId, user.user_id, chatId, user.username || null, user.name || null]
      );

      await sendMaxMessage(chatId, '✅ MAX успешно подключён к платформе «Мой Профсоюз»! Вы будете получать уведомления здесь.');
      return Response.json({ ok: true });
    }

    // message_created — incoming message from user
    if (updateType === 'message_created') {
      const message = body.message;
      if (!message?.sender?.user_id || !message?.body?.text) {
        return Response.json({ ok: true });
      }

      const maxUserId = message.sender.user_id;
      const text = message.body.text;

      // Find binding
      const { rows: bindRows } = await pool.query(
        `SELECT mb.profile_id, mb.max_chat_id, mb.last_conversation_id
         FROM max_bindings mb
         WHERE mb.max_user_id = $1 AND mb.is_active = true
         LIMIT 1`,
        [maxUserId]
      );

      if (bindRows.length === 0) {
        const chatId = message.recipient?.chat_id || message.sender?.user_id;
        if (chatId) {
          await sendMaxMessage(chatId, 'Вы не привязаны к платформе. Подключите MAX в разделе Профиль на платформе.');
        }
        return Response.json({ ok: true });
      }

      const binding = bindRows[0];

      // Find or get conversation
      let convId = binding.last_conversation_id;
      if (!convId) {
        const { rows: convRows } = await pool.query(
          `SELECT c.id FROM conversations c
           JOIN agents a ON a.id = c.agent_id
           WHERE a.user_id = $1
           ORDER BY c.last_message_at DESC NULLS LAST LIMIT 1`,
          [binding.profile_id]
        );
        if (convRows.length > 0) convId = convRows[0].id;
      }

      if (convId) {
        // Save message
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_type, text, channel)
           VALUES ($1, 'agent', $2, 'max')`,
          [convId, text]
        );
        await pool.query(
          `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
          [text.substring(0, 255), convId]
        );
      }

      return Response.json({ ok: true });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('MAX webhook error:', err);
    return Response.json({ ok: true });
  }
}

// Export sendMaxMessage for use in notifications
export { sendMaxMessage };
