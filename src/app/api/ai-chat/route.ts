import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

const SYSTEM_PROMPT = `Ты — профсоюзный помощник платформы «Мой Профсоюз». Ты помогаешь членам профсоюза ориентироваться на платформе, даёшь юридические консультации по трудовому праву и профсоюзной деятельности, а также направляешь к нужным разделам.

Правила:
- Отвечай на русском языке, кратко и понятно
- Давай развёрнутые юридические консультации по трудовому праву, ТК РФ, правам работников, профсоюзному законодательству
- Ссылайся на конкретные статьи ТК РФ, федеральные законы, когда это уместно
- Если вопрос сложный и требует индивидуального разбора с документами, направь также в раздел «Вопрос юристу» для персонального сопровождения
- Если вопрос требует обращения к руководству, направь в раздел «Обращение к руководителю»
- Не изменяй никаких данных в системе
- Будь вежливым и профессиональным

Разделы платформы:
- «О платформе» — главная страница с обзором активности
- «О профсоюзе» — органы управления, мероприятия, история, FAQ, документы, деятельность
- «Партнёры» — партнёрские организации профсоюза
- «Обращение к руководителю» — подача жалоб и инициатив руководству профсоюза
- «Сообщения» — переписка с руководителем профсоюза
- «Коллеги» — общение с коллегами из подразделения
- «Вопрос юристу» — юридические вопросы (рассматриваются администрацией)
- «Опросы» — опросы профсоюзной организации
- «Обучение» — курсы по трудовым правам, работе с платформой
- «Соглашения» — пользовательское соглашение, конфиденциальность, согласие на ПД
- «Профиль» — личные данные, подразделение, Telegram

Профсоюз: Саратовская областная организация «Всероссийский Электропрофсоюз»
Председатель: Грядкин Сергей Александрович
Адрес: 410029, г. Саратов, ул. Сакко и Ванцетти, 55
Телефон: 8 (8452) 26-33-56

Типы обращений: жалоба, инициатива
Статусы обращений: новое → принято → подтверждено → на согласовании → в работе → решено / закрыто

При вопросах о юридических правах можешь давать ОБЩУЮ справочную информацию по ТК РФ, но обязательно добавляй: «Для получения персональной консультации обратитесь в раздел Вопрос юристу».`;

const VOIDAI_API_URL = "https://api.voidai.app/v1/chat/completions";
const VOIDAI_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "gpt-4.1-mini";
const MAX_HISTORY = 20; // last N messages to include in context

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    // Get or create chat
    let { rows } = await pool.query(
      `SELECT id FROM ai_chats WHERE user_id = $1`, [user.id]
    );
    if (rows.length === 0) {
      const created = await pool.query(
        `INSERT INTO ai_chats (user_id) VALUES ($1) RETURNING id`, [user.id]
      );
      rows = created.rows;
    }
    const chatId = rows[0].id;

    // Get messages
    const { rows: messages } = await pool.query(
      `SELECT id, role, content, created_at FROM ai_chat_messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [chatId]
    );

    return Response.json({
      chatId,
      messages: messages.map((m) => toCamelCase(m)),
    });
  } catch (err) {
    console.error("GET /api/ai-chat error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { message } = await request.json();
    if (!message?.trim()) {
      return Response.json({ error: "Сообщение обязательно" }, { status: 400 });
    }

    // Get or create chat
    let { rows } = await pool.query(
      `SELECT id FROM ai_chats WHERE user_id = $1`, [user.id]
    );
    if (rows.length === 0) {
      const created = await pool.query(
        `INSERT INTO ai_chats (user_id) VALUES ($1) RETURNING id`, [user.id]
      );
      rows = created.rows;
    }
    const chatId = rows[0].id;

    // Save user message
    await pool.query(
      `INSERT INTO ai_chat_messages (chat_id, role, content) VALUES ($1, 'user', $2)`,
      [chatId, message.trim()]
    );

    // Load history for context
    const { rows: history } = await pool.query(
      `SELECT role, content FROM ai_chat_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [chatId, MAX_HISTORY]
    );
    history.reverse();

    // Build messages for AI
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Call VoidAI
    const aiResponse = await fetch(VOIDAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VOIDAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: aiMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    let assistantContent = "Извините, не удалось получить ответ. Попробуйте позже.";

    if (aiResponse.ok) {
      const data = await aiResponse.json();
      assistantContent = data.choices?.[0]?.message?.content || assistantContent;
    } else {
      console.error("VoidAI error:", aiResponse.status, await aiResponse.text().catch(() => ""));
    }

    // Save assistant message
    const { rows: savedMsg } = await pool.query(
      `INSERT INTO ai_chat_messages (chat_id, role, content) VALUES ($1, 'assistant', $2) RETURNING id, role, content, created_at`,
      [chatId, assistantContent]
    );

    // Update chat timestamp
    await pool.query(`UPDATE ai_chats SET updated_at = now() WHERE id = $1`, [chatId]);

    return Response.json({
      reply: assistantContent,
      message: toCamelCase(savedMsg[0]),
    });
  } catch (err) {
    console.error("POST /api/ai-chat error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
