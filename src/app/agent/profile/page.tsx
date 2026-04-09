"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { getInitials } from "@/lib/utils";
import { Send, Unlink, MessageCircle, Check, Link2, HelpCircle, Building2, Star, FileText, User, Phone, MapPin, Briefcase } from "lucide-react";

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

  // MAX state
  const [maxStatus, setMaxStatus] = useState<{ connected: boolean; maxUsername?: string; maxFirstName?: string } | null>(null);
  const [maxLoading, setMaxLoading] = useState(false);
  const [maxDeepLink, setMaxDeepLink] = useState<string | null>(null);

  // Feedback state
  const [fbType, setFbType] = useState("platform");
  const [fbMessage, setFbMessage] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbSent, setFbSent] = useState(false);

  const loadTgStatus = useCallback(() => {
    fetch("/api/telegram/status").then((r) => r.json()).then((data) => setTgStatus(data)).catch(() => {});
  }, []);

  const loadMaxStatus = useCallback(() => {
    fetch("/api/max/status").then((r) => r.json()).then((data) => setMaxStatus(data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({
          fullName: data.fullName || "", phone: data.phone || "", gender: data.gender || "not_specified",
          birthYear: data.birthYear ? String(data.birthYear) : "", profession: data.profession || "",
          preferredMessenger: data.preferredMessenger || "telegram", city: data.city || "", specialization: data.specialization || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    loadTgStatus();
    loadMaxStatus();
  }, [loadTgStatus, loadMaxStatus]);

  const handleTgConnect = async () => {
    setTgLoading(true);
    try { const res = await fetch("/api/telegram/link", { method: "POST" }); if (res.ok) { const data = await res.json(); setTgDeepLink(data.deepLink); } } catch {} finally { setTgLoading(false); }
  };
  const handleTgDisconnect = async () => {
    setTgLoading(true);
    try { const res = await fetch("/api/telegram/link", { method: "DELETE" }); if (res.ok) { setTgStatus({ connected: false }); setTgDeepLink(null); } } catch {} finally { setTgLoading(false); }
  };
  const handleMaxConnect = async () => {
    setMaxLoading(true);
    try { const res = await fetch("/api/max/link", { method: "POST" }); if (res.ok) { const data = await res.json(); setMaxDeepLink(data.deepLink); } } catch {} finally { setMaxLoading(false); }
  };
  const handleMaxDisconnect = async () => {
    setMaxLoading(true);
    try { const res = await fetch("/api/max/link", { method: "DELETE" }); if (res.ok) { setMaxStatus({ connected: false }); setMaxDeepLink(null); } } catch {} finally { setMaxLoading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true); setMessage(null);
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone, gender: form.gender, birthYear: form.birthYear ? Number(form.birthYear) : null, profession: form.profession || null, preferredMessenger: form.preferredMessenger, city: form.city, specialization: form.specialization }),
      });
      if (res.ok) { const updated = await res.json(); setProfile((prev) => (prev ? { ...prev, ...updated } : prev)); setMessage("Сохранено"); }
      else { const err = await res.json(); setMessage(err.error || "Ошибка сохранения"); }
    } catch { setMessage("Ошибка сети"); } finally { setSaving(false); }
  };

  if (loading) return <CardSkeleton />;
  if (!profile) return <div className="p-8 text-muted-foreground">Профиль не найден</div>;

  /* ---- Telegram inline render ---- */
  const renderTg = () => {
    if (tgStatus?.connected) return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#2AABEE]/10 flex items-center justify-center"><Send className="h-4 w-4 text-[#2AABEE]" /></div>
          <div>
            <p className="text-sm font-medium">Telegram</p>
            <p className="text-xs text-muted-foreground">{tgStatus.telegramUsername ? `@${tgStatus.telegramUsername}` : tgStatus.telegramFirstName || "Подключён"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-[10px]">Подключён</Badge>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleTgDisconnect} disabled={tgLoading}><Unlink className="h-3 w-3" /></Button>
        </div>
      </div>
    );
    if (tgDeepLink) return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#2AABEE]/10 flex items-center justify-center"><Send className="h-4 w-4 text-[#2AABEE]" /></div>
          <div>
            <p className="text-sm font-medium">Telegram</p>
            <p className="text-xs text-muted-foreground">Ожидание привязки</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={tgDeepLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2AABEE] text-white text-xs font-medium hover:bg-[#229ED9] transition-colors"><Send className="h-3 w-3" />Открыть</a>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setTgDeepLink(null); loadTgStatus(); }}>Обновить</Button>
        </div>
      </div>
    );
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Send className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-sm font-medium">Telegram</p>
            <p className="text-xs text-muted-foreground">Не подключён</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleTgConnect} disabled={tgLoading}>{tgLoading ? "..." : "Подключить"}</Button>
      </div>
    );
  };

  /* ---- MAX inline render ---- */
  const renderMax = () => {
    if (maxStatus?.connected) return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#5B2EFF]/10 flex items-center justify-center"><MessageCircle className="h-4 w-4 text-[#5B2EFF]" /></div>
          <div>
            <p className="text-sm font-medium">MAX</p>
            <p className="text-xs text-muted-foreground">{maxStatus.maxUsername ? `@${maxStatus.maxUsername}` : maxStatus.maxFirstName || "Подключён"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-[10px]">Подключён</Badge>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleMaxDisconnect} disabled={maxLoading}><Unlink className="h-3 w-3" /></Button>
        </div>
      </div>
    );
    if (maxDeepLink) return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#5B2EFF]/10 flex items-center justify-center"><MessageCircle className="h-4 w-4 text-[#5B2EFF]" /></div>
          <div>
            <p className="text-sm font-medium">MAX</p>
            <p className="text-xs text-muted-foreground">Ожидание привязки</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={maxDeepLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B2EFF] text-white text-xs font-medium hover:bg-[#4A1FE6] transition-colors"><MessageCircle className="h-3 w-3" />Открыть</a>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setMaxDeepLink(null); loadMaxStatus(); }}>Обновить</Button>
        </div>
      </div>
    );
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><MessageCircle className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-sm font-medium">MAX</p>
            <p className="text-xs text-muted-foreground">Не подключён</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleMaxConnect} disabled={maxLoading}>{maxLoading ? "..." : "Подключить"}</Button>
      </div>
    );
  };

  const roleLabel = profile.role === "manager" ? "Руководитель" : "Участник профсоюза";

  return (
    <div>
      <PageHeader
        title="Профиль"
        description="Ваши данные и настройки"
        breadcrumbs={[
          { title: "Платформа", href: `/${profile.role === "manager" ? "manager" : "agent"}/dashboard` },
          { title: "Профиль" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ===== LEFT: Profile Card ===== */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-5">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {getInitials(profile.fullName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold leading-tight">{profile.fullName}</h2>
                {(profile as any).memberNumber && (
                  <p className="text-xs font-mono text-primary mt-0.5">{(profile as any).memberNumber}</p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <Badge variant="info">{roleLabel}</Badge>
                  <Badge variant="success">{profile.status === "active" ? "Активен" : profile.status}</Badge>
                </div>
              </div>

              {/* Organization */}
              {(profile.unionShortName || profile.divisionName) && (
                <div className="border-t border-border pt-4 space-y-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Организация</p>
                  {profile.unionShortName && (
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{profile.unionShortName}</span>
                    </div>
                  )}
                  {profile.divisionName && (
                    <div className="flex items-center gap-2.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{profile.divisionName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="border-t border-border pt-4 mt-4 grid grid-cols-2 gap-3">
                <div className="text-center p-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-lg font-bold">{profile.rating ?? "0.0"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Рейтинг</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-lg font-bold">{profile.totalLeads ?? 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Обращений</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connections */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Подключения</h3>
              </div>
              <div className="space-y-4">
                {renderTg()}
                <div className="border-t border-border" />
                {renderMax()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== RIGHT: Personal Data + Support ===== */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-semibold mb-5">Личные данные</h3>

              {/* Section: Basic */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Основная информация</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">ФИО</label>
                    <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <Input value={profile.email} disabled className="opacity-60" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Пол</label>
                    <select className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                      <option value="not_specified">Не указан</option>
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Год рождения</label>
                    <Input type="number" min={1940} max={2010} placeholder="1990" value={form.birthYear} onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Contacts */}
              <div className="mb-5 border-t border-border pt-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Контакты</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Телефон</label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Город</label>
                    <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Предпочтительный мессенджер</label>
                    <select className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground" value={form.preferredMessenger} onChange={(e) => setForm((f) => ({ ...f, preferredMessenger: e.target.value }))}>
                      <option value="telegram">Telegram</option>
                      <option value="max">MAX</option>
                      <option value="vk">VK</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Work */}
              <div className="mb-5 border-t border-border pt-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Работа</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Должность</label>
                    <Input value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Профессия</label>
                    <Input value={form.profession} onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))} placeholder="Например: инженер, электрик..." />
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{message || "Изменения сохраняются вручную"}</p>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить изменения"}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Support / Feedback — compact */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Поддержка</h3>
              </div>
              {fbSent ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" /> Спасибо за обратную связь!
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <select className="h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground sm:w-40 shrink-0" value={fbType} onChange={(e) => setFbType(e.target.value)}>
                    <option value="platform">О платформе</option>
                    <option value="onboarding">Об обучении</option>
                    <option value="suggestion">Предложение</option>
                    <option value="problem">Проблема</option>
                  </select>
                  <Input placeholder="Ваш комментарий..." value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} className="flex-1" />
                  <Button size="sm" className="shrink-0" disabled={fbSending || !fbMessage.trim()} onClick={async () => {
                    setFbSending(true);
                    try { const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: fbType, message: fbMessage }) }); if (res.ok) { setFbSent(true); setFbMessage(""); } } catch {} finally { setFbSending(false); }
                  }}>
                    {fbSending ? "..." : "Отправить"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
