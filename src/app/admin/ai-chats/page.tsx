"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { plural } from "@/lib/utils";
import { ArrowLeft, MessageCircle, Search, User, Bot } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChatRow {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  userRole: string;
  avatarUrl: string | null;
  messageCount: number;
  userMessageCount: number;
  lastUserMessage: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  agent: "Участник",
  manager: "Руководитель",
  admin: "Администратор",
};

export default function AdminAiChatsPage() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state for viewing messages
  const [selectedChat, setSelectedChat] = useState<ChatRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai-chats")
      .then((r) => (r.ok ? r.json() : []))
      .then(setChats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openChat = async (chat: ChatRow) => {
    setSelectedChat(chat);
    setMessagesLoading(true);
    setMessages([]);
    try {
      const res = await fetch(`/api/admin/ai-chats?chatId=${chat.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch { /* ignore */ }
    finally { setMessagesLoading(false); }
  };

  if (loading) return <LoadingSkeleton />;

  const filtered = chats.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Only chats that have at least 1 message
  const activeChats = filtered.filter((c) => Number(c.messageCount) > 0);

  return (
    <div>
      <PageHeader
        title="Чаты с ИИ"
        description={`${plural(activeChats.length, "пользователь общался", "пользователя общались", "пользователей общались")} с ИИ-помощником`}
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Чаты с ИИ" },
        ]}
      />

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Всего чатов</p>
            <p className="text-2xl font-semibold">{activeChats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Всего сообщений</p>
            <p className="text-2xl font-semibold">
              {activeChats.reduce((sum, c) => sum + Number(c.messageCount), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Вопросов пользователей</p>
            <p className="text-2xl font-semibold">
              {activeChats.reduce((sum, c) => sum + Number(c.userMessageCount), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Среднее сообщений/чат</p>
            <p className="text-2xl font-semibold">
              {activeChats.length > 0
                ? Math.round(
                    activeChats.reduce((sum, c) => sum + Number(c.messageCount), 0) / activeChats.length
                  )
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat list */}
      {activeChats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Нет чатов с ИИ
        </div>
      ) : (
        <div className="space-y-2">
          {activeChats.map((chat) => (
            <Card
              key={chat.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => openChat(chat)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{chat.fullName}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {roleLabels[chat.userRole] || chat.userRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{chat.email}</p>
                      {chat.lastUserMessage && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">
                          Последний вопрос: {chat.lastUserMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {plural(Number(chat.messageCount), "сообщение", "сообщения", "сообщений")}
                      </div>
                      {chat.lastMessageAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDateTime(chat.lastMessageAt)}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Открыть
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chat messages dialog */}
      <Dialog open={!!selectedChat} onOpenChange={(open) => !open && setSelectedChat(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft
                className="h-4 w-4 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setSelectedChat(null)}
              />
              {selectedChat?.fullName}
            </DialogTitle>
            <DialogDescription>
              {selectedChat?.email} · {roleLabels[selectedChat?.userRole || ""] || ""} · {" "}
              {selectedChat && plural(Number(selectedChat.messageCount), "сообщение", "сообщения", "сообщений")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1" style={{ maxHeight: "60vh" }}>
            {messagesLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Нет сообщений</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-3.5 py-2.5 max-w-[80%] text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1.5 ${
                        msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatDateTime(msg.createdAt)}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
