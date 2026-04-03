import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { rows } = await pool.query(`
      SELECT dc.*,
        p1.full_name as user1_name,
        p2.full_name as user2_name,
        (SELECT count(*) FROM direct_messages dm WHERE dm.chat_id = dc.id AND dm.sender_id != $1 AND dm.is_read = false) as unread_count
      FROM direct_chats dc
      JOIN profiles p1 ON p1.id = dc.user1_id
      JOIN profiles p2 ON p2.id = dc.user2_id
      WHERE dc.user1_id = $1 OR dc.user2_id = $1
      ORDER BY dc.last_message_at DESC NULLS LAST
    `, [user.id]);

    // Add contact name (the other person)
    const result = rows.map((r) => ({
      ...(toCamelCase(r) as Record<string, unknown>),
      contactName: r.user1_id === user.id ? r.user2_name : r.user1_name,
      contactId: r.user1_id === user.id ? r.user2_id : r.user1_id,
    }));

    return Response.json(result);
  } catch (err) {
    console.error("GET /api/direct-chats error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { recipientId } = await request.json();
    if (!recipientId) return Response.json({ error: "Укажите получателя" }, { status: 400 });

    // Ensure consistent ordering (smaller UUID first)
    const [u1, u2] = user.id < recipientId ? [user.id, recipientId] : [recipientId, user.id];

    // Check if chat already exists
    const { rows: existing } = await pool.query(
      `SELECT id FROM direct_chats WHERE user1_id = $1 AND user2_id = $2`, [u1, u2]
    );
    if (existing.length > 0) {
      return Response.json({ chatId: existing[0].id });
    }

    // Verify recipient has the same manager
    const { rows: check } = await pool.query(`
      SELECT a1.manager_id as my_manager, a2.manager_id as their_manager
      FROM agents a1, agents a2
      WHERE a1.user_id = $1 AND a2.user_id = $2
    `, [user.id, recipientId]);

    if (check.length === 0 || !check[0].my_manager || check[0].my_manager !== check[0].their_manager) {
      return Response.json({ error: "Можно переписываться только с коллегами, закреплёнными за одним руководителем" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `INSERT INTO direct_chats (user1_id, user2_id) VALUES ($1, $2) RETURNING id`,
      [u1, u2]
    );

    return Response.json({ chatId: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/direct-chats error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
