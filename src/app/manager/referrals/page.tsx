"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";

interface LeaderboardEntry {
  id: string;
  refCode: string;
  fullName: string;
  email: string;
  totalClicks: number;
  uniqueClicks: number;
  referralLeads: number;
}

export default function ManagerReferralsPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.leaderboard || []).map((r: LeaderboardEntry, i: number) => ({ ...r, id: r.refCode || String(i) }));
        setData(rows);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalClicks = data.reduce((s, d) => s + d.uniqueClicks, 0);
  const totalLeads = data.reduce((s, d) => s + d.referralLeads, 0);

  return (
    <>
      <PageHeader
        title="Приглашения"
        description="Статистика приглашений по членам"
        breadcrumbs={[{ title: "Платформа", href: "/manager/dashboard" }, { title: "Приглашения" }]}
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Членов с приглашениями</p>
          <p className="text-2xl font-semibold mt-1">{data.filter((d) => d.uniqueClicks > 0).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Всего переходов</p>
          <p className="text-2xl font-semibold mt-1">{totalClicks}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Регистраций по приглашениям</p>
          <p className="text-2xl font-semibold mt-1">{totalLeads}</p>
        </Card>
      </div>

      {loading ? (
        <Card className="h-48 animate-pulse bg-muted" />
      ) : (
        <DataTable
          columns={[
            { key: "fullName", title: "Участник профсоюза", render: (row) => row.fullName },
            { key: "refCode", title: "Код", render: (row) => <span className="font-mono text-xs">{row.refCode}</span> },
            { key: "uniqueClicks", title: "Переходы", render: (row) => row.uniqueClicks },
            { key: "referralLeads", title: "Регистрации", render: (row) => (
              <span className={row.referralLeads > 0 ? "text-green-500 font-medium" : "text-muted-foreground"}>{row.referralLeads}</span>
            )},
            { key: "conversion", title: "Конверсия", render: (row) => {
              const conv = row.uniqueClicks > 0 ? ((row.referralLeads / row.uniqueClicks) * 100).toFixed(1) : "0.0";
              return <span>{conv}%</span>;
            }},
          ]}
          data={data}
        />
      )}
    </>
  );
}
