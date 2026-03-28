import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

/**
 * GET /api/admin/ai-chats
 * Returns all AI chats with user info, message count, and last message preview.
 * Optional ?chatId=xxx to get full messages for a specific chat.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("admin");
  if (auth.error) return auth.error;

  const chatId = request.nextUrl.searchParams.get("chatId");

  // If chatId is provided — return full messages for that chat
  if (chatId) {
    const { rows: messages } = await pool.query(
      `SELECT id, role, content, created_at
       FROM ai_chat_messages
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chatId]
    );
    return Response.json(toCamelCase(messages));
  }

  // Otherwise — return list of all chats with user info
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.user_id,
       c.created_at,
       c.updated_at,
       p.full_name,
       p.email,
       p.role AS user_role,
       p.avatar_url,
       (SELECT count(*) FROM ai_chat_messages m WHERE m.chat_id = c.id) AS message_count,
       (SELECT count(*) FROM ai_chat_messages m WHERE m.chat_id = c.id AND m.role = 'user') AS user_message_count,
       (SELECT content FROM ai_chat_messages m WHERE m.chat_id = c.id AND m.role = 'user' ORDER BY m.created_at DESC LIMIT 1) AS last_user_message,
       (SELECT created_at FROM ai_chat_messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
     FROM ai_chats c
     JOIN profiles p ON p.id = c.user_id
     ORDER BY c.updated_at DESC`
  );

  return Response.json(toCamelCase(rows));
}
