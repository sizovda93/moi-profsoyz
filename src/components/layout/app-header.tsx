"use client";

import { Bell, Menu, LogOut, ChevronDown, Sun, Moon, CalendarDays, ClipboardList, MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/types";
import { getInitials } from "@/lib/utils";
import { getRoleLabel } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/hooks/use-theme";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface AppHeaderProps {
  user: User;
  onMenuToggle?: () => void;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  success: CalendarDays,
  warning: ClipboardList,
  error: MessageSquare,
};

export function AppHeader({ user, onMenuToggle }: AppHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { theme, toggleTheme, mounted } = useTheme();

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} д назад`;
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false); }}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-[10px] font-medium text-white flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">Уведомления</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-muted-foreground">{unreadCount} новых</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Нет уведомлений
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => {
                        const Icon = typeIcons[n.type] || Info;
                        return (
                          <button
                            key={n.id}
                            onClick={() => { markAsRead(n.id); }}
                            className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                              !n.read ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex gap-3">
                              <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-medium ${!n.read ? "" : "text-muted-foreground"}`}>{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{formatTimeAgo(n.createdAt)}</p>
                              </div>
                              {!n.read && (
                                <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{getInitials(user.fullName)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">{user.fullName}</p>
                <p className="text-[11px] text-muted-foreground">{getRoleLabel(user.role)}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
