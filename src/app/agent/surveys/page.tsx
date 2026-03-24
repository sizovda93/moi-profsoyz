"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList,
  Users,
  Loader2,
  CheckCircle2,
} from "lucide-react";

/* ---------- types ---------- */

interface Survey {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  responseCount: number;
  hasResponded: boolean;
  createdAt: string;
}

interface SurveyOption {
  id: string;
  optionText: string;
  sortOrder: number;
}

interface SurveyQuestion {
  id: string;
  questionText: string;
  questionType: "single_choice" | "multiple_choice";
  sortOrder: number;
  options: SurveyOption[];
}

interface SurveyDetail extends Survey {
  questions: SurveyQuestion[];
}

/* ---------- page ---------- */

export default function AgentSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<SurveyDetail | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ---------- load list ---------- */

  const loadSurveys = useCallback(() => {
    fetch("/api/surveys")
      .then((r) => r.json())
      .then((data) => setSurveys(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  /* ---------- open survey ---------- */

  const openSurvey = async (surveyId: string) => {
    setSurveyLoading(true);
    setAnswers(new Map());
    setSubmitted(false);

    try {
      const res = await fetch(`/api/surveys/${surveyId}`);
      if (res.ok) {
        const data: SurveyDetail = await res.json();
        setActiveSurvey(data);
      }
    } catch {
      // silently fail
    } finally {
      setSurveyLoading(false);
    }
  };

  /* ---------- answer handling ---------- */

  const toggleAnswer = (questionId: string, optionId: string, type: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      if (type === "single_choice") {
        next.set(questionId, [optionId]);
      } else {
        const current = next.get(questionId) || [];
        if (current.includes(optionId)) {
          next.set(questionId, current.filter((id) => id !== optionId));
        } else {
          next.set(questionId, [...current, optionId]);
        }
      }
      return next;
    });
  };

  /* ---------- submit ---------- */

  const handleSubmit = async () => {
    if (!activeSurvey) return;
    setSubmitting(true);
    try {
      const payload = activeSurvey.questions
        .map((q) => ({
          questionId: q.id,
          optionIds: answers.get(q.id) || [],
        }))
        .filter((a) => a.optionIds.length > 0);

      const res = await fetch(`/api/surveys/${activeSurvey.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setActiveSurvey(null);
          setSubmitted(false);
          setAnswers(new Map());
          loadSurveys();
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- close dialog ---------- */

  const handleDialogClose = (open: boolean) => {
    if (!open && !submitting) {
      setActiveSurvey(null);
      setSubmitted(false);
      setAnswers(new Map());
    }
  };

  /* ---------- helpers ---------- */

  const hasAnsweredAll =
    activeSurvey != null &&
    activeSurvey.questions.length > 0 &&
    activeSurvey.questions.every((q) => {
      const a = answers.get(q.id);
      return a && a.length > 0;
    });

  /* ---------- loading state ---------- */

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Опросы"
          description="Опросы профсоюзной организации"
          breadcrumbs={[
            { title: "Платформа", href: "/agent/dashboard" },
            { title: "Опросы" },
          ]}
        />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div>
      <PageHeader
        title="Опросы"
        description="Опросы профсоюзной организации"
        breadcrumbs={[
          { title: "Платформа", href: "/agent/dashboard" },
          { title: "Опросы" },
        ]}
      />

      {/* ---------- empty state ---------- */}
      {surveys.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">
              Нет доступных опросов
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---------- surveys list ---------- */}
      <div className="space-y-3">
        {surveys.map((survey) => (
          <Card key={survey.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{survey.title}</CardTitle>
                    <Badge variant={survey.hasResponded ? "success" : "secondary"}>
                      {survey.hasResponded ? "Пройден" : "Не пройден"}
                    </Badge>
                  </div>
                  {survey.description && (
                    <p className="text-sm text-muted-foreground">{survey.description}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {survey.questionCount}{" "}
                    {survey.questionCount === 1
                      ? "вопрос"
                      : survey.questionCount >= 2 && survey.questionCount <= 4
                        ? "вопроса"
                        : "вопросов"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {survey.responseCount} участников
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={survey.hasResponded ? "outline" : "default"}
                  disabled={survey.hasResponded || surveyLoading}
                  onClick={() => openSurvey(survey.id)}
                >
                  {surveyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : survey.hasResponded ? (
                    "Пройден \u2713"
                  ) : (
                    "Пройти опрос"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---------- survey dialog ---------- */}
      <Dialog open={activeSurvey !== null} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {surveyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : submitted ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-center">
                Спасибо! Ваши ответы приняты.
              </p>
            </div>
          ) : activeSurvey ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeSurvey.title}</DialogTitle>
                {activeSurvey.description && (
                  <DialogDescription>{activeSurvey.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {activeSurvey.questions.map((question, qIndex) => (
                  <div key={question.id} className="space-y-3">
                    <p className="text-sm font-semibold">
                      {qIndex + 1}. {question.questionText}
                    </p>
                    <div className="space-y-2 pl-4">
                      {question.options.map((option) => {
                        const selected = (answers.get(question.id) || []).includes(option.id);
                        const inputType =
                          question.questionType === "single_choice" ? "radio" : "checkbox";

                        return (
                          <label
                            key={option.id}
                            className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                          >
                            <input
                              type={inputType}
                              name={`question-${question.id}`}
                              checked={selected}
                              onChange={() =>
                                toggleAnswer(question.id, option.id, question.questionType)
                              }
                              className="accent-primary h-4 w-4 shrink-0"
                            />
                            <span>{option.optionText}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* actions */}
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  disabled={submitting}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !hasAnsweredAll}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Отправить
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
