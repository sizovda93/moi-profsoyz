import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.txt'];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'Файл не передан' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'Файл слишком большой (макс. 10 МБ)' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json({ error: `Недопустимый тип файла: ${ext}` }, { status: 400 });
    }

    // Генерируем безопасное имя файла
    const safeName = crypto.randomUUID() + ext;

    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(UPLOAD_DIR, safeName), buffer);

    return Response.json({
      fileUrl: `/uploads/${safeName}`,
      fileName: file.name,
      fileSize: file.size,
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
