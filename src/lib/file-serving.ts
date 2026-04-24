import { readFile, access } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain",
};

export async function serveUploadedFile(
  fileUrl: string,
  downloadName?: string
): Promise<Response> {
  // Защита от path traversal: берём только basename
  const fileName = path.basename(fileUrl);
  const filePath = path.join(UPLOAD_DIR, fileName);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
    return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    await access(resolvedPath);
  } catch {
    return Response.json({ error: "Файл не найден на диске" }, { status: 404 });
  }

  const fileBuffer = await readFile(resolvedPath);
  const ext = path.extname(fileName).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName || fileName)}"`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
