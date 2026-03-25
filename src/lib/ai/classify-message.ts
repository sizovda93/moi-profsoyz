import pool from "@/lib/db";
import { tryAutoReply } from "./auto-reply";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = "https://api.voidai.app/v1/chat/completions";
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8000;

const VALID_CLASSIFICATIONS = [
  "lead",
  "question",
  "status_request",
  "document",
  "objection",
  "escalation",
  "other",
] as const;

type Classification = (typeof VALID_CLASSIFICATIONS)[number];

const SYSTEM_PROMPT = `Ты — классификатор сообщений в платформе агентской программы по банкротству физических лиц.
Тебе приходит входящее сообщение от агента менеджеру.
Нужно определить только категорию сообщения и confidence.

Допустимые категории:
- lead — агент передаёт потенциального клиента, контакт, описание ситуации клиента
- question — агент задаёт вопрос о платформе, процессе, условиях, выплатах, обучении, реферальной системе
- status_request — агент спрашивает статус лида, выплаты, документа, заявки, процесса
- document — сообщение связано с документами: отправка, загрузка, запрос, уточнение
- objection — недовольство условиями, возражение, отказ работать, претензия
- escalation — жалоба, требование подключить руководителя, серьёзный конфликт, угроза уйти
- other — приветствие, благодарность, нейтральное или неподходящее сообщение

Правила:
- Выбери ровно одну категорию.
- confidence должен быть числом от 0 до 1.
- Не добавляй пояснений.
- Не используй markdown.
- Верни только JSON.

Формат ответа:
{"classification":"lead","confidence":0.95}`;

/**
 * Classify a message asynchronously. Fire-and-forget — never throws.
 * Updates messages and conversations tables with classification result.
 */
export async function classifyMessage(
  messageId: string,
  text: string,
  conversationId: string,
  channel: string = "web",
  agentId: string | null = null
): Promise<void> {
  try {
    // Guard: no API key
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
      return;
    }

    // Guard: empty or too short text
    if (!text || text.trim().length < 3) {
      return;
    }

    // Guard: already classified
    const { rows: check } = await pool.query(
      `SELECT classified_at FROM messages WHERE id = $1`,
      [messageId]
    );
    if (check.length > 0 && check[0].classified_at) {
      return;
    }

    // Call AI
    const userMessage = `Канал: ${channel}\nРоль отправителя: agent\nТекст сообщения: "${text.trim()}"`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANTHROPIC_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 100,
          temperature: 0,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(`AI classify HTTP error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error("AI classify: empty response content");
      return;
    }

    // Parse JSON — handle potential markdown wrapping
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    let parsed: { classification?: string; confidence?: number };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("AI classify: invalid JSON:", content);
      return;
    }

    // Validate classification
    let classification: Classification = "other";
    if (
      parsed.classification &&
      VALID_CLASSIFICATIONS.includes(parsed.classification as Classification)
    ) {
      classification = parsed.classification as Classification;
    }

    // Validate confidence
    let confidence = 0;
    if (typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1) {
      confidence = Math.round(parsed.confidence * 100) / 100;
    }

    // Determine needs_attention
    let needsAttention = false;
    let attentionReason: string | null = null;

    if (classification === "escalation") {
      needsAttention = true;
      attentionReason = "escalation_detected";
    } else if (classification === "objection") {
      needsAttention = true;
      attentionReason = "objection_detected";
    } else if (confidence < 0.7) {
      needsAttention = true;
      attentionReason = "low_confidence";
    }

    // Update message
    await pool.query(
      `UPDATE messages
       SET classification = $1, confidence = $2, needs_attention = $3,
           attention_reason = $4, classified_at = now()
       WHERE id = $5`,
      [classification, confidence, needsAttention, attentionReason, messageId]
    );

    // Update conversation
    await pool.query(
      `UPDATE conversations
       SET last_classification = $1,
           has_attention = CASE
             WHEN $2 = true THEN true
             ELSE (SELECT EXISTS(
               SELECT 1 FROM messages
               WHERE conversation_id = $3 AND needs_attention = true
             ))
           END
       WHERE id = $3`,
      [classification, needsAttention, conversationId]
    );

    // Auto-reply disabled — manager should use "Предложить ответ" button instead
  } catch (err) {
    // Never let classification errors propagate
    if (err instanceof Error && err.name === "AbortError") {
      console.error("AI classify: timeout after", TIMEOUT_MS, "ms");
    } else {
      console.error("AI classify error:", err instanceof Error ? err.message : err);
    }
  }
}
