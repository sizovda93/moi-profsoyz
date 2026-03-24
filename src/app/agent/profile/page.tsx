"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { getInitials } from "@/lib/utils";
import { Send, Unlink, MessageCircle, Check } from "lucide-react";

interface ProfileData {
  id: string;
  role: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  city?: string;
  specialization?: string;
  rating?: number;
  totalLeads?: number;
  agentId?: string;
  gender?: string;
  birthYear?: number | null;
  profession?: string | null;
  preferredMessenger?: string;
  divisionName?: string;
  unionName?: string;
  unionShortName?: string;
}

interface TelegramStatus {
  connected: boolean;
  telegramUsername?: string;
  telegramFirstName?: string;
  linkedAt?: string;
}

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    gender: "not_specified",
    birthYear: "" as string,
    profession: "",
    preferredMessenger: "telegram",
    city: "",
    specialization: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  // Telegram state
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);

  // Feedback state
  const [fbType, setFbType] = useState("platform");
  const [fbMessage, setFbMessage] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbSent, setFbSent] = useState(false);

  const loadTgStatus = useCallback(() => {
    fetch("/api/telegram/status")
      .then((r) => r.json())
      .then((data) => setTgStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({
          fullName: data.fullName || "",
          phone: data.phone || "",
          gender: data.gender || "not_specified",
          birthYear: data.birthYear ? String(data.birthYear) : "",
          profession: data.profession || "",
          preferredMessenger: data.preferredMessenger || "telegram",
          city: data.city || "",
          specialization: data.specialization || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    loadTgStatus();
  }, [loadTgStatus]);

  const handleTgConnect = async () => {
    setTgLoading(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTgDeepLink(data.deepLink);
      }
    } catch { /* ignore */ }
    finally { setTgLoading(false); }
  };

  const handleTgDisconnect = async () => {
    setTgLoading(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "DELETE" });
      if (res.ok) {
        setTgStatus({ connected: false });
        setTgDeepLink(null);
      }
    } catch { /* ignore */ }
    finally { setTgLoading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          gender: form.gender,
          birthYear: form.birthYear ? Number(form.birthYear) : null,
          profession: form.profession || null,
          preferredMessenger: form.preferredMessenger,
          city: form.city,
          specialization: form.specialization,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
        setMessage("Сохранено");
      } else {
        const err = await res.json();
        setMessage(err.error || "Ошибка сохранения");
      }
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardSkeleton />;
  if (!profile) return <div className="p-8 text-muted-foreground">Профиль не найден</div>;

  return (
    <div>
      <PageHeader
        title="Профиль"
        description="Ваши данные и настройки"
        breadcrumbs={[
          { title: "Платформа", href: "/agent/dashboard" },
          { title: "Профиль" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <img src="/logo.png" alt="Мой Профсоюз" className="h-20 w-20 rounded-full object-contain mb-4" />
            <h2 className="text-lg font-semibold">{profile.fullName}</h2>
            <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="info">Член профсоюза</Badge>
              <Badge variant="success">{profile.status === "active" ? "Активен" : profile.status}</Badge>
            </div>
            {(profile.unionName || profile.divisionName) && (
              <div className="w-full mt-4 pt-4 border-t border-border space-y-2 text-sm">
                {profile.unionShortName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Профсоюз</span>
                    <span className="text-right max-w-[180px]">{profile.unionShortName}</span>
                  </div>
                )}
                {profile.divisionName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Подразделение</span>
                    <span className="text-right max-w-[180px]">{profile.divisionName}</span>
                  </div>
                )}
              </div>
            )}
            <div className="w-full mt-6 pt-6 border-t border-border space-y-3 text-sm">
              {profile.city && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Город</span>
                  <span>{profile.city}</span>
                </div>
              )}
              {profile.specialization && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Должность</span>
                  <span>{profile.specialization}</span>
                </div>
              )}
              {profile.profession && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Профессия</span>
                  <span>{profile.profession}</span>
                </div>
              )}
              {profile.birthYear && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Возраст</span>
                  <span>{new Date().getFullYear() - profile.birthYear} лет</span>
                </div>
              )}
              {profile.rating !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Рейтинг</span>
                  <span>⭐ {profile.rating}</span>
                </div>
              )}
              {profile.totalLeads !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Обращений</span>
                  <span>{profile.totalLeads}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Личные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">ФИО</label>
                  <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
                  <Input value={profile.email} disabled />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Телефон</label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Город</label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Должность</label>
                  <Input value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Профессия</label>
                  <Input
                    value={form.profession}
                    onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
                    placeholder="Например: инженер, электрик..."
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Пол</label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  >
                    <option value="not_specified">Не указан</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Год рождения</label>
                  <Input
                    type="number"
                    min={1940}
                    max={2010}
                    placeholder="Например: 1990"
                    value={form.birthYear}
                    onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Предпочтительный мессенджер</label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
                    value={form.preferredMessenger}
                    onChange={(e) => setForm((f) => ({ ...f, preferredMessenger: e.target.value }))}
                  >
                    <option value="telegram">Telegram</option>
                    <option value="max">MAX</option>
                    <option value="vk">VK</option>
                  </select>
                </div>
              </div>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tgStatus?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="success">Подключён</Badge>
                    {tgStatus.telegramUsername && (
                      <span className="text-sm text-muted-foreground">@{tgStatus.telegramUsername}</span>
                    )}
                    {!tgStatus.telegramUsername && tgStatus.telegramFirstName && (
                      <span className="text-sm text-muted-foreground">{tgStatus.telegramFirstName}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Вы получаете уведомления и сообщения руководителя в Telegram.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleTgDisconnect} disabled={tgLoading}>
                    <Unlink className="h-3.5 w-3.5 mr-1" />
                    {tgLoading ? "Отключение..." : "Отключить"}
                  </Button>
                </div>
              ) : tgDeepLink ? (
                <div className="space-y-3">
                  <p className="text-sm">Откройте ссылку и нажмите Start в боте:</p>
                  <a
                    href={tgDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2AABEE] text-white text-sm font-medium hover:bg-[#229ED9] transition-colors"
                  >
                    <Send className="h-4 w-4" /> Открыть Telegram
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Ссылка действительна 15 минут. После привязки обновите страницу.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setTgDeepLink(null); loadTgStatus(); }}
                  >
                    Я уже привязал — обновить статус
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Подключите Telegram, чтобы получать уведомления и отвечать руководителю прямо из мессенджера.
                  </p>
                  <Button onClick={handleTgConnect} disabled={tgLoading}>
                    <Send className="h-4 w-4 mr-1" />
                    {tgLoading ? "Генерация ссылки..." : "Подключить Telegram"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Обратная связь
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fbSent ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" /> Спасибо за обратную связь!
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Расскажите, что можно улучшить или что мешает работе</p>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={fbType}
                    onChange={(e) => setFbType(e.target.value)}
                  >
                    <option value="platform">О платформе</option>
                    <option value="onboarding">Об обучении</option>
                    <option value="suggestion">Предложение</option>
                    <option value="problem">Проблема</option>
                  </select>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Ваш комментарий..."
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={fbSending || !fbMessage.trim()}
                      onClick={async () => {
                        setFbSending(true);
                        try {
                          const res = await fetch("/api/feedback", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: fbType, message: fbMessage }),
                          });
                          if (res.ok) {
                            setFbSent(true);
                            setFbMessage("");
                          }
                        } catch { /* ignore */ }
                        finally { setFbSending(false); }
                      }}
                    >
                      {fbSending ? "Отправка..." : "Отправить"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
