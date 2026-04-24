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

  // Максимально простой HTML без таблиц, фонов и сложной разметки —
  // чтобы Yandex не бракнул письмо как спам.
  const html =
    `<p>Здравствуйте, ${escapeHtml(name)}!</p>` +
    `<p>Вы запросили сброс пароля на платформе «Мой Профсоюз».</p>` +
    `<p>Ваш временный пароль: <b>${escapeHtml(tempPassword)}</b></p>` +
    `<p>Войдите с ним в кабинет и смените пароль в разделе «Профиль → Безопасность».</p>` +
    `<p>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>` +
    `<p>—<br>Мой Профсоюз</p>`;

  const text =
    `Здравствуйте, ${name}!\n\n` +
    `Вы запросили сброс пароля на платформе «Мой Профсоюз».\n\n` +
    `Ваш временный пароль: ${tempPassword}\n\n` +
    `Войдите с ним в кабинет и смените пароль в разделе «Профиль → Безопасность».\n\n` +
    `Если вы не запрашивали сброс, просто проигнорируйте это письмо.\n\n` +
    `—\nМой Профсоюз`;

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
