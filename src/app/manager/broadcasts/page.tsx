"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTime } from "@/lib/utils";
import { Send, ChevronLeft, CheckCircle, XCircle, MinusCircle } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface AgentOption {
  id: string;
  fullName: string;
  lifecycle: string;
}

interface BroadcastRow {
  id: string;
  title: string | null;
  text: string;
  channel: string;
  audienceType: string;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

interface RecipientRow {
  id: string;
  agentId: string;
  agentName: string;
  channelWeb: string;
  channelTg: string;
  errorDetails: string | null;
}

interface BroadcastDetail extends BroadcastRow {
  senderName: string;
  recipients: RecipientRow[];
}

type AudienceType = "all" | "active" | "activated" | "learning" | "sleeping" | "no_telegram" | "manual";
type ChannelType = "web" | "telegram" | "both";
type View = "list" | "create" | "detail";

const audienceLabels: Record<AudienceType, string> = {
  all: "Все мои партнёры",
  active: "Активные (есть лиды)",
  activated: "Готовы, без первого лида",
  learning: "На обучении",
  sleeping: "Спящие (30+ дней)",
  no_telegram: "Без Telegram",
  manual: "Выбрать вручную",
};

const channelLabels: Record<ChannelType, string> = {
  web: "Web (уведомление)",
  telegram: "Telegram",
  both: "Web + Telegram",
};

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    web: "bg-blue-500/10 text-blue-500",
    telegram: "bg-cyan-500/10 text-cyan-500",
    both: "bg-violet-500/10 text-violet-500",
  };
  return (
    <Badge className={colors[channel] || "bg-muted text-muted-foreground"}>
      {channelLabels[channel as ChannelType] || channel}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "sent") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

export default function ManagerBroadcastsPage() {
  const [view, setView] = useState<View>("list");
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<ChannelType>("both");
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Detail state
  const [detail, setDetail] = useState<BroadcastDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadBroadcasts = useCallback(() =>
    fetch("/api/broadcasts")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBroadcasts), []);

  const loadAgents = useCallback(() =>
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAgents), []);

  useEffect(() => {
    Promise.all([loadBroadcasts(), loadAgents()]).finally(() => setLoading(false));
  }, [loadBroadcasts, loadAgents]);

  const resetForm = () => {
    setTitle("");
    setText("");
    setChannel("both");
    setAudienceType("all");
    setSelectedAgents([]);
    setError(null);
    setSuccess(null);
  };

  const handleCreate = () => {
    resetForm();
    setView("create");
  };

  const handleBack = () => {
    setView("list");
    setDetail(null);
    setError(null);
    setSuccess(null);
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    setView("detail");
    try {
      const res = await fetch(`/api/broadcasts/${id}`);
      if (res.ok) {
        setDetail(await res.json());
      }
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const handleSend = async () => {
    if (!text.trim()) {
      setError("Введите текст сообщения");
      return;
    }
    if (audienceType === "manual" && selectedAgents.length === 0) {
      setError("Выберите хотя бы одного партнёра");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          text: text.trim(),
          channel,
          audienceType,
          agentIds: audienceType === "manual" ? selectedAgents : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка отправки");
        return;
      }

      setSuccess(
        `Рассылка отправлена: ${data.deliveredCount} из ${data.totalRecipients} получателей`
      );
      await loadBroadcasts();

      // Show result for 3 seconds, then go to list
      setTimeout(() => {
        setView("list");
        setSuccess(null);
      }, 3000);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  if (loading) return <LoadingSkeleton />;

  // ==================== DETAIL VIEW ====================
  if (view === "detail") {
    return (
      <div>
        <PageHeader
          title="Детали рассылки"
          breadcrumbs={[
            { title: "Дашборд", href: "/manager/dashboard" },
            { title: "Рассылки" },
            { title: "Детали" },
          ]}
          actions={
            <Button size="sm" variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
          }
        />
        {detailLoading ? (
          <LoadingSkeleton />
        ) : detail ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-3">
                {detail.title && (
                  <div>
                    <span className="text-sm text-muted-foreground">Заголовок: </span>
                    <span className="font-medium">{detail.title}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Текст: </span>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{detail.text}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Канал: </span>
                    <ChannelBadge channel={detail.channel} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Аудитория: </span>
                    <span>{audienceLabels[detail.audienceType as AudienceType] || detail.audienceType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата: </span>
                    <span>{formatDateTime(detail.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-500">Доставлено: {detail.deliveredCount}</span>
                  {detail.failedCount > 0 && (
                    <span className="text-red-500">Ошибки: {detail.failedCount}</span>
                  )}
                  <span className="text-muted-foreground">Всего: {detail.totalRecipients}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Получатели</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                        <th className="px-3 py-2">Партнёр</th>
                        <th className="px-3 py-2">Web</th>
                        <th className="px-3 py-2">Telegram</th>
                        <th className="px-3 py-2">Ошибка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.recipients.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{r.agentName}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <StatusIcon status={r.channelWeb} />
                              <span className="text-xs text-muted-foreground">{r.channelWeb}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <StatusIcon status={r.channelTg} />
                              <span className="text-xs text-muted-foreground">{r.channelTg}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-red-400">{r.errorDetails || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState title="Рассылка не найдена" />
        )}
      </div>
    );
  }

  // ==================== CREATE VIEW ====================
  if (view === "create") {
    return (
      <div>
        <PageHeader
          title="Новая рассылка"
          breadcrumbs={[
            { title: "Дашборд", href: "/manager/dashboard" },
            { title: "Рассылки" },
            { title: "Новая" },
          ]}
          actions={
            <Button size="sm" variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Title */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Заголовок <span className="text-xs">(необязательно)</span>
              </label>
              <Input
                placeholder="Тема рассылки..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Text */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Сообщение *</label>
              <textarea
                className="flex w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-32 resize-y"
                placeholder="Текст рассылки..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            {/* Channel */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Канал доставки</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(channelLabels) as ChannelType[]).map((ch) => (
                  <Button
                    key={ch}
                    size="sm"
                    variant={channel === ch ? "default" : "outline"}
                    onClick={() => setChannel(ch)}
                  >
                    {channelLabels[ch]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Аудитория</label>
              <select
                className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={audienceType}
                onChange={(e) => {
                  setAudienceType(e.target.value as AudienceType);
                  setSelectedAgents([]);
                }}
              >
                {(Object.keys(audienceLabels) as AudienceType[]).map((at) => (
                  <option key={at} value={at}>{audienceLabels[at]}</option>
                ))}
              </select>
            </div>

            {/* Manual agent selection */}
            {audienceType === "manual" && (
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  Выберите партнёров ({selectedAgents.length} выбрано)
                </label>
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {agents.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">Нет закреплённых партнёров</p>
                  ) : (
                    agents.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgents.includes(a.id)}
                          onChange={() => toggleAgent(a.id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm">{a.fullName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{a.lifecycle}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {audienceType === "manual"
                ? `Будет отправлено ${selectedAgents.length} партнёрам`
                : `Сегмент: ${audienceLabels[audienceType]}`
              }
              {" через "}
              {channelLabels[channel].toLowerCase()}
            </div>

            {/* Error / Success */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-500">
                {success}
              </div>
            )}

            {/* Send button */}
            <Button className="w-full" onClick={handleSend} disabled={sending || !!success}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Отправка..." : "Отправить рассылку"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== LIST VIEW (default) ====================
  return (
    <div>
      <PageHeader
        title="Рассылки"
        description="Массовые сообщения для ваших партнёров"
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Рассылки" },
        ]}
        actions={
          <Button size="sm" onClick={handleCreate}>
            <Send className="h-4 w-4 mr-1" /> Новая рассылка
          </Button>
        }
      />

      {broadcasts.length === 0 ? (
        <EmptyState
          title="Нет рассылок"
          description="Создайте первую рассылку для ваших партнёров"
          action={
            <Button size="sm" onClick={handleCreate}>
              <Send className="h-4 w-4 mr-1" /> Создать рассылку
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <Card
              key={b.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => handleViewDetail(b.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {b.title && <span className="font-medium text-sm">{b.title}</span>}
                      <ChannelBadge channel={b.channel} />
                      <Badge variant="outline" className="text-xs">
                        {audienceLabels[b.audienceType as AudienceType] || b.audienceType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{b.text}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</p>
                    <p className="text-sm mt-1">
                      <span className="text-green-500">{b.deliveredCount}</span>
                      {b.failedCount > 0 && (
                        <span className="text-red-500"> / {b.failedCount} err</span>
                      )}
                      <span className="text-muted-foreground"> / {b.totalRecipients}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
