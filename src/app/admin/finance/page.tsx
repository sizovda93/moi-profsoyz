"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { BalanceCard } from "@/components/finance/balance-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { PayoutStatusBadge } from "@/components/dashboard/status-badges";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Payout } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

export default function AdminFinancePage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPayouts = () => {
    fetch("/api/payouts")
      .then((r) => r.json())
      .then((data) => setPayouts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleAction = async (id: string, status: string, rejectionReason?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (res.ok) {
        setRejectId(null);
        setRejectReason("");
        fetchPayouts();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  if (loading) return <CardSkeleton />;

  const paid = payouts.filter((p) => p.status === "paid");
  const pending = payouts.filter((p) => p.status === "pending" || p.status === "processing");
  const totalEarned = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = pending.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);

  const columns = [
    {
      key: "agent",
      title: "Партнёр",
      render: (p: Payout) => <span className="font-medium">{p.agentName}</span>,
    },
    {
      key: "period",
      title: "Период",
      render: (p: Payout) => <span className="text-muted-foreground">{p.period}</span>,
    },
    {
      key: "amount",
      title: "Сумма",
      render: (p: Payout) => <span className="font-medium">{formatCurrency(p.amount)}</span>,
      className: "text-right",
    },
    {
      key: "status",
      title: "Статус",
      render: (p: Payout) => <PayoutStatusBadge status={p.status} />,
    },
    {
      key: "date",
      title: "Дата",
      render: (p: Payout) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    },
    {
      key: "actions",
      title: "Действия",
      render: (p: Payout) => {
        if (p.status === "paid" || p.status === "rejected") return <span className="text-muted-foreground text-xs">—</span>;
        const isLoading = actionLoading === p.id;

        if (rejectId === p.id) {
          return (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Причина отклонения"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-sm px-2 py-1 rounded border border-border bg-background w-48"
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={!rejectReason.trim() || isLoading}
                onClick={() => handleAction(p.id, "rejected", rejectReason)}
              >
                Отклонить
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}>
                Отмена
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {p.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleAction(p.id, "processing")}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                В обработку
              </Button>
            )}
            {p.status === "processing" && (
              <Button
                size="sm"
                variant="default"
                disabled={isLoading}
                onClick={() => handleAction(p.id, "paid")}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Оплатить
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={isLoading}
              onClick={() => setRejectId(p.id)}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Отклонить
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Финансы"
        description="Управление выплатами партнёров"
        breadcrumbs={[
          { title: "Дашборд", href: "/admin/dashboard" },
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
          <DataTable columns={columns} data={payouts} emptyMessage="Нет выплат" />
        </CardContent>
      </Card>
    </div>
  );
}
