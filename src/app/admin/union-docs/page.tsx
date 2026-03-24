"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Archive,
  Upload,
  X,
  Check,
  FileText,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface UnionDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  status: "draft" | "published" | "archived";
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  status: "draft" | "published";
}

const emptyForm: FormState = {
  title: "",
  description: "",
  category: "other",
  fileName: "",
  fileUrl: "",
  fileSize: null,
  status: "draft",
};

const categoryLabels: Record<string, string> = {
  regulations: "Нормативные документы",
  agreements: "Соглашения",
  reports: "Отчёты",
  templates: "Шаблоны",
  other: "Прочее",
};

const statusConfig: Record<
  string,
  { label: string; variant: "secondary" | "success" | "warning" }
> = {
  draft: { label: "Черновик", variant: "secondary" },
  published: { label: "Опубликовано", variant: "success" },
  archived: { label: "В архиве", variant: "warning" },
};

export default function AdminUnionDocsPage() {
  const [docs, setDocs] = useState<UnionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(
    () =>
      fetch("/api/union-documents")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setDocs(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadDocs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (doc: UnionDocument) => {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      description: doc.description || "",
      category: doc.category || "other",
      fileName: doc.fileName || "",
      fileUrl: doc.fileUrl || "",
      fileSize: doc.fileSize || null,
      status: doc.status === "archived" ? "draft" : doc.status,
    });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({
          ...f,
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileSize: file.size,
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.fileUrl) return;
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      fileName: form.fileName,
      fileUrl: form.fileUrl,
      fileSize: form.fileSize,
      status: form.status,
    };

    try {
      const url = editingId
        ? `/api/union-documents/${editingId}`
        : "/api/union-documents";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDialogOpen(false);
        loadDocs();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (doc: UnionDocument) => {
    const newStatus = doc.status === "published" ? "draft" : "published";
    await fetch(`/api/union-documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadDocs();
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/union-documents/${id}`, { method: "DELETE" });
    loadDocs();
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  if (loading) return <LoadingSkeleton />;

  const totalCount = docs.length;
  const publishedCount = docs.filter((d) => d.status === "published").length;

  const columns = [
    {
      key: "title",
      title: "Название",
      render: (d: UnionDocument) => (
        <div className="max-w-md">
          <p className="font-medium flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {d.title}
          </p>
          {d.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {d.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      title: "Категория",
      render: (d: UnionDocument) => (
        <Badge variant="secondary">
          {categoryLabels[d.category] || categoryLabels.other}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (d: UnionDocument) => {
        const cfg = statusConfig[d.status] || statusConfig.draft;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "file",
      title: "Файл",
      render: (d: UnionDocument) => (
        <span className="text-xs text-muted-foreground">
          {d.fileName ? (
            <span className="flex items-center gap-1">
              <span className="truncate max-w-[150px]">{d.fileName}</span>
              {d.fileSize ? (
                <span className="shrink-0">({formatFileSize(d.fileSize)})</span>
              ) : null}
            </span>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "date",
      title: "Дата",
      render: (d: UnionDocument) => (
        <span className="text-muted-foreground">
          {formatDate(d.publishedAt || d.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (d: UnionDocument) => (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Редактировать"
            onClick={() => openEdit(d)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title={
              d.status === "published"
                ? "Снять с публикации"
                : "Опубликовать"
            }
            onClick={() => handleTogglePublish(d)}
          >
            {d.status === "published" ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          {d.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-warning"
              title="В архив"
              onClick={() => handleArchive(d.id)}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Документы профсоюза"
        description="Управление документами организации"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Документы профсоюза" },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Добавить документ
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего документов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Опубликовано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">
              {publishedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={docs}
        onRowClick={(d: UnionDocument) => openEdit(d)}
        emptyMessage="Нет документов. Добавьте первый документ."
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать документ" : "Новый документ"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Внесите изменения и сохраните"
                : "Заполните данные документа"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium">Название *</label>
              <Input
                className="mt-1"
                placeholder="Название документа"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Описание</label>
              <Input
                className="mt-1"
                placeholder="Краткое описание документа"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium">Категория</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="text-sm font-medium">Файл *</label>
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploading ? "Загрузка..." : "Загрузить файл"}
                  </Button>
                  {form.fileUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          fileUrl: "",
                          fileName: "",
                          fileSize: null,
                        }))
                      }
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Удалить
                    </Button>
                  )}
                </div>
                {form.fileName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-border px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{form.fileName}</span>
                    {form.fileSize && (
                      <span className="shrink-0 text-xs">
                        ({formatFileSize(form.fileSize)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium">Статус</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "draft" | "published",
                  })
                }
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              {editingId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleArchive(editingId);
                    setDialogOpen(false);
                  }}
                >
                  <Archive className="h-3.5 w-3.5 mr-1" /> В архив
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    saving || !form.title.trim() || !form.fileUrl
                  }
                >
                  {saving ? (
                    "Сохранение..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Сохранить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
