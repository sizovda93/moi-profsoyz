import { NavItem, UserRole } from "@/types";

export const agentNav: NavItem[] = [
  { title: "Платформа", href: "/agent/dashboard", icon: "LayoutDashboard" },
  { title: "Обращения", href: "/agent/leads", icon: "UserPlus" },
  { title: "Документы", href: "/agent/documents", icon: "FileText" },
  { title: "Сообщения", href: "/agent/messages", icon: "MessageSquare", badge: 3 },
  { title: "Приглашения", href: "/agent/referral", icon: "Share2" },
  { title: "Материалы", href: "/agent/marketing", icon: "Megaphone" },
  { title: "Вопрос юристу", href: "/agent/legal", icon: "Shield" },
  { title: "Обучение", href: "/agent/learning", icon: "GraduationCap" },
  { title: "Профиль", href: "/agent/profile", icon: "User" },
];

export const managerNav: NavItem[] = [
  { title: "Платформа", href: "/manager/dashboard", icon: "LayoutDashboard" },
  { title: "Члены профсоюза", href: "/manager/agents", icon: "Users" },
  { title: "Обращения", href: "/manager/leads", icon: "UserPlus" },
  { title: "Диалоги", href: "/manager/conversations", icon: "MessageSquare", badge: 5 },
  { title: "Объявления", href: "/manager/broadcasts", icon: "Send" },
  { title: "Документы", href: "/manager/documents", icon: "FileText" },
  { title: "Приглашения", href: "/manager/referrals", icon: "Share2" },
  { title: "Обучение", href: "/manager/learning", icon: "GraduationCap" },
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
  { title: "Юридические вопросы", href: "/admin/legal", icon: "Scale" },
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
      return "Член профсоюза";
    case "manager":
      return "Руководитель";
    case "admin":
      return "Администратор";
  }
}
