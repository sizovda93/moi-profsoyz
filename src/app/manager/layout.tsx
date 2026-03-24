"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="manager">{children}</DashboardLayout>;
}
