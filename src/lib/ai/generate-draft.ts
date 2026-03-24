import pool from "@/lib/db";
import { retrieveKnowledge } from "./retrieve-knowledge";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = "https://api.voidai.app/v1/chat/completions";
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 10000;

const SYSTEM_PROMPT = `Ты — помощник менеджера в платформе по банкротству физических лиц.
Менеджер общается с агентом (партнёром). Тебе нужно предложить черновик ответа менеджера.

Правила:
- Пиши от лица менеджера, коротко и по делу (2–4 предложения).
- Обращайся к агенту по имени, если оно известно.
- Если в справочной информации есть ответ — используй его.
- Если справочной информации нет или она не подходит — предложи нейтральный ответ.
- Не обещай конкретных сумм, сроков или гарантий, если они не указаны в справке.
- Не выдумывай статусы лидов, выплат или документов.
- Если агент спрашивает статус — предложи ответ в формате «Уточню и вернусь с информацией».
- Если агент передаёт лид — поблагодари и подтверди получение.
- Если возражение — ответь уважительно, используя факты из справки.
- Если эскалация — прими серьёзно, предложи разобраться.
- При возможности направь агента в нужный раздел платформы.
- Не используй markdown. Пиши обычным текстом.
- Не добавляй подпись.

Верни только текст ответа, без пояснений.`;

interface GenerateDraftResult {
  draftText: string;
  sourceMessageId: string;
  classification: string | null;
  knowledgeUsed: string[];
}

/**
 * Generate a knowledge-grounded draft reply for a conversation.
 * Returns the draft text or null if generation failed.
 */
export async function generateDraft(
  conversationId: string,
  userId: string
): Promise<GenerateDraftResult | null> {
  // Guard: no API key
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
    return null;
  }

  // Fetch last 5 meaningful messages (agent/manager only, no system noise)
  const { rows: messages } = await pool.query(
    `SELECT id, sender_type, sender_name, text, classification
     FROM messages
     WHERE conversation_id = $1
       AND sender_type IN ('agent', 'manager')
       AND length(text) >= 2
     ORDER BY created_at DESC
     LIMIT 5`,
    [conversationId]
  );

  if (messages.length === 0) {
    return null;
  }

  // Reverse to chronological order
  messages.reverse();

  // Guard: last message must be from agent
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.sender_type !== "agent") {
    return null;
  }

  const classification = lastMessage.classification || "other";
  const agentName = lastMessage.sender_name || "Агент";

  // Retrieve knowledge snippets
  const knowledge = await retrieveKnowledge(classification, lastMessage.text);

  // Build context
  const contextLines = messages.map((m) => {
    const role = m.sender_type === "agent" ? "Агент" : "Менеджер";
    return `${role} (${m.sender_name}): ${m.text}`;
  });

  let userPrompt = `Контекст диалога (последние сообщения):
${contextLines.join("\n")}

Классификация последнего сообщения: ${classification}
Имя агента: ${agentName}`;

  if (knowledge.snippets.length > 0) {
    userPrompt += `

Справочная информация из платформы:
${knowledge.snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }

  userPrompt += "\n\nПредложи ответ менеджера.";

  // Call AI
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANTHROPIC_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`AI draft HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const draftText = data?.choices?.[0]?.message?.content?.trim();

    if (!draftText || draftText.length < 5) {
      console.error("AI draft: empty or too short response");
      return null;
    }

    // Reject previous suggested drafts for this conversation
    await pool.query(
      `UPDATE message_drafts SET status = 'rejected'
       WHERE conversation_id = $1 AND status = 'suggested'`,
      [conversationId]
    );

    // Save new draft with knowledge sources
    await pool.query(
      `INSERT INTO message_drafts
         (conversation_id, source_message_id, draft_text, status, classification,
          model_name, generated_by, knowledge_snippets_used)
       VALUES ($1, $2, $3, 'suggested', $4, $5, $6, $7)`,
      [
        conversationId,
        lastMessage.id,
        draftText,
        classification,
        MODEL,
        userId,
        knowledge.sources.length > 0 ? knowledge.sources : null,
      ]
    );

    return {
      draftText,
      sourceMessageId: lastMessage.id,
      classification,
      knowledgeUsed: knowledge.sources,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("AI draft: timeout after", TIMEOUT_MS, "ms");
    } else {
      console.error("AI draft error:", err instanceof Error ? err.message : err);
    }
    return null;
  }
}
