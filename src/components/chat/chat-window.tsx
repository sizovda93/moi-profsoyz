"use client";

import { Message, Conversation } from "@/types";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { ConversationStatusBadge, ChannelBadge } from "@/components/dashboard/status-badges";

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  currentUserType?: string;
  onSend?: (text: string) => void;
  showClassification?: boolean;
  onInputRef?: (ref: { insert: (text: string) => void }) => void;
}

function getContactInfo(conv: Conversation & { agentName?: string; managerName?: string }, currentUserType: string): { name: string; role: string } {
  if (currentUserType === "agent") {
    const name = (conv as any).managerName;
    if (name) return { name, role: "Руководитель профсоюза" };
  }
  if (currentUserType === "manager") {
    const name = (conv as any).agentName;
    if (name) return { name, role: "Участник профсоюза" };
  }
  return { name: conv.clientName || "Диалог", role: "" };
}

export function ChatWindow({ conversation, messages, currentUserType = "agent", onSend, showClassification, onInputRef }: ChatWindowProps) {
  const contact = getContactInfo(conversation as any, currentUserType);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-medium">{contact.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {contact.role && (
              <span className="text-xs text-muted-foreground">{contact.role}</span>
            )}
            <ConversationStatusBadge status={conversation.status} />
            {conversation.channel && conversation.channel !== "web" && (
              <ChannelBadge channel={conversation.channel} />
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderType === currentUserType}
            showClassification={showClassification}
          />
        ))}
      </div>

      {/* Input */}
      <MessageInput onSend={onSend ?? (() => {})} onInputRef={onInputRef} />
    </div>
  );
}
