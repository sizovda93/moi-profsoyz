"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { LeadTable } from "@/components/leads/lead-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { Lead } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminLeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
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
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || "").includes(search)
  );

  const websiteLeads = filtered.filter((l) => l.source === "website");
  const newLeads = filtered.filter((l) => l.status === "new");
  const activeLeads = filtered.filter((l) => !["new", "won", "lost"].includes(l.status));
  const closedLeads = filtered.filter((l) => ["won", "lost"].includes(l.status));
  const conflictLeads = filtered.filter((l: any) => l.conflictStatus === "open");
  const unassigned = filtered.filter((l: any) => !l.assignedAgentId && !l.assignedManagerId);

  const goToLead = (lead: Lead) => router.push(`/manager/leads/${lead.id}`);

  return (
    <div>
      <PageHeader
        title="Обращения"
        description="Все обращения системы, включая заявки с лендинга"
        breadcrumbs={[
          { title: "Дашборд", href: "/admin/dashboard" },
          { title: "Обращения" },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Всего" value={leads.length} icon="Users" />
        <StatCard title="С лендинга" value={leads.filter((l) => l.source === "website").length} icon="Target" />
        <StatCard title="Новые" value={leads.filter((l) => l.status === "new").length} icon="UserPlus" />
        <StatCard title="Без назначения" value={leads.filter((l: any) => !l.assignedAgentId && !l.assignedManagerId).length} icon="AlertTriangle" />
      </div>

      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по имени, городу или телефону..." />
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
      </div>

      <Tabs defaultValue={websiteLeads.length > 0 ? "website" : "all"}>
        <TabsList>
          <TabsTrigger value="all">Все ({filtered.length})</TabsTrigger>
          <TabsTrigger value="website">С лендинга ({websiteLeads.length})</TabsTrigger>
          <TabsTrigger value="new">Новые ({newLeads.length})</TabsTrigger>
          <TabsTrigger value="active">В работе ({activeLeads.length})</TabsTrigger>
          <TabsTrigger value="closed">Завершённые ({closedLeads.length})</TabsTrigger>
          {unassigned.length > 0 && (
            <TabsTrigger value="unassigned" className="text-orange-500">
              Без назначения ({unassigned.length})
            </TabsTrigger>
          )}
          {conflictLeads.length > 0 && (
            <TabsTrigger value="conflicts" className="text-yellow-600">
              Конфликты ({conflictLeads.length})
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="all">
          <LeadTable leads={filtered} onRowClick={goToLead} />
        </TabsContent>
        <TabsContent value="website">
          <LeadTable leads={websiteLeads} onRowClick={goToLead} />
        </TabsContent>
        <TabsContent value="new">
          <LeadTable leads={newLeads} onRowClick={goToLead} />
        </TabsContent>
        <TabsContent value="active">
          <LeadTable leads={activeLeads} onRowClick={goToLead} />
        </TabsContent>
        <TabsContent value="closed">
          <LeadTable leads={closedLeads} onRowClick={goToLead} />
        </TabsContent>
        {unassigned.length > 0 && (
          <TabsContent value="unassigned">
            <LeadTable leads={unassigned} onRowClick={goToLead} />
          </TabsContent>
        )}
        {conflictLeads.length > 0 && (
          <TabsContent value="conflicts">
            <LeadTable leads={conflictLeads} onRowClick={goToLead} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
