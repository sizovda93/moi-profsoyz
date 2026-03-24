"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  action: string;
  userEmail: string;
  details: string;
  level: string;
  createdAt: string;
}

const levelConfig: Record<string, { label: string; variant: "info" | "warning" | "destructive" | "success" }> = {
  info: { label: "INFO", variant: "info" },
  warning: { label: "WARN", variant: "warning" },
  error: { label: "ERROR", variant: "destructive" },
  success: { label: "OK", variant: "success" },
};

export default function AdminLogsPage() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs')
      .then((r) => r.ok ? r.json() : [])
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const filtered = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.userEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Логи"
        description="Журнал действий системы"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Логи" },
        ]}
      />

      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по действию или пользователю..." />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Нет записей</div>
            ) : filtered.map((log) => {
              const level = levelConfig[log.level] || levelConfig.info;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <Badge variant={level.variant} className="mt-0.5 shrink-0 font-mono text-[10px]">
                    {level.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-primary font-mono">{log.action}</code>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
