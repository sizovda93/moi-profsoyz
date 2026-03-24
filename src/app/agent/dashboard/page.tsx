"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/dashboard/status-badges";
import { formatDate } from "@/lib/utils";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Circle,
  UserPlus, MessageSquare, Shield, GraduationCap, Sparkles,
} from "lucide-react";
import { Lead, Conversation } from "@/types";
import { AvatarHelper } from "@/components/avatar/avatar-helper";
import { NewsBlock } from "@/components/dashboard/news-block";

interface ChecklistState {
  profileFilled: boolean;
  learningDone: boolean;
  telegramConnected: boolean;
  firstLead: boolean;
}

export default function AgentDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistState | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/conversations").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/learning/progress").then((r) => r.json()).catch(() => null),
      fetch("/api/telegram/status").then((r) => r.json()).catch(() => ({ connected: false })),
    ])
      .then(([ld, cv, profile, progress, tgStatus]) => {
        const leadsArr = Array.isArray(ld) ? ld : [];
        setLeads(leadsArr);
        setConversations(Array.isArray(cv) ? cv : []);

        const cl: ChecklistState = {
          profileFilled: !!(profile?.city && profile?.phone),
          learningDone: progress?.allRequiredDone === true,
          telegramConnected: tgStatus?.connected === true,
          firstLead: leadsArr.length > 0,
        };
        setChecklist(cl);
        setShowChecklist(!(cl.profileFilled && cl.learningDone && cl.telegramConnected && cl.firstLead));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status));
  const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const resolvedCount = leads.filter((l) => l.status === "won").length;

  const checklistItems = checklist ? [
    { done: checklist.profileFilled, label: "Заполнить профиль", href: "/agent/profile" },
    { done: checklist.learningDone, label: "Пройти обучение", href: "/agent/learning" },
    { done: checklist.telegramConnected, label: "Подключить Telegram", href: "/agent/profile" },
    { done: checklist.firstLead, label: "Подать обращение", href: "/agent/leads" },
  ] : [];
  const completedSteps = checklistItems.filter((i) => i.done).length;

  return (
    <div>
      {/* ============ HERO: Помощник + Действия ============ */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: Avatar helper */}
            <div className="p-6 flex items-center justify-center bg-muted/30">
              <AvatarHelper />
            </div>

            {/* Right: Welcome + CTA */}
            <div className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Мой Профсоюз</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Платформа для обращений, юридической помощи и взаимодействия с профсоюзной организацией
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Link
                  href="/agent/leads"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span>Обращение</span>
                </Link>
                <Link
                  href="/agent/legal"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>Вопрос юристу</span>
                </Link>
                <Link
                  href="/agent/messages"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span>Руководителю</span>
                </Link>
              </div>

              <div className="mt-4">
                <Link
                  href="/agent/ai-chat"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 text-sm font-medium text-violet-400 hover:from-violet-500/20 hover:to-blue-500/20 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Чат с ИИ — мгновенная консультация
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ МЕТРИКИ ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Активные обращения" value={activeLeads.length} icon="UserPlus" />
        <StatCard title="Непрочитанные" value={unreadCount} icon="MessageSquare" />
        <StatCard title="Решено" value={resolvedCount} icon="Target" />
      </div>

      {/* ============ ПЕРВЫЕ ШАГИ (компактный) ============ */}
      {showChecklist && checklist && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Первые шаги</span>
              </div>
              <span className="text-xs text-muted-foreground">{completedSteps}/{checklistItems.length}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(completedSteps / checklistItems.length) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {checklistItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    item.done
                      ? "bg-muted/50 text-muted-foreground line-through"
                      : "bg-primary/5 text-foreground hover:bg-primary/10 border border-primary/10"
                  }`}
                >
                  {item.done ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Circle className="h-3 w-3 text-muted-foreground/40" />}
                  {item.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ НОВОСТИ ============ */}
      <NewsBlock />

      {/* ============ ОБРАЩЕНИЯ + ДИАЛОГИ ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Последние обращения</CardTitle>
            <Link href="/agent/leads" className="text-sm text-primary hover:underline flex items-center gap-1">
              Все <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет обращений</p>
            ) : (
              <div className="space-y-2">
                {leads.slice(0, 4).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/agent/leads/${lead.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.fullName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Активные диалоги</CardTitle>
            <Link href="/agent/messages" className="text-sm text-primary hover:underline flex items-center gap-1">
              Все <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет диалогов</p>
            ) : (
              <div className="space-y-2">
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
