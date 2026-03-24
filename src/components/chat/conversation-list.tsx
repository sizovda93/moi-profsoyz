"use client";

import { Conversation } from "@/types";
import { ConversationStatusBadge, ModeBadge, ChannelBadge } from "@/components/dashboard/status-badges";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
  currentRole?: string;
}

function getContactName(conv: Conversation & { agentName?: string; managerName?: string }, role?: string): { name: string; role: string } {
  if (role === "agent") {
    // Member sees manager name as contact
    const name = (conv as any).managerName;
    if (name) return { name, role: "Руководитель" };
  }
  if (role === "manager") {
    // Leader sees agent/member name as contact
    const name = (conv as any).agentName;
    if (name) return { name, role: "Член профсоюза" };
  }
  // Fallback to clientName
  return { name: conv.clientName || "Диалог", role: "" };
}

export function ConversationList({ conversations, activeId, onSelect, currentRole }: ConversationListProps) {
  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const contact = getContactName(conv as any, currentRole);
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              "flex flex-col gap-1.5 p-4 text-left border-b border-border transition-colors hover:bg-muted/50 cursor-pointer",
              activeId === conv.id && "bg-muted/70 border-l-2 border-l-primary"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="font-medium text-sm block truncate">{contact.name}</span>
                {contact.role && (
                  <span className="text-[10px] text-muted-foreground">{contact.role}</span>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1.5 shrink-0">
                  {conv.unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <ConversationStatusBadge status={conv.status} />
              {conv.channel && conv.channel !== "web" && (
                <ChannelBadge channel={conv.channel} />
              )}
            </div>
          </button>
        );
      })}
      {conversations.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Нет диалогов
        </div>
      )}
    </div>
  );
}
