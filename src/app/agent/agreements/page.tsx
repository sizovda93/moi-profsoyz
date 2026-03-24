"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { FileText, Shield, UserCheck, ArrowRight } from "lucide-react";

const documents = [
  {
    title: "Пользовательское соглашение (Оферта)",
    description: "Условия использования платформы «Мой Профсоюз», права и обязанности сторон",
    href: "/offer",
    icon: FileText,
  },
  {
    title: "Политика конфиденциальности",
    description: "Порядок сбора, хранения и обработки персональных данных пользователей",
    href: "/privacy",
    icon: Shield,
  },
  {
    title: "Согласие на обработку персональных данных",
    description: "Перечень обрабатываемых данных, цели обработки и срок действия согласия",
    href: "/consent",
    icon: UserCheck,
  },
];

export default function AgentAgreementsPage() {
  return (
    <div>
      <PageHeader
        title="Соглашения"
        description="Правовые документы платформы"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Соглашения" },
        ]}
      />

      <div className="space-y-4">
        {documents.map((doc) => {
          const Icon = doc.icon;
          return (
            <Link key={doc.href} href={doc.href} target="_blank">
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Регистрируясь на платформе, вы подтверждаете согласие с указанными документами.
        Актуальные версии документов всегда доступны на этой странице.
      </p>
    </div>
  );
}
