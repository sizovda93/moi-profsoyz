"use client";

import { use, useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadDetailsPanel } from "@/components/leads/lead-details-panel";
import { LeadTimeline } from "@/components/leads/lead-timeline";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConflictBadge } from "@/components/dashboard/status-badges";
import { Lead, LeadStatus, TimelineEvent } from "@/types";
import { UserPlus, MessageSquare, AlertTriangle, Shield, ArrowRightLeft, SplitSquareHorizontal } from "lucide-react";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Новое" },
  { value: "contacted", label: "Принято" },
  { value: "qualified", label: "Подтверждено" },
  { value: "proposal", label: "На согласовании" },
  { value: "negotiation", label: "В работе" },
  { value: "won", label: "Решено" },
  { value: "lost", label: "Закрыто" },
];

interface ConflictLead {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  agentName?: string;
  createdAt: string;
  status: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ManagerLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<any>(null);
  const [conflictLead, setConflictLead] = useState<ConflictLead | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadLead = () =>
    fetch(`/api/leads/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setLead(data);
        // Load conflict lead details
        if (data?.conflictWithLeadId && data?.conflictStatus === "open") {
          fetch(`/api/leads/${data.conflictWithLeadId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then(setConflictLead)
            .catch(() => {});
        }
      });

  const loadEvents = () =>
    fetch(`/api/leads/${id}/events`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        setEvents(
          data.map((e) => ({
            id: e.id,
            title: e.eventType?.replace(/_/g, " ") || e.event_type?.replace(/_/g, " ") || "",
            description: e.details,
            date: e.createdAt || e.created_at,
            type: "status_change" as const,
          }))
        );
      });

  useEffect(() => {
    Promise.all([loadLead(), loadEvents()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead || newStatus === lead.status) return;
    setStatusSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
        setStatusMsg("Статус обновлён");
        loadEvents();
      } else {
        const err = await res.json();
        setStatusMsg(err.error || "Ошибка");
      }
    } catch {
      setStatusMsg("Ошибка сети");
    } finally {
      setStatusSaving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleResolve = async (resolution: string) => {
    setResolving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/leads/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
        setConflictLead(null);
        setStatusMsg("Конфликт решён");
        loadEvents();
      } else {
        const err = await res.json();
        setStatusMsg(err.error || "Ошибка");
      }
    } catch {
      setStatusMsg("Ошибка сети");
    } finally {
      setResolving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  if (loading) return <CardSkeleton />;

  if (!lead) {
    return (
      <div>
        <PageHeader title="Обращение не найдено" breadcrumbs={[{ title: "Обращения", href: "/manager/leads" }, { title: "Не найден" }]} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={lead.fullName}
        breadcrumbs={[
          { title: "Платформа", href: "/manager/dashboard" },
          { title: "Обращения", href: "/manager/leads" },
          { title: lead.fullName },
        ]}
        actions={
          <div className="flex gap-2">
            <ConflictBadge status={lead.conflictStatus} resolution={lead.conflictResolution} />
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-1" /> Назначить ответственного
            </Button>
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-1" /> Открыть диалог
            </Button>
          </div>
        }
      />

      {/* Conflict block */}
      {lead.conflictStatus === "open" && conflictLead && (
        <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" /> Потенциальный дубль
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-sm space-y-1">
                <p className="font-medium">Существующее обращение:</p>
                <p>{conflictLead.fullName}</p>
                <p className="text-muted-foreground">{conflictLead.phone}</p>
                {conflictLead.email && <p className="text-muted-foreground">{conflictLead.email}</p>}
                <p className="text-muted-foreground">Ответственный: {conflictLead.agentName || "—"}</p>
                <p className="text-muted-foreground">Создан: {formatDate(conflictLead.createdAt)}</p>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-medium">Текущее обращение:</p>
                <p>{lead.fullName}</p>
                <p className="text-muted-foreground">{lead.phone}</p>
                {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                <p className="text-muted-foreground">Ответственный: {lead.agentName || "—"}</p>
                <p className="text-muted-foreground">Создан: {formatDate(lead.createdAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleResolve("confirmed_duplicate")}
                disabled={resolving}
              >
                <Shield className="h-3.5 w-3.5 mr-1" /> Подтвердить дубль
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve("kept_existing")}
                disabled={resolving}
              >
                Оставить текущего owner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve("kept_separate")}
                disabled={resolving}
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1" /> Разные обращения
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status changer */}
      <Card className="mb-6">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Статус:</span>
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {statusSaving && <span className="text-xs text-muted-foreground">Сохранение...</span>}
          {statusMsg && <span className="text-xs text-muted-foreground">{statusMsg}</span>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadDetailsPanel lead={lead} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">История</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadTimeline events={events.length > 0 ? events : [
              { id: "t1", title: "Обращение создано", date: lead.createdAt, type: "status_change" },
            ]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
