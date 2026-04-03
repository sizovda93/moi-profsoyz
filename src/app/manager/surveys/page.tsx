"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  BarChart3,
  Trash2,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ───────────────────────────────────────────────────────────────────────

interface Survey {
  id: string;
  title: string;
  description: string | null;
  targetRole: "all" | "agent" | "manager";
  status: "draft" | "published" | "closed";
  questionCount: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface QuestionForm {
  questionText: string;
  questionType: string;
  options: string[];
}

interface ResultOption {
  optionText: string;
  voteCount: number;
}

interface ResultQuestion {
  questionText: string;
  questionType: string;
  options: ResultOption[];
}

interface SurveyResults {
  id: string;
  title: string;
  totalResponses: number;
  questions: ResultQuestion[];
}

// ── Constants ───────────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; variant: "secondary" | "success" | "warning" }
> = {
  draft: { label: "Черновик", variant: "secondary" },
  published: { label: "Опубликован", variant: "success" },
  closed: { label: "Закрыт", variant: "warning" },
};

const targetRoleLabels: Record<string, string> = {
  all: "Все",
  agent: "Члены",
  manager: "Руководители",
};

const questionTypeLabels: Record<string, string> = {
  single_choice: "Один вариант",
  multiple_choice: "Несколько вариантов",
};

// ── Page Component ──────────────────────────────────────────────────────────────

export default function AdminSurveysPage() {
  const [view, setView] = useState<"list" | "create" | "results">("list");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "agent" | "manager">("all");
  const [formStatus, setFormStatus] = useState<"draft" | "published">("draft");
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { questionText: "", questionType: "single_choice", options: ["", ""] },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Results
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // ── Load surveys ────────────────────────────────────────────────────────────

  const loadSurveys = useCallback(() => {
    fetch("/api/manager/surveys")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSurveys(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSurveys();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Questions helpers ───────────────────────────────────────────────────────

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { questionText: "", questionType: "single_choice", options: ["", ""] },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: [...q.options, ""] } : q,
      ),
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.filter((_, j) => j !== oIndex) }
          : q,
      ),
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) => (j === oIndex ? value : o)),
            }
          : q,
      ),
    );
  };

  // ── Reset create form ───────────────────────────────────────────────────────

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetRole("all");
    setFormStatus("draft");
    setQuestions([
      { questionText: "", questionType: "single_choice", options: ["", ""] },
    ]);
    setEditingId(null);
  };

  // ── Open create ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    resetForm();
    setView("create");
  };

  // ── Open edit ───────────────────────────────────────────────────────────────

  const openEdit = async (survey: Survey) => {
    if (survey.status !== "draft") return;
    resetForm();
    setEditingId(survey.id);
    setTitle(survey.title);
    setDescription(survey.description || "");
    setTargetRole(survey.targetRole);
    setFormStatus("draft");

    try {
      const res = await fetch(`/api/manager/surveys/${survey.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(
            data.questions.map((q: any) => ({
              questionText: q.questionText || "",
              questionType: q.questionType || "single_choice",
              options: Array.isArray(q.options)
                ? q.options.map((o: any) => (typeof o === "string" ? o : o.optionText || ""))
                : ["", ""],
            })),
          );
        }
      }
    } catch {
      // use defaults
    }

    setView("create");
  };

  // ── Save survey ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      targetRole,
      status: formStatus,
      questions: questions
        .filter((q) => q.questionText.trim())
        .map((q) => ({
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          options: q.options.filter((o) => o.trim()),
        })),
    };

    try {
      const url = editingId
        ? `/api/manager/surveys/${editingId}`
        : "/api/manager/surveys";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm();
        setView("list");
        loadSurveys();
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle status ───────────────────────────────────────────────────────────

  const handleToggleStatus = async (survey: Survey) => {
    const newStatus = survey.status === "published" ? "closed" : "published";
    await fetch(`/api/manager/surveys/${survey.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadSurveys();
  };

  // ── View results ────────────────────────────────────────────────────────────

  const openResults = async (survey: Survey) => {
    setSelectedId(survey.id);
    setResultsLoading(true);
    setView("results");
    try {
      const res = await fetch(`/api/manager/surveys/${survey.id}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        setResults(null);
      }
    } catch {
      setResults(null);
    } finally {
      setResultsLoading(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />;

  // ── Computed stats ──────────────────────────────────────────────────────────

  const totalCount = surveys.length;
  const publishedCount = surveys.filter((s) => s.status === "published").length;
  const closedCount = surveys.filter((s) => s.status === "closed").length;

  // ═════════════════════════════════════════════════════════════════════════════
  // RESULTS VIEW
  // ═════════════════════════════════════════════════════════════════════════════

  if (view === "results") {
    return (
      <div>
        <PageHeader
          title="Результаты опроса"
          description="Просмотр ответов участников"
          breadcrumbs={[
            { title: "Платформа", href: "/manager/dashboard" },
            { title: "Опросы", href: "/manager/surveys" },
            { title: "Результаты" },
          ]}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setView("list");
                setResults(null);
                setSelectedId(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку
            </Button>
          }
        />

        {resultsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results ? (
          <div className="space-y-6">
            {/* Header info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{results.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Всего ответов: <span className="font-semibold text-foreground">{results.totalResponses}</span>
                </p>
              </CardContent>
            </Card>

            {/* Questions with results */}
            {results.questions.map((question, qIdx) => (
              <Card key={qIdx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {qIdx + 1}. {question.questionText}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {questionTypeLabels[question.questionType] || question.questionType}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {question.options.map((option, oIdx) => {
                      const percentage =
                        results.totalResponses > 0
                          ? (option.voteCount / results.totalResponses) * 100
                          : 0;
                      return (
                        <div key={oIdx}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{option.optionText}</span>
                            <span className="text-muted-foreground font-medium ml-2 shrink-0">
                              {option.voteCount} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          {option.voteCount > 0 && results.totalResponses > 0 && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {results.questions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Нет данных по вопросам
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Не удалось загрузить результаты
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CREATE / EDIT VIEW
  // ═════════════════════════════════════════════════════════════════════════════

  if (view === "create") {
    return (
      <div>
        <PageHeader
          title={editingId ? "Редактировать опрос" : "Новый опрос"}
          description={editingId ? "Внесите изменения и сохраните" : "Создайте новый опрос с вопросами"}
          breadcrumbs={[
            { title: "Платформа", href: "/manager/dashboard" },
            { title: "Опросы", href: "/manager/surveys" },
            { title: editingId ? "Редактирование" : "Создание" },
          ]}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetForm();
                setView("list");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку
            </Button>
          }
        />

        <div className="max-w-3xl space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium">Название опроса *</label>
                <Input
                  className="mt-1"
                  placeholder="Введите название опроса"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  style={{ minHeight: "80px" }}
                  placeholder="Описание опроса..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Target role + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Целевая аудитория</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={targetRole}
                    onChange={(e) =>
                      setTargetRole(e.target.value as "all" | "agent" | "manager")
                    }
                  >
                    <option value="all">Все</option>
                    <option value="agent">Участники профсоюза</option>
                    <option value="manager">Руководители</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Статус</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as "draft" | "published")
                    }
                  >
                    <option value="draft">Черновик</option>
                    <option value="published">Опубликован</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Вопросы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Вопрос {qIdx + 1}
                    </span>
                    {questions.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        title="Удалить вопрос"
                        onClick={() => removeQuestion(qIdx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Question text */}
                  <Input
                    placeholder="Текст вопроса"
                    value={q.questionText}
                    onChange={(e) =>
                      updateQuestion(qIdx, "questionText", e.target.value)
                    }
                  />

                  {/* Question type */}
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={q.questionType}
                    onChange={(e) =>
                      updateQuestion(qIdx, "questionType", e.target.value)
                    }
                  >
                    <option value="single_choice">Один вариант</option>
                    <option value="multiple_choice">Несколько вариантов</option>
                  </select>

                  {/* Options */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Варианты ответа
                    </span>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder={`Вариант ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) =>
                            updateOption(qIdx, oIdx, e.target.value)
                          }
                        />
                        {q.options.length > 2 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive shrink-0"
                            title="Удалить вариант"
                            onClick={() => removeOption(qIdx, oIdx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addOption(qIdx)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Добавить вариант
                    </Button>
                  </div>
                </div>
              ))}

              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" /> Добавить вопрос
              </Button>
            </CardContent>
          </Card>

          {/* Save actions */}
          <div className="flex justify-end gap-2 pb-8">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setView("list");
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Сохранение...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" /> Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LIST VIEW (default)
  // ═════════════════════════════════════════════════════════════════════════════

  const columns = [
    {
      key: "title",
      title: "Название",
      render: (s: Survey) => (
        <div className="max-w-md">
          <p className="font-medium">{s.title}</p>
          {s.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {s.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "targetRole",
      title: "Аудитория",
      render: (s: Survey) => (
        <Badge variant="outline">{targetRoleLabels[s.targetRole] || s.targetRole}</Badge>
      ),
    },
    {
      key: "status",
      title: "Статус",
      render: (s: Survey) => {
        const cfg = statusConfig[s.status] || statusConfig.draft;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "questions",
      title: "Вопросы",
      render: (s: Survey) => (
        <span className="text-muted-foreground">{s.questionCount}</span>
      ),
    },
    {
      key: "responses",
      title: "Ответы",
      render: (s: Survey) => (
        <span className="text-muted-foreground">{s.responseCount}</span>
      ),
    },
    {
      key: "date",
      title: "Дата",
      render: (s: Survey) => (
        <span className="text-muted-foreground">{formatDate(s.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (s: Survey) => (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          {s.status === "draft" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Редактировать"
              onClick={() => openEdit(s)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {s.status !== "closed" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title={s.status === "published" ? "Закрыть опрос" : "Опубликовать"}
              onClick={() => handleToggleStatus(s)}
            >
              {s.status === "published" ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {s.status === "closed" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Опубликовать снова"
              onClick={() => handleToggleStatus(s)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Результаты"
            onClick={() => openResults(s)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Опросы"
        description="Управление опросами"
        breadcrumbs={[
          { title: "Платформа", href: "/manager/dashboard" },
          { title: "Опросы" },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Создать опрос
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Опубликовано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">
              {publishedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Закрыто
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-warning">
              {closedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={surveys}
        emptyMessage="Нет опросов. Создайте первый опрос."
      />
    </div>
  );
}
