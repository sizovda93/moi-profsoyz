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

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  city?: string;
}

export default function AgentLeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    comment: "",
    requestType: "complaint",
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
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          email: profile.email,
          city: profile.city || "",
          source: "website",
          comment: form.comment,
          requestType: form.requestType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDialogOpen(false);
        setForm({ comment: "", requestType: "complaint" });
        loadLeads();
        if (data.conflict) {
          setConflictAlert("Найден похожее обращение. Новое обращение создано и передано на рассмотрение руководителю.");
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
        title="Обращение к руководителю"
        description="Ваши обращения к руководству профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/agent/dashboard" },
          { title: "Обращение к руководителю" },
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
            {/* Данные из профиля — read-only */}
            {profile && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Отправитель:</span> {profile.fullName}</p>
                {profile.phone && <p><span className="text-muted-foreground">Телефон:</span> {profile.phone}</p>}
                {profile.email && <p><span className="text-muted-foreground">Email:</span> {profile.email}</p>}
                {profile.city && <p><span className="text-muted-foreground">Город:</span> {profile.city}</p>}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Тип обращения</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.requestType}
                onChange={(e) => setForm({ ...form, requestType: e.target.value })}
              >
                <option value="complaint">Жалоба</option>
                <option value="initiative">Инициатива</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Описание *</label>
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Опишите суть обращения..."
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={saving || !form.comment.trim() || !profile}
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
