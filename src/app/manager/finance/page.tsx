"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { BalanceCard } from "@/components/finance/balance-card";
import { PayoutTable } from "@/components/finance/payout-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Payout } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";

export default function ManagerFinancePage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payouts")
      .then((r) => r.json())
      .then((data) => setPayouts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  const paid = payouts.filter((p) => p.status === "paid");
  const pending = payouts.filter((p) => p.status === "pending" || p.status === "processing");
  const totalEarned = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = pending.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <PageHeader
        title="Финансы"
        description="Выплаты и взносы участников профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/manager/dashboard" },
          { title: "Финансы" },
        ]}
      />

      <div className="mb-8">
        <BalanceCard balance={balance} pending={pendingAmount} totalEarned={totalEarned} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Все выплаты</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutTable payouts={payouts} />
        </CardContent>
      </Card>
    </div>
  );
}
