"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadDetailsPanel } from "@/components/leads/lead-details-panel";
import { LeadTimeline } from "@/components/leads/lead-timeline";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { TimelineEvent, Lead } from "@/types";
import { MessageSquare, Phone } from "lucide-react";

export default function AgentLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [leadRes, eventsRes] = await Promise.all([
          fetch(`/api/leads/${id}`),
          fetch(`/api/leads/${id}/events`),
        ]);
        if (!leadRes.ok) {
          setError(leadRes.status === 404 ? 'not_found' : 'error');
          return;
        }
        const leadData = await leadRes.json();
        setLead(leadData);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.map((e: { id: string; eventType: string; details?: string; createdAt: string }) => ({
            id: e.id,
            title: e.eventType === 'status_changed' ? 'Смена статуса'
              : e.eventType === 'created' ? 'Обращение создано'
              : e.eventType === 'agent_assigned' ? 'Назначен ответственный'
              : e.eventType === 'agent_reassigned' ? 'Переназначен ответственный'
              : e.eventType === 'payout_created' ? 'Решение принято'
              : e.eventType,
            description: e.details || undefined,
            date: e.createdAt,
            type: e.eventType === 'status_changed' ? 'status_change' as const
              : e.eventType === 'agent_assigned' || e.eventType === 'agent_reassigned' ? 'assignment' as const
              : e.eventType === 'payout_created' ? 'payment' as const
              : 'note' as const,
          })));
        }
      } catch {
        setError('error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (error === 'not_found' || !lead) {
    return (
      <div>
        <PageHeader title="Обращение не найдено" breadcrumbs={[{ title: "Обращения", href: "/agent/leads" }, { title: "Не найден" }]} />
        <p className="text-muted-foreground">Обращение не найдено.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={lead.fullName}
        breadcrumbs={[
          { title: "Дашборд", href: "/agent/dashboard" },
          { title: "Обращения", href: "/agent/leads" },
          { title: lead.fullName },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-1" /> Позвонить
            </Button>
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-1" /> Написать
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadDetailsPanel lead={lead} />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">История</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <LeadTimeline events={events} />
              ) : (
                <p className="text-sm text-muted-foreground">Нет событий</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
