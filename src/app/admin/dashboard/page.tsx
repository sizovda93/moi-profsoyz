"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TierBadge } from "@/components/dashboard/status-badges";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { FunnelBar } from "@/components/analytics/funnel-bar";
import { formatCurrency } from "@/lib/utils";
import type { AgentTier } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminDashboard() {
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
  const funnel = analytics?.funnel;
  const tiers = analytics?.tiers;
  const onboarding = analytics?.onboarding;
  const referral = analytics?.referral;
  const topAgents = analytics?.topAgents;

  return (
    <div>
      <PageHeader
        title="Панель администратора"
        description="Аналитика и мониторинг платформы"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Членов профсоюза" value={s?.totalAgents ?? 0} icon="Users" />
        <StatCard title="Обращений всего" value={s?.totalLeads ?? 0} icon="Target" />
        <StatCard title="Won за месяц" value={s?.wonThisMonth ?? 0} icon="UserCheck" />
        <StatCard title="Revenue за месяц" value={formatCurrency(s?.revenueThisMonth ?? 0)} icon="Wallet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Onboarding funnel */}
        {onboarding && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Воронка онбординга</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Зарегистрированы", value: onboarding.total, pct: 100 },
                  { label: "Начали обучение", value: onboarding.startedLearning, pct: onboarding.total > 0 ? Math.round((onboarding.startedLearning / onboarding.total) * 100) : 0 },
                  { label: "Завершили обучение", value: onboarding.completedLearning, pct: onboarding.total > 0 ? Math.round((onboarding.completedLearning / onboarding.total) * 100) : 0 },
                  { label: "Первое обращение", value: onboarding.withFirstLead, pct: onboarding.total > 0 ? Math.round((onboarding.withFirstLead / onboarding.total) * 100) : 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36 shrink-0">{item.label}</span>
                    <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm bg-primary transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-12 text-right">{item.value} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Активация: {onboarding.activationRate}%</p>
            </CardContent>
          </Card>
        )}

        {/* Lead funnel */}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Tier distribution */}
        {tiers && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Уровни участников</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tiers.map((t: any) => (
                  <div key={t.tier} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <TierBadge tier={t.tier as AgentTier} />
                      <span className="text-sm">{t.agentCount} членов</span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {t.payoutsCount > 0 ? (
                        <>
                          {formatCurrency(t.totalRevenue)} · avg {formatCurrency(t.avgPayout)}
                        </>
                      ) : (
                        "Нет выплат"
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral */}
        {referral && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Реферальная программа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Уникальные клики</p>
                  <p className="text-lg font-semibold">{referral.uniqueClicks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Обращения из реф.</p>
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

        {/* Conflicts + summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Состояние системы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Открытые конфликты</span>
                <span className={s?.openConflicts > 0 ? "font-semibold text-yellow-600" : ""}>{s?.openConflicts ?? 0}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Обращений в работе</span>
                <span>{s?.activeLeads ?? 0}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Won за месяц</span>
                <span className="font-medium">{s?.wonThisMonth ?? 0}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Revenue за месяц</span>
                <span className="font-medium">{formatCurrency(s?.revenueThisMonth ?? 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top agents */}
      {topAgents && topAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ участников</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topAgents.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{a.rank}</span>
                    <div>
                      <p className="text-sm font-medium">{a.fullName}</p>
                      <p className="text-xs text-muted-foreground">{a.wonLeads} won · {a.totalLeads} обращений · {formatCurrency(a.revenue)}</p>
                    </div>
                  </div>
                  <TierBadge tier={a.tier as AgentTier} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
