"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { FunnelBar } from "@/components/analytics/funnel-bar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NewsBlock } from "@/components/dashboard/news-block";

/* eslint-disable @typescript-eslint/no-explicit-any */

const segmentLabels: Record<string, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  registered: { label: "Новые", variant: "secondary" },
  learning: { label: "Обучаются", variant: "info" },
  activated: { label: "Готовы", variant: "warning" },
  active: { label: "Активные", variant: "success" },
  sleeping: { label: "Неактивные", variant: "secondary" },
  inactive: { label: "Неактивны", variant: "secondary" },
  blocked: { label: "Заблокированы", variant: "destructive" },
};

export default function ManagerDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [divisionStats, setDivisionStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/analytics/divisions")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setDivisionStats(Array.isArray(data) ? data : []))
      .catch(() => {});
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
        title="Платформа руководителя"
        description="Обзор профсоюзной организации и показателей"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Членов профсоюза" value={s?.totalAgents ?? 0} icon="Users" />
        <StatCard title="Обращений в работе" value={s?.activeLeads ?? 0} icon="UserPlus" />
        <StatCard title="Решено за месяц" value={s?.wonThisMonth ?? 0} icon="Target" />
        <StatCard title="Всего обращений" value={(s?.activeLeads ?? 0) + (s?.wonThisMonth ?? 0)} icon="FileText" />
      </div>

      {/* Segments */}
      {segments && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Сегменты членов профсоюза</CardTitle>
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

      {/* News Block */}
      <NewsBlock />

      {divisionStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Подразделения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Подразделение</th>
                    <th className="text-right py-2 px-3 font-medium">Членов</th>
                    <th className="text-right py-2 px-3 font-medium">Новых</th>
                    <th className="text-right py-2 px-3 font-medium">В работе</th>
                    <th className="text-right py-2 px-3 font-medium">Решено</th>
                    <th className="text-right py-2 px-3 font-medium">Всего</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionStats.map((d: any) => (
                    <tr key={d.divisionId} className="border-b border-border">
                      <td className="py-2 px-3 font-medium">{d.divisionName}</td>
                      <td className="py-2 px-3 text-right">{d.memberCount}</td>
                      <td className="py-2 px-3 text-right">{d.newAppeals > 0 ? <span className="text-blue-500 font-medium">{d.newAppeals}</span> : "0"}</td>
                      <td className="py-2 px-3 text-right">{d.activeAppeals > 0 ? <span className="text-yellow-500 font-medium">{d.activeAppeals}</span> : "0"}</td>
                      <td className="py-2 px-3 text-right">{d.resolvedAppeals > 0 ? <span className="text-green-500 font-medium">{d.resolvedAppeals}</span> : "0"}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{d.totalAppeals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        {funnel && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Воронка обращений</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelBar stages={funnel.stages} conversionRate={funnel.conversionRate} />
            </CardContent>
          </Card>
        )}

        {/* Top members */}
        {topAgents && topAgents.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Активные члены</CardTitle>
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
                        <p className="text-xs text-muted-foreground">{a.wonLeads} решено</p>
                      </div>
                    </div>
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
              <CardTitle className="text-base">Приглашения</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Переходы</p>
                  <p className="text-lg font-semibold">{referral.uniqueClicks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Обращения</p>
                  <p className="text-lg font-semibold">{referral.referralLeads}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Решено</p>
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
