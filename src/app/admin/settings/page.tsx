"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [rateBase, setRateBase] = useState("");
  const [rateSilver, setRateSilver] = useState("");
  const [rateGold, setRateGold] = useState("");
  const [autoReply, setAutoReply] = useState(true);
  const [relMessages, setRelMessages] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const toPercent = (v: string | undefined, fallback: string) =>
    v ? String(Math.round(parseFloat(v) * 100)) : fallback;

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, string>) => {
        setPlatformName(data.platform_name || "");
        setSupportEmail(data.support_email || "");
        setSupportPhone(data.support_phone || "");
        setRateBase(toPercent(data.commission_rate_base, "25"));
        setRateSilver(toPercent(data.commission_rate_silver, "30"));
        setRateGold(toPercent(data.commission_rate_gold, "35"));
        setAutoReply(data.auto_reply_enabled !== "false");
        setRelMessages(data.relationship_messages_enabled !== "false");
      })
      .finally(() => setLoading(false));
  }, []);

  const saveGeneral = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_name: platformName,
        support_email: supportEmail,
        support_phone: supportPhone,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "Сохранено" : "Ошибка сохранения");
  };

  const saveCommission = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commission_rate_base: (parseFloat(rateBase) / 100).toFixed(2),
        commission_rate_silver: (parseFloat(rateSilver) / 100).toFixed(2),
        commission_rate_gold: (parseFloat(rateGold) / 100).toFixed(2),
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "Сохранено" : "Ошибка сохранения");
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Конфигурация платформы"
        breadcrumbs={[
          { title: "Дашборд", href: "/admin/dashboard" },
          { title: "Настройки" },
        ]}
      />

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message === "Сохранено" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {message}
        </div>
      )}

      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Общие настройки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Название платформы</label>
              <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email поддержки</label>
              <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Телефон поддержки</label>
              <Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveGeneral} disabled={saving}>Сохранить</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Комиссии</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Базовый (%)</label>
                <Input type="number" value={rateBase} onChange={(e) => setRateBase(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Серебро (%)</label>
                <Input type="number" value={rateSilver} onChange={(e) => setRateSilver(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Золото (%)</label>
                <Input type="number" value={rateGold} onChange={(e) => setRateGold(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveCommission} disabled={saving}>Сохранить</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI-модули</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "AI автоответы", value: autoReply, key: "auto_reply_enabled", setter: setAutoReply },
              { label: "Relationship-сообщения", value: relMessages, key: "relationship_messages_enabled", setter: setRelMessages },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <span className="text-sm">{item.label}</span>
                <div
                  onClick={async () => {
                    const newVal = !item.value;
                    item.setter(newVal);
                    await fetch('/api/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ [item.key]: String(newVal) }),
                    });
                  }}
                  className={`h-6 w-11 rounded-full transition-colors cursor-pointer ${
                    item.value ? "bg-primary" : "bg-secondary"
                  } relative`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      item.value ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Уведомления</CardTitle>
              <Badge variant="success">Активно</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Email уведомления", active: true },
              { label: "Telegram уведомления", active: false },
              { label: "Уведомления об эскалациях", active: true },
              { label: "Уведомления о новых лидах", active: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm">{item.label}</span>
                <div
                  className={`h-6 w-11 rounded-full transition-colors cursor-pointer ${
                    item.active ? "bg-primary" : "bg-secondary"
                  } relative`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      item.active ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
