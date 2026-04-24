import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { setAuthCookie } from "@/lib/auth-server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // 10 попыток логина с одного IP за 15 минут
    const ipCheck = rateLimit(`login:ip:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    if (!ipCheck.allowed) return rateLimitResponse(ipCheck.retryAfter);

    const rawText = await request.text();
    let body;
    try {
      body = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Login JSON parse failed. Raw body:", JSON.stringify(rawText), "Length:", rawText.length);
      return Response.json(
        { error: "Неверный формат запроса" },
        { status: 400 }
      );
    }
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Введите email и пароль" },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `SELECT p.id, p.password_hash, p.role, p.full_name, p.email, p.phone,
              p.avatar_url, p.status
       FROM profiles p
       WHERE p.email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return Response.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const profile = rows[0];

    if (profile.status === "blocked") {
      return Response.json(
        { error: "Аккаунт заблокирован" },
        { status: 403 }
      );
    }

    if (!profile.password_hash) {
      return Response.json(
        { error: "Для этого аккаунта не задан пароль. Обратитесь к администратору" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      return Response.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    // Аудит-лог
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('user.login', $1, 'Успешный вход')`,
      [email]
    );

    // JWT cookie
    await setAuthCookie(profile.id, profile.role);

    return Response.json({
      user: {
        id: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        status: profile.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return Response.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
