import { NavItem, UserRole } from "@/types";

export const agentNav: NavItem[] = [
  { title: "Дашборд", href: "/agent/dashboard", icon: "LayoutDashboard" },
  { title: "Лиды", href: "/agent/leads", icon: "Users" },
  { title: "Финансы", href: "/agent/finance", icon: "Wallet" },
  { title: "Документы", href: "/agent/documents", icon: "FileText" },
  { title: "Сообщения", href: "/agent/messages", icon: "MessageSquare", badge: 3 },
  { title: "Рефералы", href: "/agent/referral", icon: "Share2" },
  { title: "Материалы", href: "/agent/marketing", icon: "Megaphone" },
  { title: "Обучение", href: "/agent/learning", icon: "GraduationCap" },
  { title: "Профиль", href: "/agent/profile", icon: "User" },
];

export const managerNav: NavItem[] = [
  { title: "Дашборд", href: "/manager/dashboard", icon: "LayoutDashboard" },
  { title: "Партнёры", href: "/manager/agents", icon: "Users" },
  { title: "Лиды", href: "/manager/leads", icon: "UserPlus" },
  { title: "Диалоги", href: "/manager/conversations", icon: "MessageSquare", badge: 5 },
  { title: "Финансы", href: "/manager/finance", icon: "Wallet" },
  { title: "Рассылки", href: "/manager/broadcasts", icon: "Send" },
  { title: "Документы", href: "/manager/documents", icon: "FileText" },
  { title: "Операции", href: "/manager/operations", icon: "ClipboardList" },
  { title: "Рефералы", href: "/manager/referrals", icon: "Share2" },
  { title: "Обучение", href: "/manager/learning", icon: "GraduationCap" },
];

export const adminNav: NavItem[] = [
  { title: "Дашборд", href: "/admin/dashboard", icon: "LayoutDashboard" },
  { title: "Пользователи", href: "/admin/users", icon: "Users" },
  { title: "Лиды", href: "/admin/leads", icon: "UserPlus" },
  { title: "Финансы", href: "/admin/finance", icon: "Wallet" },
  { title: "Роли", href: "/admin/roles", icon: "Shield" },
  { title: "Настройки", href: "/admin/settings", icon: "Settings" },
  { title: "Интеграции", href: "/admin/integrations", icon: "Plug" },
  { title: "Логи", href: "/admin/logs", icon: "ScrollText" },
  { title: "Рефералы", href: "/admin/referrals", icon: "Share2" },
  { title: "Материалы", href: "/admin/marketing", icon: "Megaphone" },
  { title: "Обучение", href: "/admin/learning", icon: "GraduationCap" },
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
      return "Партнёр";
    case "manager":
      return "Менеджер";
    case "admin":
      return "Администратор";
  }
}
