"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface QueueItem {
  agentId: string;
  fullName: string;
  reason: string;
  daysSinceActivity: number;
  lastActivityAt: string | null;
  registeredAt: string;
}

const queueConfig: { key: string; title: string; icon: string; variant: "destructive" | "warning" | "info" | "secondary" }[] = [
  { key: "conflicts", title: "Открытые конфликты", icon: "AlertTriangle", variant: "destructive" },
  { key: "newInactive", title: "Пропавшие новички (3+ дней)", icon: "UserX", variant: "warning" },
  { key: "stuckLearning", title: "Застряли на обучении (7+ дней)", icon: "BookOpen", variant: "warning" },
  { key: "noFirstLead", title: "Без обращений (7+ дней)", icon: "Target", variant: "info" },
  { key: "sleeping", title: "Спящие (30+ дней)", icon: "Moon", variant: "secondary" },
  { key: "noTelegram", title: "Без Telegram", icon: "Send", variant: "secondary" },
];

export default function ManagerOperationsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["conflicts", "newInactive"]));

  useEffect(() => {
    fetch("/api/operations/queues")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleContacted = async (agentId: string) => {
    await fetch(`/api/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerContactedAt: "now" }),
    });
    // Refresh queues
    const res = await fetch("/api/operations/queues");
    if (res.ok) setData(await res.json());
  };

  if (loading) return <LoadingSkeleton />;
  if (!data) return <div className="p-8 text-muted-foreground">Ошибка загрузки</div>;

  const totalItems =
    (data.conflicts?.length || 0) +
    (data.newInactive?.length || 0) +
    (data.stuckLearning?.length || 0) +
    (data.noFirstLead?.length || 0) +
    (data.sleeping?.length || 0) +
    (data.noTelegram?.length || 0);

  return (
    <div>
      <PageHeader
        title="Операции"
        description="Рабочие очереди и контроль"
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Операции" },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {queueConfig.map((q) => (
          <StatCard
            key={q.key}
            title={q.title.split("(")[0].trim()}
            value={data[q.key]?.length ?? 0}
            icon={q.icon}
          />
        ))}
      </div>

      {totalItems === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-medium">Все очереди пусты</p>
          <p className="text-xs text-muted-foreground mt-1">Нет членов, требующих внимания</p>
        </Card>
      )}

      {/* Queues */}
      <div className="space-y-4 mb-8">
        {queueConfig.map((q) => {
          const items: any[] = data[q.key] || [];
          if (items.length === 0) return null;
          const isOpen = expanded.has(q.key);
          const isConflict = q.key === "conflicts";

          return (
            <Card key={q.key}>
              <button
                onClick={() => toggle(q.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={q.variant}>{items.length}</Badge>
                  <span className="text-sm font-medium">{q.title}</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-2">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">
                            {isConflict ? item.leadName : item.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isConflict
                              ? `Ответственный: ${item.agentName || "—"} · ${formatDate(item.createdAt)}`
                              : item.reason}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={isConflict ? `/manager/leads/${item.leadId}` : `/manager/agents/${item.agentId}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3 w-3 mr-1" /> Открыть
                            </Button>
                          </Link>
                          {!isConflict && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleContacted(item.agentId)}
                              title="Отметить как обработанного"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Feedback */}
      {data.recentFeedback?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Обратная связь от членов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentFeedback.map((f: any) => (
                <div key={f.id} className="py-2 px-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{f.agentName}</span>
                    <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(f.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
