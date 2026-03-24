"use client";

import { Bell, Menu, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/types";
import { getInitials } from "@/lib/utils";
import { getRoleLabel } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AppHeaderProps {
  user: User;
  onMenuToggle?: () => void;
}

export function AppHeader({ user, onMenuToggle }: AppHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
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
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-[10px] font-medium text-white flex items-center justify-center px-1">
              2
            </span>
          </Button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitials(user.fullName)}</AvatarFallback>
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
