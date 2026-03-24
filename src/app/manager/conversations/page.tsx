"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { DataTable } from "@/components/dashboard/data-table";
import {
  ConversationStatusBadge, ModeBadge, ChannelBadge,
  ClassificationBadge, AttentionDot,
} from "@/components/dashboard/status-badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ManagerConversationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  const filtered = conversations.filter((c) =>
    c.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((c) => c.status === "active" || c.status === "waiting");
  const escalated = filtered.filter((c) => c.status === "escalated");
  const attention = filtered.filter((c) => c.hasAttention);

  const columns = [
    {
      key: "attention",
      title: "",
      render: (c: any) => c.hasAttention ? <AttentionDot /> : null,
      className: "w-4",
    },
    {
      key: "client",
      title: "Клиент",
      render: (c: any) => <span className="font-medium">{c.clientName}</span>,
    },
    {
      key: "classification",
      title: "AI",
      render: (c: any) => <ClassificationBadge classification={c.lastClassification} />,
    },
    {
      key: "channel",
      title: "Канал",
      render: (c: any) => <ChannelBadge channel={c.channel || "web"} />,
    },
    {
      key: "status",
      title: "Статус",
      render: (c: any) => <ConversationStatusBadge status={c.status} />,
    },
    {
      key: "unread",
      title: "Непрочитано",
      render: (c: any) =>
        c.unreadCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1.5">
            {c.unreadCount}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "lastMsg",
      title: "Последнее сообщение",
      render: (c: any) => (
        <span className="text-muted-foreground text-sm truncate max-w-48 block">{c.lastMessage}</span>
      ),
    },
  ];

  const defaultTab = attention.length > 0 ? "attention" : "all";

  return (
    <div>
      <PageHeader
        title="Диалоги"
        description="Мониторинг всех диалогов с клиентами"
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Диалоги" },
        ]}
      />

      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по имени клиента..." />
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {attention.length > 0 && (
            <TabsTrigger value="attention" className="text-red-600">
              Требует внимания ({attention.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all">Все ({filtered.length})</TabsTrigger>
          <TabsTrigger value="active">Активные ({active.length})</TabsTrigger>
          <TabsTrigger value="escalated">Эскалации ({escalated.length})</TabsTrigger>
        </TabsList>
        {attention.length > 0 && (
          <TabsContent value="attention">
            <DataTable columns={columns} data={attention} onRowClick={(c: any) => router.push(`/manager/conversations/${c.id}`)} />
          </TabsContent>
        )}
        <TabsContent value="all">
          <DataTable columns={columns} data={filtered} onRowClick={(c: any) => router.push(`/manager/conversations/${c.id}`)} />
        </TabsContent>
        <TabsContent value="active">
          <DataTable columns={columns} data={active} onRowClick={(c: any) => router.push(`/manager/conversations/${c.id}`)} />
        </TabsContent>
        <TabsContent value="escalated">
          <DataTable columns={columns} data={escalated} onRowClick={(c: any) => router.push(`/manager/conversations/${c.id}`)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
