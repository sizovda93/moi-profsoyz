import { Badge } from "@/components/ui/badge";
import {
  LeadStatus,
  UserStatus,
  PayoutStatus,
  DocumentStatus,
  ConversationStatus,
  ConversationMode,
  UserRole,
  MessageChannel,
  AgentLifecycle,
  AgentTier,
} from "@/types";
import { Send, Globe, AlertTriangle, CheckCircle2 } from "lucide-react";

// ====== Lead Status ======
const leadStatusConfig: Record<LeadStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary" }> = {
  new: { label: "Новый", variant: "info" },
  contacted: { label: "Контакт", variant: "default" },
  qualified: { label: "Квалифицирован", variant: "default" },
  proposal: { label: "Предложение", variant: "warning" },
  negotiation: { label: "Переговоры", variant: "warning" },
  won: { label: "Договор заключен", variant: "success" },
  lost: { label: "Потерян", variant: "destructive" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = leadStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== User Status ======
const userStatusConfig: Record<UserStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  active: { label: "Активен", variant: "success" },
  inactive: { label: "Неактивен", variant: "secondary" },
  blocked: { label: "Заблокирован", variant: "destructive" },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = userStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Payout Status ======
const payoutStatusConfig: Record<PayoutStatus, { label: string; variant: "warning" | "info" | "success" | "destructive" }> = {
  pending: { label: "Ожидает", variant: "warning" },
  processing: { label: "В обработке", variant: "info" },
  paid: { label: "Оплачено", variant: "success" },
  rejected: { label: "Отклонено", variant: "destructive" },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const config = payoutStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Document Status ======
const docStatusConfig: Record<DocumentStatus, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Черновик", variant: "secondary" },
  pending_signature: { label: "На подписи", variant: "warning" },
  signed: { label: "Подписан", variant: "success" },
  expired: { label: "Истёк", variant: "destructive" },
  rejected: { label: "Отклонён", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = docStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Conversation Status ======
const convStatusConfig: Record<ConversationStatus, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  active: { label: "Активен", variant: "success" },
  waiting: { label: "Ожидание", variant: "warning" },
  closed: { label: "Закрыт", variant: "secondary" },
  escalated: { label: "Эскалация", variant: "destructive" },
};

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const config = convStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Mode Badge ======
const modeConfig: Record<ConversationMode, { label: string; variant: "info" | "default" | "warning" }> = {
  ai: { label: "AI", variant: "info" },
  manual: { label: "Ручной", variant: "default" },
  "semi-auto": { label: "Полуавто", variant: "warning" },
};

export function ModeBadge({ mode }: { mode: ConversationMode }) {
  const config = modeConfig[mode];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Role Badge ======
const roleConfig: Record<UserRole, { label: string; variant: "info" | "warning" | "destructive" }> = {
  agent: { label: "Партнёр", variant: "info" },
  manager: { label: "Менеджер", variant: "warning" },
  admin: { label: "Админ", variant: "destructive" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Lifecycle Badge ======
const lifecycleConfig: Record<AgentLifecycle, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  registered: { label: "Зарегистрирован", variant: "secondary" },
  learning_in_progress: { label: "Обучается", variant: "info" },
  activated: { label: "Активирован", variant: "warning" },
  active: { label: "Активен", variant: "success" },
  inactive: { label: "Неактивен", variant: "secondary" },
  blocked: { label: "Заблокирован", variant: "destructive" },
  rejected: { label: "Отклонён", variant: "destructive" },
};

export function LifecycleBadge({ lifecycle }: { lifecycle: AgentLifecycle }) {
  const config = lifecycleConfig[lifecycle] ?? lifecycleConfig.registered;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Channel Badge ======
export function ChannelBadge({ channel }: { channel: MessageChannel }) {
  if (channel === "telegram") {
    return (
      <Badge variant="info" className="gap-1">
        <Send className="h-3 w-3" /> Telegram
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Globe className="h-3 w-3" /> Web
    </Badge>
  );
}

// ====== Tier Badge ======
const tierConfig: Record<AgentTier, { label: string; variant: "secondary" | "info" | "warning" }> = {
  base: { label: "Базовый", variant: "secondary" },
  silver: { label: "Серебро", variant: "info" },
  gold: { label: "Золото", variant: "warning" },
};

export function TierBadge({ tier }: { tier: AgentTier }) {
  const config = tierConfig[tier] ?? tierConfig.base;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ====== Conflict Badge ======
export function ConflictBadge({ status, resolution }: { status?: string | null; resolution?: string | null }) {
  if (status === 'open') {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Конфликт
      </Badge>
    );
  }
  if (status === 'resolved') {
    const labels: Record<string, string> = {
      confirmed_duplicate: 'Дубль',
      kept_existing: 'Решён',
      overridden: 'Переназначен',
      kept_separate: 'Разделён',
    };
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> {labels[resolution || ''] || 'Решён'}
      </Badge>
    );
  }
  return null;
}

// ====== AI Classification Badge ======
const classificationConfig: Record<string, { label: string; variant: "secondary" | "info" | "warning" | "destructive" }> = {
  lead: { label: "Лид", variant: "info" },
  question: { label: "Вопрос", variant: "secondary" },
  status_request: { label: "Статус", variant: "secondary" },
  document: { label: "Документ", variant: "secondary" },
  objection: { label: "Возражение", variant: "warning" },
  escalation: { label: "Эскалация", variant: "destructive" },
  other: { label: "Прочее", variant: "secondary" },
};

export function ClassificationBadge({ classification }: { classification?: string | null }) {
  if (!classification) return null;
  const config = classificationConfig[classification] ?? classificationConfig.other;
  return <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>;
}

export function AttentionDot() {
  return <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" title="Требует внимания" />;
}
