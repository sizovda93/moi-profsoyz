"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  Upload,
  X,
  Loader2,
  Scale,
  MessageSquare,
} from "lucide-react";

/* ---------- constants ---------- */

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

/* ---------- types ---------- */

interface Attachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
}

interface LegalRequest {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  answerText: string | null;
  answeredByName: string | null;
  answeredAt: string | null;
  createdAt: string;
  attachments?: Attachment[];
  attachmentCount?: number;
}

/* ---------- page ---------- */

export default function AgentLegalPage() {
  const [requests, setRequests] = useState<LegalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // expand
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, LegalRequest>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  /* ---------- load list ---------- */

  const loadRequests = useCallback(() => {
    fetch("/api/legal-requests")
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /* ---------- expand / load detail ---------- */

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // Load full detail with attachments if not cached
    if (!expandedData[id]) {
      setLoadingDetail(id);
      try {
        const res = await fetch(`/api/legal-requests/${id}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedData((prev) => ({ ...prev, [id]: data }));
        }
      } catch {
        // silently fail
      } finally {
        setLoadingDetail(null);
      }
    }
  };

  /* ---------- upload ---------- */

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setAttachments((prev) => [
          ...prev,
          { fileName: data.fileName, fileUrl: data.fileUrl, fileSize: data.fileSize },
        ]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---------- create ---------- */

  const resetForm = () => {
    setSubject("");
    setCategory("other");
    setDescription("");
    setAttachments([]);
  };

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/legal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          description: description.trim(),
          attachments,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        setLoading(true);
        loadRequests();
      }
    } finally {
      setSaving(false);
    }
  };

  /* ---------- helpers ---------- */

  const getStatus = (status: string) =>
    statusLabels[status] ?? { label: status, variant: "secondary" as const };

  const formatFileSize = (size: number | null) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ---------- loading state ---------- */

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Вопрос юристу"
          description="Задайте вопрос по трудовому праву"
          breadcrumbs={[
            { title: "Дашборд", href: "/agent/dashboard" },
            { title: "Вопрос юристу" },
          ]}
        />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div>
      <PageHeader
        title="Вопрос юристу"
        description="Задайте вопрос по трудовому праву"
        breadcrumbs={[
          { title: "Дашборд", href: "/agent/dashboard" },
          { title: "Вопрос юристу" },
        ]}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Задать вопрос
          </Button>
        }
      />

      {/* ---------- empty state ---------- */}
      {requests.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">
              У вас пока нет вопросов юристу
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Задать вопрос
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---------- requests list ---------- */}
      <div className="space-y-3">
        {requests.map((req) => {
          const expanded = expandedId === req.id;
          const detail = expandedData[req.id];
          const st = getStatus(req.status);

          return (
            <Card key={req.id} className="overflow-hidden">
              {/* header row */}
              <button
                type="button"
                className="w-full text-left p-4 sm:p-6 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => toggleExpand(req.id)}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{req.subject}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <Badge variant="outline">{categoryLabels[req.category] ?? req.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(req.createdAt)}
                    {req.attachmentCount && Number(req.attachmentCount) > 0 && (
                      <span className="inline-flex items-center gap-0.5 ml-3">
                        <Paperclip className="h-3 w-3" />
                        {req.attachmentCount}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 pt-0.5 text-muted-foreground">
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* expanded content */}
              {expanded && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border pt-4 space-y-4">
                  {loadingDetail === req.id ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </div>
                  ) : (
                    <>
                      {/* description */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Описание</p>
                        <p className="text-sm whitespace-pre-line">
                          {detail?.description ?? req.description}
                        </p>
                      </div>

                      {/* attachments */}
                      {detail?.attachments && detail.attachments.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Прикреплённые файлы
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {detail.attachments.map((att, idx) => (
                              <a
                                key={att.id ?? idx}
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate">{att.fileName}</span>
                                {att.fileSize && (
                                  <span className="text-xs text-muted-foreground">
                                    ({formatFileSize(att.fileSize)})
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* answer */}
                      {(detail?.answerText ?? req.answerText) && (
                        <div className="mt-4 p-4 rounded-lg border-l-4 border-green-500 bg-green-500/5">
                          <p className="text-xs font-medium text-green-600 mb-2">
                            Ответ юриста
                            {(detail?.answeredByName ?? req.answeredByName) &&
                              ` (${detail?.answeredByName ?? req.answeredByName})`}
                          </p>
                          <p className="text-sm whitespace-pre-line">
                            {detail?.answerText ?? req.answerText}
                          </p>
                          {(detail?.answeredAt ?? req.answeredAt) && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate((detail?.answeredAt ?? req.answeredAt)!)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* no answer yet */}
                      {!(detail?.answerText ?? req.answerText) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          Ответ ещё не получен
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ---------- create dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Задать вопрос юристу</DialogTitle>
            <DialogDescription>
              Опишите вашу ситуацию, и юрист профсоюза ответит вам в ближайшее время
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* subject */}
            <div className="space-y-1.5">
              <label htmlFor="lr-subject" className="text-sm font-medium">
                Тема <span className="text-destructive">*</span>
              </label>
              <Input
                id="lr-subject"
                placeholder="Кратко опишите тему вопроса"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* category */}
            <div className="space-y-1.5">
              <label htmlFor="lr-category" className="text-sm font-medium">
                Категория
              </label>
              <select
                id="lr-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* description */}
            <div className="space-y-1.5">
              <label htmlFor="lr-description" className="text-sm font-medium">
                Описание <span className="text-destructive">*</span>
              </label>
              <textarea
                id="lr-description"
                placeholder="Подробно опишите вашу ситуацию или вопрос..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                style={{ minHeight: 120 }}
              />
            </div>

            {/* attachments */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Прикрепить файлы</label>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm rounded-lg border border-border bg-muted/50 px-3 py-2"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{att.fileName}</span>
                      {att.fileSize && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(att.fileSize)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Загрузка..." : "Выбрать файл"}
              </Button>
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG, WEBP, DOC, DOCX
              </p>
            </div>
          </div>

          {/* actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !subject.trim() || !description.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Отправить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
