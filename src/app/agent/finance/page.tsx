"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { BalanceCard } from "@/components/finance/balance-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TierBadge, PayoutStatusBadge } from "@/components/dashboard/status-badges";
import { DataTable } from "@/components/dashboard/data-table";
import { Payout, AgentTier } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AgentFinancePage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [profile, setProfile] = useState<{ tier?: AgentTier; commissionRate?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/payouts").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([payoutData, profileData]) => {
        setPayouts(Array.isArray(payoutData) ? payoutData : []);
        setProfile(profileData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  const paid = payouts.filter((p) => p.status === "paid");
  const pending = payouts.filter((p) => p.status === "pending" || p.status === "processing");
  const totalEarned = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = pending.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);

  const tier = (profile?.tier as AgentTier) || "base";

  const columns = [
    {
      key: "period",
      title: "Период",
      render: (p: Payout) => <span className="font-medium">{p.period}</span>,
    },
    {
      key: "lead",
      title: "Обращение",
      render: (p: Payout) => (
        <span className="text-muted-foreground">{p.leadName || "—"}</span>
      ),
    },
    {
      key: "breakdown",
      title: "Расчёт",
      render: (p: Payout) => (
        <div className="text-xs text-muted-foreground">
          {p.baseAmount ? (
            <>
              {formatCurrency(Number(p.baseAmount))} × {((p.commissionRate || 0) * 100).toFixed(0)}%
              {Number(p.bonusAmount) > 0 && ` + ${formatCurrency(Number(p.bonusAmount))}`}
            </>
          ) : (
            "—"
          )}
        </div>
      ),
    },
    {
      key: "amount",
      title: "Сумма",
      render: (p: Payout) => <span className="font-medium">{formatCurrency(Number(p.amount))}</span>,
      className: "text-right",
    },
    {
      key: "status",
      title: "Статус",
      render: (p: Payout) => (
        <div className="space-y-1">
          <PayoutStatusBadge status={p.status} />
          {p.status === "rejected" && p.rejectionReason && (
            <p className="text-xs text-destructive">{p.rejectionReason}</p>
          )}
        </div>
      ),
    },
    {
      key: "date",
      title: "Дата",
      render: (p: Payout) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Финансы"
        description="Баланс, выплаты и комиссии"
        breadcrumbs={[
          { title: "Платформа", href: "/agent/dashboard" },
          { title: "Финансы" },
        ]}
      />

      {/* Tier info */}
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Ваш уровень:</span>
          <TierBadge tier={tier} />
        </div>
      </Card>

      <div className="mb-8">
        <BalanceCard balance={balance} pending={pendingAmount} totalEarned={totalEarned} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">История выплат</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={payouts} emptyMessage="Нет выплат" />
        </CardContent>
      </Card>
    </div>
  );
}
