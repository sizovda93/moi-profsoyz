"use client";

import { Document } from "@/types";
import { DataTable } from "@/components/dashboard/data-table";
import { DocumentStatusBadge } from "@/components/dashboard/status-badges";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";

interface DocumentTableProps {
  documents: Document[];
  onRowClick?: (doc: Document) => void;
}

const typeLabels: Record<string, string> = {
  contract: "Договор",
  invoice: "Счёт",
  act: "Акт",
  agreement: "Соглашение",
  power_of_attorney: "Доверенность",
  other: "Прочее",
};

export function DocumentTable({ documents, onRowClick }: DocumentTableProps) {
  const columns = [
    {
      key: "title",
      title: "Документ",
      render: (doc: Document) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{doc.title}</p>
            <p className="text-xs text-muted-foreground">{doc.ownerName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "Тип",
      render: (doc: Document) => (
        <Badge variant="outline">{typeLabels[doc.type] ?? doc.type}</Badge>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (doc: Document) => <DocumentStatusBadge status={doc.status} />,
    },
    {
      key: "size",
      title: "Размер",
      render: (doc: Document) => (
        <span className="text-muted-foreground text-sm">{doc.fileSize ?? "—"}</span>
      ),
    },
    {
      key: "date",
      title: "Дата",
      render: (doc: Document) => (
        <span className="text-muted-foreground">{formatDate(doc.createdAt)}</span>
      ),
    },
  ];

  return (
    <DataTable columns={columns} data={documents} onRowClick={onRowClick} emptyMessage="Нет документов" />
  );
}
