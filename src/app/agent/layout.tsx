"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="agent">{children}</DashboardLayout>;
}
