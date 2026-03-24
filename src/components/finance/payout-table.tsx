"use client";

import { Payout } from "@/types";
import { DataTable } from "@/components/dashboard/data-table";
import { PayoutStatusBadge } from "@/components/dashboard/status-badges";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PayoutTableProps {
  payouts: Payout[];
}

export function PayoutTable({ payouts }: PayoutTableProps) {
  const columns = [
    {
      key: "period",
      title: "Период",
      render: (p: Payout) => <span className="font-medium">{p.period}</span>,
    },
    {
      key: "agent",
      title: "Член профсоюза",
      render: (p: Payout) => <span className="text-muted-foreground">{p.agentName}</span>,
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
  ];

  return <DataTable columns={columns} data={payouts} emptyMessage="Нет выплат" />;
}
