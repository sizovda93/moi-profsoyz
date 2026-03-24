"use client";

import { Message } from "@/types";
import { cn } from "@/lib/utils";
import { ClassificationBadge } from "@/components/dashboard/status-badges";

interface MessageBubbleProps {
  message: Message & { classification?: string | null; needsAttention?: boolean };
  isOwn?: boolean;
  showClassification?: boolean;
}

export function MessageBubble({ message, isOwn, showClassification }: MessageBubbleProps) {
  const isSystem = message.senderType === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.text}
        </span>
      </div>
    );
  }

  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  return (
    <div className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
          message.needsAttention && !isOwn ? "ring-1 ring-red-400/50" : ""
        )}
      >
        {!isOwn && (
          <p className="text-xs font-medium mb-0.5 opacity-70">{message.senderName}</p>
        )}
        <p className="text-sm leading-relaxed">{message.text}</p>
        <div className={cn("flex items-center gap-2 mt-1", isOwn ? "" : "")}>
          <p
            className={cn(
              "text-[10px]",
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {time}
          </p>
          {showClassification && !isOwn && message.classification && (
            <ClassificationBadge classification={message.classification} />
          )}
        </div>
      </div>
    </div>
  );
}
