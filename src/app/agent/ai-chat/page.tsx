"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, User, AlertCircle, Sparkles, Volume2, VolumeX } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const quickQuestions = [
  "Как подать обращение к руководителю?",
  "Как задать вопрос юристу?",
  "Где посмотреть документы профсоюза?",
  "Где пройти обучение?",
  "Как написать руководителю?",
  "Где посмотреть новости профсоюза?",
  "Что находится в разделе «О профсоюзе»?",
  "Как написать коллеге из подразделения?",
];

// Idle variants — random one picked on each page load
const IDLE_VARIANTS = [
  { video: "/ai-cat/sleep.mp4", voice: null, hasAudioInVideo: false }, // silent sleep with purr
  { video: "/ai-cat/idle-1.mp4", voice: "/ai-cat/idle-1-voice.mp3", hasAudioInVideo: false },
  { video: "/ai-cat/idle-2.mp4", voice: "/ai-cat/idle-2-voice.mp3", hasAudioInVideo: false },
  { video: "/ai-cat/idle-3.mp4", voice: null, hasAudioInVideo: true }, // sound baked into video
];

const CAT_PEEK = "/ai-cat/peek.mp4";
const CAT_TALK = "/ai-cat/talk.mp4";
const CAT_THINK = "/ai-cat/think.mp4";
const CAT_ANSWER = "/ai-cat/answer.mp4";
const CAT_THINK_VOICE = "/ai-cat/think-voice.mp3";
const CAT_ANSWER_VOICE = "/ai-cat/answer-voice.mp3";
const CAT_PURR = "/ai-cat/purr.mp3";

type CatState = "idle" | "peek" | "talk" | "think" | "answer";

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cat state — pick random idle variant on mount
  const [idleVariant] = useState(() => IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)]);
  const [catState, setCatState] = useState<CatState>("idle");
  const catVideoRef = useRef<HTMLVideoElement>(null);
  const catAudioRef = useRef<HTMLAudioElement | null>(null);
  const purrAudioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleVoicePlayed = useRef(false);

  useEffect(() => {
    fetch("/api/ai-chat")
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play idle voice in loop while catState is "idle" (stops when user types)
  useEffect(() => {
    if (catState !== "idle" || !idleVariant.voice || muted) return;
    let stopped = false;
    const playLoop = () => {
      if (stopped) return;
      const audio = new Audio(idleVariant.voice!);
      catAudioRef.current = audio;
      audio.addEventListener("ended", () => {
        // Small pause between repeats
        setTimeout(() => { if (!stopped) playLoop(); }, 500);
      }, { once: true });
      audio.play().catch(() => {});
    };
    // Start with 1s delay on first load
    const timer = setTimeout(playLoop, 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (catAudioRef.current) { catAudioRef.current.pause(); catAudioRef.current = null; }
    };
  }, [catState, idleVariant.voice, muted]);

  // Switch cat video + audio when state changes
  useEffect(() => {
    if (!catVideoRef.current) return;

    // Map state to video src
    let videoSrc: string;
    if (catState === "idle") {
      videoSrc = idleVariant.video;
    } else {
      const srcMap: Record<string, string> = {
        peek: CAT_PEEK, talk: CAT_TALK, think: CAT_THINK, answer: CAT_ANSWER,
      };
      videoSrc = srcMap[catState] || idleVariant.video;
    }

    catVideoRef.current.src = videoSrc;
    catVideoRef.current.loop = catState !== "talk"; // talk plays once, rest loop
    // Unmute video only for idle variants with baked-in audio
    catVideoRef.current.muted = !(catState === "idle" && idleVariant.hasAudioInVideo && !muted);
    catVideoRef.current.play().catch(() => {});

    // Voice: play when entering different states
    let voiceAudio: HTMLAudioElement | null = null;
    let mutedTimeout: ReturnType<typeof setTimeout> | null = null;

    if (catState === "talk") {
      if (!muted) {
        voiceAudio = new Audio(CAT_THINK_VOICE);
        catAudioRef.current = voiceAudio;
        voiceAudio.addEventListener("ended", () => {
          setCatState("think");
        }, { once: true });
        voiceAudio.play().catch(() => {
          setCatState("think");
        });
      } else {
        mutedTimeout = setTimeout(() => setCatState("think"), 3000);
      }
    }

    if (catState === "answer") {
      if (!muted) {
        voiceAudio = new Audio(CAT_ANSWER_VOICE);
        catAudioRef.current = voiceAudio;
        voiceAudio.addEventListener("ended", () => {
          setCatState("idle");
        }, { once: true });
        voiceAudio.play().catch(() => {
          setCatState("idle");
        });
      } else {
        mutedTimeout = setTimeout(() => setCatState("idle"), 5000);
      }
    }

    // Purr: play only when idle with sleep variant (no voice), stop otherwise
    if (catState === "idle" && !idleVariant.voice && !muted) {
      if (!purrAudioRef.current) {
        const purr = new Audio(CAT_PURR);
        purr.loop = true;
        purr.volume = 0.3;
        purrAudioRef.current = purr;
      }
      purrAudioRef.current.play().catch(() => {});
    } else if (purrAudioRef.current) {
      purrAudioRef.current.pause();
    }

    // Cleanup: stop audio created in THIS effect run
    return () => {
      if (voiceAudio) { voiceAudio.pause(); voiceAudio = null; }
      if (mutedTimeout) clearTimeout(mutedTimeout);
      if (purrAudioRef.current) { purrAudioRef.current.pause(); purrAudioRef.current = null; }
    };
  }, [catState, muted, idleVariant]);

  // Cleanup catAudioRef on unmount only
  useEffect(() => {
    return () => {
      if (catAudioRef.current) { catAudioRef.current.pause(); catAudioRef.current = null; }
    };
  }, []);

  // Stop audio when user leaves the page (tab switch, window switch, alt-tab)
  useEffect(() => {
    const pauseAll = () => {
      if (purrAudioRef.current) purrAudioRef.current.pause();
      if (catAudioRef.current) catAudioRef.current.pause();
    };
    const resumeIfNeeded = () => {
      if (catState === "idle" && !idleVariant.voice && !muted && purrAudioRef.current) {
        purrAudioRef.current.play().catch(() => {});
      }
    };
    const handleVisibility = () => {
      if (document.hidden) pauseAll(); else resumeIfNeeded();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", pauseAll);
    window.addEventListener("focus", resumeIfNeeded);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", pauseAll);
      window.removeEventListener("focus", resumeIfNeeded);
    };
  }, [catState, muted]);

  // Trigger talk → voice → think sequence (audio handled in useEffect)
  const playCatThinkSequence = useCallback(() => {
    // Clear any pending typing timeout so it doesn't override cat state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Stop purr
    if (purrAudioRef.current) purrAudioRef.current.pause();
    // Stop any previous voice
    if (catAudioRef.current) { catAudioRef.current.pause(); catAudioRef.current = null; }
    // Switch to talk — useEffect will play the voice audio
    setCatState("talk");
  }, []);

  // Handle input typing → cat peeks
  const handleInputChange = (value: string) => {
    setInput(value);
    if (sending) return; // don't change cat while AI is thinking
    if (value.trim()) {
      setCatState("peek");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setCatState("idle");
      }, 3000);
    } else {
      setCatState("idle");
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setSending(true);

    // Cat: voice first, then think video
    playCatThinkSequence();

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, {
          id: data.message?.id || `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          createdAt: data.message?.createdAt || new Date().toISOString(),
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Не удалось получить ответ. Попробуйте позже.",
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Ошибка соединения. Попробуйте позже.",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      // Stop think voice, switch to answer video + voice
      if (catAudioRef.current) { catAudioRef.current.pause(); catAudioRef.current = null; }
      setCatState("answer");
    }
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (catAudioRef.current) catAudioRef.current.muted = next;
      if (purrAudioRef.current) {
        if (next) {
          purrAudioRef.current.pause();
        } else if (catState === "idle" && !idleVariant.voice) {
          purrAudioRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  };

  const formatTime = (dateStr: string) =>
    new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateStr));

  return (
    <div>
      <PageHeader
        title="Чат с ИИ"
        description="Мгновенные юридические консультации и помощь по платформе"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Чат с ИИ" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cat panel */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden !bg-[#2a2a2f] !border-[#3a3a42]">
            <CardContent className="p-0">
              <div className="relative bg-[#2a2a2f]" style={{ height: 280 }}>
                <video
                  ref={catVideoRef}
                  src={idleVariant.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover brightness-110"
                />
                <button
                  onClick={toggleMute}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                >
                  {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
                {/* State indicator */}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/50 text-[10px] text-white">
                  {catState === "idle" && "😺 На месте"}
                  {catState === "peek" && "👀 Подсматривает..."}
                  {catState === "talk" && "💬 Говорит..."}
                  {catState === "think" && "🤔 Думает..."}
                  {catState === "answer" && "✅ Ответ готов!"}
                </div>
              </div>
              <div className="px-3 py-2 bg-[#2a2a2f]">
                <p className="text-sm font-semibold text-[#fafafa]">Котофей Петрович</p>
                <p className="text-[11px] text-[#71717a] leading-snug">ИИ-помощник профсоюза</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Chat window */}
        <div className="lg:col-span-9">
          <Card className="flex flex-col" style={{ height: 600 }}>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Помощник «Мой Профсоюз»</p>
                <p className="text-[10px] text-muted-foreground">Юридические консультации и навигация по платформе</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium mb-1">Добро пожаловать!</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Задайте вопрос о трудовых правах, платформе или профсоюзе. Выберите быстрый вопрос слева или напишите свой.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {sending && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Задайте вопрос..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 mt-3 px-1">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              ИИ-помощник консультирует по трудовому праву и профсоюзной деятельности. Для персонального сопровождения с документами используйте раздел «Вопрос юристу».
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
