"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Send, Loader2, UserRound, MessageCircle } from "lucide-react";

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

interface ChatMsg {
  id: string;
  text: string;
  senderType: string;
  senderName?: string;
  createdAt: string;
  isOwn?: boolean;
}

export default function AgentManagerChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [managerName, setManagerName] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [noManager, setNoManager] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load or create conversation with manager
  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        const convs = Array.isArray(data) ? data : [];
        if (convs.length > 0) {
          const conv = convs[0];
          setConversationId(conv.id);
          setManagerName(conv.managerName || "Руководитель");
        } else {
          setNoManager(true);
        }
      })
      .catch(() => setNoManager(true))
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = useCallback(() => {
    if (!conversationId) return;
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) loadMessages();
  }, [conversationId, loadMessages]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!conversationId || !messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      if (res.ok) {
        setMessageText("");
        loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) return <CardSkeleton />;

  return (
    <div>
      <PageHeader
        title="Чат с руководителем"
        description="Прямая связь с руководством профсоюза"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Чат с руководителем" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cat panel */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden !bg-[#2a2a2f] !border-[#3a3a42]">
            <CardContent className="p-0">
              <div className="relative" style={{ height: 240 }}>
                <video
                  src="/ai-cat/peek.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover brightness-110"
                />
              </div>
              <div className="px-3 py-2.5 bg-[#2a2a2f]">
                <p className="text-sm font-semibold text-[#a0a0a8]">Котофей Петрович</p>
                <p className="text-[10px] text-[#a0a0a8] leading-snug">
                  Заслуженный помощник профсоюзного движения.
                  <br />
                  Кандидат сметанных и сгущённых наук
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Comic bubble */}
          <div className="relative mt-3 mx-1">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <p className="text-xs leading-relaxed">
                Задавайте вопросы, а я передам Сергею Александровичу. У нас как раз совещание через час!
              </p>
            </div>
            {/* Tail */}
            <div className="absolute -top-1 left-4 w-3 h-3 bg-card border-l border-t border-border rotate-45" />
          </div>
        </div>

        {/* Chat window */}
        <div className="lg:col-span-9">
          {noManager ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <UserRound className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">Руководитель пока не назначен</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Ваш руководитель появится после того, как администратор назначит вас в подразделение. После этого здесь откроется чат.
              </p>
            </Card>
          ) : (
            <Card className="flex flex-col overflow-hidden" style={{ height: 600 }}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInit(managerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{managerName}</p>
                  <p className="text-[11px] text-muted-foreground">Руководитель</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Напишите руководителю — он получит ваше сообщение
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          msg.isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          {msg.createdAt ? formatTime(msg.createdAt) : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border px-4 py-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Написать руководителю..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={sending || !messageText.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
