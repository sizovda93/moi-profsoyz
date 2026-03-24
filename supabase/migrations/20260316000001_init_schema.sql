-- =============================================
-- Агентум Про — Схема базы данных
-- =============================================

-- Расширения
create extension if not exists "uuid-ossp";

-- =============================================
-- ENUM типы
-- =============================================

create type user_role as enum ('agent', 'manager', 'admin');
create type user_status as enum ('active', 'inactive', 'blocked');
create type lead_status as enum ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
create type lead_source as enum ('website', 'telegram', 'whatsapp', 'referral', 'cold', 'partner');
create type conversation_mode as enum ('ai', 'manual', 'semi-auto');
create type conversation_status as enum ('active', 'waiting', 'closed', 'escalated');
create type message_sender_type as enum ('agent', 'manager', 'client', 'ai', 'system');
create type message_status as enum ('sent', 'delivered', 'read');
create type payout_status as enum ('pending', 'processing', 'paid', 'rejected');
create type document_type as enum ('contract', 'invoice', 'act', 'agreement', 'power_of_attorney', 'other');
create type document_status as enum ('draft', 'pending_signature', 'signed', 'expired', 'rejected');
create type onboarding_status as enum ('pending', 'in_progress', 'completed', 'rejected');
create type notification_type as enum ('info', 'success', 'warning', 'error');

-- =============================================
-- ТАБЛИЦЫ
-- =============================================

-- Профили пользователей (связано с auth.users)
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique, -- будет связано с auth.users при подключении реальной авторизации
  role user_role not null default 'agent',
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Агенты (расширение профиля)
create table public.agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city text not null default '',
  specialization text not null default '',
  active_leads int not null default 0,
  total_leads int not null default 0,
  total_revenue numeric(12,2) not null default 0,
  onboarding_status onboarding_status not null default 'pending',
  rating numeric(2,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Лиды
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  city text not null default '',
  source lead_source not null default 'website',
  status lead_status not null default 'new',
  assigned_agent_id uuid references public.agents(id) on delete set null,
  assigned_manager_id uuid references public.profiles(id) on delete set null,
  comment text,
  estimated_value numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Диалоги
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references public.agents(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  client_name text not null,
  mode conversation_mode not null default 'manual',
  unread_count int not null default 0,
  last_message text,
  last_message_at timestamptz default now(),
  status conversation_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Сообщения
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type message_sender_type not null,
  sender_name text not null,
  text text not null,
  status message_status not null default 'sent',
  created_at timestamptz not null default now()
);

-- Выплаты
create table public.payouts (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_name text not null,
  amount numeric(12,2) not null,
  status payout_status not null default 'pending',
  period text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Документы
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_name text not null,
  title text not null,
  type document_type not null default 'other',
  status document_status not null default 'draft',
  file_url text,
  file_size text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Уведомления
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  type notification_type not null default 'info',
  created_at timestamptz not null default now()
);

-- Логи системы
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  action text not null,
  user_email text,
  details text,
  level text not null default 'info',
  created_at timestamptz not null default now()
);

-- =============================================
-- ИНДЕКСЫ
-- =============================================

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_email on public.profiles(email);

create index idx_agents_user_id on public.agents(user_id);

create index idx_leads_status on public.leads(status);
create index idx_leads_agent on public.leads(assigned_agent_id);
create index idx_leads_manager on public.leads(assigned_manager_id);
create index idx_leads_created on public.leads(created_at desc);

create index idx_conversations_agent on public.conversations(agent_id);
create index idx_conversations_status on public.conversations(status);

create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_created on public.messages(created_at);

create index idx_payouts_agent on public.payouts(agent_id);
create index idx_payouts_status on public.payouts(status);

create index idx_documents_owner on public.documents(owner_id);

create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_read on public.notifications(read);

create index idx_audit_logs_action on public.audit_logs(action);
create index idx_audit_logs_created on public.audit_logs(created_at desc);

-- =============================================
-- RLS (Row Level Security) — подготовка
-- =============================================

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.payouts enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Временные политики — полный доступ (для разработки)
-- В продакшене заменить на role-based политики

create policy "Allow all for dev" on public.profiles for all using (true) with check (true);
create policy "Allow all for dev" on public.agents for all using (true) with check (true);
create policy "Allow all for dev" on public.leads for all using (true) with check (true);
create policy "Allow all for dev" on public.conversations for all using (true) with check (true);
create policy "Allow all for dev" on public.messages for all using (true) with check (true);
create policy "Allow all for dev" on public.payouts for all using (true) with check (true);
create policy "Allow all for dev" on public.documents for all using (true) with check (true);
create policy "Allow all for dev" on public.notifications for all using (true) with check (true);
create policy "Allow all for dev" on public.audit_logs for all using (true) with check (true);

-- =============================================
-- Функция обновления updated_at
-- =============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.agents
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.documents
  for each row execute function public.handle_updated_at();
