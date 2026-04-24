import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    // 5 попыток смены пароля за 15 минут на одного пользователя
    const check = rateLimit(`change-pw:${user.id}`, 5, 15 * 60 * 1000);
    if (!check.allowed) return rateLimitResponse(check.retryAfter);

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: "Укажите текущий и новый пароль" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return Response.json(
        { error: `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return Response.json(
        { error: "Новый пароль должен отличаться от текущего" },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `SELECT password_hash FROM profiles WHERE id = $1`,
      [user.id]
    );

    if (rows.length === 0 || !rows[0].password_hash) {
      return Response.json({ error: "Аккаунт не найден" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return Response.json({ error: "Текущий пароль неверен" }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE profiles SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [newHash, user.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('user.password_changed', $1, 'Пароль изменён')`,
      [user.email]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
