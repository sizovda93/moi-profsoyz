import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;

    // Verify access
    const { rows: chatRows } = await pool.query(
      `SELECT * FROM direct_chats WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [id, user.id]
    );
    if (chatRows.length === 0) return Response.json({ error: "Не найден" }, { status: 404 });

    // Get messages
    const { rows: messages } = await pool.query(
      `SELECT dm.*, p.full_name as sender_name
       FROM direct_messages dm
       JOIN profiles p ON p.id = dm.sender_id
       WHERE dm.chat_id = $1
       ORDER BY dm.created_at ASC`,
      [id]
    );

    // Mark as read
    await pool.query(
      `UPDATE direct_messages SET is_read = true WHERE chat_id = $1 AND sender_id != $2 AND is_read = false`,
      [id, user.id]
    );

    const chat = chatRows[0];
    return Response.json({
      ...toCamelCase(chat),
      contactName: chat.user1_id === user.id
        ? (await pool.query(`SELECT full_name FROM profiles WHERE id = $1`, [chat.user2_id])).rows[0]?.full_name
        : (await pool.query(`SELECT full_name FROM profiles WHERE id = $1`, [chat.user1_id])).rows[0]?.full_name,
      messages: messages.map((m) => toCamelCase(m)),
    });
  } catch (err) {
    console.error("GET /api/direct-chats/[id] error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;

    // Verify access
    const { rows: chatRows } = await pool.query(
      `SELECT * FROM direct_chats WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [id, user.id]
    );
    if (chatRows.length === 0) return Response.json({ error: "Не найден" }, { status: 404 });

    const { text } = await request.json();
    if (!text?.trim()) return Response.json({ error: "Текст обязателен" }, { status: 400 });

    const { rows } = await pool.query(
      `INSERT INTO direct_messages (chat_id, sender_id, text) VALUES ($1, $2, $3) RETURNING *`,
      [id, user.id, text.trim()]
    );

    await pool.query(
      `UPDATE direct_chats SET last_message = $1, last_message_at = now() WHERE id = $2`,
      [text.trim().substring(0, 255), id]
    );

    // Notify recipient
    const chat = chatRows[0];
    const recipientId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
    pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
      [recipientId, "Новое сообщение", `${user.fullName}: ${text.trim().substring(0, 100)}`]
    ).catch(() => {});

    return Response.json(toCamelCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/direct-chats/[id] error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
