import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { setAuthCookie } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, consents } = body;

    // Валидация
    if (!fullName || !email || !password) {
      return Response.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Пароль должен быть не менее 8 символов" },
        { status: 400 }
      );
    }

    if (
      !consents ||
      !Array.isArray(consents) ||
      !consents.includes("offer") ||
      !consents.includes("personal_data")
    ) {
      return Response.json(
        { error: "Необходимо принять оферту и согласие на обработку ПД" },
        { status: 400 }
      );
    }

    const validConsentTypes = ["offer", "personal_data", "privacy"];
    const filteredConsents = consents.filter((c: string) =>
      validConsentTypes.includes(c)
    );

    // Проверка уникальности email
    const existing = await pool.query(
      "SELECT id FROM profiles WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return Response.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 12);

    // Создаём профиль
    const profileResult = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'agent')
       RETURNING id, role, full_name, email, phone, status`,
      [fullName, email, phone || null, passwordHash]
    );
    const profile = profileResult.rows[0];

    // Создаём запись агента
    await pool.query(
      `INSERT INTO agents (user_id) VALUES ($1)`,
      [profile.id]
    );

    // Записываем consents
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    for (const consentType of filteredConsents) {
      await pool.query(
        `INSERT INTO consents (user_id, type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [profile.id, consentType, ip, ua]
      );
    }

    // Аудит-лог
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details)
       VALUES ('user.registered', $1, $2)`,
      [email, `Роль: agent, ФИО: ${fullName}`]
    );

    // JWT cookie
    await setAuthCookie(profile.id, "agent");

    return Response.json({
      user: {
        id: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        status: profile.status,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return Response.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
