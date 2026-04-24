import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { serveUploadedFile } from "@/lib/file-serving";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    const { rows } = await pool.query(
      `SELECT file_url, file_name, title, status FROM union_documents WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Документ не найден" }, { status: 404 });
    }

    const doc = rows[0];

    // Черновики и архивы видит только админ
    if (doc.status !== "published" && user.role !== "admin") {
      return Response.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    if (!doc.file_url) {
      return Response.json({ error: "К документу не прикреплён файл" }, { status: 404 });
    }

    return serveUploadedFile(doc.file_url, doc.file_name || doc.title);
  } catch (err) {
    console.error("GET union-documents download error:", err);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
