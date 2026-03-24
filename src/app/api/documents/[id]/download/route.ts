import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { readFile, access } from 'fs/promises';
import path from 'path';

type RouteContext = { params: Promise<{ id: string }> };

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    const { rows } = await pool.query(
      `SELECT d.*, l.assigned_manager_id
       FROM documents d
       LEFT JOIN leads l ON l.id::text = d.owner_id::text
       WHERE d.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Документ не найден' }, { status: 404 });
    }

    const doc = rows[0];

    // Проверка прав доступа
    if (user.role === 'agent') {
      if (doc.owner_id !== user.id) {
        return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
    } else if (user.role === 'manager') {
      // Менеджер видит документы, владелец которых — он сам,
      // или документы принадлежащие профилям его агентов
      if (doc.owner_id !== user.id) {
        const agentCheck = await pool.query(
          `SELECT 1 FROM agents a
           JOIN leads l ON l.assigned_agent_id = a.id
           WHERE a.user_id = $1 AND l.assigned_manager_id = $2
           UNION
           SELECT 1 FROM documents WHERE id = $3 AND owner_id IN (
             SELECT a2.user_id FROM agents a2
             JOIN leads l2 ON l2.assigned_agent_id = a2.id
             WHERE l2.assigned_manager_id = $2
           )`,
          [doc.owner_id, user.id, id]
        );
        if (agentCheck.rows.length === 0) {
          return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
        }
      }
    }
    // admin — доступ ко всем документам, проверка не нужна

    if (!doc.file_url) {
      return Response.json({ error: 'Файл не прикреплён к документу' }, { status: 404 });
    }

    // Защита от path traversal: извлекаем только имя файла
    const fileName = path.basename(doc.file_url);
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Проверяем что resolved path всё ещё внутри UPLOAD_DIR
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    try {
      await access(resolvedPath);
    } catch {
      return Response.json({ error: 'Файл не найден на диске' }, { status: 404 });
    }

    const fileBuffer = await readFile(resolvedPath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.title || fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('GET /api/documents/[id]/download error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
