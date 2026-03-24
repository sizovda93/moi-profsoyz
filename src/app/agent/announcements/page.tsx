"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Megaphone, Clock } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} д назад`;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(dateStr));
};

export default function AgentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        // Filter only broadcast notifications
        setAnnouncements(all.filter((n: Announcement) => n.type === "broadcast"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  if (loading) return <CardSkeleton />;

  const unreadCount = announcements.filter((a) => !a.read).length;

  return (
    <div>
      <PageHeader
        title="Объявления"
        description="Рассылки и объявления от руководства профсоюза"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Объявления" },
        ]}
      />

      {unreadCount > 0 && (
        <div className="mb-4">
          <Badge variant="secondary">{unreadCount} новых</Badge>
        </div>
      )}

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-medium mb-1">Нет объявлений</p>
            <p className="text-xs text-muted-foreground">
              Здесь будут появляться рассылки и объявления от руководства профсоюза
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card
              key={a.id}
              className={`transition-colors ${!a.read ? "border-primary/30 bg-primary/5" : ""}`}
              onClick={() => !a.read && markAsRead(a.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${!a.read ? "bg-primary/10" : "bg-muted"}`}>
                    <Megaphone className={`h-4 w-4 ${!a.read ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-medium ${!a.read ? "" : "text-muted-foreground"}`}>
                        {a.title}
                      </p>
                      {!a.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{a.message}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{formatTimeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
