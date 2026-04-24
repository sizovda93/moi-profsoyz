import { NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendMail, renderTempPasswordEmail } from "@/lib/mail";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ error: "Укажите email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Лимиты: 3 попытки на email за час + 10 с одного IP за час (защита от спама)
    const emailCheck = rateLimit(`forgot:email:${normalizedEmail}`, 3, 60 * 60 * 1000);
    if (!emailCheck.allowed) return rateLimitResponse(emailCheck.retryAfter);

    const ipCheck = rateLimit(`forgot:ip:${getClientIp(request)}`, 10, 60 * 60 * 1000);
    if (!ipCheck.allowed) return rateLimitResponse(ipCheck.retryAfter);

    const { rows } = await pool.query(
      `SELECT id, full_name, email FROM profiles WHERE email = $1`,
      [normalizedEmail]
    );

    // Don't reveal if email exists or not — always return success
    if (rows.length === 0) {
      return Response.json({ success: true });
    }

    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4).toUpperCase();

    const { html, text } = renderTempPasswordEmail(rows[0].full_name, tempPassword);

    // Сначала отправляем письмо — и только при успехе меняем пароль в БД.
    // Иначе при сбое SMTP пользователь окажется заблокирован с паролем, который не знает.
    try {
      await sendMail({
        to: rows[0].email,
        subject: "Мой Профсоюз — временный пароль для входа",
        html,
        text,
      });
    } catch (mailErr) {
      console.error("Forgot password: mail send failed:", mailErr);
      return Response.json(
        { error: "Не удалось отправить письмо. Попробуйте позже." },
        { status: 500 }
      );
    }

    const hash = await bcrypt.hash(tempPassword, 10);
    await pool.query(`UPDATE profiles SET password_hash = $1 WHERE id = $2`, [
      hash,
      rows[0].id,
    ]);

    return Response.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
