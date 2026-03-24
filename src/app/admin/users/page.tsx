"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { RoleBadge, UserStatusBadge, TierBadge, LifecycleBadge } from "@/components/dashboard/status-badges";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { UserRole, AgentTier, AgentLifecycle } from "@/types";
import { Filter, X } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface UserRow {
  id: string;
  role: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  agentId?: string;
  managerId?: string;
  managerName?: string;
  tier?: string;
  city?: string;
  profession?: string;
  birthYear?: number | null;
  gender?: string;
  lifecycle?: AgentLifecycle;
}

interface ManagerOption {
  id: string;
  fullName: string;
}

type SortKey = "newest" | "oldest" | "name_asc" | "name_desc" | "age_asc" | "age_desc" | "leads_desc" | "revenue_desc";

const sortLabels: Record<SortKey, string> = {
  newest: "Новые",
  oldest: "Старые",
  name_asc: "Имя А→Я",
  name_desc: "Имя Я→А",
  age_asc: "Возраст ↑",
  age_desc: "Возраст ↓",
  leads_desc: "Обращения ↓",
  revenue_desc: "Доход ↓",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [agents, setAgents] = useState<UserRow[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "agents">("all");

  // Filter state (for agents view)
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const buildAgentQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (gender) p.set("gender", gender);
    if (city.trim()) p.set("city", city.trim());
    if (profession.trim()) p.set("profession", profession.trim());
    if (minAge) p.set("minAge", minAge);
    if (maxAge) p.set("maxAge", maxAge);
    if (sort !== "newest") p.set("sort", sort);
    return p.toString() ? `?${p.toString()}` : "";
  }, [search, gender, city, profession, minAge, maxAge, sort]);

  const loadUsers = useCallback(() =>
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setUsers(data);
        setManagers(
          data
            .filter((u: any) => u.role === "manager")
            .map((u: any) => ({ id: u.id, fullName: u.fullName }))
        );
      }), []);

  const loadAgents = useCallback(() =>
    fetch(`/api/agents${buildAgentQuery()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAgents), [buildAgentQuery]);

  useEffect(() => {
    Promise.all([loadUsers(), loadAgents()]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload agents on filter change
  useEffect(() => {
    if (loading || viewMode !== "agents") return;
    const timer = setTimeout(() => { loadAgents(); }, 300);
    return () => clearTimeout(timer);
  }, [search, gender, city, profession, minAge, maxAge, sort, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAssignManager = async (agentId: string, managerId: string | null) => {
    setSaving(agentId);
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: managerId || null }),
      });
      await Promise.all([loadUsers(), loadAgents()]);
    } catch { /* ignore */ }
    finally { setSaving(null); }
  };

  const resetFilters = () => {
    setSearch("");
    setGender("");
    setCity("");
    setProfession("");
    setMinAge("");
    setMaxAge("");
    setSort("newest");
  };

  const hasActiveFilters = gender || city || profession || minAge || maxAge || sort !== "newest";

  if (loading) return <LoadingSkeleton />;

  // All users view — client-side search only
  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const userColumns = [
    {
      key: "name",
      title: "Пользователь",
      render: (u: UserRow) => (
        <div>
          <p className="font-medium">{u.fullName}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      title: "Роль",
      render: (u: UserRow) => (
        <div className="flex items-center gap-2">
          <RoleBadge role={u.role as UserRole} />
          {u.role === "agent" && u.tier && <TierBadge tier={u.tier as AgentTier} />}
        </div>
      ),
    },
    {
      key: "manager",
      title: "Руководитель",
      render: (u: UserRow) => {
        if (u.role !== "agent" || !u.agentId) return <span className="text-muted-foreground">—</span>;
        return (
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={u.managerId || ""}
            disabled={saving === u.agentId}
            onChange={(e) => handleAssignManager(u.agentId!, e.target.value || null)}
          >
            <option value="">Не назначен</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </select>
        );
      },
    },
    {
      key: "status",
      title: "Статус",
      render: (u: UserRow) => <UserStatusBadge status={u.status as "active" | "inactive" | "blocked"} />,
    },
    {
      key: "created",
      title: "Дата",
      render: (u: UserRow) => <span className="text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
  ];

  const agentColumns = [
    {
      key: "name",
      title: "Участник профсоюза",
      render: (a: UserRow) => (
        <div>
          <p className="font-medium">{a.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {[a.city, a.profession].filter(Boolean).join(" · ") || a.email}
          </p>
        </div>
      ),
    },
    {
      key: "lifecycle",
      title: "Статус",
      render: (a: UserRow) => a.lifecycle ? <LifecycleBadge lifecycle={a.lifecycle} /> : <span>—</span>,
    },
    {
      key: "gender",
      title: "Пол",
      render: (a: UserRow) => (
        <span className="text-muted-foreground">
          {a.gender === "male" ? "М" : a.gender === "female" ? "Ж" : "—"}
        </span>
      ),
    },
    {
      key: "age",
      title: "Возраст",
      render: (a: UserRow) => (
        <span className="text-muted-foreground">
          {a.birthYear ? `${new Date().getFullYear() - a.birthYear}` : "—"}
        </span>
      ),
    },
    {
      key: "manager",
      title: "Руководитель",
      render: (a: UserRow) => (
        <span className="text-muted-foreground">{a.managerName || "—"}</span>
      ),
    },
    {
      key: "tier",
      title: "Тир",
      render: (a: UserRow) => a.tier ? <TierBadge tier={a.tier as AgentTier} /> : <span>—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Пользователи"
        description="Управление пользователями и членами профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Пользователи" },
        ]}
        actions={
          <div className="flex gap-2">
            {viewMode === "agents" && (
              <Button
                size="sm"
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Фильтры
                {hasActiveFilters && <span className="ml-1 text-xs">●</span>}
              </Button>
            )}
          </div>
        }
      />

      {/* View mode tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant={viewMode === "all" ? "default" : "outline"}
          onClick={() => { setViewMode("all"); setShowFilters(false); }}
        >
          Все пользователи
          <span className="ml-1.5 text-xs opacity-70">{users.length}</span>
        </Button>
        <Button
          size="sm"
          variant={viewMode === "agents" ? "default" : "outline"}
          onClick={() => setViewMode("agents")}
        >
          Участники профсоюза
          <span className="ml-1.5 text-xs opacity-70">{agents.length}</span>
        </Button>
      </div>

      {/* Filter panel (agents only) */}
      {showFilters && viewMode === "agents" && (
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <Input className="h-8" placeholder="Город..." value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Профессия</label>
                <Input className="h-8" placeholder="Профессия..." value={profession} onChange={(e) => setProfession(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Возраст от</label>
                <Input className="h-8" type="number" min={18} max={80} placeholder="18" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Возраст до</label>
                <Input className="h-8" type="number" min={18} max={80} placeholder="80" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
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

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder={viewMode === "agents" ? "Поиск по имени или email..." : "Поиск по имени или email..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      {viewMode === "all" ? (
        <DataTable columns={userColumns} data={filteredUsers} />
      ) : (
        <DataTable columns={agentColumns} data={agents as any} />
      )}
    </div>
  );
}
