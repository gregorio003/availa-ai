-- AgendaZap - Initial Schema
-- Multi-tenant: each "business" is a prestador de serviço

-- Businesses (prestadores de serviço)
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,       -- WhatsApp number of business
  niche text not null,              -- 'lavajato' | 'sobrancelha' | 'salao' | 'unhas'
  address text,
  google_calendar_id text,
  google_refresh_token text,
  working_hours jsonb default '{"mon":{"start":"08:00","end":"18:00"},"tue":{"start":"08:00","end":"18:00"},"wed":{"start":"08:00","end":"18:00"},"thu":{"start":"08:00","end":"18:00"},"fri":{"start":"08:00","end":"18:00"},"sat":{"start":"08:00","end":"13:00"},"sun":null}',
  slot_duration_minutes int default 60,
  active boolean default true,
  created_at timestamptz default now()
);

-- Users (backoffice users — owners/employees)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'owner',  -- 'owner' | 'employee'
  created_at timestamptz default now()
);

-- Services offered by each business
create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,                 -- "Lavagem Simples", "Lavagem Completa", "Polimento"
  description text,
  duration_minutes int not null default 60,
  price decimal(10,2),
  active boolean default true,
  created_at timestamptz default now()
);

-- Customers (clients of each business)
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text,
  phone text not null,               -- WhatsApp number of customer
  created_at timestamptz default now(),
  unique(business_id, phone)
);

-- WhatsApp conversations (sessions per customer)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  status text not null default 'active',  -- 'active' | 'completed' | 'abandoned'
  context jsonb default '{}',             -- AI conversation state
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages within conversations
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,                -- 'customer' | 'assistant'
  content text not null,
  whatsapp_message_id text,
  created_at timestamptz default now()
);

-- Appointments (agendamentos)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_id uuid references services(id),
  conversation_id uuid references conversations(id),
  google_event_id text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  status text not null default 'confirmed',  -- 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes text,
  created_at timestamptz default now()
);

-- Indexes
create index on conversations(business_id, status);
create index on messages(conversation_id);
create index on appointments(business_id, scheduled_at);
create index on customers(business_id, phone);

-- RLS Policies
alter table businesses enable row level security;
alter table users enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;

-- Users can only see their own business data
create policy "Users see own business" on businesses
  for all using (id in (select business_id from users where id = auth.uid()));

create policy "Users see own business users" on users
  for all using (business_id in (select business_id from users where id = auth.uid()));

create policy "Users see own services" on services
  for all using (business_id in (select business_id from users where id = auth.uid()));

create policy "Users see own customers" on customers
  for all using (business_id in (select business_id from users where id = auth.uid()));

create policy "Users see own conversations" on conversations
  for all using (business_id in (select business_id from users where id = auth.uid()));

create policy "Users see own messages" on messages
  for all using (conversation_id in (
    select id from conversations where business_id in (
      select business_id from users where id = auth.uid()
    )
  ));

create policy "Users see own appointments" on appointments
  for all using (business_id in (select business_id from users where id = auth.uid()));

-- Sample data for lavajato
insert into businesses (id, name, phone, niche, address, slot_duration_minutes) values
  ('11111111-1111-1111-1111-111111111111', 'Lavajato do João', '5511999990000', 'lavajato', 'Rua das Flores, 123 - São Paulo/SP', 60);

insert into services (business_id, name, duration_minutes, price) values
  ('11111111-1111-1111-1111-111111111111', 'Lavagem Simples', 45, 30.00),
  ('11111111-1111-1111-1111-111111111111', 'Lavagem Completa', 90, 60.00),
  ('11111111-1111-1111-1111-111111111111', 'Polimento', 180, 150.00),
  ('11111111-1111-1111-1111-111111111111', 'Higienização Interna', 120, 100.00);
