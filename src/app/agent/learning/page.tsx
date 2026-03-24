"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchModules, fetchAllLessons, LearningModule, LearningLesson, ProgressMap } from "@/lib/learning-content";
import {
  Rocket, Wallet, FileText, MessageSquare, HelpCircle,
  Target, Plug, ScrollText, BookOpen, CheckCircle2, ChevronRight, Play, Loader2, ShieldCheck,
} from "lucide-react";

const ROLE = "agent";
const STORAGE_KEY = `learning_progress_${ROLE}`;

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket, Wallet, FileText, MessageSquare, HelpCircle,
  Target, Plug, ScrollText, BookOpen,
};

function getLocalProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

export default function AgentLearningPage() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [allLessons, setAllLessons] = useState<{ module: LearningModule; lesson: LearningLesson }[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load server progress, fall back to localStorage
    const loadProgress = async () => {
      try {
        const res = await fetch("/api/learning/progress");
        if (res.ok) {
          const data = await res.json();
          const serverMap: ProgressMap = {};
          for (const slug of data.completedSlugs ?? []) {
            serverMap[slug] = { completedAt: new Date().toISOString() };
          }
          // Merge: server wins, localStorage fills gaps
          const local = getLocalProgress();
          const merged = { ...local, ...serverMap };
          setProgress(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return;
        }
      } catch { /* fall through to localStorage */ }
      setProgress(getLocalProgress());
    };

    Promise.all([
      fetchModules(ROLE),
      fetchAllLessons(ROLE),
      loadProgress(),
    ]).then(([m, l]) => {
      setModules(m);
      setAllLessons(l);
      setLoading(false);
    });
  }, []);

  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => progress[l.lesson.slug]).length;
  const firstUnread = allLessons.find((l) => !progress[l.lesson.slug]);

  // Required modules progress
  const requiredModules = modules.filter((m) => m.isRequired);
  const requiredLessons = allLessons.filter((l) => requiredModules.some((m) => m.id === l.module.id));
  const requiredCompleted = requiredLessons.filter((l) => progress[l.lesson.slug]).length;
  const allRequiredDone = requiredLessons.length > 0 && requiredCompleted >= requiredLessons.length;

  if (loading) {
    return (
      <>
        <PageHeader title="Обучение" description="Руководства и инструкции по работе с платформой"
          breadcrumbs={[{ title: "Платформа", href: `/${ROLE}/dashboard` }, { title: "Обучение" }]} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Обучение"
        description="Руководства и инструкции по работе с платформой"
        breadcrumbs={[
          { title: "Платформа", href: `/${ROLE}/dashboard` },
          { title: "Обучение" },
        ]}
      />

      {/* Required progress */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Обязательное обучение
          </span>
          <span className="text-sm text-muted-foreground">
            {requiredCompleted} из {requiredLessons.length} уроков
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${allRequiredDone ? "bg-green-500" : "bg-primary"}`}
            style={{ width: requiredLessons.length ? `${(requiredCompleted / requiredLessons.length) * 100}%` : "0%" }}
          />
        </div>
        {allRequiredDone && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Все обязательные модули пройдены
          </p>
        )}
      </Card>

      {/* Overall progress (if has optional) */}
      {totalLessons > requiredLessons.length && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Общий прогресс</span>
            <span className="text-sm text-muted-foreground">
              {completedLessons} из {totalLessons} уроков
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: totalLessons ? `${(completedLessons / totalLessons) * 100}%` : "0%" }}
            />
          </div>
        </Card>
      )}

      {/* Start here block */}
      {firstUnread && completedLessons < totalLessons && (
        <Card className="p-5 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {completedLessons === 0 ? "С чего начать" : "Продолжить обучение"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {firstUnread.module.title} &rarr; {firstUnread.lesson.title}
              </p>
            </div>
            <Link href={`/${ROLE}/learning/${firstUnread.lesson.slug}`}>
              <Button size="sm">
                <Play className="h-3.5 w-3.5 mr-1.5" />
                {completedLessons === 0 ? "Начать" : "Продолжить"}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {completedLessons === totalLessons && totalLessons > 0 && (
        <Card className="p-5 mb-6 border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-500">Обучение завершено</p>
              <p className="text-xs text-muted-foreground mt-0.5">Вы прошли все уроки. Можете вернуться к любому для повторения.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Modules */}
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((mod) => {
          const Icon = iconMap[mod.icon] ?? BookOpen;
          const done = mod.lessons.filter((l) => progress[l.slug]).length;
          const allDone = done === mod.lessons.length;

          return (
            <Card key={mod.id} className="p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${allDone ? "bg-green-500/10" : "bg-primary/10"}`}>
                  {allDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Icon className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{mod.title}</h3>
                    {mod.isRequired && (
                      <Badge variant="info" className="text-[10px] px-1.5 py-0">Обязательный</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>

                  <div className="mt-3 space-y-1">
                    {mod.lessons.map((lesson) => {
                      const isRead = !!progress[lesson.slug];
                      return (
                        <Link
                          key={lesson.slug}
                          href={`/${ROLE}/learning/${lesson.slug}`}
                          className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
                        >
                          {isRead ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                          )}
                          <span className={isRead ? "text-muted-foreground" : ""}>{lesson.title}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{lesson.duration}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
