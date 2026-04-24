import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { serveUploadedFile } from "@/lib/file-serving";

type RouteContext = { params: Promise<{ id: string; attId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id, attId } = await params;

    const { rows } = await pool.query(
      `SELECT lra.file_url, lra.file_name, lr.author_id
       FROM legal_request_attachments lra
       JOIN legal_requests lr ON lr.id = lra.request_id
       WHERE lra.id = $1 AND lra.request_id = $2`,
      [attId, id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Вложение не найдено" }, { status: 404 });
    }

    const att = rows[0];

    // Доступ: админ — ко всем, автор — только к своим
    if (user.role !== "admin" && att.author_id !== user.id) {
      return Response.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    return serveUploadedFile(att.file_url, att.file_name);
  } catch (err) {
    console.error("GET legal attachment download error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
