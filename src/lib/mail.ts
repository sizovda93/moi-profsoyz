import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP не настроен (SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER!;

  return transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

export function renderTempPasswordEmail(fullName: string | null, tempPassword: string) {
  const name = fullName?.trim() || "участник профсоюза";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Восстановление пароля</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td style="padding:32px 40px 16px;">
          <div style="font-size:18px;font-weight:600;color:#18181b;">Мой Профсоюз</div>
        </td></tr>
        <tr><td style="padding:8px 40px 16px;">
          <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Восстановление пароля</h1>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">Здравствуйте, ${escapeHtml(name)}!</p>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">Вы запросили восстановление пароля. Ниже — ваш временный пароль для входа:</p>
          <div style="margin:24px 0;padding:20px;background:#f4f4f5;border-radius:8px;text-align:center;">
            <code style="font-size:22px;font-weight:700;font-family:'Courier New',monospace;color:#18181b;letter-spacing:1px;">${escapeHtml(tempPassword)}</code>
          </div>
          <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">Используйте его для входа, а затем смените пароль в профиле.</p>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
          Мой Профсоюз · <a href="https://profsouz.info" style="color:#2563eb;text-decoration:none;">profsouz.info</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Здравствуйте, ${name}!

Вы запросили восстановление пароля. Ваш временный пароль:

${tempPassword}

Используйте его для входа, а затем смените пароль в профиле.

Если вы не запрашивали восстановление, проигнорируйте это письмо.

Мой Профсоюз — https://profsouz.info`;

  return { html, text };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
