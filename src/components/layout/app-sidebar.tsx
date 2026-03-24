"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  MessageSquare,
  User,
  UserPlus,
  Send,
  Shield,
  Settings,
  Plug,
  ScrollText,
  Target,
  GraduationCap,
  Share2,
  Megaphone,
  ClipboardList,
  Scale,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  MessageSquare,
  User,
  UserPlus,
  Send,
  Shield,
  Settings,
  Plug,
  ScrollText,
  Target,
  GraduationCap,
  Share2,
  Megaphone,
  ClipboardList,
  Scale,
};

interface AppSidebarProps {
  items: NavItem[];
  role: UserRole;
}

export function AppSidebar({ items, role }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href={`/${role}/dashboard`} className="flex items-center gap-3">
          <img src="/logo.png" alt="Мой Профсоюз" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <span className="font-semibold text-sm tracking-tight">Мой Профсоюз</span>
            <span className="text-[10px] text-muted-foreground block -mt-0.5">профсоюзная платформа</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1.5">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground text-center">
          © 2026 Мой Профсоюз
        </div>
      </div>
    </aside>
  );
}
