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
  Image,
  Video,
  Archive,
  Upload,
  X,
  Check,
  CalendarDays,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface UnionEvent {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  eventDate: string | null;
  mediaType: "none" | "image" | "video";
  mediaUrl: string | null;
  status: "draft" | "published" | "archived";
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FormState {
  title: string;
  excerpt: string;
  content: string;
  eventDate: string;
  mediaType: "none" | "image" | "video";
  mediaUrl: string;
  status: "draft" | "published";
}

const emptyForm: FormState = {
  title: "",
  excerpt: "",
  content: "",
  eventDate: "",
  mediaType: "none",
  mediaUrl: "",
  status: "draft",
};

const statusConfig: Record<
  string,
  { label: string; variant: "secondary" | "success" | "warning" }
> = {
  draft: { label: "Черновик", variant: "secondary" },
  published: { label: "Опубликовано", variant: "success" },
  archived: { label: "В архиве", variant: "warning" },
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<UnionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEvents = useCallback(
    () =>
      fetch("/api/union-events")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setEvents(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadEvents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (event: UnionEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      excerpt: event.excerpt || "",
      content: event.content,
      eventDate: event.eventDate
        ? new Date(event.eventDate).toISOString().split("T")[0]
        : "",
      mediaType: event.mediaType || "none",
      mediaUrl: event.mediaUrl || "",
      status: event.status === "archived" ? "draft" : event.status,
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
      eventDate: form.eventDate || null,
      mediaType: form.mediaType,
      mediaUrl: form.mediaType === "none" ? null : form.mediaUrl || null,
      status: form.status,
    };

    try {
      const url = editingId
        ? `/api/union-events/${editingId}`
        : "/api/union-events";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDialogOpen(false);
        loadEvents();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (event: UnionEvent) => {
    const newStatus = event.status === "published" ? "draft" : "published";
    await fetch(`/api/union-events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadEvents();
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/union-events/${id}`, { method: "DELETE" });
    loadEvents();
  };

  if (loading) return <LoadingSkeleton />;

  const totalCount = events.length;
  const publishedCount = events.filter((e) => e.status === "published").length;
  const draftCount = events.filter((e) => e.status === "draft").length;

  const columns = [
    {
      key: "title",
      title: "Название",
      render: (e: UnionEvent) => (
        <div className="max-w-md">
          <p className="font-medium">{e.title}</p>
          {e.excerpt && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {e.excerpt}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "eventDate",
      title: "Дата мероприятия",
      render: (e: UnionEvent) => (
        <span className="text-muted-foreground flex items-center gap-1.5">
          {e.eventDate ? (
            <>
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatDate(e.eventDate)}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (e: UnionEvent) => {
        const cfg = statusConfig[e.status] || statusConfig.draft;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "media",
      title: "Медиа",
      render: (e: UnionEvent) => {
        if (e.mediaType === "image")
          return <Image className="h-4 w-4 text-muted-foreground" />;
        if (e.mediaType === "video")
          return <Video className="h-4 w-4 text-muted-foreground" />;
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "actions",
      title: "",
      render: (e: UnionEvent) => (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(ev) => ev.stopPropagation()}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Редактировать"
            onClick={() => openEdit(e)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title={
              e.status === "published"
                ? "Снять с публикации"
                : "Опубликовать"
            }
            onClick={() => handleTogglePublish(e)}
          >
            {e.status === "published" ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          {e.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-warning"
              title="В архив"
              onClick={() => handleArchive(e.id)}
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
        title="Мероприятия"
        description="Управление мероприятиями профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Мероприятия" },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Создать мероприятие
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Черновики
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-muted-foreground">
              {draftCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={events}
        onRowClick={(e: UnionEvent) => openEdit(e)}
        emptyMessage="Нет мероприятий. Создайте первое мероприятие."
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? "Редактировать мероприятие"
                : "Новое мероприятие"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Внесите изменения и сохраните"
                : "Заполните данные мероприятия"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium">Название *</label>
              <Input
                className="mt-1"
                placeholder="Название мероприятия"
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
                onChange={(e) =>
                  setForm({ ...form, excerpt: e.target.value })
                }
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium">
                Описание мероприятия *
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                style={{ minHeight: "120px" }}
                placeholder="Полное описание мероприятия..."
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
              />
            </div>

            {/* Event Date */}
            <div>
              <label className="text-sm font-medium">Дата мероприятия</label>
              <Input
                type="date"
                className="mt-1"
                value={form.eventDate}
                onChange={(e) =>
                  setForm({ ...form, eventDate: e.target.value })
                }
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
                      accept={
                        form.mediaType === "image" ? "image/*" : "video/*"
                      }
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
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            mediaUrl: "",
                            mediaType: "none",
                          }))
                        }
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
                    saving || !form.title.trim() || !form.content.trim()
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
