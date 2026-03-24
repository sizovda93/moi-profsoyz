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
  // Chats
  const [chats, setChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  // Active chat
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [contactName, setContactName] = useState("");
  // Input
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load colleagues and chats on mount
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
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/direct-chats/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setContactName(data.contactName || "");
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleSend = async () => {
    if (!activeChatId || !messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/direct-chats/${activeChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      if (res.ok) {
        setMessageText("");
        loadChat(activeChatId);
        // Refresh chat list
        fetch("/api/direct-chats")
          .then((r) => r.json())
          .then(setChats)
          .catch(() => {});
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
        title="Коллеги"
        description="Общение с коллегами из вашего профсоюза"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Коллеги" },
        ]}
      />

      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-xl border border-border overflow-hidden"
        style={{ height: 600 }}
      >
        {/* Colleagues panel - 3 cols */}
        <div className="lg:col-span-3 border-r border-border overflow-y-auto">
          <div className="sticky top-0 z-10 bg-card px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Коллеги</h3>
              {colleagues.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {colleagues.length}
                </Badge>
              )}
            </div>
          </div>

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
          ) : colleagues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100%-49px)] text-center px-4">
              <UserRound className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Нет коллег в профсоюзе
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
                    {colleague.profession && (
                      <p className="text-xs text-muted-foreground truncate">
                        {colleague.profession}
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

        {/* Chat list - 3 cols */}
        <div className="lg:col-span-3 border-r border-border overflow-y-auto">
          <div className="sticky top-0 z-10 bg-card px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Диалоги</h3>
            </div>
          </div>

          {chatsLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-2.5 w-32 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100%-49px)] text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Начните диалог с коллегой
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    activeChatId === chat.id &&
                      "bg-muted/70 border-l-2 border-l-primary"
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInit(chat.contactName || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {chat.contactName}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge className="shrink-0 text-[10px] px-1.5 py-0">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {chat.lastMessage}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat window - 6 cols */}
        <div className="lg:col-span-6 flex flex-col">
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
