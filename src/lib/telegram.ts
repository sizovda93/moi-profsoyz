import pool from './db';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function getWebhookSecret(): string {
  return process.env.TELEGRAM_WEBHOOK_SECRET || '';
}

const TG_API = 'https://api.telegram.org/bot';

interface TgResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
}

async function callApi(method: string, body: Record<string, unknown>): Promise<TgResponse> {
  const token = getBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

  const res = await fetch(`${TG_API}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<TgResponse>;
}

// ==================== Public API ====================

export async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode: 'HTML' | 'Markdown' | undefined = undefined
): Promise<TgResponse> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;
  return callApi('sendMessage', body);
}

export async function setWebhook(url: string): Promise<TgResponse> {
  const secret = getWebhookSecret();
  const body: Record<string, unknown> = {
    url,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  };
  if (secret) body.secret_token = secret;
  return callApi('setWebhook', body);
}

export async function deleteWebhook(): Promise<TgResponse> {
  return callApi('deleteWebhook', { drop_pending_updates: true });
}

export async function getWebhookInfo(): Promise<TgResponse> {
  const token = getBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');
  const res = await fetch(`${TG_API}${token}/getWebhookInfo`);
  return res.json() as Promise<TgResponse>;
}

export async function getMe(): Promise<TgResponse> {
  const token = getBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');
  const res = await fetch(`${TG_API}${token}/getMe`);
  return res.json() as Promise<TgResponse>;
}

export function validateWebhookSecret(headerValue: string | null): boolean {
  const secret = getWebhookSecret();
  if (!secret) return true; // if not configured, skip validation
  return headerValue === secret;
}

// ==================== Notification helpers ====================

export async function notifyAgent(profileId: string, text: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `SELECT telegram_chat_id FROM telegram_bindings
       WHERE profile_id = $1 AND is_active = true LIMIT 1`,
      [profileId]
    );
    if (rows.length === 0) return false;

    const result = await sendMessage(rows[0].telegram_chat_id, text);

    if (!result.ok && (result.error_code === 403 || result.error_code === 400)) {
      // Bot blocked or chat not found — deactivate binding
      await pool.query(
        `UPDATE telegram_bindings SET is_active = false WHERE profile_id = $1`,
        [profileId]
      );
      await pool.query(
        `INSERT INTO audit_logs (action, user_email, details, level)
         VALUES ('telegram.bot_blocked', NULL, $1, 'warning')`,
        [`Profile ${profileId}: ${result.description}`]
      );
      return false;
    }

    return result.ok;
  } catch (err) {
    console.error('notifyAgent error:', err);
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details, level)
       VALUES ('telegram.send_error', NULL, $1, 'error')`,
      [`Profile ${profileId}: ${String(err)}`]
    );
    return false;
  }
}

// Find agent's profile_id from agent.id
export async function getProfileIdByAgentId(agentId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT user_id FROM agents WHERE id = $1`,
    [agentId]
  );
  return rows.length > 0 ? rows[0].user_id : null;
}
