import type { AgentLifecycle, OnboardingStatus, UserStatus } from "@/types";

/**
 * Compute the unified agent lifecycle status from existing fields.
 * This is the single source of truth — used by API responses and UI.
 */
export function computeLifecycle(
  userStatus: UserStatus,
  onboardingStatus: OnboardingStatus,
  totalLeads: number
): AgentLifecycle {
  if (userStatus === "blocked") return "blocked";
  if (userStatus === "inactive") return "inactive";
  if (onboardingStatus === "rejected") return "rejected";

  // userStatus === 'active' from here
  if (onboardingStatus === "pending") return "registered";
  if (onboardingStatus === "in_progress") return "learning_in_progress";

  // onboardingStatus === 'completed'
  if (totalLeads > 0) return "active";
  return "activated";
}

/** Human-readable label for each lifecycle status. */
export const lifecycleLabels: Record<AgentLifecycle, string> = {
  registered: "Зарегистрирован",
  learning_in_progress: "Обучается",
  activated: "Активирован",
  active: "Активен",
  inactive: "Неактивен",
  blocked: "Заблокирован",
  rejected: "Отклонён",
};
