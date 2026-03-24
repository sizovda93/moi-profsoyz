"use client";

import { Conversation } from "@/types";
import { ConversationStatusBadge, ModeBadge, ChannelBadge } from "@/components/dashboard/status-badges";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, activeId, onSelect }: ConversationListProps) {
  return (
    <div className="flex flex-col">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={cn(
            "flex flex-col gap-1.5 p-4 text-left border-b border-border transition-colors hover:bg-muted/50 cursor-pointer",
            activeId === conv.id && "bg-muted/70 border-l-2 border-l-primary"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{conv.clientName}</span>
            {conv.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1.5">
                {conv.unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <ModeBadge mode={conv.mode} />
            <ConversationStatusBadge status={conv.status} />
            {conv.channel && conv.channel !== "web" && (
              <ChannelBadge channel={conv.channel} />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
