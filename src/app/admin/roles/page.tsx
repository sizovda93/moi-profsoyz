"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Eye, Edit, Trash2 } from "lucide-react";

const roles = [
  {
    id: "agent",
    name: "Участник профсоюза",
    description: "Подача обращений, документы, обучение",
    permissions: ["Просмотр своих обращений", "Чат с поддержкой", "Просмотр финансов", "Управление профилем", "Загрузка документов"],
    usersCount: 3,
    color: "info" as const,
  },
  {
    id: "manager",
    name: "Руководитель",
    description: "Управление членами профсоюза, обращения, объявления",
    permissions: ["Управление членами", "Все обращения", "Все диалоги", "Рассылки", "Финансы", "Документы"],
    usersCount: 2,
    color: "warning" as const,
  },
  {
    id: "admin",
    name: "Администратор",
    description: "Полный доступ к системе, управление пользователями и настройками",
    permissions: ["Все права менеджера", "Управление пользователями", "Управление ролями", "Системные настройки", "Интеграции", "Логи"],
    usersCount: 1,
    color: "destructive" as const,
  },
];

export default function AdminRolesPage() {
  return (
    <div>
      <PageHeader
        title="Роли"
        description="Управление ролями и правами доступа"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Роли" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="hover:border-primary/20 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{role.usersCount} пользователей</span>
                    </div>
                  </div>
                </div>
                <Badge variant={role.color}>{role.id}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
              <div className="space-y-1.5">
                {role.permissions.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
