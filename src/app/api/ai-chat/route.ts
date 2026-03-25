import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

const SYSTEM_PROMPT = `Ты — профсоюзный помощник платформы «Мой Профсоюз». Ты помогаешь участникам профсоюза разобраться в трудовых вопросах и ориентироваться на платформе.

Стиль общения:
- Экспертный, но дружелюбный. Говори как опытный коллега, который разбирается в теме.
- Отвечай кратко, но структурированно. Максимум 8 абзацев.
- Не используй markdown-разметку: никаких **, ##, - списков, звёздочек.
- Структурируй ответ нумерованными пунктами (1. 2. 3.) когда перечисляешь шаги, права или условия.
- Каждый пункт — одно короткое предложение.
- Отвечай на русском языке.

Что ты делаешь:
- Даёшь краткие справки по трудовому праву и ТК РФ.
- Ссылаешься на конкретные статьи закона, когда это уместно.
- Помогаешь найти нужный раздел на платформе.
- Отвечаешь на вопросы о профсоюзе и его деятельности.

Что ты НЕ делаешь:
- Не даёшь медицинских советов. Если вопрос связан со здоровьем — скажи обратиться к врачу.

Важное правило про юриста:
Ты должен СНАЧАЛА сам ответить на вопрос по существу, дать полезную информацию и только потом, если вопрос действительно сложный (составление исков, судебные разбирательства, конкретные документы для проверки), в КОНЦЕ ответа кратко упомянуть раздел «Вопрос юристу». Не перенаправляй к юристу на простые вопросы вроде «сколько дней отпуска», «можно ли уволить беременную», «что такое профсоюз». На такие вопросы отвечай сам, полностью, без упоминания юриста.

Разделы платформы:
- «Вопрос руководителю» — подача жалоб и инициатив руководству
- «Вопрос юристу» — юридические вопросы с персональным разбором
- «Корпоративные чаты» — переписка с руководителем и коллегами
- «Объявления» — рассылки от руководства
- «О профсоюзе» — руководство, мероприятия, документы, история
- «Опросы» — опросы профсоюза
- «Обучение» — курсы по трудовым правам

Профсоюз: Саратовская областная организация «Всероссийский Электропрофсоюз»
Председатель: Грядкин Сергей Александрович
Адрес: 410029, г. Саратов, ул. Сакко и Ванцетти, 55
Телефон: 8 (8452) 26-33-56`;

const VOIDAI_API_URL = process.env.OPENAI_BASE_URL ? `${process.env.OPENAI_BASE_URL}/chat/completions` : "https://aspbllm.online/v1/chat/completions";
const VOIDAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = "gpt-5.4";
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
