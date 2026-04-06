"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable } from "@/components/dashboard/data-table";
import { LifecycleBadge } from "@/components/dashboard/status-badges";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserPlus, Filter, X } from "lucide-react";
import type { AgentLifecycle } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface AgentRow {
  id: string;
  fullName: string;
  email: string;
  city: string;
  specialization: string;
  profession: string | null;
  birthYear: number | null;
  gender: string;
  preferredMessenger: string;
  activeLeads: number;
  totalLeads: number;
  totalRevenue: number;
  rating: number;
  userStatus: string;
  lifecycle: AgentLifecycle;
}

type TabFilter = "all" | "learning" | "ready" | "active" | "problem";
type SortKey = "newest" | "oldest" | "age_asc" | "age_desc" | "name_asc" | "name_desc" | "leads_desc";

const sortLabels: Record<SortKey, string> = {
  newest: "Новые",
  oldest: "Старые",
  name_asc: "Имя А→Я",
  name_desc: "Имя Я→А",
  age_asc: "Возраст ↑",
  age_desc: "Возраст ↓",
  leads_desc: "Обращения ↓",
};

export default function ManagerAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [unassigned, setUnassigned] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("all");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [divisionId, setDivisionId] = useState("");

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

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (gender) p.set("gender", gender);
    if (city.trim()) p.set("city", city.trim());
    if (profession.trim()) p.set("profession", profession.trim());
    if (minAge) p.set("minAge", minAge);
    if (maxAge) p.set("maxAge", maxAge);
    if (sort !== "newest") p.set("sort", sort);
    if (divisionId) p.set("divisionId", divisionId);
    return p.toString() ? `?${p.toString()}` : "";
  }, [search, gender, city, profession, minAge, maxAge, sort, divisionId]);

  const loadData = useCallback(() =>
    Promise.all([
      fetch(`/api/agents${buildQuery()}`).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/agents?unassigned=true").then((r) => (r.ok ? r.json() : [])),
    ]).then(([myAgents, free]) => {
      setAgents(myAgents);
      setUnassigned(free);
    }), [buildQuery]);

  // Initial load
  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload on filter/sort change (debounced for text inputs)
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(timer);
  }, [search, gender, city, profession, minAge, maxAge, sort, divisionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClaim = async (agentId: string) => {
    setClaiming(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: "self" }),
      });
      if (res.ok) {
        await loadData();
        setShowUnassigned(unassigned.length > 1);
      }
    } catch { /* ignore */ }
    finally { setClaiming(null); }
  };

  const resetFilters = () => {
    setSearch("");
    setGender("");
    setCity("");
    setProfession("");
    setMinAge("");
    setMaxAge("");
    setSort("newest");
    setDivisionId("");
  };

  const hasActiveFilters = gender || city || profession || minAge || maxAge || sort !== "newest" || divisionId;

  if (loading) return <LoadingSkeleton />;

  // Stats (from current result set)
  const learning = agents.filter((a) => ["registered", "learning_in_progress"].includes(a.lifecycle));
  const activated = agents.filter((a) => a.lifecycle === "activated");
  const active = agents.filter((a) => a.lifecycle === "active");
  const problem = agents.filter((a) => ["inactive", "blocked", "rejected"].includes(a.lifecycle));

  // Client-side tab filter (lifecycle tabs stay client-side for instant UX)
  const tabFiltered = (() => {
    switch (tab) {
      case "learning": return learning;
      case "ready": return activated;
      case "active": return active;
      case "problem": return problem;
      default: return agents;
    }
  })();

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "Все", count: agents.length },
  ];

  const columns = [
    {
      key: "name",
      title: "Участник профсоюза",
      render: (a: AgentRow) => (
        <div>
          <p className="font-medium">{a.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {[(a as any).memberNumber, a.city, a.profession].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "lifecycle",
      title: "Статус",
      render: (a: AgentRow) => <LifecycleBadge lifecycle={a.lifecycle} />,
    },
    {
      key: "age",
      title: "Возраст",
      render: (a: AgentRow) => (
        <span className="text-muted-foreground">
          {a.birthYear ? `${new Date().getFullYear() - a.birthYear}` : "—"}
        </span>
      ),
    },
    {
      key: "leads",
      title: "Обращения",
      render: (a: AgentRow) => (
        <span>
          <span className="font-medium">{a.activeLeads}</span>
          <span className="text-muted-foreground"> / {a.totalLeads}</span>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Участники профсоюза"
        description="Управление членами профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/manager/dashboard" },
          { title: "Участники профсоюза" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Фильтры
              {hasActiveFilters && <span className="ml-1 text-xs">●</span>}
            </Button>
            {unassigned.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowUnassigned(!showUnassigned)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Незакреплённые ({unassigned.length})
              </Button>
            )}
          </div>
        }
      />

      {/* Unassigned agents panel */}
      {showUnassigned && unassigned.length > 0 && (
        <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Члены без руководителя</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Button
                size="sm"
                onClick={async () => {
                  setBulkAssigning(true);
                  try {
                    const ids = unassigned.map((a) => a.id);
                    const res = await fetch("/api/agents/bulk-assign", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ agentIds: ids }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      alert(`Закреплено: ${data.assigned}`);
                      await loadData();
                      setShowUnassigned(false);
                    } else {
                      const err = await res.json();
                      alert(err.error || "Ошибка");
                    }
                  } catch { /* ignore */ }
                  finally { setBulkAssigning(false); }
                }}
                disabled={bulkAssigning || unassigned.length === 0}
              >
                {bulkAssigning ? "Закрепление..." : `Закрепить всех (${unassigned.length})`}
              </Button>
            </div>
            <div className="space-y-2">
              {unassigned.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background/60">
                  <div>
                    <p className="text-sm font-medium">{a.fullName}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleClaim(a.id)}
                      disabled={claiming === a.id}
                    >
                      {claiming === a.id ? "..." : "Закрепить за собой"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={async () => {
                        if (!confirm(`Удалить ${a.fullName} из списка?`)) return;
                        try {
                          const res = await fetch(`/api/agents/${a.id}`, { method: "DELETE" });
                          if (res.ok) await loadData();
                          else alert("Ошибка удаления");
                        } catch { /* ignore */ }
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Подразделение</label>
                <select
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm"
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                >
                  <option value="">Все</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Пол</label>
                <select
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Все</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                  <option value="not_specified">Не указан</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Город</label>
                <Input
                  className="h-8"
                  placeholder="Город..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Профессия</label>
                <Input
                  className="h-8"
                  placeholder="Профессия..."
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Возраст от</label>
                <Input
                  className="h-8"
                  type="number"
                  min={18}
                  max={80}
                  placeholder="18"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Возраст до</label>
                <Input
                  className="h-8"
                  type="number"
                  min={18}
                  max={80}
                  placeholder="80"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Сортировка</label>
                <select
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  {Object.entries(sortLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={resetFilters}>
                  <X className="h-3.5 w-3.5 mr-1" /> Сбросить
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Всего" value={agents.length} icon="Users" />
        <StatCard title="Обучаются" value={learning.length} icon="BookOpen" />
        <StatCard title="Активные" value={active.length} icon="UserCheck" />
        <StatCard title="Проблемные" value={problem.length} icon="AlertTriangle" />
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">{t.count}</span>
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={tabFiltered}
        onRowClick={(a: AgentRow) => router.push(`/manager/agents/${a.id}`)}
      />
    </div>
  );
}
