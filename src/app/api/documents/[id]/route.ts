import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { unlink } from 'fs/promises';
import path from 'path';

type RouteContext = { params: Promise<{ id: string }> };

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    const { rows } = await pool.query(`SELECT * FROM documents WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return Response.json({ error: 'Документ не найден' }, { status: 404 });
    }

    const doc = rows[0];

    // Удаляем файл с диска если есть
    if (doc.file_url) {
      const fileName = path.basename(doc.file_url);
      const filePath = path.resolve(path.join(UPLOAD_DIR, fileName));
      if (filePath.startsWith(path.resolve(UPLOAD_DIR))) {
        try {
          await unlink(filePath);
        } catch {
          // Файл может уже быть удалён — не критично
        }
      }
    }

    await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('document.deleted', $1, $2)`,
      [user.email, `Документ: ${doc.title} (${id})`]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/documents/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
