"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChatWindow } from "@/components/chat/chat-window";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Conversation, Message } from "@/types";
import { Sparkles, Copy, RefreshCw, X, Loader2 } from "lucide-react";

export default function ManagerConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Draft state
  const [draftText, setDraftText] = useState<string | null>(null);
  const [draftGrounded, setDraftGrounded] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [inputRef, setInputRef] = useState<{ insert: (text: string) => void } | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          const { messages: msgs, ...conv } = data;
          setConversation(conv);
          setMessages(msgs || []);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSend = async (text: string) => {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setDraftText(null); // Clear draft after sending
    }
  };

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    setDraftError(null);
    try {
      const res = await fetch(`/api/conversations/${id}/draft`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDraftText(data.draftText);
        setDraftGrounded(!!(data.knowledgeSnippetsUsed && data.knowledgeSnippetsUsed.length > 0));
      } else {
        const err = await res.json();
        setDraftError(err.error || 'Ошибка генерации');
      }
    } catch {
      setDraftError('Ошибка сети');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleAcceptDraft = () => {
    if (draftText && inputRef) {
      inputRef.insert(draftText);
      fetch(`/api/conversations/${id}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      }).catch(() => {});
      setDraftText(null);
    }
  };

  const handleRejectDraft = () => {
    fetch(`/api/conversations/${id}/draft`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    }).catch(() => {});
    setDraftText(null);
    setDraftError(null);
  };

  if (loading) return <LoadingSkeleton />;

  if (!conversation) {
    return (
      <div>
        <PageHeader title="Диалог не найден" breadcrumbs={[{ title: "Диалоги", href: "/manager/conversations" }, { title: "Не найден" }]} />
      </div>
    );
  }

  // Show generate button only if last message is from agent
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const canGenerate = lastMessage?.senderType === 'agent';

  return (
    <div>
      <PageHeader
        title={`Диалог: ${conversation.clientName}`}
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Диалоги", href: "/manager/conversations" },
          { title: conversation.clientName },
        ]}
        actions={
          canGenerate && !draftText ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateDraft}
              disabled={draftLoading}
            >
              {draftLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {draftLoading ? "Генерация..." : "Предложить ответ"}
            </Button>
          ) : undefined
        }
      />

      {/* Draft suggestion block */}
      {draftText && (
        <Card className="mb-4 border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">
                Предложенный ответ{draftGrounded ? " (с учётом базы знаний)" : ""}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-3 whitespace-pre-line">{draftText}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAcceptDraft}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Вставить в поле
              </Button>
              <Button size="sm" variant="outline" onClick={handleGenerateDraft} disabled={draftLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${draftLoading ? 'animate-spin' : ''}`} /> Обновить
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRejectDraft}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draftError && !draftText && (
        <Card className="mb-4 p-3 border-yellow-500/20 bg-yellow-500/5">
          <p className="text-sm text-yellow-700">{draftError}</p>
        </Card>
      )}

      <div className="rounded-xl border border-border overflow-hidden h-[600px]">
        <ChatWindow
          conversation={conversation}
          messages={messages}
          currentUserType="manager"
          onSend={handleSend}
          showClassification
          onInputRef={setInputRef}
        />
      </div>
    </div>
  );
}
