"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Copy, Check, Share2, MousePointerClick, Users, TrendingUp, Link2,
  MessageCircle,
} from "lucide-react";

interface ReferralData {
  refCode: string;
  link: string;
  stats: {
    totalClicks: number;
    uniqueClicks: number;
    totalLeads: number;
    conversion: number;
  };
}

export default function AgentReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareTemplates = [
    {
      title: "Для соцсетей",
      text: (link: string) =>
        `Я работаю с платформой Агентум Про — современная система для юридических партнёров. Присоединяйтесь: ${link}`,
    },
    {
      title: "Для мессенджеров",
      text: (link: string) =>
        `Привет! Рекомендую платформу для юридических партнёров — удобная система управления лидами и выплатами. Регистрация: ${link}`,
    },
    {
      title: "Краткий",
      text: (link: string) =>
        `Агентум Про — платформа для юридических партнёров. Регистрация: ${link}`,
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title="Реферальная программа" breadcrumbs={[{ title: "Дашборд", href: "/agent/dashboard" }, { title: "Рефералы" }]} />
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => <Card key={i} className="h-24 animate-pulse bg-muted" />)}
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Реферальная программа" breadcrumbs={[{ title: "Дашборд", href: "/agent/dashboard" }, { title: "Рефералы" }]} />
        <Card className="p-6 text-center text-muted-foreground">Не удалось загрузить данные</Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Реферальная программа"
        description="Приглашайте коллег и отслеживайте результат"
        breadcrumbs={[{ title: "Дашборд", href: "/agent/dashboard" }, { title: "Рефералы" }]}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard
          title="Переходы по ссылке"
          value={data.stats.uniqueClicks}
          icon="MousePointerClick"
          change={`${data.stats.totalClicks} всего`}
          changeType="neutral"
        />
        <StatCard
          title="Лиды по реферралу"
          value={data.stats.totalLeads}
          icon="Users"
          changeType="neutral"
        />
        <StatCard
          title="Конверсия"
          value={`${data.stats.conversion}%`}
          icon="TrendingUp"
          change="клик → лид"
          changeType="neutral"
        />
      </div>

      {/* My Link */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-medium text-sm">Ваша реферальная ссылка</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-mono truncate">
            {data.link}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(data.link, "link")}
          >
            {copied === "link" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied === "link" ? "Скопировано" : "Скопировать"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Код: <span className="font-mono font-medium">{data.refCode}</span> — при переходе по ссылке и регистрации лид привязывается к вам
        </p>
      </Card>

      {/* Share templates */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-medium text-sm">Готовые тексты для размещения</h3>
        </div>
        <div className="space-y-3">
          {shareTemplates.map((tpl, i) => {
            const text = tpl.text(data.link);
            return (
              <div key={i} className="rounded-lg bg-muted p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{tpl.title}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => copyToClipboard(text, `tpl-${i}`)}
                  >
                    {copied === `tpl-${i}` ? <Check className="h-3 w-3 text-green-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied === `tpl-${i}` ? "Скопировано" : "Скопировать"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Where to share */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-medium text-sm">Где размещать ссылку</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2 p-2">
            <span className="text-primary mt-0.5">1.</span>
            <span>Telegram-каналы и чаты по юридической тематике</span>
          </div>
          <div className="flex items-start gap-2 p-2">
            <span className="text-primary mt-0.5">2.</span>
            <span>Профили в соцсетях (VK, Instagram, Facebook)</span>
          </div>
          <div className="flex items-start gap-2 p-2">
            <span className="text-primary mt-0.5">3.</span>
            <span>Форумы и профессиональные сообщества</span>
          </div>
          <div className="flex items-start gap-2 p-2">
            <span className="text-primary mt-0.5">4.</span>
            <span>Личные сообщения коллегам-юристам</span>
          </div>
          <div className="flex items-start gap-2 p-2">
            <span className="text-primary mt-0.5">5.</span>
            <span>Email-рассылки и визитки</span>
          </div>
          <div className="flex items-start gap-2 p-2">
            <span className="text-primary mt-0.5">6.</span>
            <span>WhatsApp-группы и бизнес-чаты</span>
          </div>
        </div>
      </Card>
    </>
  );
}
