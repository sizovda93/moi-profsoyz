"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/dashboard/status-badges";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Rocket, Lightbulb, UserPlus, BookOpen, Share2, GraduationCap, MessageSquare, DollarSign } from "lucide-react";
import { Lead, Conversation, AgentTier } from "@/types";
import { TierBadge } from "@/components/dashboard/status-badges";
import { AvatarHelper } from "@/components/avatar/avatar-helper";

interface ChecklistState {
  profileFilled: boolean;
  learningDone: boolean;
  telegramConnected: boolean;
  firstLead: boolean;
}

export default function AgentDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<{ totalRevenue?: number }>({});
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistState | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [agentRank, setAgentRank] = useState<{ rank: number | null; totalAgents: number } | null>(null);
  const [agentTier, setAgentTier] = useState<AgentTier>("base");

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/conversations").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/learning/progress").then((r) => r.json()).catch(() => null),
      fetch("/api/telegram/status").then((r) => r.json()).catch(() => ({ connected: false })),
      fetch("/api/analytics").then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([ld, cv, st, profile, progress, tgStatus, analyticsData]) => {
        const leadsArr = Array.isArray(ld) ? ld : [];
        setLeads(leadsArr);
        setConversations(Array.isArray(cv) ? cv : []);
        setStats(st || {});

        // Build checklist from existing data
        const cl: ChecklistState = {
          profileFilled: !!(profile?.city && profile?.phone),
          learningDone: progress?.allRequiredDone === true,
          telegramConnected: tgStatus?.connected === true,
          firstLead: leadsArr.length > 0,
        };
        setChecklist(cl);

        // Show checklist if not all done
        const allDone = cl.profileFilled && cl.learningDone && cl.telegramConnected && cl.firstLead;
        setShowChecklist(!allDone);

        if (analyticsData?.agentRank) {
          setAgentRank(analyticsData.agentRank);
        }
        if (profile?.tier) {
          setAgentTier(profile.tier as AgentTier);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status));
  const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  const checklistItems = checklist ? [
    { done: checklist.profileFilled, label: "Заполнить профиль (город и телефон)", href: "/agent/profile" },
    { done: checklist.learningDone, label: "Пройти обязательное обучение", href: "/agent/learning" },
    { done: checklist.telegramConnected, label: "Подключить Telegram", href: "/agent/profile" },
    { done: checklist.firstLead, label: "Создать первый лид", href: "/agent/leads" },
  ] : [];

  const completedSteps = checklistItems.filter((i) => i.done).length;

  // Retention reminders (for agents who finished checklist but need nudges)
  const retentionReminders: { label: string; href: string }[] = [];
  if (!showChecklist && checklist) {
    if (leads.length === 0) {
      retentionReminders.push({ label: "Создайте первый лид — это просто!", href: "/agent/leads" });
    }
    if (leads.length > 0 && leads.length < 3) {
      retentionReminders.push({ label: "Попробуйте маркетинговые материалы для привлечения клиентов", href: "/agent/marketing" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Обзор вашей активности и ключевые показатели"
      />

      {/* Onboarding Checklist */}
      {showChecklist && checklist && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Начало работы</h3>
                <p className="text-xs text-muted-foreground">{completedSteps} из {checklistItems.length} шагов выполнено</p>
              </div>
            </div>
            <div className="space-y-2">
              {checklistItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-background/60 transition-colors group"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm ${item.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {item.label}
                  </span>
                  {!item.done && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention reminders */}
      {retentionReminders.length > 0 && (
        <Card className="mb-6 p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Подсказка</span>
          </div>
          <div className="space-y-2">
            {retentionReminders.map((r, i) => (
              <Link key={i} href={r.href} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ArrowRight className="h-3 w-3" /> {r.label}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Rank + Tier */}
      {agentRank?.rank && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Ваш рейтинг:</span>
              <span className="text-lg font-bold">#{agentRank.rank}</span>
              <span className="text-sm text-muted-foreground">из {agentRank.totalAgents}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Уровень:</span>
              <TierBadge tier={agentTier} />
            </div>
          </div>
        </Card>
      )}

      {/* How to earn block */}
      <Card className="mb-6 border-green-500/20 bg-green-500/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Как зарабатывать с платформой</h3>
              <p className="text-xs text-muted-foreground">5 простых шагов к первому вознаграждению</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-5">
            {[
              { step: "1", text: "Найдите человека с проблемой долгов — среди знакомых, клиентов или через рекламу" },
              { step: "2", text: "Передайте контакт в платформу — создайте лида с именем и телефоном" },
              { step: "3", text: "Менеджер берёт клиента в работу — вы отслеживаете статус в кабинете" },
              { step: "4", text: "Клиент заключает договор на банкротство — сделка переходит в статус «Won»" },
              { step: "5", text: "Вы получаете вознаграждение — выплата фиксируется в разделе «Финансы»" },
            ].map((item) => (
              <div key={item.step} className="flex gap-2.5 items-start">
                <div className="h-6 w-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-600">{item.step}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Link href="/agent/leads" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <UserPlus className="h-3.5 w-3.5" /> Создать лида
            </Link>
            <Link href="/agent/marketing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-colors">
              <BookOpen className="h-3.5 w-3.5" /> Материалы
            </Link>
            <Link href="/agent/referral" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-colors">
              <Share2 className="h-3.5 w-3.5" /> Реферальная ссылка
            </Link>
            <Link href="/agent/learning" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-colors">
              <GraduationCap className="h-3.5 w-3.5" /> Обучение
            </Link>
            <Link href="/agent/messages" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-colors">
              <MessageSquare className="h-3.5 w-3.5" /> Написать менеджеру
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Helper */}
      <div className="mb-6 max-w-md">
        <AvatarHelper />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Активные лиды"
          value={activeLeads.length}
          icon="Users"
        />
        <StatCard
          title="Непрочитанные"
          value={unreadCount}
          icon="MessageSquare"
        />
        <StatCard
          title="Заработано"
          value={formatCurrency(Number(stats.totalRevenue || 0))}
          icon="Wallet"
        />
        <StatCard
          title="Конверсия"
          value={`${conversionRate}%`}
          icon="Target"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Последние лиды</CardTitle>
            <Link
              href="/agent/leads"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Все лиды <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leads.slice(0, 4).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/agent/leads/${lead.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{lead.fullName}</p>
                    <p className="text-xs text-muted-foreground">{lead.city} · {formatDate(lead.createdAt)}</p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Активные диалоги</CardTitle>
            <Link
              href="/agent/messages"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Все сообщения <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversations.slice(0, 4).map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{conv.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1.5 ml-3">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
