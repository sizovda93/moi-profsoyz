import pool from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { retrieveKnowledge } from "./retrieve-knowledge";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = "https://api.voidai.app/v1/chat/completions";
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://agentum.club";

// ─── Blocklist: NEVER auto-reply ─────────────

const BLOCKED_CLASSIFICATIONS = ["escalation", "objection"];

// ─── Navigation responses (static) ──────────

const NAV_RESPONSES: Record<string, string> = {
  nav_telegram: `Подключить Telegram можно в разделе «Профиль».\nПерейдите: ${APP_URL}/agent/profile\nНажмите «Подключить Telegram» и следуйте инструкции.`,
  nav_referral: `Ваша реферальная ссылка находится в разделе «Рефералы».\nПерейдите: ${APP_URL}/agent/referral\nТам же можно скопировать ссылку и посмотреть статистику.`,
  nav_materials: `Готовые тексты и инструкции для привлечения клиентов — в разделе «Материалы».\nПерейдите: ${APP_URL}/agent/marketing`,
  nav_documents: `Загрузить документы можно в разделе «Документы».\nПерейдите: ${APP_URL}/agent/documents\nПоддерживаемые форматы: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (до 10 МБ).`,
  nav_finance: `Ваш баланс и историю выплат можно посмотреть в разделе «Финансы».\nПерейдите: ${APP_URL}/agent/finance`,
  nav_learning: `Обучение доступно в разделе «Обучение».\nПерейдите: ${APP_URL}/agent/learning\nОбязательные модули отмечены специальным бейджем.`,
  nav_profile: `Редактировать профиль (ФИО, телефон, город) можно здесь:\n${APP_URL}/agent/profile`,
};

// ─── Keyword → topic mapping ────────────────

const TOPIC_KEYWORDS: [string[], string][] = [
  [["подключ", "телеграм", "telegram", "тг "], "nav_telegram"],
  [["реферал", "ссылк", "партнёрск", "пригласи"], "nav_referral"],
  [["материал", "текст", "пост", "шаблон", "контент"], "nav_materials"],
  [["документ", "загруз", "файл", "скан"], "nav_documents"],
  [["выплат", "баланс", "финанс", "деньг", "зарплат"], "nav_finance"],
  [["обучен", "урок", "курс", "модуль"], "nav_learning"],
  [["профиль", "настройк", "телефон изменить", "фио изменить"], "nav_profile"],
  [["статус", "лид", "заявк", "клиент"], "lead_status"],
  [["ставк", "комисси", "процент", "уровень", "tier", "грейд"], "tier_info"],
  [["банкротств", "долг", "кредит", "коллектор", "списа", "процедур"], "bfl_general"],
  [["как создать", "как работает", "платформ", "кабинет", "интерфейс"], "platform_how"],
];

const BFL_DISCLAIMER = "\n\nДля оценки конкретной ситуации рекомендуем записаться на бесплатную консультацию с юристом.";

const BFL_SYSTEM_PROMPT = `Ты — справочный помощник по банкротству физических лиц (ФЗ-127).
Отвечай только общую публичную информацию. Коротко, 2–4 предложения.

Нельзя:
- Давать персональные юридические выводы
- Обещать результаты («вам спишут долг»)
- Называть конкретные сроки для конкретного человека
- Рекомендовать конкретных арбитражных управляющих
- Гарантировать сохранение имущества

Верни только текст ответа, без markdown.`;

export interface AutoReplyResult {
  replyText: string;
  topic: string;
}

/**
 * Try to generate a safe auto-reply.
 * Returns null if the message should not be auto-replied.
 */
export async function tryAutoReply(
  classification: string,
  messageText: string,
  agentId: string,
  confidence: number
): Promise<AutoReplyResult | null> {
  try {
    // Guard: check kill switch
    const { rows: settingsRows } = await pool.query(
      "SELECT value FROM settings WHERE key = 'auto_reply_enabled'"
    );
    if (settingsRows.length === 0 || settingsRows[0].value !== "true") {
      return null;
    }

    // Guard: blocked classifications
    if (BLOCKED_CLASSIFICATIONS.includes(classification)) {
      return null;
    }

    // Guard: low confidence — leave for manager
    if (confidence < 0.80) {
      return null;
    }

    // Load allowed topics
    const { rows: topicRows } = await pool.query(
      "SELECT value FROM settings WHERE key = 'auto_reply_topics'"
    );
    const allowedTopics = new Set(
      (topicRows[0]?.value || "").split(",").map((t: string) => t.trim())
    );

    // Detect topic from keywords
    const textLower = messageText.toLowerCase();
    let detectedTopic: string | null = null;

    for (const [keywords, topic] of TOPIC_KEYWORDS) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        detectedTopic = topic;
        break;
      }
    }

    if (!detectedTopic || !allowedTopics.has(detectedTopic)) {
      return null;
    }

    // ─── Navigation responses (static) ──────
    if (detectedTopic.startsWith("nav_") && NAV_RESPONSES[detectedTopic]) {
      return { replyText: NAV_RESPONSES[detectedTopic], topic: detectedTopic };
    }

    // ─── Lead status (DB lookup) ────────────
    if (detectedTopic === "lead_status") {
      return await handleLeadStatus(textLower, agentId);
    }

    // ─── Tier info (DB lookup) ──────────────
    if (detectedTopic === "tier_info") {
      return await handleTierInfo(agentId);
    }

    // ─── BFL general (AI + knowledge) ───────
    if (detectedTopic === "bfl_general") {
      return await handleBflGeneral(messageText);
    }

    // ─── Platform how-to (AI + knowledge) ───
    if (detectedTopic === "platform_how") {
      return await handlePlatformHow(messageText);
    }

    return null;
  } catch (err) {
    console.error("Auto-reply error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Lead status handler ─────────────────────

async function handleLeadStatus(
  textLower: string,
  agentId: string
): Promise<AutoReplyResult | null> {
  // Try to extract phone first
  const phoneMatch = textLower.match(/[\d+() -]{10,}/);
  let leads;

  if (phoneMatch) {
    const phoneNorm = normalizePhone(phoneMatch[0]);
    if (phoneNorm.length >= 10) {
      const { rows } = await pool.query(
        `SELECT full_name, status, updated_at FROM leads
         WHERE assigned_agent_id = $1 AND phone_normalized = $2
         ORDER BY created_at DESC LIMIT 3`,
        [agentId, phoneNorm]
      );
      leads = rows;
    }
  }

  // If no phone match, try name search
  if (!leads || leads.length === 0) {
    // Extract potential name: words with capital letters or cyrillic
    const words = textLower
      .replace(/[^а-яёa-z\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    // Remove common noise words
    const noise = ["какой", "статус", "лиду", "лида", "моему", "моей", "клиент", "заявк", "дело", "как", "что", "где"];
    const nameWords = words.filter((w) => !noise.includes(w));

    if (nameWords.length > 0) {
      const searchTerm = `%${nameWords[0]}%`;
      const { rows } = await pool.query(
        `SELECT full_name, status, updated_at FROM leads
         WHERE assigned_agent_id = $1 AND lower(full_name) LIKE $2
         ORDER BY created_at DESC LIMIT 3`,
        [agentId, searchTerm]
      );
      leads = rows;
    }
  }

  if (!leads || leads.length === 0) {
    return {
      replyText: "Лид не найден. Уточните, пожалуйста, ФИО или номер телефона клиента.",
      topic: "lead_status",
    };
  }

  if (leads.length === 1) {
    const l = leads[0];
    const statusLabels: Record<string, string> = {
      new: "Новый", contacted: "Контакт", qualified: "Квалифицирован",
      proposal: "Предложение", negotiation: "Переговоры",
      won: "Договор заключен", lost: "Потерян",
    };
    const date = new Date(l.updated_at).toLocaleDateString("ru-RU");
    return {
      replyText: `Лид «${l.full_name}» — статус: ${statusLabels[l.status] || l.status} (обновлён ${date}).`,
      topic: "lead_status",
    };
  }

  // Multiple leads
  const names = leads.map((l: { full_name: string }) => `«${l.full_name}»`).join(", ");
  return {
    replyText: `Найдено несколько лидов: ${names}. Уточните, пожалуйста, о каком клиенте идёт речь.`,
    topic: "lead_status",
  };
}

// ─── Tier info handler ───────────────────────

async function handleTierInfo(agentId: string): Promise<AutoReplyResult | null> {
  const { rows } = await pool.query(
    `SELECT a.tier FROM agents a WHERE a.id = $1`,
    [agentId]
  );
  if (rows.length === 0) return null;

  const tier = rows[0].tier || "base";
  const { rows: rateRows } = await pool.query(
    `SELECT value FROM settings WHERE key = $1`,
    [`commission_rate_${tier}`]
  );
  const rate = rateRows[0]?.value
    ? `${(parseFloat(rateRows[0].value) * 100).toFixed(0)}%`
    : "—";

  const tierLabels: Record<string, string> = { base: "Базовый", silver: "Серебро", gold: "Золото" };

  return {
    replyText: `Ваш текущий уровень: ${tierLabels[tier] || tier}.\nСтавка комиссии: ${rate}.\nДетали в разделе «Финансы»: ${APP_URL}/agent/finance`,
    topic: "tier_info",
  };
}

// ─── BFL general handler ─────────────────────

async function handleBflGeneral(messageText: string): Promise<AutoReplyResult | null> {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your_anthropic_api_key_here") return null;

  const knowledge = await retrieveKnowledge("question", messageText);
  let context = "";
  if (knowledge.snippets.length > 0) {
    context = "\n\nСправка:\n" + knowledge.snippets.join("\n");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANTHROPIC_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: BFL_SYSTEM_PROMPT + context },
          { role: "user", content: messageText },
        ],
        max_tokens: 250,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 10) return null;

    return { replyText: text + BFL_DISCLAIMER, topic: "bfl_general" };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ─── Platform how-to handler ─────────────────

async function handlePlatformHow(messageText: string): Promise<AutoReplyResult | null> {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your_anthropic_api_key_here") return null;

  const knowledge = await retrieveKnowledge("question", messageText);
  if (knowledge.snippets.length === 0) return null; // No knowledge = no auto-reply

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANTHROPIC_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Ты — справочный помощник платформы для агентов по банкротству.
Отвечай коротко (2–3 предложения) на основе справочной информации. Не выдумывай.
Не используй markdown. Только текст.

Справка:
${knowledge.snippets.join("\n")}`,
          },
          { role: "user", content: messageText },
        ],
        max_tokens: 200,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 10) return null;

    return { replyText: text, topic: "platform_how" };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
