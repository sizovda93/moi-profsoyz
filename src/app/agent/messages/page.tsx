"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { Conversation, Message } from "@/types";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";

export default function AgentMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        const convs = Array.isArray(data) ? data : [];
        setConversations(convs);
        if (convs.length > 0) setActiveConv(convs[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = useCallback((convId: string) => {
    fetch(`/api/conversations/${convId}`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data.messages) ? data.messages : []))
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv.id);
  }, [activeConv, loadMessages]);

  const handleSend = async (text: string) => {
    if (!activeConv) return;
    const res = await fetch(`/api/conversations/${activeConv.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      loadMessages(activeConv.id);
    }
  };

  if (loading) return <CardSkeleton />;

  return (
    <div>
      <PageHeader
        title="Сообщения"
        description="Переписка с руководством профсоюза"
        breadcrumbs={[
          { title: "Платформа", href: "/agent/dashboard" },
          { title: "Сообщения" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-xl border border-border overflow-hidden h-[600px]">
        <div className="border-r border-border overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeId={activeConv?.id}
            onSelect={setActiveConv}
            currentRole="agent"
          />
        </div>

        <div className="lg:col-span-2">
          {activeConv ? (
            <ChatWindow
              conversation={activeConv}
              messages={messages}
              currentUserType="agent"
              onSend={handleSend}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Выберите диалог
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
