"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Users,
  MessageSquare,
  Send,
  Loader2,
  UserRound,
  MessagesSquare,
} from "lucide-react";

function getInit(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const formatTime = (dateStr: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));

export default function AgentColleaguesPage() {
  // Colleagues
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [colleaguesLoading, setColleaguesLoading] = useState(true);
  // Manager
  const [manager, setManager] = useState<{ id: string; name: string; conversationId: string } | null>(null);
  // Chats
  const [chats, setChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  // Active chat
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<"direct" | "conversation">("direct");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [contactName, setContactName] = useState("");
  // Input
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load colleagues, manager, and chats on mount
  useEffect(() => {
    fetch("/api/colleagues")
      .then((r) => r.json())
      .then((data) => setColleagues(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setColleaguesLoading(false));

    fetch("/api/direct-chats")
      .then((r) => r.json())
      .then((data) => setChats(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setChatsLoading(false));

    // Load manager from conversations
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        const convs = Array.isArray(data) ? data : [];
        if (convs.length > 0) {
          setManager({
            id: convs[0].managerId,
            name: convs[0].managerName || "Руководитель",
            conversationId: convs[0].id,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-refresh active chat every 5 seconds
  useEffect(() => {
    if (!activeChatId) return;
    const interval = setInterval(() => {
      const endpoint = activeChatType === "conversation" ? `/api/conversations/${activeChatId}` : `/api/direct-chats/${activeChatId}`;
      fetch(endpoint)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.messages) setMessages(data.messages);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [activeChatId, activeChatType]);

  const loadChat = async (chatId: string, type: "direct" | "conversation" = "direct") => {
    setActiveChatId(chatId);
    setActiveChatType(type);
    setChatLoading(true);
    try {
      const endpoint = type === "conversation" ? `/api/conversations/${chatId}` : `/api/direct-chats/${chatId}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setContactName(type === "conversation" ? (data.managerName || "Руководитель") : (data.contactName || ""));
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleSend = async () => {
    if (!activeChatId || !messageText.trim()) return;
    setSending(true);
    try {
      const endpoint = activeChatType === "conversation" ? `/api/conversations/${activeChatId}` : `/api/direct-chats/${activeChatId}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      if (res.ok) {
        setMessageText("");
        loadChat(activeChatId, activeChatType);
        if (activeChatType === "direct") {
          fetch("/api/direct-chats").then((r) => r.json()).then(setChats).catch(() => {});
        }
      }
    } finally {
      setSending(false);
    }
  };

  const startChat = async (colleagueId: string) => {
    const res = await fetch("/api/direct-chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: colleagueId }),
    });
    if (res.ok) {
      const data = await res.json();
      loadChat(data.chatId);
      // Refresh chat list
      fetch("/api/direct-chats")
        .then((r) => r.json())
        .then(setChats)
        .catch(() => {});
    }
  };

  if (colleaguesLoading && chatsLoading) return <CardSkeleton />;

  return (
    <div>
      <PageHeader
        title="Корпоративные чаты"
        description="Общение с руководителем и коллегами из вашего профсоюза"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Корпоративные чаты" },
        ]}
      />
      <div className="-mt-6 mb-6">
        <span className="inline-block px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          Корпоративные чаты
        </span>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-xl border border-border overflow-hidden"
        style={{ height: 600 }}
      >
        {/* Contacts panel - 3 cols */}
        <div className="lg:col-span-3 border-r border-border overflow-y-auto">
          <div className="sticky top-0 z-10 bg-card px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Контакты</h3>
              {(colleagues.length + (manager ? 1 : 0)) > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {colleagues.length + (manager ? 1 : 0)}
                </Badge>
              )}
            </div>
          </div>

          {/* Manager — highlighted at top */}
          {manager && (
            <div
              className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b-2 border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer"
              onClick={() => loadChat(manager.conversationId, "conversation")}
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInit(manager.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{manager.name}</p>
                <p className="text-[11px] text-primary truncate">Руководитель</p>
              </div>
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            </div>
          )}

          {colleaguesLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-2.5 w-16 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : colleagues.length === 0 && !manager ? (
            <div className="flex flex-col items-center justify-center h-[calc(100%-49px)] text-center px-4">
              <UserRound className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Нет контактов
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {colleagues.map((colleague) => (
                <div
                  key={colleague.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInit(colleague.fullName || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {colleague.fullName}
                    </p>
                    {colleague.divisionName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {colleague.divisionName}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => startChat(colleague.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Написать
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat window - 9 cols */}
        <div className="lg:col-span-9 flex flex-col">
          {!activeChatId ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessagesSquare className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Выберите диалог или напишите коллеге
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="sticky top-0 z-10 bg-card px-4 py-3 border-b border-border flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInit(contactName || "")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-sm font-semibold truncate">
                  {contactName}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {chatLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">
                      Нет сообщений. Начните переписку!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.isOwn;
                    return (
                      <div
                        key={msg.id || idx}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-xl px-3.5 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {!isOwn && msg.senderName && (
                            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                              {msg.senderName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isOwn
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {msg.created_at ? formatTime(msg.created_at) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="border-t border-border px-4 py-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Введите сообщение..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sending || !messageText.trim()}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
