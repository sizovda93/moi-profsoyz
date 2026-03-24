"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { LeadTable } from "@/components/leads/lead-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Lead } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";

export default function ManagerLeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestTypeFilter, setRequestTypeFilter] = useState("");
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [divisionFilter, setDivisionFilter] = useState("");

  useEffect(() => {
    fetch("/api/unions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDivisions(data[0].divisions || []);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = divisionFilter ? `/api/leads?divisionId=${divisionFilter}` : "/api/leads";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [divisionFilter]);

  if (loading) return <CardSkeleton />;

  const filtered = leads.filter(
    (l) =>
      (l.fullName.toLowerCase().includes(search.toLowerCase()) ||
        l.city.toLowerCase().includes(search.toLowerCase())) &&
      (!requestTypeFilter || (l as any).requestType === requestTypeFilter)
  );

  const newLeads = filtered.filter((l) => l.status === "new");
  const activeLeads = filtered.filter((l) => !["new", "won", "lost"].includes(l.status));
  const closedLeads = filtered.filter((l) => ["won", "lost"].includes(l.status));
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const conflictLeads = filtered.filter((l: any) => l.conflictStatus === "open");

  return (
    <div>
      <PageHeader
        title="Обращения"
        description="Все обращения — рассмотрение и контроль"
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Обращения" },
        ]}
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Новое обращение
          </Button>
        }
      />

      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по имени или городу..." />
      </div>

      <div className="flex gap-4 mb-4">
        <select
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
        >
          <option value="">Все подразделения</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          value={requestTypeFilter}
          onChange={(e) => setRequestTypeFilter(e.target.value)}
        >
          <option value="">Все типы</option>
          <option value="consultation">Консультация</option>
          <option value="complaint">Жалоба</option>
          <option value="request">Заявка</option>
          <option value="initiative">Инициатива</option>
        </select>
      </div>

      <Tabs defaultValue={conflictLeads.length > 0 ? "conflicts" : "new"}>
        <TabsList>
          {conflictLeads.length > 0 && (
            <TabsTrigger value="conflicts" className="text-yellow-600">
              ⚠ Конфликты ({conflictLeads.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="new">Новые ({newLeads.length})</TabsTrigger>
          <TabsTrigger value="active">В работе ({activeLeads.length})</TabsTrigger>
          <TabsTrigger value="closed">Завершённые ({closedLeads.length})</TabsTrigger>
          <TabsTrigger value="all">Все ({filtered.length})</TabsTrigger>
        </TabsList>
        {conflictLeads.length > 0 && (
          <TabsContent value="conflicts">
            <LeadTable leads={conflictLeads} onRowClick={(lead: Lead) => router.push(`/manager/leads/${lead.id}`)} />
          </TabsContent>
        )}
        <TabsContent value="new">
          <LeadTable leads={newLeads} onRowClick={(lead: Lead) => router.push(`/manager/leads/${lead.id}`)} />
        </TabsContent>
        <TabsContent value="active">
          <LeadTable leads={activeLeads} onRowClick={(lead: Lead) => router.push(`/manager/leads/${lead.id}`)} />
        </TabsContent>
        <TabsContent value="closed">
          <LeadTable leads={closedLeads} onRowClick={(lead: Lead) => router.push(`/manager/leads/${lead.id}`)} />
        </TabsContent>
        <TabsContent value="all">
          <LeadTable leads={filtered} onRowClick={(lead: Lead) => router.push(`/manager/leads/${lead.id}`)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
