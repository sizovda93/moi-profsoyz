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
      "Это партнёрская платформа, где вы можете передавать клиентов, следить за их статусами и зарабатывать через партнёрскую программу",
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
    <Card className="overflow-hidden rounded-2xl max-w-xs">
      <CardContent className="p-0">
        <div className="relative">
          <video
            ref={videoRef}
            src={IDLE_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto block"
          />

          <button
            onClick={toggleMute}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {state === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 rounded-2xl">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2">Задайте вопрос:</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q) => (
              <Button
                key={q.id}
                size="sm"
                variant={activeQuestion?.id === q.id ? "default" : "outline"}
                onClick={() => handleQuestion(q)}
                disabled={state === "loading"}
                className="text-xs"
              >
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
