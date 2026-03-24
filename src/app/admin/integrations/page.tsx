"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug, MessageSquare, Bot, CreditCard, Workflow, Database, Send, RefreshCw } from "lucide-react";

interface TelegramSetupData {
  webhook: { url: string; has_custom_certificate: boolean; pending_update_count: number; last_error_date?: number; last_error_message?: string } | null;
  bot: { id: number; first_name: string; username: string; is_bot: boolean } | null;
  connectedUsers: number;
  recentErrors: { action: string; details: string; created_at: string }[];
}

const otherIntegrations = [
  { name: "Supabase", description: "База данных и аутентификация", icon: Database, status: "planned" as const, category: "Инфраструктура" },
  { name: "WhatsApp Business", description: "Коммуникации через WhatsApp API", icon: MessageSquare, status: "planned" as const, category: "Мессенджеры" },
  { name: "AI Engine (OpenAI)", description: "AI-ассистент для обработки обращений", icon: Bot, status: "planned" as const, category: "AI" },
  { name: "n8n Workflows", description: "Автоматизация бизнес-процессов", icon: Workflow, status: "planned" as const, category: "Автоматизация" },
  { name: "Платёжная система", description: "Обработка платежей", icon: CreditCard, status: "planned" as const, category: "Финансы" },
];

const statusConfig = {
  active: { label: "Активно", variant: "success" as const },
  planned: { label: "Запланировано", variant: "secondary" as const },
  error: { label: "Ошибка", variant: "destructive" as const },
};

export default function AdminIntegrationsPage() {
  const [tgData, setTgData] = useState<TelegramSetupData | null>(null);
  const [tgLoading, setTgLoading] = useState(true);
  const [tgAction, setTgAction] = useState(false);

  const loadTgData = () => {
    setTgLoading(true);
    fetch("/api/telegram/setup")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setTgData(data))
      .catch(() => {})
      .finally(() => setTgLoading(false));
  };

  useEffect(() => { loadTgData(); }, []);

  const handleRegisterWebhook = async () => {
    setTgAction(true);
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST" });
      if (res.ok) loadTgData();
    } catch { /* ignore */ }
    finally { setTgAction(false); }
  };

  const handleDeleteWebhook = async () => {
    setTgAction(true);
    try {
      const res = await fetch("/api/telegram/setup", { method: "DELETE" });
      if (res.ok) loadTgData();
    } catch { /* ignore */ }
    finally { setTgAction(false); }
  };

  const webhookActive = tgData?.webhook && tgData.webhook.url && tgData.webhook.url.length > 0;

  return (
    <div>
      <PageHeader
        title="Интеграции"
        description="Подключённые сервисы и API"
        breadcrumbs={[
          { title: "Дашборд", href: "/admin/dashboard" },
          { title: "Интеграции" },
        ]}
      />

      {/* Telegram Bot — live section */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> Telegram Bot
            </CardTitle>
            <div className="flex items-center gap-2">
              {webhookActive ? (
                <Badge variant="success">Активно</Badge>
              ) : (
                <Badge variant="secondary">Не настроено</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={loadTgData} disabled={tgLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${tgLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tgLoading && !tgData ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : tgData ? (
            <>
              {/* Bot info */}
              {tgData.bot && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Бот</span>
                    <span className="font-medium">@{tgData.bot.username}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Webhook</span>
                    <span className="font-medium">{webhookActive ? "Зарегистрирован" : "Не установлен"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Подключённых членов</span>
                    <span className="font-medium">{tgData.connectedUsers}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Ожидающих обновлений</span>
                    <span className="font-medium">{tgData.webhook?.pending_update_count ?? 0}</span>
                  </div>
                </div>
              )}

              {/* Webhook URL */}
              {webhookActive && tgData.webhook && (
                <div className="text-xs bg-muted rounded-lg p-3 font-mono break-all">
                  {tgData.webhook.url}
                </div>
              )}

              {/* Last error */}
              {tgData.webhook?.last_error_message && (
                <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">
                  Последняя ошибка: {tgData.webhook.last_error_message}
                  {tgData.webhook.last_error_date && (
                    <span className="ml-2 text-muted-foreground">
                      ({new Date(tgData.webhook.last_error_date * 1000).toLocaleString("ru-RU")})
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!webhookActive ? (
                  <Button size="sm" onClick={handleRegisterWebhook} disabled={tgAction}>
                    {tgAction ? "Регистрация..." : "Зарегистрировать Webhook"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleDeleteWebhook} disabled={tgAction}>
                    {tgAction ? "Удаление..." : "Удалить Webhook"}
                  </Button>
                )}
              </div>

              {/* Recent errors log */}
              {tgData.recentErrors.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-2">Последние ошибки интеграции</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {tgData.recentErrors.map((e, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="shrink-0">{new Date(e.created_at).toLocaleString("ru-RU")}</span>
                        <span className="truncate">{e.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-destructive">Не удалось загрузить данные. Проверьте TELEGRAM_BOT_TOKEN в переменных окружения.</p>
          )}
        </CardContent>
      </Card>

      {/* Other integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherIntegrations.map((integration) => {
          const Icon = integration.icon;
          const status = statusConfig[integration.status];
          return (
            <Card key={integration.name} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <h3 className="font-medium mb-1">{integration.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>
                <span className="text-xs text-muted-foreground">{integration.category}</span>
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plug className="h-3.5 w-3.5 mr-1" /> Настроить
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
