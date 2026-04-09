import { NavItem, UserRole } from "@/types";

export const agentNav: NavItem[] = [
  { title: "О платформе", href: "/agent/dashboard", icon: "LayoutDashboard" },
  { title: "О профсоюзе", href: "/agent/about", icon: "Users" },
  { title: "Вопрос руководителю", href: "/agent/leads", icon: "UserPlus" },
  { title: "Вопрос юристу", href: "/agent/legal", icon: "Shield" },
  { title: "Чат с ИИ", href: "/agent/ai-chat", icon: "Bot" },
  { title: "Корпоративные чаты", href: "/agent/colleagues", icon: "MessageSquare" },
  { title: "Объявления", href: "/agent/announcements", icon: "Megaphone" },
  { title: "Партнёры", href: "/agent/partners", icon: "Building2" },
  { title: "Опросы", href: "/agent/surveys", icon: "ClipboardList" },
  { title: "Обучение", href: "/agent/learning", icon: "GraduationCap" },
  { title: "Соглашения", href: "/agent/agreements", icon: "ScrollText" },
  { title: "Профиль", href: "/agent/profile", icon: "User" },
];

export const managerNav: NavItem[] = [
  { title: "Платформа", href: "/manager/dashboard", icon: "LayoutDashboard" },
  { title: "О профсоюзе", href: "/manager/about", icon: "Users" },
  { title: "Участники профсоюза", href: "/manager/agents", icon: "Users" },
  { title: "Обращения", href: "/manager/leads", icon: "UserPlus" },
  { title: "Диалоги", href: "/manager/conversations", icon: "MessageSquare" },
  { title: "Объявления", href: "/manager/broadcasts", icon: "Send" },
  { title: "Документы", href: "/manager/documents", icon: "FileText" },
  { title: "Опросы", href: "/manager/surveys", icon: "ClipboardList" },
  { title: "Чат с ИИ", href: "/manager/ai-chat", icon: "Bot"},
  { title: "Обучение", href: "/manager/learning", icon: "GraduationCap" },
  { title: "Профиль", href: "/agent/profile", icon: "User" },
];

export const adminNav: NavItem[] = [
  { title: "Платформа", href: "/admin/dashboard", icon: "LayoutDashboard" },
  { title: "Пользователи", href: "/admin/users", icon: "Users" },
  { title: "Обращения", href: "/admin/leads", icon: "UserPlus" },
  { title: "Финансы", href: "/admin/finance", icon: "Wallet" },
  { title: "Роли", href: "/admin/roles", icon: "Shield" },
  { title: "Настройки", href: "/admin/settings", icon: "Settings" },
  { title: "Интеграции", href: "/admin/integrations", icon: "Plug" },
  { title: "Логи", href: "/admin/logs", icon: "ScrollText" },
  { title: "Приглашения", href: "/admin/referrals", icon: "Share2" },
  { title: "Материалы", href: "/admin/marketing", icon: "Megaphone" },
  { title: "Обучение", href: "/admin/learning", icon: "GraduationCap" },
  { title: "Новости", href: "/admin/news", icon: "FileText" },
  { title: "Мероприятия", href: "/admin/events", icon: "Target" },
  { title: "Документы профсоюза", href: "/admin/union-docs", icon: "FileText" },
  { title: "Опросы", href: "/admin/surveys", icon: "ClipboardList" },
  { title: "Юридические вопросы", href: "/admin/legal", icon: "Scale" },
  { title: "Чаты с ИИ", href: "/admin/ai-chats", icon: "Bot" },
  { title: "Профсоюзы", href: "/admin/unions", icon: "Shield" },
];

export function getNavByRole(role: UserRole): NavItem[] {
  switch (role) {
    case "agent":
      return agentNav;
    case "manager":
      return managerNav;
    case "admin":
      return adminNav;
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "agent":
      return "Участник профсоюза";
    case "manager":
      return "Руководитель";
    case "admin":
      return "Администратор";
  }
}
