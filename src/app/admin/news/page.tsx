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
  Star,
  Image,
  Video,
  Archive,
  Upload,
  X,
  Check,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  mediaType: "none" | "image" | "video";
  mediaUrl: string | null;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FormState {
  title: string;
  excerpt: string;
  content: string;
  mediaType: "none" | "image" | "video";
  mediaUrl: string;
  status: "draft" | "published";
  isFeatured: boolean;
}

const emptyForm: FormState = {
  title: "",
  excerpt: "",
  content: "",
  mediaType: "none",
  mediaUrl: "",
  status: "draft",
  isFeatured: false,
};

const statusConfig: Record<string, { label: string; variant: "secondary" | "success" | "warning" }> = {
  draft: { label: "Черновик", variant: "secondary" },
  published: { label: "Опубликовано", variant: "success" },
  archived: { label: "В архиве", variant: "warning" },
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNews = useCallback(() =>
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false)),
  []);

  useEffect(() => { loadNews(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (article: NewsArticle) => {
    setEditingId(article.id);
    setForm({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content,
      mediaType: article.mediaType || "none",
      mediaUrl: article.mediaUrl || "",
      status: article.status === "archived" ? "draft" : article.status,
      isFeatured: article.isFeatured,
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
        setForm((f) => ({ ...f, mediaUrl: data.fileUrl }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      mediaType: form.mediaType,
      mediaUrl: form.mediaType === "none" ? null : form.mediaUrl || null,
      status: form.status,
      isFeatured: form.isFeatured,
    };

    try {
      const url = editingId ? `/api/news/${editingId}` : "/api/news";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDialogOpen(false);
        loadNews();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    const newStatus = article.status === "published" ? "draft" : "published";
    await fetch(`/api/news/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadNews();
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/news/${id}`, { method: "DELETE" });
    loadNews();
  };

  if (loading) return <LoadingSkeleton />;

  const totalCount = news.length;
  const publishedCount = news.filter((n) => n.status === "published").length;
  const draftCount = news.filter((n) => n.status === "draft").length;

  const columns = [
    {
      key: "title",
      title: "Заголовок",
      render: (n: NewsArticle) => (
        <div className="max-w-md">
          <p className="font-medium flex items-center gap-1.5">
            {n.isFeatured && <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
            {n.title}
          </p>
          {n.excerpt && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.excerpt}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (n: NewsArticle) => {
        const cfg = statusConfig[n.status] || statusConfig.draft;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "media",
      title: "Медиа",
      render: (n: NewsArticle) => {
        if (n.mediaType === "image") return <Image className="h-4 w-4 text-muted-foreground" />;
        if (n.mediaType === "video") return <Video className="h-4 w-4 text-muted-foreground" />;
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "date",
      title: "Дата",
      render: (n: NewsArticle) => (
        <span className="text-muted-foreground">
          {formatDate(n.publishedAt || n.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (n: NewsArticle) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Редактировать"
            onClick={() => openEdit(n)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title={n.status === "published" ? "Снять с публикации" : "Опубликовать"}
            onClick={() => handleTogglePublish(n)}
          >
            {n.status === "published" ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          {n.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-warning"
              title="В архив"
              onClick={() => handleArchive(n.id)}
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
        title="Новости"
        description="Управление новостями профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Новости" },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Создать новость
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Опубликовано</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">{publishedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Черновики</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-muted-foreground">{draftCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={news}
        onRowClick={(n: NewsArticle) => openEdit(n)}
        emptyMessage="Нет новостей. Создайте первую новость."
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать новость" : "Новая новость"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Внесите изменения и сохраните" : "Заполните данные новости"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium">Заголовок *</label>
              <Input
                className="mt-1"
                placeholder="Заголовок новости"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="text-sm font-medium">Краткое описание</label>
              <Input
                className="mt-1"
                placeholder="Краткое описание для ленты"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium">Текст новости *</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                style={{ minHeight: "120px" }}
                placeholder="Полный текст новости..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>

            {/* Media */}
            <div>
              <label className="text-sm font-medium">Медиа</label>
              <div className="flex gap-2 mt-1">
                {(["none", "image", "video"] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={form.mediaType === type ? "default" : "outline"}
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        mediaType: type,
                        mediaUrl: type === "none" ? "" : f.mediaUrl,
                      }));
                    }}
                  >
                    {type === "none" && "Без медиа"}
                    {type === "image" && (
                      <>
                        <Image className="h-3.5 w-3.5 mr-1" /> Изображение
                      </>
                    )}
                    {type === "video" && (
                      <>
                        <Video className="h-3.5 w-3.5 mr-1" /> Видео
                      </>
                    )}
                  </Button>
                ))}
              </div>

              {form.mediaType !== "none" && (
                <div className="mt-3 space-y-3">
                  {/* Upload area */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={form.mediaType === "image" ? "image/*" : "video/*"}
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
                    {form.mediaUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setForm((f) => ({ ...f, mediaUrl: "", mediaType: "none" }))}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Удалить
                      </Button>
                    )}
                  </div>

                  {/* Preview */}
                  {form.mediaUrl && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      {form.mediaType === "image" ? (
                        <img
                          src={form.mediaUrl}
                          alt="Превью"
                          className="max-h-48 w-auto object-contain"
                        />
                      ) : (
                        <video
                          src={form.mediaUrl}
                          controls
                          className="max-h-48 w-full"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status + Featured */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Статус</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}
                >
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                </select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  id="is-featured"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                />
                <label htmlFor="is-featured" className="text-sm flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500" /> Закрепить
                </label>
              </div>
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
                <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
                  {saving ? "Сохранение..." : (
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
