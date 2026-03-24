import { UserRole } from "@/types";

export interface LearningLesson {
  slug: string;
  title: string;
  duration: string;
  sections: { heading: string; body: string }[];
  nextAction?: { label: string; href: string };
}

export interface ProgressEntry {
  completedAt: string; // ISO date
}

export type ProgressMap = Record<string, ProgressEntry>;

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  isRequired?: boolean;
  lessons: LearningLesson[];
}

// ─── Async fetchers (DB-backed via API) ────────────────

export async function fetchModules(role: UserRole): Promise<LearningModule[]> {
  const res = await fetch(`/api/learning?role=${role}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAllLessons(
  role: UserRole
): Promise<{ module: LearningModule; lesson: LearningLesson }[]> {
  const modules = await fetchModules(role);
  const result: { module: LearningModule; lesson: LearningLesson }[] = [];
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      result.push({ module: mod, lesson });
    }
  }
  return result;
}

export async function fetchLesson(
  role: UserRole,
  slug: string
): Promise<{ module: LearningModule; lesson: LearningLesson } | null> {
  const res = await fetch(`/api/learning/${slug}?role=${role}`);
  if (!res.ok) return null;
  return res.json();
}
