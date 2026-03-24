"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Scale,
  User,
  Mail,
  Phone,
  Building,
  Paperclip,
  FileText,
  Download,
  Check,
  Loader2,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ──────────────────────────────────────────────────────────────────────

interface LegalRequest {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  divisionName: string | null;
  subject: string;
  category: string;
  description: string;
  status: string;
  answerText: string | null;
  answeredByName: string | null;
  answeredAt: string | null;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface LegalRequestDetail extends LegalRequest {
  authorPhone: string | null;
  unionName: string | null;
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    createdAt: string;
  }[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  labor_disputes: "Трудовые споры",
  dismissal: "Увольнение",
  salary: "Заработная плата",
  vacation: "Отпуск",
  labor_safety: "Охрана труда",
  disciplinary: "Дисциплинарные взыскания",
  benefits: "Льготы и гарантии",
  other: "Другое",
};

const statusLabels: Record<
  string,
  { label: string; variant: "info" | "warning" | "secondary" | "success" | "destructive" }
> = {
  new: { label: "Новый", variant: "info" },
  in_progress: { label: "В работе", variant: "warning" },
  waiting: { label: "Ожидание", variant: "secondary" },
  answered: { label: "Отвечен", variant: "success" },
  closed: { label: "Закрыт", variant: "secondary" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function AdminLegalPage() {
  const [requests, setRequests] = useState<LegalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LegalRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Load list ──────────────────────────────────────────────────────────────

  const loadData = useCallback(() => {
    fetch("/api/legal-requests")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load detail ────────────────────────────────────────────────────────────

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/legal-requests/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        setAnswerText(data.answerText || "");
        setNewStatus(data.status);
      }
    } catch {
      // silently fail
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Save handler ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body: any = { status: newStatus };
      if (answerText.trim()) body.answerText = answerText;
      const res = await fetch(`/api/legal-requests/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSelectedId(null);
        setDetail(null);
        loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Close dialog ───────────────────────────────────────────────────────────

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setAnswerText("");
    setNewStatus("");
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />;

  // ── Computed ───────────────────────────────────────────────────────────────

  const filtered = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    return true;
  });

  const totalCount = requests.length;
  const newCount = requests.filter((r) => r.status === "new").length;
  const answeredCount = requests.filter((r) => r.status === "answered").length;

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns = [
    {
      key: "subject",
      title: "Тема",
      render: (r: LegalRequest) => (
        <div className="max-w-xs">
          <p className="font-medium line-clamp-1">{r.subject}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{r.authorName}</p>
        </div>
      ),
    },
    {
      key: "division",
      title: "Подразделение",
      render: (r: LegalRequest) => (
        <span className="text-muted-foreground text-sm">
          {r.divisionName || "—"}
        </span>
      ),
    },
    {
      key: "category",
      title: "Категория",
      render: (r: LegalRequest) => (
        <Badge variant="outline">{categoryLabels[r.category] || r.category}</Badge>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (r: LegalRequest) => {
        const cfg = statusLabels[r.status] || statusLabels.new;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "attachments",
      title: "Файлы",
      render: (r: LegalRequest) =>
        r.attachmentCount > 0 ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            {r.attachmentCount}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "date",
      title: "Дата",
      render: (r: LegalRequest) => (
        <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Юридические вопросы"
        description="Вопросы членов профсоюза юристу"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Юридические вопросы" },
        ]}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Новых</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-info">{newCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Отвечено</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">{answeredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Все категории</option>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {(statusFilter || categoryFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("");
              setCategoryFilter("");
            }}
          >
            Сбросить
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          Показано: {filtered.length} из {totalCount}
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(r: LegalRequest) => loadDetail(r.id)}
        emptyMessage="Нет юридических вопросов"
      />

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {detailLoading ? "Загрузка..." : detail?.subject || "Вопрос"}
            </DialogTitle>
            <DialogDescription>
              Просмотр и ответ на юридический вопрос
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-5 mt-4">
              {/* Author info */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Автор</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {detail.authorName}
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {detail.authorEmail}
                  </span>
                  {detail.authorPhone && (
                    <span className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {detail.authorPhone}
                    </span>
                  )}
                  {detail.divisionName && (
                    <span className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      {detail.divisionName}
                      {detail.unionName && ` (${detail.unionName})`}
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {categoryLabels[detail.category] || detail.category}
                </Badge>
                <Badge variant={statusLabels[detail.status]?.variant || "secondary"}>
                  {statusLabels[detail.status]?.label || detail.status}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(detail.createdAt)}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium mb-1">Описание</p>
                <div className="rounded-lg border border-border p-4 text-sm whitespace-pre-line">
                  {detail.description}
                </div>
              </div>

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Вложения ({detail.attachments.length})
                  </p>
                  <div className="space-y-1.5">
                    {detail.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{att.fileName}</span>
                        {att.fileSize && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatFileSize(att.fileSize)}
                          </span>
                        )}
                        <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing answer */}
              {detail.answerText && detail.answeredByName && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <p className="text-sm font-medium text-success mb-1">
                    Ответ от {detail.answeredByName}
                  </p>
                  {detail.answeredAt && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatDate(detail.answeredAt)}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-line">{detail.answerText}</p>
                </div>
              )}

              {/* Answer form */}
              <div>
                <label className="text-sm font-medium">Ответ юриста</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  style={{ minHeight: "100px" }}
                  placeholder="Введите ответ на вопрос..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                />
              </div>

              {/* Status select */}
              <div>
                <label className="text-sm font-medium">Статус</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {Object.entries(statusLabels).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDetail}>
                  Отмена
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Сохранение...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Сохранить
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Не удалось загрузить данные
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
