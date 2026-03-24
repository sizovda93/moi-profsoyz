"use client";

import { useState, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  onInputRef?: (ref: { insert: (text: string) => void }) => void;
}

export function MessageInput({ onSend, placeholder = "Напишите сообщение...", onInputRef }: MessageInputProps) {
  const [text, setText] = useState("");

  const insert = useCallback((draft: string) => {
    setText(draft);
  }, []);

  useEffect(() => {
    if (onInputRef) {
      onInputRef({ insert });
    }
  }, [onInputRef, insert]);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 border-t border-border">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder={placeholder}
        className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
      />
      <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
