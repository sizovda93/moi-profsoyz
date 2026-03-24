"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TierBadge } from "@/components/dashboard/status-badges";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { FunnelBar } from "@/components/analytics/funnel-bar";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AgentTier } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const segmentLabels: Record<string, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  registered: { label: "Новые", variant: "secondary" },
  learning: { label: "Обучаются", variant: "info" },
  activated: { label: "Готовы", variant: "warning" },
  active: { label: "Работают", variant: "success" },
  sleeping: { label: "Спят", variant: "secondary" },
  inactive: { label: "Неактивны", variant: "secondary" },
  blocked: { label: "Заблокированы", variant: "destructive" },
};

export default function ManagerDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const s = analytics?.summary;
  const segments = analytics?.segments;
  const funnel = analytics?.funnel;
  const topAgents = analytics?.topAgents;
  const referral = analytics?.referral;

  return (
    <div>
      <PageHeader
        title="Дашборд менеджера"
        description="Обзор партнёрской сети и показателей"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Партнёров" value={s?.totalAgents ?? 0} icon="Users" />
        <StatCard title="Лидов в работе" value={s?.activeLeads ?? 0} icon="UserPlus" />
        <StatCard title="Won за месяц" value={s?.wonThisMonth ?? 0} icon="Target" />
        <StatCard title="Revenue за месяц" value={formatCurrency(s?.revenueThisMonth ?? 0)} icon="Wallet" />
      </div>

      {/* Segments */}
      {segments && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Сегменты партнёров</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(segmentLabels).map(([key, cfg]) => {
                const count = segments[key] ?? 0;
                if (count === 0 && ["blocked", "inactive"].includes(key)) return null;
                return (
                  <Link key={key} href={`/manager/agents?tab=${key}`}>
                    <Badge variant={cfg.variant} className="cursor-pointer px-3 py-1.5 text-xs">
                      {cfg.label}: {count}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        {funnel && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Воронка лидов</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelBar stages={funnel.stages} conversionRate={funnel.conversionRate} />
            </CardContent>
          </Card>
        )}

        {/* Top agents */}
        {topAgents && topAgents.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Топ партнёров</CardTitle>
              <Link href="/manager/agents" className="text-sm text-primary hover:underline flex items-center gap-1">
                Все <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topAgents.slice(0, 5).map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/manager/agents/${a.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{a.rank}</span>
                      <div>
                        <p className="text-sm font-medium">{a.fullName}</p>
                        <p className="text-xs text-muted-foreground">{a.wonLeads} won · {formatCurrency(a.revenue)}</p>
                      </div>
                    </div>
                    <TierBadge tier={a.tier as AgentTier} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Referral + Conflicts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {referral && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Реферальная программа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Клики</p>
                  <p className="text-lg font-semibold">{referral.uniqueClicks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Лиды</p>
                  <p className="text-lg font-semibold">{referral.referralLeads}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Won</p>
                  <p className="text-lg font-semibold">{referral.referralWon}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Конверсия</p>
                  <p className="text-lg font-semibold">{referral.clickToLeadConversion}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {s?.openConflicts > 0 && (
          <Card className="border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-base text-yellow-600">Конфликты</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Нерешённых конфликтов: <span className="font-semibold text-yellow-600">{s.openConflicts}</span></p>
              <Link href="/manager/leads?tab=conflicts" className="text-sm text-primary hover:underline">
                Перейти к конфликтам →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
