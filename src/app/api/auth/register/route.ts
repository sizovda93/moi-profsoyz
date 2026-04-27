import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { setAuthCookie } from "@/lib/auth-server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// Advisory lock id для сериализации генерации member_number (любое стабильное число)
const MEMBER_NUMBER_LOCK_ID = 84910274;

export async function POST(request: NextRequest) {
  try {
    // 5 регистраций с одного IP в час
    const ipCheck = rateLimit(`register:ip:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    if (!ipCheck.allowed) return rateLimitResponse(ipCheck.retryAfter);

    const body = await request.json();
    const { fullName, email, phone, password, consents, unionId, divisionId } = body;

    if (!fullName || !email || !password) {
      return Response.json({ error: "Заполните все обязательные поля" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "Пароль должен быть не менее 8 символов" }, { status: 400 });
    }

    if (!unionId || !divisionId) {
      return Response.json({ error: "Выберите профсоюз и подразделение" }, { status: 400 });
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

    const divCheck = await pool.query(
      `SELECT id FROM union_divisions WHERE id = $1 AND union_id = $2 AND is_active = true`,
      [divisionId, unionId]
    );
    if (divCheck.rows.length === 0) {
      return Response.json({ error: "Выбранное подразделение не найдено" }, { status: 400 });
    }

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

    const validConsentTypes = ["offer", "personal_data", "privacy"];
    const filteredConsents = (consents as string[]).filter((c) =>
      validConsentTypes.includes(c)
    );

    const passwordHash = await bcrypt.hash(password, 12);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "unknown";

    // ========== Транзакция ==========
    const client = await pool.connect();
    let profileId: string;
    let profileRow: Record<string, unknown>;

    try {
      await client.query("BEGIN");

      // Блокируем генерацию member_number до конца транзакции — защита от race condition
      await client.query("SELECT pg_advisory_xact_lock($1)", [MEMBER_NUMBER_LOCK_ID]);

      // 1. Профиль
      const profileResult = await client.query(
        `INSERT INTO profiles (full_name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, 'agent')
         RETURNING id, role, full_name, email, phone, status`,
        [fullName, email, phone || null, passwordHash]
      );
      profileRow = profileResult.rows[0];
      profileId = profileRow.id as string;

      // 2. member_number — атомарно под advisory lock
      const { rows: maxRows } = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 4) AS INTEGER)), 0) + 1 AS next_num
         FROM agents WHERE member_number IS NOT NULL`
      );
      const memberNumber = "MP-" + String(maxRows[0].next_num).padStart(6, "0");

      // 3. Агент — все новые юзеры автоматически закрепляются за дефолтным руководителем
      const defaultManagerId = process.env.DEFAULT_MANAGER_ID || null;
      await client.query(
        `INSERT INTO agents (user_id, union_id, division_id, member_number, manager_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [profileId, unionId, divisionId, memberNumber, defaultManagerId]
      );

      // 4. Согласия
      for (const consentType of filteredConsents) {
        await client.query(
          `INSERT INTO consents (user_id, type, ip_address, user_agent)
           VALUES ($1, $2, $3, $4)`,
          [profileId, consentType, ip, ua]
        );
      }

      // 5. Аудит
      await client.query(
        `INSERT INTO audit_logs (action, user_email, details)
         VALUES ('user.registered', $1, $2)`,
        [email, `Роль: agent, ФИО: ${fullName}, member: ${memberNumber}`]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK").catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

    // Cookie ставим ПОСЛЕ успешного коммита
    await setAuthCookie(profileId, "agent");

    return Response.json({
      user: {
        id: profileId,
        role: profileRow.role,
        fullName: profileRow.full_name,
        email: profileRow.email,
        phone: profileRow.phone,
        status: profileRow.status,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
