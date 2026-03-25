"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  Upload,
  X,
  Loader2,
  Scale,
  MessageSquare,
  Send,
  Eye,
  CheckCircle2,
  Clock,
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

  // form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
        resetForm();
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 4000);
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
          description="Задайте вопрос юристу профсоюза и получите ответ в течение 3 часов"
          breadcrumbs={[
            { title: "О платформе", href: "/agent/dashboard" },
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

  // Filter helpers
  const inProgressRequests = requests.filter((r) => ["new", "in_progress", "waiting"].includes(r.status));
  const answeredRequests = requests.filter((r) => r.status === "answered");
  const closedRequests = requests.filter((r) => r.status === "closed");

  const statusIcon = (status: string) => {
    if (status === "answered") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (status === "closed") return <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />;
    return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
  };

  /* ---------- request card component ---------- */

  const RequestCard = ({ req }: { req: LegalRequest }) => {
    const expanded = expandedId === req.id;
    const detail = expandedData[req.id];
    const st = getStatus(req.status);

    return (
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
          onClick={() => toggleExpand(req.id)}
        >
          <div className="mt-0.5 shrink-0">{statusIcon(req.status)}</div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{req.subject}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={st.variant}>{st.label}</Badge>
              <Badge variant="outline">{categoryLabels[req.category] ?? req.category}</Badge>
              <span className="text-[11px] text-muted-foreground">{formatDate(req.createdAt)}</span>
              {req.attachmentCount && Number(req.attachmentCount) > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {req.attachmentCount}
                </span>
              )}
              {req.answerText && (
                <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
                  <MessageSquare className="h-3 w-3" />
                  Есть ответ
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 pt-0.5 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
            {loadingDetail === req.id ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка...
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Описание</p>
                  <p className="text-sm whitespace-pre-line">{detail?.description ?? req.description}</p>
                </div>

                {detail?.attachments && detail.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Прикреплённые файлы</p>
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
                            <span className="text-xs text-muted-foreground">({formatFileSize(att.fileSize)})</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(detail?.answerText ?? req.answerText) && (
                  <div className="p-4 rounded-lg border-l-4 border-green-500 bg-green-500/5">
                    <p className="text-xs font-medium text-green-600 mb-2">
                      Ответ юриста
                      {(detail?.answeredByName ?? req.answeredByName) &&
                        ` (${detail?.answeredByName ?? req.answeredByName})`}
                    </p>
                    <p className="text-sm whitespace-pre-line">{detail?.answerText ?? req.answerText}</p>
                    {(detail?.answeredAt ?? req.answeredAt) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate((detail?.answeredAt ?? req.answeredAt)!)}
                      </p>
                    )}
                  </div>
                )}

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
  };

  /* ---------- render ---------- */

  return (
    <div>
      <PageHeader
        title="Вопрос юристу"
        description="Задайте вопрос юристу профсоюза и получите ответ в течение 3 часов"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Вопрос юристу" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== LEFT SIDEBAR ===== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Mascot */}
          <Card className="overflow-hidden !bg-[#2a2a2f] !border-[#3a3a42]">
            <CardContent className="p-0">
              <div className="relative" style={{ height: 160 }}>
                <video
                  src="/ai-cat/peek.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover brightness-110"
                />
              </div>
              <div className="px-3 py-2 bg-[#2a2a2f]">
                <p className="text-xs font-semibold text-[#fafafa]">Котофей Петрович</p>
                <p className="text-[9px] text-[#a0a0a8] leading-snug">Помощник по юридическим вопросам</p>
              </div>
            </CardContent>
          </Card>

          {/* Tip */}
          <div className="relative">
            <div className="bg-primary rounded-xl px-3.5 py-2.5">
              <p className="text-[13px] leading-relaxed text-primary-foreground">
                Если Ваш вопрос требует изучения документов и предварительного анализа, задайте его моему руководителю — ответ поступит в течение 3 часов.
              </p>
            </div>
            <div className="absolute -top-1 left-4 w-2.5 h-2.5 bg-primary rotate-45" />
          </div>

          {/* How it works */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold mb-3">Как это работает</p>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Вы задаёте вопрос юристу с описанием ситуации</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Eye className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Юрист профсоюза получает и рассматривает обращение</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Ответ появится в этом разделе</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground">Среднее время ответа — до 3 часов</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== RIGHT MAIN ZONE ===== */}
        <div className="lg:col-span-8 space-y-6">

          {/* --- INLINE FORM --- */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Задать вопрос юристу</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Опишите ситуацию — ответ появится в истории обращений ниже</p>
              </div>

              {submitSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700">Вопрос отправлен! Юрист ответит в течение 3 часов.</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Тема вопроса *</label>
                    <Input
                      placeholder="Например: вопрос по трудовому спору"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Категория</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Опишите ситуацию *</label>
                  <textarea
                    placeholder="Кратко опишите вашу ситуацию, чтобы юрист мог быстрее разобраться"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                    style={{ minHeight: 100 }}
                  />
                </div>

                {/* Attachments */}
                <div>
                  {attachments.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm rounded-lg border border-border bg-muted/50 px-3 py-2"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{att.fileName}</span>
                          {att.fileSize && (
                            <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>
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
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Загрузка..." : "Прикрепить файл"}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">PDF, JPG, PNG, DOC — при необходимости</span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    onClick={handleCreate}
                    disabled={saving || !subject.trim() || !description.trim()}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Отправить вопрос
                  </Button>
                  <span className="text-[10px] text-muted-foreground">Среднее время ответа — до 3 часов</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- HISTORY --- */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Мои вопросы</h3>

            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Scale className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold mb-1">У вас пока нет обращений к юристу</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      После отправки вопроса здесь появится история ваших обращений и ответы юриста
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {["Трудовые вопросы", "Документы", "Права работника", "Консультация"].map((chip) => (
                        <span key={chip} className="px-2.5 py-1 rounded-full bg-muted text-[10px] text-muted-foreground">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-3">
                  <TabsTrigger value="all">
                    Все
                    {requests.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({requests.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="in_progress">
                    В работе
                    {inProgressRequests.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({inProgressRequests.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="answered">
                    Отвечено
                    {answeredRequests.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({answeredRequests.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="closed">
                    Закрыто
                    {closedRequests.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({closedRequests.length})</span>}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <div className="space-y-2">
                    {requests.map((req) => <RequestCard key={req.id} req={req} />)}
                  </div>
                </TabsContent>
                <TabsContent value="in_progress">
                  {inProgressRequests.length === 0 ? (
                    <Card><CardContent className="py-8 text-center"><p className="text-sm text-muted-foreground">Нет вопросов в работе</p></CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {inProgressRequests.map((req) => <RequestCard key={req.id} req={req} />)}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="answered">
                  {answeredRequests.length === 0 ? (
                    <Card><CardContent className="py-8 text-center"><p className="text-sm text-muted-foreground">Нет отвеченных вопросов</p></CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {answeredRequests.map((req) => <RequestCard key={req.id} req={req} />)}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="closed">
                  {closedRequests.length === 0 ? (
                    <Card><CardContent className="py-8 text-center"><p className="text-sm text-muted-foreground">Нет закрытых вопросов</p></CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {closedRequests.map((req) => <RequestCard key={req.id} req={req} />)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
