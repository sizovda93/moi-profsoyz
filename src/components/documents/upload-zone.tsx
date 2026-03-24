"use client";

import { Upload, FileUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onUploaded?: (doc: { fileUrl: string; fileName: string; fileSize: number }) => void;
}

export function UploadZone({ onUploaded }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: FileList) => {
    setError(null);
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 1. Upload file
        const fd = new FormData();
        fd.append('file', file);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!upRes.ok) {
          const err = await upRes.json();
          throw new Error(err.error || 'Ошибка загрузки');
        }
        const { fileUrl, fileName, fileSize } = await upRes.json();

        // 2. Create document record
        const docRes = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: fileName, type: 'other', fileUrl, fileSize }),
        });
        if (!docRes.ok) {
          const err = await docRes.json();
          throw new Error(err.error || 'Ошибка создания документа');
        }
        onUploaded?.({ fileUrl, fileName, fileSize });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) {
          uploadFiles(e.dataTransfer.files);
        }
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-sm font-medium">{uploading ? 'Загрузка...' : 'Перетащите файлы сюда'}</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (макс. 10 МБ)</p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!uploading && (
          <label className="cursor-pointer">
            <input type="file" className="hidden" multiple onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
            <span className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <FileUp className="h-4 w-4" />
              Выбрать файлы
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
