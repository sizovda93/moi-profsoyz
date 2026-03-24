"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { User, UserRole } from "@/types";
import { getNavByRole } from "@/lib/navigation";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.user) {
          router.push("/login");
          return;
        }
        const u = data.user;
        if (u.role !== role && u.role !== "admin") {
          router.push(`/${u.role}/dashboard`);
          return;
        }
        setUser({
          id: u.id,
          role: u.role,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone || "",
          avatar: u.avatarUrl || undefined,
          status: u.status,
          createdAt: "",
        });
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [role, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CardSkeleton />
      </div>
    );
  }

  if (!user) return null;

  const navItems = getNavByRole(role);

  return (
    <div className="flex min-h-screen">
      <AppSidebar items={navItems} role={role} />

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full">
            <AppSidebar items={navItems} role={role} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
