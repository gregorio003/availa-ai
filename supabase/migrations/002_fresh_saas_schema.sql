-- ============================================================
-- Availa.ai — Schema SaaS Multi-Tenant
-- Reseta o schema antigo do MVP e monta o novo (multi-tenant).
-- Rodar UMA vez no SQL Editor do Supabase (projeto restaurado).
-- ATENÇÃO: apaga os dados de teste antigos (Lavajato do João etc).
-- ============================================================

-- ---------- RESET: limpa o schema antigo ----------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists is_super_admin() cascade;
drop table if exists appointments cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists customers cascade;
drop table if exists services cascade;
drop table if exists bot_messages cascade;
drop table if exists businesses cascade;
drop table if exists profiles cascade;
drop table if exists users cascade;
drop type if exists user_role cascade;

-- ---------- PAPÉIS (super_admin vs cliente) ----------
create type user_role as enum ('super_admin', 'client');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  created_at timestamptz not null default now()
);

-- Cria profile automaticamente quando um usuário é criado no Auth
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id, 'client', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- ESTABELECIMENTOS (o tenant) ----------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,                               -- WhatsApp do negócio
  niche text not null default 'lavajato',   -- 'lavajato' | 'salao' | 'sobrancelha' | 'unhas'
  address text,

  -- Agenda / calendário
  google_calendar_id text,
  google_refresh_token text,
  working_hours jsonb not null default '{"mon":{"start":"08:00","end":"18:00"},"tue":{"start":"08:00","end":"18:00"},"wed":{"start":"08:00","end":"18:00"},"thu":{"start":"08:00","end":"18:00"},"fri":{"start":"08:00","end":"18:00"},"sat":{"start":"08:00","end":"13:00"},"sun":null}',
  slot_duration_minutes int not null default 30,

  -- REGRAS DE CAPACIDADE (as duas juntas, editáveis pelo dono)
  employee_count int not null default 1,          -- carros simultâneos = nº de funcionários
  max_appointments_per_hour int not null default 4, -- teto de agendamentos por hora

  -- ADIANTAMENTO / SINAL (editável pelo dono)
  requires_advance boolean not null default false,
  advance_amount numeric(10,2) default 0,         -- valor do sinal, se requires_advance

  -- ASSINATURA (controle manual agora; pronto p/ automático depois)
  plan text not null default 'basico',            -- 'basico' | 'pro' | 'business'
  commission_pct numeric(5,2) not null default 0, -- % da Availa por agendamento (ex: 1.00 = 1%)
  subscription_status text not null default 'active', -- 'active' | 'suspended' | 'trial'
  subscription_valid_until date,                  -- você controla a validade manualmente

  -- CONEXÃO WHATSAPP (Z-API por estabelecimento)
  zapi_instance_id text,
  zapi_token text,
  whatsapp_connected boolean not null default false,

  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index businesses_owner_idx on businesses(owner_user_id);
create index businesses_zapi_idx on businesses(zapi_instance_id);

-- ---------- MENSAGENS CUSTOMIZÁVEIS DO BOT ----------
create table bot_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  greeting text not null default 'Olá! 👋 Seja bem-vindo(a). Como posso te ajudar com seu agendamento?',
  service_prompt text not null default 'Qual serviço você deseja?',
  date_prompt text not null default 'Para qual dia você prefere?',
  time_prompt text not null default 'Qual horário fica melhor pra você?',
  confirmation text not null default '✅ Agendado com sucesso! Te esperamos. 😊',
  advance_message text not null default 'Para confirmar, é necessário um sinal. Assim que efetuar, seu horário fica garantido.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id)
);

-- ---------- SERVIÇOS ----------
create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 60,
  price numeric(10,2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- CLIENTES FINAIS ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text,
  phone text not null,
  created_at timestamptz not null default now(),
  unique(business_id, phone)
);

-- ---------- CONVERSAS ----------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  status text not null default 'active',   -- 'active' | 'completed' | 'abandoned'
  context jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MENSAGENS ----------
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,                      -- 'customer' | 'assistant' | 'owner'
  content text not null,
  whatsapp_message_id text,
  created_at timestamptz not null default now()
);

-- ---------- AGENDAMENTOS ----------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_id uuid references services(id),
  conversation_id uuid references conversations(id),
  google_event_id text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  status text not null default 'confirmed', -- 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  price numeric(10,2),                      -- valor do serviço no momento
  commission_amount numeric(10,2),          -- comissão da Availa (calculada = price * commission_pct)
  advance_paid boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- ÍNDICES ----------
create index conversations_business_status_idx on conversations(business_id, status);
create index messages_conversation_idx on messages(conversation_id);
create index appointments_business_date_idx on appointments(business_id, scheduled_at);
create index customers_business_phone_idx on customers(business_id, phone);

-- ============================================================
-- RLS — isolamento por tenant
-- (o webhook usa service_role e IGNORA RLS, então não quebra o bot)
-- ============================================================
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table bot_messages enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;

-- Helper: usuário atual é super_admin?
create or replace function is_super_admin()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$ language sql security definer stable;

-- profiles
create policy "own_profile" on profiles
  for all using (auth.uid() = id or is_super_admin());

-- businesses
create policy "own_business" on businesses
  for all using (owner_user_id = auth.uid() or is_super_admin());

-- bot_messages
create policy "own_bot_messages" on bot_messages
  for all using (exists (
    select 1 from businesses b where b.id = bot_messages.business_id
    and (b.owner_user_id = auth.uid() or is_super_admin())
  ));

-- services
create policy "own_services" on services
  for all using (exists (
    select 1 from businesses b where b.id = services.business_id
    and (b.owner_user_id = auth.uid() or is_super_admin())
  ));

-- customers
create policy "own_customers" on customers
  for all using (exists (
    select 1 from businesses b where b.id = customers.business_id
    and (b.owner_user_id = auth.uid() or is_super_admin())
  ));

-- conversations
create policy "own_conversations" on conversations
  for all using (exists (
    select 1 from businesses b where b.id = conversations.business_id
    and (b.owner_user_id = auth.uid() or is_super_admin())
  ));

-- messages
create policy "own_messages" on messages
  for all using (exists (
    select 1 from conversations c
    join businesses b on b.id = c.business_id
    where c.id = messages.conversation_id
    and (b.owner_user_id = auth.uid() or is_super_admin())
  ));

-- appointments
create policy "own_appointments" on appointments
  for all using (exists (
    select 1 from businesses b where b.id = appointments.business_id
    and (b.owner_user_id = auth.uid() or is_super_admin())
  ));

-- ============================================================
-- SEED — 1 negócio de teste (lavajato) para provar o bot (Fase 0)
-- Sem owner por enquanto; você vira dono depois pelo painel.
-- ============================================================
insert into businesses (id, name, phone, niche, address, employee_count, max_appointments_per_hour, commission_pct, active, whatsapp_connected)
values ('11111111-1111-1111-1111-111111111111', 'Lavajato Teste', '5537999181248', 'lavajato', 'Rua Teste, 100', 2, 4, 1.00, true, false);

insert into bot_messages (business_id) values ('11111111-1111-1111-1111-111111111111');

insert into services (business_id, name, duration_minutes, price) values
  ('11111111-1111-1111-1111-111111111111', 'Lavagem Simples', 45, 30.00),
  ('11111111-1111-1111-1111-111111111111', 'Lavagem Completa', 90, 60.00),
  ('11111111-1111-1111-1111-111111111111', 'Polimento', 180, 150.00);
