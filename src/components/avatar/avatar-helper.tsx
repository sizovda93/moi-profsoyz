"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface AvatarQuestion {
  id: string;
  label: string;
  video: string;
  answerText: string;
}

const IDLE_VIDEO = "/avatar/idle.webm";
const ELEVENLABS_VOICE_ID = "yl2ZDV1MzN4HbQJbMihG";

const questions: AvatarQuestion[] = [
  {
    id: "q1",
    label: "Что это за платформа?",
    video: "/avatar/answer-q1.webm",
    answerText:
      "Это профсоюзная платформа Мой Профсоюз. Здесь вы можете подавать обращения к руководству, задавать вопросы юристу, общаться с коллегами из вашего подразделения, проходить обучение по трудовым правам и получать новости профсоюза. Всё в одном месте.",
  },
  {
    id: "q2",
    label: "Как задать вопрос юристу?",
    video: "/avatar/answer-q2.webm",
    answerText:
      "В левом меню найдите раздел Вопрос юристу. Нажмите Задать вопрос, выберите категорию, например трудовые споры или заработная плата, напишите тему и подробно опишите ситуацию. Можно прикрепить документы. После отправки вопрос попадёт к юристу, и вы получите уведомление, когда ответ будет готов.",
  },
  {
    id: "q3",
    label: "Как связаться с руководителем?",
    video: "/avatar/answer-q1.webm",
    answerText:
      "Откройте раздел Сообщения в левом меню. Выберите диалог с руководителем или напишите новое сообщение. Руководитель получит уведомление и ответит прямо на платформе. Если подключён Телеграм, ответ придёт и в мессенджер. Подключить Телеграм можно в разделе Профиль.",
  },
  {
    id: "q4",
    label: "Где найти документы профсоюза?",
    video: "/avatar/answer-q2.webm",
    answerText:
      "Документы профсоюза находятся в разделе О профсоюзе, на вкладке Документы. Там опубликованы постановления, соглашения и другие официальные документы организации. Также на вкладке Деятельность есть документы по направлениям работы.",
  },
  {
    id: "q5",
    label: "Что такое Чат с ИИ?",
    video: "/avatar/answer-q1.webm",
    answerText:
      "Чат с ИИ — это раздел платформы, где вы можете мгновенно получить юридическую консультацию по трудовому праву. Искусственный интеллект ответит на ваш вопрос, сошлётся на статьи Трудового кодекса и подскажет, куда обратиться дальше. Найти его можно в левом меню — он выделен фиолетовым цветом.",
  },
];

type AvatarState = "idle" | "loading" | "answering";

async function fetchTTS(text: string): Promise<Blob | null> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) return null;
  return res.blob();
}

export function AvatarHelper() {
  const [state, setState] = useState<AvatarState>("idle");
  const [muted, setMuted] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<AvatarQuestion | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const switchToIdle = useCallback(() => {
    setState("idle");
    setActiveQuestion(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.src = IDLE_VIDEO;
      videoRef.current.loop = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const handleQuestion = useCallback(
    async (q: AvatarQuestion) => {
      if (state === "loading" || state === "answering") return;

      setState("loading");
      setActiveQuestion(q);

      // Fetch TTS first, THEN start video + audio together
      try {
        const audioBlob = await fetchTTS(q.answerText);

        if (!audioBlob || audioBlob.size === 0) {
          // No audio — just play video without sound
          if (videoRef.current) {
            videoRef.current.loop = false;
            videoRef.current.src = q.video;
            videoRef.current.play().catch(() => {});
          }
          setState("answering");
          return;
        }

        const url = URL.createObjectURL(audioBlob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audio.muted = muted;
        audioRef.current = audio;

        // Switch to answer video — LOOP it so it plays as long as audio lasts
        if (videoRef.current) {
          videoRef.current.loop = true;
          videoRef.current.src = q.video;
          videoRef.current.play().catch(() => {});
        }

        // Start audio simultaneously
        setState("answering");
        await audio.play();

        // When audio ends → switch back to idle
        audio.addEventListener("ended", switchToIdle, { once: true });
      } catch (err) {
        console.error("TTS error:", err);
        switchToIdle();
      }
    },
    [state, muted, switchToIdle]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  return (
    <div className="flex items-start gap-4">
      {/* Video card — left */}
      <Card className="overflow-hidden rounded-2xl shrink-0 !bg-[#2a2a2f] !border-[#3a3a42]" style={{ width: 220 }}>
        <CardContent className="p-0">
          <div className="relative overflow-hidden bg-[#2a2a2f]" style={{ height: 210 }}>
            <video
              ref={videoRef}
              src={IDLE_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto block absolute left-0 brightness-110"
              style={{ top: "-45%" }}
            />

            <button
              onClick={toggleMute}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
            >
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </button>

            {state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-[#2a2a2f]">
            <p className="text-sm font-semibold text-[#fafafa]">Сэр Бонифаций</p>
            <p className="text-[11px] text-[#71717a] leading-snug">
              Ваш помощник на платформе
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questions — right */}
      <div className="pt-2 space-y-3">
        <p className="text-xs text-muted-foreground">Подскажу, как всё устроено и с чего начать:</p>
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <Button
              key={q.id}
              size="sm"
              variant="outline"
              onClick={() => handleQuestion(q)}
              disabled={state === "loading"}
              className={`text-xs h-8 px-3 justify-start ${
                activeQuestion?.id === q.id
                  ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                  : "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              }`}
            >
              {q.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
