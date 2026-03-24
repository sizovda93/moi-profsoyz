"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { LeadTable } from "@/components/leads/lead-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lead } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AgentLeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    source: "website",
    comment: "",
    requestType: "consultation",
  });

  const loadLeads = () => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setDialogOpen(false);
        setForm({ fullName: "", phone: "", email: "", city: "", source: "website", comment: "", requestType: "consultation" });
        loadLeads();
        if (data.conflict) {
          setConflictAlert("Найден потенциальный дубль по телефону или email. Обращение создано и передано на рассмотрение руководителю.");
          setTimeout(() => setConflictAlert(null), 6000);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardSkeleton />;

  const filtered = leads.filter(
    (l) =>
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase())
  );

  const activeLeads = filtered.filter((l) => !["won", "lost"].includes(l.status));
  const closedLeads = filtered.filter((l) => ["won", "lost"].includes(l.status));

  return (
    <div>
      <PageHeader
        title="Мои обращения"
        description="Ваши обращения в профсоюз"
        breadcrumbs={[
          { title: "Платформа", href: "/agent/dashboard" },
          { title: "Обращения" },
        ]}
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Новое обращение
          </Button>
        }
      />

      {conflictAlert && (
        <Card className="mb-4 p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {conflictAlert}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое обращение</DialogTitle>
            <DialogDescription>Опишите ваше обращение</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">ФИО *</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Телефон *</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Город</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Москва"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Тип обращения</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.requestType}
                onChange={(e) => setForm({ ...form, requestType: e.target.value })}
              >
                <option value="consultation">Консультация</option>
                <option value="complaint">Жалоба</option>
                <option value="request">Заявка</option>
                <option value="initiative">Инициатива</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Канал обращения</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="website">Платформа</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referral">От коллеги</option>
                <option value="cold">Другое</option>
                <option value="partner">Подразделение</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Комментарий</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={2}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Опишите суть обращения..."
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={saving || !form.fullName.trim() || !form.phone.trim()}
            >
              {saving ? "Создание..." : "Создать обращение"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <SearchInput
          placeholder="Поиск по имени или городу..."
          value={search}
          onChange={setSearch}
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Активные ({activeLeads.length})</TabsTrigger>
          <TabsTrigger value="closed">Завершённые ({closedLeads.length})</TabsTrigger>
          <TabsTrigger value="all">Все ({filtered.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <LeadTable leads={activeLeads} onRowClick={(lead: Lead) => router.push(`/agent/leads/${lead.id}`)} />
        </TabsContent>
        <TabsContent value="closed">
          <LeadTable leads={closedLeads} onRowClick={(lead: Lead) => router.push(`/agent/leads/${lead.id}`)} />
        </TabsContent>
        <TabsContent value="all">
          <LeadTable leads={filtered} onRowClick={(lead: Lead) => router.push(`/agent/leads/${lead.id}`)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
