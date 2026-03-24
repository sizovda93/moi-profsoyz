"use client";

import { Lead } from "@/types";
import { DataTable } from "@/components/dashboard/data-table";
import { LeadStatusBadge } from "@/components/dashboard/status-badges";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeadTableProps {
  leads: Lead[];
  onRowClick?: (lead: Lead) => void;
}

const sourceLabels: Record<string, string> = {
  website: "Сайт",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  referral: "Реферал",
  cold: "Холодный",
  partner: "Партнёр",
};

export function LeadTable({ leads, onRowClick }: LeadTableProps) {
  const columns = [
    {
      key: "name",
      title: "Имя",
      render: (lead: Lead) => <span className="font-medium">{lead.fullName}</span>,
    },
    {
      key: "city",
      title: "Город",
      render: (lead: Lead) => <span className="text-muted-foreground">{lead.city}</span>,
    },
    {
      key: "source",
      title: "Источник",
      render: (lead: Lead) => (
        <Badge variant="outline">{sourceLabels[lead.source] ?? lead.source}</Badge>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (lead: Lead) => <LeadStatusBadge status={lead.status} />,
    },
    {
      key: "value",
      title: "Оценка",
      render: (lead: Lead) => (
        <span className="text-muted-foreground">
          {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "—"}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "date",
      title: "Дата",
      render: (lead: Lead) => (
        <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>
      ),
    },
  ];

  return <DataTable columns={columns} data={leads} onRowClick={onRowClick} emptyMessage="Нет лидов" />;
}
