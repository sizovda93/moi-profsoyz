"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LifecycleBadge, LeadStatusBadge } from "@/components/dashboard/status-badges";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { getInitials, formatDate } from "@/lib/utils";
import { Lead, AgentLifecycle } from "@/types";
import { CheckCircle2, Circle, ShieldCheck, UserX, UserCheck } from "lucide-react";

interface AgentData {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  specialization: string;
  activeLeads: number;
  totalLeads: number;
  totalRevenue: number;
  onboardingStatus: string;
  rating: number;
  userStatus: string;
  lifecycle: AgentLifecycle;
  tier: string;
  gender?: string;
  birthYear?: number | null;
  profession?: string | null;
  preferredMessenger?: string;
}

interface LearningModule {
  id: string;
  title: string;
  isRequired: boolean;
  lessons: { slug: string; title: string }[];
}

export default function ManagerAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);

  const loadAgent = () =>
    fetch(`/api/agents/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setAgent);

  useEffect(() => {
    Promise.all([
      loadAgent(),
      fetch("/api/leads")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setLeads(data.filter((l: Lead) => l.assignedAgentId === id));
        }),
      // Load agent learning modules
      fetch("/api/learning?role=agent")
        .then((r) => r.json())
        .then((data) => setModules(Array.isArray(data) ? data : [])),
      // Load agent learning progress (via admin-visible endpoint)
      fetch(`/api/learning/progress/agent/${id}`)
        .then((r) => (r.ok ? r.json() : { completedSlugs: [] }))
        .then((data) => setCompletedSlugs(data.completedSlugs || [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: "active" | "inactive") => {
    if (!agent || statusSaving) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAgent(updated);
      }
    } catch { /* ignore */ }
    finally { setStatusSaving(false); }
  };

  if (loading) return <LoadingSkeleton />;

  if (!agent) {
    return (
      <div>
        <PageHeader title="Член профсоюза не найден" breadcrumbs={[{ title: "Члены профсоюза", href: "/manager/agents" }, { title: "Не найден" }]} />
      </div>
    );
  }

  // Learning progress
  const requiredModules = modules.filter((m) => m.isRequired);
  const requiredLessons = requiredModules.flatMap((m) => m.lessons);
  const requiredDone = requiredLessons.filter((l) => completedSlugs.includes(l.slug)).length;

  return (
    <div>
      <PageHeader
        title={agent.fullName}
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Члены профсоюза", href: "/manager/agents" },
          { title: agent.fullName },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile card */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-4">
              <AvatarFallback className="text-lg">{getInitials(agent.fullName)}</AvatarFallback>
            </Avatar>
            <h2 className="font-semibold">{agent.fullName}</h2>
            <p className="text-sm text-muted-foreground mt-1">{agent.email}</p>
            <div className="flex gap-2 mt-3">
              <LifecycleBadge lifecycle={agent.lifecycle} />
            </div>

            {/* Status & tier controls */}
            <div className="w-full mt-4 flex justify-center gap-2 flex-wrap">
              {agent.userStatus === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("inactive")}
                  disabled={statusSaving}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Деактивировать
                </Button>
              ) : agent.userStatus === "inactive" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("active")}
                  disabled={statusSaving}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Активировать
                </Button>
              ) : null}
            </div>

            <div className="w-full mt-6 pt-6 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Город</span>
                <span>{agent.city || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Специализация</span>
                <span>{agent.specialization || "—"}</span>
              </div>
              {agent.profession && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Профессия</span>
                  <span>{agent.profession}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Телефон</span>
                <span>{agent.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Пол</span>
                <span>
                  {agent.gender === "male" ? "М" : agent.gender === "female" ? "Ж" : "—"}
                </span>
              </div>
              {agent.birthYear && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Возраст</span>
                  <span>{new Date().getFullYear() - agent.birthYear} лет</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Мессенджер</span>
                <span>
                  {agent.preferredMessenger === "telegram" ? "Telegram" :
                   agent.preferredMessenger === "max" ? "MAX" :
                   agent.preferredMessenger === "vk" ? "VK" : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Рейтинг</span>
                <span>⭐ {agent.rating}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Активные обращения" value={agent.activeLeads} icon="Users" />
            <StatCard title="Всего обращений" value={agent.totalLeads} icon="UserPlus" />
          </div>

          {/* Learning progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Прогресс обучения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  Обязательные модули: {requiredDone} из {requiredLessons.length}
                </span>
                {requiredLessons.length > 0 && requiredDone >= requiredLessons.length && (
                  <Badge variant="success">Завершено</Badge>
                )}
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all ${
                    requiredLessons.length > 0 && requiredDone >= requiredLessons.length
                      ? "bg-green-500"
                      : "bg-primary"
                  }`}
                  style={{
                    width: requiredLessons.length
                      ? `${(requiredDone / requiredLessons.length) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <div className="space-y-1">
                {requiredModules.map((mod) => {
                  const modDone = mod.lessons.filter((l) => completedSlugs.includes(l.slug)).length;
                  const allModDone = modDone === mod.lessons.length;
                  return (
                    <div key={mod.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium py-1">
                        {allModDone ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                        <span className={allModDone ? "text-muted-foreground" : ""}>
                          {mod.title}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {modDone}/{mod.lessons.length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Обращения члена профсоюза</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет обращений</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-3 font-medium">Имя</th>
                    <th className="text-left py-3 px-3 font-medium">Город</th>
                    <th className="text-left py-3 px-3 font-medium">Источник</th>
                    <th className="text-left py-3 px-3 font-medium">Статус</th>
                    <th className="text-left py-3 px-3 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/manager/leads/${l.id}`)}
                    >
                      <td className="py-3 px-3 font-medium">{l.fullName}</td>
                      <td className="py-3 px-3 text-muted-foreground">{l.city}</td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-xs">{l.source}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        <LeadStatusBadge status={l.status} />
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
