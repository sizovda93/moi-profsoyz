"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadStatusBadge, RequestTypeBadge } from "@/components/dashboard/status-badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lead } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  AlertTriangle,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
  Send,
  Eye,
  MessageSquare,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
          setConflictAlert("Найдено похожее обращение. Новое обращение создано и передано на рассмотрение.");
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
      (l as any).comment?.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase())
  );

  const activeLeads = filtered.filter((l) => !["won", "lost"].includes(l.status));
  const closedLeads = filtered.filter((l) => ["won", "lost"].includes(l.status));

  const statusIcon = (status: string) => {
    if (status === "won") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (status === "lost") return <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />;
    return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
  };

  const LeadCards = ({ items }: { items: Lead[] }) => (
    <div className="space-y-2">
      {items.map((lead) => (
        <Card
          key={lead.id}
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => router.push(`/agent/leads/${lead.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {statusIcon(lead.status)}
                  <p className="text-sm font-medium truncate">
                    {(lead as any).comment
                      ? (lead as any).comment.length > 60
                        ? (lead as any).comment.substring(0, 60) + "..."
                        : (lead as any).comment
                      : "Обращение"}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <RequestTypeBadge type={(lead as any).requestType} />
                  <LeadStatusBadge status={lead.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EmptyState = () => (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-2">У вас пока нет обращений</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Задайте вопрос руководству профсоюза — обращение сохранится здесь, и вы сможете следить за ответом
          </p>
          <Button onClick={() => setDialogOpen(true)} className="mb-6">
            <Plus className="h-4 w-4 mr-1" />
            Создать первое обращение
          </Button>
          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Примеры тем</p>
            {["Вопрос по членству в профсоюзе", "Вопрос по условиям труда", "Предложение для профсоюза"].map((t) => (
              <button
                key={t}
                onClick={() => { setForm({ ...form, comment: t }); setDialogOpen(true); }}
                className="w-full text-left px-3 py-2 rounded-lg border border-border text-xs hover:bg-muted/50 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Вопрос руководителю"
        description="Отправляйте обращения руководству профсоюза и отслеживайте ответы в одном месте"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Вопрос руководителю" },
        ]}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — mascot + how it works */}
        <div className="lg:col-span-4 space-y-4">
          {/* Compact mascot card */}
          <Card className="overflow-hidden !bg-[#2a2a2f] !border-[#3a3a42]">
            <CardContent className="p-0">
              <div className="relative" style={{ height: 160 }}>
                <video
                  src="/ai-cat/peek.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover brightness-110"
                />
              </div>
              <div className="px-3 py-2 bg-[#2a2a2f]">
                <p className="text-xs font-semibold text-[#fafafa]">Котофей Петрович</p>
                <p className="text-[11px] text-[#a0a0a8] leading-snug">Помощник по обращениям</p>
              </div>
            </CardContent>
          </Card>

          {/* Tip bubble */}
          <div className="relative">
            <div className="bg-primary rounded-xl px-3.5 py-2.5">
              <p className="text-[22px] leading-relaxed text-primary-foreground">
                Задайте свой вопрос, я передам Сергею Александровичу. У нас как раз с ним совещание через час!
              </p>
            </div>
            <div className="absolute -top-1 left-4 w-2.5 h-2.5 bg-primary rotate-45" />
          </div>

          {/* How it works */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold mb-3">Как это работает</p>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">Вы создаёте обращение с описанием вопроса</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Eye className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">Руководитель получает и рассматривает обращение</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">Ответ появится в этом разделе</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground">Среднее время ответа — 1 рабочий день</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right — main workspace */}
        <div className="lg:col-span-8">
          {/* Search + Tabs control panel */}
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Найти обращение..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">
                Активные
                {activeLeads.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({activeLeads.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="closed">
                Завершённые
                {closedLeads.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({closedLeads.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="all">
                Все
                {filtered.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({filtered.length})</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeLeads.length === 0 ? <EmptyState /> : <LeadCards items={activeLeads} />}
            </TabsContent>
            <TabsContent value="closed">
              {closedLeads.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Нет завершённых обращений</p>
                  </CardContent>
                </Card>
              ) : (
                <LeadCards items={closedLeads} />
              )}
            </TabsContent>
            <TabsContent value="all">
              {filtered.length === 0 ? <EmptyState /> : <LeadCards items={filtered} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое обращение</DialogTitle>
            <DialogDescription>Опишите ваш вопрос руководству профсоюза</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {profile && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Отправитель:</span> {profile.fullName}</p>
                {profile.phone && <p><span className="text-muted-foreground">Телефон:</span> {profile.phone}</p>}
                {profile.email && <p><span className="text-muted-foreground">Email:</span> {profile.email}</p>}
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
                placeholder="Опишите суть обращения подробно..."
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={saving || !form.comment.trim() || !profile}
            >
              {saving ? "Отправка..." : "Отправить обращение"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
