"use client";

import { Lead } from "@/types";
import { DataTable } from "@/components/dashboard/data-table";
import { LeadStatusBadge, RequestTypeBadge } from "@/components/dashboard/status-badges";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeadTableProps {
  leads: Lead[];
  onRowClick?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

const sourceLabels: Record<string, string> = {
  website: "Платформа",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  referral: "От коллеги",
  cold: "Другое",
  partner: "Подразделение",
};

export function LeadTable({ leads, onRowClick, onDelete }: LeadTableProps) {
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
      title: "Канал",
      render: (lead: Lead) => (
        <Badge variant="outline">{sourceLabels[lead.source] ?? lead.source}</Badge>
      ),
    },
    {
      key: "requestType",
      title: "Тип",
      render: (lead: Lead) => <RequestTypeBadge type={(lead as any).requestType} />,
    },
    {
      key: "status",
      title: "Статус",
      render: (lead: Lead) => <LeadStatusBadge status={lead.status} />,
    },
    {
      key: "date",
      title: "Дата",
      render: (lead: Lead) => (
        <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>
      ),
    },
    ...(onDelete ? [{
      key: "actions",
      title: "",
      render: (lead: Lead) => (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          title="Удалить обращение"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      ),
    }] : []),
  ];

  return <DataTable columns={columns} data={leads} onRowClick={onRowClick} emptyMessage="Нет обращений" />;
}
