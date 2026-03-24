import { requireRole } from '@/lib/auth-server';
import { setWebhook, deleteWebhook, getWebhookInfo, getMe } from '@/lib/telegram';
import pool from '@/lib/db';

// POST — register webhook (admin only)
export async function POST() {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return Response.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 });
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    const result = await setWebhook(webhookUrl);

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('telegram.webhook_set', $1, $2)`,
      [user.email, `URL: ${webhookUrl}, result: ${JSON.stringify(result)}`]
    );

    return Response.json({ success: result.ok, webhookUrl, result });
  } catch (err) {
    console.error('POST /api/telegram/setup error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// DELETE — remove webhook (admin only)
export async function DELETE() {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;

    const result = await deleteWebhook();
    return Response.json({ success: result.ok, result });
  } catch (err) {
    console.error('DELETE /api/telegram/setup error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// GET — webhook info + bot info + connected count (admin only)
export async function GET() {
  try {
    const auth = await requireRole('admin');
    if (auth.error) return auth.error;

    const [webhookInfo, botInfo, countResult, recentErrors] = await Promise.all([
      getWebhookInfo(),
      getMe(),
      pool.query(`SELECT count(*) FROM telegram_bindings WHERE is_active = true`),
      pool.query(
        `SELECT action, details, created_at FROM audit_logs
         WHERE action LIKE 'telegram.%' AND level IN ('error', 'warning')
         ORDER BY created_at DESC LIMIT 10`
      ),
    ]);

    return Response.json({
      webhook: webhookInfo.result,
      bot: botInfo.result,
      connectedUsers: parseInt(countResult.rows[0].count, 10),
      recentErrors: recentErrors.rows,
    });
  } catch (err) {
    console.error('GET /api/telegram/setup error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
