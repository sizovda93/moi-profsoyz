"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchLesson, fetchAllLessons, LearningModule, LearningLesson, ProgressMap } from "@/lib/learning-content";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink, List, Loader2 } from "lucide-react";

const ROLE = "manager";
const STORAGE_KEY = `learning_progress_${ROLE}`;

function getProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function markReadLocal(slug: string) {
  const progress = getProgress();
  if (!progress[slug]) {
    progress[slug] = { completedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
}

async function markReadServer(slug: string) {
  markReadLocal(slug);
  try {
    await fetch("/api/learning/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  } catch { /* server sync failed, localStorage still saved */ }
}

function isRead(slug: string): boolean {
  return !!getProgress()[slug];
}

function renderBody(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.trim() === "") return <br key={i} />;
    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="text-xs bg-muted px-1.5 py-0.5 rounded">$1</code>');
    if (line.trim().startsWith("•")) {
      return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: formatted.replace("•", "").trim() }} />;
    }
    const numMatch = line.trim().match(/^(\d+)\.\s/);
    if (numMatch) {
      return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s/, "").trim() }} />;
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}

export default function ManagerLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [mod, setMod] = useState<LearningModule | null>(null);
  const [lesson, setLesson] = useState<LearningLesson | null>(null);
  const [allLessons, setAllLessons] = useState<{ module: LearningModule; lesson: LearningLesson }[]>([]);
  const [read, setRead] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRead(isRead(slug));
    Promise.all([fetchLesson(ROLE, slug), fetchAllLessons(ROLE)]).then(([result, all]) => {
      if (result) {
        setMod(result.module);
        setLesson(result.lesson);
      }
      setAllLessons(all);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lesson || !mod) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Урок не найден</p>
        <Button variant="outline" onClick={() => router.push(`/${ROLE}/learning`)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> К списку
        </Button>
      </div>
    );
  }

  const currentIndex = allLessons.findIndex((l) => l.lesson.slug === slug);
  const prev = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const next = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const handleMarkRead = async () => {
    await markReadServer(slug);
    setRead(true);
    if (next) router.push(`/${ROLE}/learning/${next.lesson.slug}`);
  };

  const showToc = lesson.sections.length > 3;

  return (
    <>
      <PageHeader
        title={lesson.title}
        breadcrumbs={[
          { title: "Платформа", href: `/${ROLE}/dashboard` },
          { title: "Обучение", href: `/${ROLE}/learning` },
          { title: mod.title },
        ]}
      />

      <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {lesson.duration}</span>
        {read && <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="h-3.5 w-3.5" /> Прочитано</span>}
      </div>

      {showToc && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <List className="h-4 w-4" /> Содержание
          </div>
          <div className="space-y-1">
            {lesson.sections.map((section, i) => (
              <a key={i} href={`#section-${i}`}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5 pl-6">
                {section.heading}
              </a>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 md:p-8 mb-6">
        <div className="space-y-8">
          {lesson.sections.map((section, i) => (
            <div key={i} id={`section-${i}`}>
              <h2 className="text-lg font-semibold mb-3">{section.heading}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
                {renderBody(section.body)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {lesson.nextAction && (
        <Card className="p-5 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Что делать дальше</p>
              <p className="text-xs text-muted-foreground mt-0.5">Применить знания на практике</p>
            </div>
            <Link href={lesson.nextAction.href}>
              <Button size="sm" variant="outline">
                {lesson.nextAction.label} <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          {prev && (
            <Link href={`/${ROLE}/learning/${prev.lesson.slug}`}>
              <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" /> {prev.lesson.title}</Button>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!read && (
            <Button size="sm" onClick={handleMarkRead}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {next ? "Прочитано — далее" : "Прочитано"}
            </Button>
          )}
          {read && next && (
            <Link href={`/${ROLE}/learning/${next.lesson.slug}`}>
              <Button size="sm">Далее <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
