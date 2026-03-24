// ==================== ENUMS ====================

export type MessageChannel = "web" | "telegram";

export type UserRole = "agent" | "manager" | "admin";

export type UserStatus = "active" | "inactive" | "blocked";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource = "website" | "telegram" | "whatsapp" | "referral" | "cold" | "partner";

export type ConversationMode = "ai" | "manual" | "semi-auto";

export type ConversationStatus = "active" | "waiting" | "closed" | "escalated";

export type MessageSenderType = "agent" | "manager" | "client" | "ai" | "system";

export type MessageStatus = "sent" | "delivered" | "read";

export type PayoutStatus = "pending" | "processing" | "paid" | "rejected";

export type DocumentType = "contract" | "invoice" | "act" | "agreement" | "power_of_attorney" | "other";

export type DocumentStatus = "draft" | "pending_signature" | "signed" | "expired" | "rejected";

export type OnboardingStatus = "pending" | "in_progress" | "completed" | "rejected";

export type AgentLifecycle =
  | "registered"
  | "learning_in_progress"
  | "activated"
  | "active"
  | "inactive"
  | "blocked"
  | "rejected";

// ==================== ENTITIES ====================

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  status: UserStatus;
  createdAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  user: User;
  city: string;
  specialization: string;
  activeLeads: number;
  totalLeads: number;
  totalRevenue: number;
  onboardingStatus: OnboardingStatus;
  rating: number;
}

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  city: string;
  source: LeadSource;
  status: LeadStatus;
  assignedAgentId?: string;
  assignedManagerId?: string;
  createdAt: string;
  updatedAt: string;
  comment?: string;
  estimatedValue?: number;
}

export interface Conversation {
  id: string;
  agentId: string;
  managerId?: string;
  clientName: string;
  mode: ConversationMode;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt: string;
  status: ConversationStatus;
  channel: MessageChannel;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderName: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
  channel: MessageChannel;
  externalId?: string;
}

export type AgentTier = "base" | "silver" | "gold";

export interface Payout {
  id: string;
  agentId: string;
  agentName: string;
  amount: number;
  status: PayoutStatus;
  period: string;
  createdAt: string;
  description?: string;
  rejectionReason?: string;
  leadId?: string;
  leadName?: string;
  baseAmount?: number;
  commissionRate?: number;
  bonusAmount?: number;
  tierAtCreation?: AgentTier;
}

export interface Document {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  fileSize?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "info" | "success" | "warning" | "error";
}

// ==================== TELEGRAM ====================

export interface TelegramBinding {
  id: string;
  profileId: string;
  telegramUserId: number;
  telegramChatId: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  isActive: boolean;
  lastConversationId?: string;
  linkedAt: string;
}

// ==================== UI TYPES ====================

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  highlight?: boolean;
  pulse?: boolean;
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface StatCardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: "status_change" | "message" | "assignment" | "note" | "payment";
}
