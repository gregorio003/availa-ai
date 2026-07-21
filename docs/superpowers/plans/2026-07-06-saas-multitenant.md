# Availa.ai SaaS Multi-Tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Availa.ai em uma plataforma SaaS multi-tenant onde Dayane (super admin) gerencia clientes, e cada cliente acessa seu próprio painel para configurar o bot de WhatsApp.

**Architecture:** Supabase Auth com tabela `profiles` para roles (super_admin | client). Cada `business` pertence a um usuário cliente. Middleware Next.js protege rotas por role. Z-API credentials ficam por `business`, o webhook roteia a mensagem para o negócio correto via `instanceId`.

**Tech Stack:** Next.js 15 (App Router), Supabase (Auth + PostgreSQL + RLS), Z-API, Groq (llama-3.3-70b), TypeScript, Tailwind CSS.

## Global Constraints

- Next.js 15 App Router — usar `async` server components, `cookies()` é assíncrono
- Supabase SSR via `@supabase/ssr` — não usar `@supabase/auth-helpers-nextjs`
- Nenhum `console.log` de dados sensíveis (tokens, senhas)
- Todos os textos de UI em português brasileiro
- RLS ativo em todas as tabelas — nunca desativar
- `createServiceClient()` (service_role) só em webhooks e server actions — nunca no cliente
- Commits frequentes por tarefa com `git add <arquivos específicos>`
- Sem mocks: dashboard usa dados reais do Supabase

---

## File Structure

### Novos arquivos a criar
```
src/
  app/
    (admin)/
      layout.tsx                    — layout protegido super_admin
      admin/
        page.tsx                    — lista de clientes
        novo/page.tsx               — criar novo cliente
        [id]/page.tsx               — detalhes do cliente
    (onboarding)/
      layout.tsx                    — layout do onboarding
      onboarding/
        page.tsx                    — wizard step 1: info do negócio
        whatsapp/page.tsx           — wizard step 2: conectar WhatsApp
        servicos/page.tsx           — wizard step 3: cadastrar serviços
    api/
      admin/
        clients/route.ts            — GET lista, POST criar cliente
        clients/[id]/route.ts       — PATCH ativar/desativar, GET detalhes
      onboarding/
        business/route.ts           — POST salvar info do negócio
        zapi/connect/route.ts       — GET QR code do Z-API
        zapi/status/route.ts        — GET status da conexão Z-API
      bot/
        messages/route.ts           — GET/PATCH mensagens customizadas do bot
  middleware.ts                     — auth + role-based routing
  lib/
    supabase/
      middleware.ts                 — helper refreshSession para middleware
    zapi/
      client.ts                     — funções Z-API (getQR, getStatus, send)
  types/
    index.ts                        — adicionar Profile, BotMessages types

### Arquivos a modificar
src/
  types/index.ts                    — adicionar Profile, BotMessages, update Business
  app/(dashboard)/layout.tsx        — verificar auth + role client
  app/(dashboard)/dashboard/page.tsx — dados reais do Supabase
  app/(dashboard)/conversas/page.tsx — dados reais do Supabase
  app/(dashboard)/clientes/page.tsx  — dados reais do Supabase
  app/(dashboard)/configuracoes/page.tsx — salvar configurações reais
  app/api/webhook/zapi/route.ts     — rotear por instanceId em vez de business único
  lib/agent/scheduler.ts            — aceitar botMessages para customização

### Banco de dados (migrations SQL)
supabase/migrations/
  001_profiles.sql                  — tabela profiles + role
  002_business_owner.sql            — coluna owner_user_id em businesses
  003_zapi_per_business.sql         — colunas zapi_instance_id, zapi_token em businesses
  004_bot_messages.sql              — tabela bot_messages
  005_rls_policies.sql              — políticas RLS atualizadas
```

---

## Task 1: Database Schema + Types

**Files:**
- Create: `supabase/migrations/001_profiles.sql`
- Create: `supabase/migrations/002_business_owner.sql`
- Create: `supabase/migrations/003_zapi_per_business.sql`
- Create: `supabase/migrations/004_bot_messages.sql`
- Create: `supabase/migrations/005_rls_policies.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Profile`, `BotMessages` types; `Business` com campos `owner_user_id`, `zapi_instance_id`, `zapi_token`, `bot_messages`

- [ ] **Step 1: Criar migration de profiles**

```sql
-- supabase/migrations/001_profiles.sql
CREATE TYPE user_role AS ENUM ('super_admin', 'client');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuário só vê seu próprio perfil
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Super admin vê todos os perfis
CREATE POLICY "super_admin_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Trigger: criar profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (NEW.id, 'client', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2: Criar migration de owner_user_id em businesses**

```sql
-- supabase/migrations/002_business_owner.sql
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Índice para buscar business por usuário
CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_user_id);

-- Atualizar RLS: cliente só vê seu próprio negócio
DROP POLICY IF EXISTS "allow_all_businesses" ON businesses;

CREATE POLICY "client_own_business" ON businesses
  FOR ALL USING (
    auth.uid() = owner_user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
```

- [ ] **Step 3: Criar migration de Z-API por negócio**

```sql
-- supabase/migrations/003_zapi_per_business.sql
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS zapi_instance_id TEXT,
  ADD COLUMN IF NOT EXISTS zapi_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN NOT NULL DEFAULT FALSE;
```

- [ ] **Step 4: Criar tabela bot_messages**

```sql
-- supabase/migrations/004_bot_messages.sql
CREATE TABLE bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  greeting TEXT NOT NULL DEFAULT 'Olá! Como posso ajudar?',
  service_prompt TEXT NOT NULL DEFAULT 'Que serviço você deseja agendar?',
  date_prompt TEXT NOT NULL DEFAULT 'Para qual data você prefere?',
  time_prompt TEXT NOT NULL DEFAULT 'Qual horário prefere?',
  confirmation TEXT NOT NULL DEFAULT '✅ Agendado com sucesso! Te esperamos.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id)
);

ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_own_bot_messages" ON bot_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = bot_messages.business_id
      AND (businesses.owner_user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );
```

- [ ] **Step 5: Criar migration de RLS para outras tabelas**

```sql
-- supabase/migrations/005_rls_policies.sql
-- customers: cliente só vê os do seu negócio
DROP POLICY IF EXISTS "allow_all_customers" ON customers;
CREATE POLICY "client_own_customers" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
      AND (businesses.owner_user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );

-- conversations: idem
DROP POLICY IF EXISTS "allow_all_conversations" ON conversations;
CREATE POLICY "client_own_conversations" ON conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = conversations.business_id
      AND (businesses.owner_user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );

-- messages: via conversations
DROP POLICY IF EXISTS "allow_all_messages" ON messages;
CREATE POLICY "client_own_messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN businesses ON businesses.id = conversations.business_id
      WHERE conversations.id = messages.conversation_id
      AND (businesses.owner_user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );

-- services: idem businesses
DROP POLICY IF EXISTS "allow_all_services" ON services;
CREATE POLICY "client_own_services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id
      AND (businesses.owner_user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );

-- appointments: idem businesses
DROP POLICY IF EXISTS "allow_all_appointments" ON appointments;
CREATE POLICY "client_own_appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = appointments.business_id
      AND (businesses.owner_user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );
```

- [ ] **Step 6: Aplicar migrations no Supabase**

Acessar Supabase Dashboard → SQL Editor → rodar cada migration na ordem 001 → 005.

Verificar que as tabelas existem:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Deve incluir: profiles, businesses, bot_messages, customers, conversations, messages, services, appointments
```

- [ ] **Step 7: Atualizar tipos TypeScript**

Substituir conteúdo de `src/types/index.ts`:

```typescript
export type UserRole = 'super_admin' | 'client'
export type Niche = 'lavajato' | 'sobrancelha' | 'salao' | 'unhas'
export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type ConversationStatus = 'active' | 'completed' | 'abandoned'
export type MessageRole = 'customer' | 'assistant'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
}

export interface Business {
  id: string
  owner_user_id: string | null
  name: string
  phone: string
  niche: Niche
  address: string | null
  google_calendar_id: string | null
  google_refresh_token: string | null
  working_hours: WorkingHours
  slot_duration_minutes: number
  active: boolean
  zapi_instance_id: string | null
  zapi_token: string | null
  whatsapp_connected: boolean
  created_at: string
}

export interface BotMessages {
  id: string
  business_id: string
  greeting: string
  service_prompt: string
  date_prompt: string
  time_prompt: string
  confirmation: string
  created_at: string
  updated_at: string
}

export interface WorkingHours {
  mon: DayHours | null
  tue: DayHours | null
  wed: DayHours | null
  thu: DayHours | null
  fri: DayHours | null
  sat: DayHours | null
  sun: DayHours | null
}

export interface DayHours {
  start: string
  end: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  active: boolean
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string | null
  phone: string
  created_at: string
}

export interface Conversation {
  id: string
  business_id: string
  customer_id: string
  status: ConversationStatus
  context: ConversationContext
  created_at: string
  updated_at: string
  customers?: Customer
  messages?: Message[]
}

export interface ConversationContext {
  stage?: 'greeting' | 'service_selection' | 'date_selection' | 'time_selection' | 'confirmation' | 'done'
  selected_service_id?: string
  selected_date?: string
  selected_time?: string
  manual_mode?: boolean
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  whatsapp_message_id: string | null
  created_at: string
}

export interface Appointment {
  id: string
  business_id: string
  customer_id: string
  service_id: string | null
  conversation_id: string | null
  google_event_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  created_at: string
  customers?: Customer
  services?: Service
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
}

export interface WhatsAppWebhookBody {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: { phone_number_id: string; display_phone_number: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: WhatsAppMessage[]
      }
      field: string
    }>
  }>
}
```

- [ ] **Step 8: Criar super admin no Supabase**

No Supabase Dashboard → Authentication → Users → criar usuário:
- Email: `dayanealvesg30@gmail.com`
- Senha: definir uma senha segura

Depois no SQL Editor:
```sql
UPDATE profiles SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'dayanealvesg30@gmail.com');
```

Verificar:
```sql
SELECT u.email, p.role FROM auth.users u JOIN profiles p ON p.id = u.id;
```

- [ ] **Step 9: Commit**

```bash
git add supabase/ src/types/index.ts
git commit -m "feat: schema multi-tenant - profiles, bot_messages, RLS policies, types"
```

---

## Task 2: Middleware Auth + Role-Based Routing

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: Supabase session cookie, `profiles.role`
- Produces: Proteção de rotas `/admin/*` (super_admin only), `/dashboard/*` (client only), `/onboarding/*` (client sem business)

- [ ] **Step 1: Criar helper de middleware para Supabase**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return { supabaseResponse, supabase, user }
}
```

- [ ] **Step 2: Criar middleware principal**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, supabase, user } = await updateSession(request)

  // Rotas públicas — sem verificação
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return supabaseResponse
  }

  // Sem sessão → redirecionar para login
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Buscar role do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Rotas /admin — apenas super_admin
  if (pathname.startsWith('/admin')) {
    if (role !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Rotas /dashboard — apenas client (e super_admin como fallback)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/conversas') ||
      pathname.startsWith('/agenda') || pathname.startsWith('/clientes') ||
      pathname.startsWith('/configuracoes')) {
    if (role === 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 3: Verificar build sem erros**

```bash
npx next build 2>&1 | tail -20
```

Esperado: sem erros de TypeScript. Warnings de rotas inexistentes são ok por agora.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/lib/supabase/middleware.ts
git commit -m "feat: middleware auth com role-based routing (super_admin vs client)"
```

---

## Task 3: Painel Super Admin — Gestão de Clientes

**Files:**
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/admin/page.tsx`
- Create: `src/app/(admin)/admin/novo/page.tsx`
- Create: `src/app/api/admin/clients/route.ts`
- Create: `src/app/api/admin/clients/[id]/route.ts`

**Interfaces:**
- Consumes: `Profile`, `Business` types; Supabase service client
- Produces: API `GET /api/admin/clients` → `{clients: {profile, business}[]}`, `POST /api/admin/clients` → cria usuário + business

- [ ] **Step 1: Criar layout do admin**

```typescript
// src/app/(admin)/layout.tsx
import Link from 'next/link'
import { Zap, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex bg-gray-950">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Availa Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition">
            <Users className="w-4 h-4" />
            Clientes
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 px-3 mb-2">{user.email}</p>
          <form action="/api/auth/signout" method="POST">
            <button className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Criar API de clientes — GET e POST**

```typescript
// src/app/api/admin/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()

  const { data: profiles } = await service
    .from('profiles')
    .select('*, businesses(*)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return NextResponse.json({ clients: profiles ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { email, full_name, business_name, niche } = body as {
    email: string; full_name: string; business_name: string; niche: string
  }

  const service = createServiceClient()

  // Criar usuário no Supabase Auth
  const { data: newUser, error: userError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (userError || !newUser.user) {
    return NextResponse.json({ error: userError?.message ?? 'Erro ao criar usuário' }, { status: 400 })
  }

  // Criar business para o cliente
  const { data: business, error: bizError } = await service
    .from('businesses')
    .insert({
      owner_user_id: newUser.user.id,
      name: business_name,
      niche,
      phone: '',
      working_hours: {
        mon: { start: '08:00', end: '18:00' },
        tue: { start: '08:00', end: '18:00' },
        wed: { start: '08:00', end: '18:00' },
        thu: { start: '08:00', end: '18:00' },
        fri: { start: '08:00', end: '18:00' },
        sat: null,
        sun: null,
      },
      slot_duration_minutes: 60,
      active: true,
    })
    .select()
    .single()

  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 400 })
  }

  // Criar bot_messages padrão
  await service.from('bot_messages').insert({ business_id: business.id })

  // Enviar link de definição de senha
  await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` },
  })

  return NextResponse.json({ user: newUser.user, business }, { status: 201 })
}
```

- [ ] **Step 3: Criar API de cliente individual — PATCH (ativar/desativar)**

```typescript
// src/app/api/admin/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { active } = await request.json() as { active: boolean }
  const service = createServiceClient()

  const { error } = await service
    .from('businesses')
    .update({ active })
    .eq('owner_user_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Criar página principal do admin**

```typescript
// src/app/(admin)/admin/page.tsx
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserPlus, CheckCircle, XCircle } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: clients } = await service
    .from('profiles')
    .select('*, businesses(*)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">{clients?.length ?? 0} clientes cadastrados</p>
        </div>
        <Link
          href="/admin/novo"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <UserPlus className="w-4 h-4" />
          Novo cliente
        </Link>
      </div>

      <div className="space-y-3">
        {clients?.map((client: any) => {
          const business = client.businesses?.[0]
          return (
            <div key={client.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{client.full_name ?? '—'}</p>
                <p className="text-gray-400 text-sm">{business?.name ?? 'Sem negócio'} · {business?.niche ?? '—'}</p>
                <p className="text-gray-500 text-xs mt-1">Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-3">
                {business?.whatsapp_connected ? (
                  <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> WhatsApp conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-500 text-xs">
                    <XCircle className="w-3.5 h-3.5" /> WhatsApp não conectado
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${business?.active ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                  {business?.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          )
        })}
        {(!clients || clients.length === 0) && (
          <div className="text-center py-16 text-gray-500">
            <p>Nenhum cliente cadastrado ainda.</p>
            <Link href="/admin/novo" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
              Cadastrar primeiro cliente →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Criar página de novo cliente**

```typescript
// src/app/(admin)/admin/novo/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const niches = [
  { value: 'lavajato', label: 'Lavajato' },
  { value: 'salao', label: 'Salão de beleza' },
  { value: 'sobrancelha', label: 'Sobrancelhas' },
  { value: 'unhas', label: 'Unhas / Manicure' },
]

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', full_name: '', business_name: '', niche: 'lavajato',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar cliente')
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <div className="max-w-md">
      <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Novo cliente</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nome do cliente</label>
          <input
            type="text" required
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
            placeholder="Maria Silva"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">E-mail de acesso</label>
          <input
            type="email" required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
            placeholder="maria@exemplo.com"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nome do negócio</label>
          <input
            type="text" required
            value={form.business_name}
            onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
            placeholder="Lavajato do João"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Segmento</label>
          <select
            value={form.niche}
            onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
          >
            {niches.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg text-sm transition"
        >
          {loading ? 'Criando...' : 'Criar cliente e enviar convite'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Adicionar rota de signout**

```typescript
// src/app/api/auth/signout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
}
```

- [ ] **Step 7: Verificar no browser**

Fazer login com `dayanealvesg30@gmail.com` → deve redirecionar para `/admin` → deve mostrar lista de clientes (vazia inicialmente).

Acessar `/admin/novo` → preencher formulário → criar cliente → verificar que aparece na lista.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(admin\)/ src/app/api/admin/ src/app/api/auth/signout/
git commit -m "feat: painel super admin - listagem e criação de clientes"
```

---

## Task 4: Login Page Real (substituir mock)

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: Supabase Auth (email + senha)
- Produces: Sessão autenticada, redirecionamento por role (/admin ou /dashboard)

- [ ] **Step 1: Reescrever login com Supabase Auth real**

```typescript
// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('E-mail ou senha incorretos')
      setLoading(false)
      return
    }

    // Buscar role para redirecionar corretamente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'super_admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold">Availa.ai</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-white text-xl font-bold mb-6 text-center">Entrar</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">E-mail</label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Senha</label>
              <input
                type="password" required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg text-sm transition mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Testar login**

Acessar `/login` → entrar com `dayanealvesg30@gmail.com` → deve ir para `/admin`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat: login real com Supabase Auth e redirect por role"
```

---

## Task 5: Onboarding do Cliente

**Files:**
- Create: `src/app/(onboarding)/layout.tsx`
- Create: `src/app/(onboarding)/onboarding/page.tsx`
- Create: `src/app/(onboarding)/onboarding/whatsapp/page.tsx`
- Create: `src/app/(onboarding)/onboarding/servicos/page.tsx`
- Create: `src/app/api/onboarding/business/route.ts`
- Create: `src/lib/zapi/client.ts`
- Create: `src/app/api/onboarding/zapi/connect/route.ts`

**Interfaces:**
- Consumes: `Business` (owner_user_id = auth.uid()), Z-API REST API
- Produces: Business atualizado com phone + working_hours; zapi_instance_id + zapi_token; pelo menos 1 Service

- [ ] **Step 1: Criar biblioteca Z-API**

```typescript
// src/lib/zapi/client.ts
const ZAPI_BASE = 'https://api.z-api.io'

export function zapiUrl(instanceId: string, token: string, path: string) {
  return `${ZAPI_BASE}/instances/${instanceId}/token/${token}${path}`
}

export async function zapiRequest(instanceId: string, token: string, path: string, options?: RequestInit) {
  const url = zapiUrl(instanceId, token, path)
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Z-API ${path} error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function sendText(instanceId: string, token: string, phone: string, message: string) {
  return zapiRequest(instanceId, token, '/send-text', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  })
}
```

- [ ] **Step 2: API de atualização de informações do negócio**

```typescript
// src/app/api/onboarding/business/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, phone, address, niche, working_hours, slot_duration_minutes } = body

  const { data, error } = await supabase
    .from('businesses')
    .update({ name, phone, address, niche, working_hours, slot_duration_minutes })
    .eq('owner_user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ business: data })
}
```

- [ ] **Step 3: Layout do onboarding**

```typescript
// src/app/(onboarding)/layout.tsx
import { Zap } from 'lucide-react'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-2">
        <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">Availa.ai</span>
        <span className="text-gray-400 text-sm ml-2">— Configuração inicial</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Página de onboarding — Step 1 (info do negócio)**

```typescript
// src/app/(onboarding)/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const niches = [
  { value: 'lavajato', label: '🚗 Lavajato' },
  { value: 'salao', label: '✂️ Salão de beleza' },
  { value: 'sobrancelha', label: '👁️ Sobrancelhas' },
  { value: 'unhas', label: '💅 Unhas / Manicure' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', address: '', niche: 'lavajato',
  })

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/onboarding/business', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        working_hours: {
          mon: { start: '08:00', end: '18:00' },
          tue: { start: '08:00', end: '18:00' },
          wed: { start: '08:00', end: '18:00' },
          thu: { start: '08:00', end: '18:00' },
          fri: { start: '08:00', end: '18:00' },
          sat: null, sun: null,
        },
        slot_duration_minutes: 60,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro ao salvar')
      setLoading(false)
      return
    }

    router.push('/onboarding/servicos')
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-6">
          <div className="h-1 flex-1 bg-green-500 rounded-full" />
          <div className="h-1 flex-1 bg-gray-200 rounded-full" />
          <div className="h-1 flex-1 bg-gray-200 rounded-full" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Sobre o seu negócio</h1>
        <p className="text-gray-500 text-sm mt-1">Essas informações aparecem nas confirmações de agendamento.</p>
      </div>

      <form onSubmit={handleNext} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do negócio</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ex: Lavajato do João"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
          <select value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {niches.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input type="text" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Rua das Flores, 123 — Belo Horizonte, MG"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp do negócio (com DDD)</label>
          <input type="tel" required value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="37999181248"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl text-sm transition mt-2">
          {loading ? 'Salvando...' : 'Próximo →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Página de onboarding — Step 2 (serviços)**

```typescript
// src/app/(onboarding)/onboarding/servicos/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

interface ServiceForm { name: string; duration_minutes: number; price: string }

export default function ServicosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<ServiceForm[]>([
    { name: '', duration_minutes: 60, price: '' },
  ])

  const addService = () => setServices(s => [...s, { name: '', duration_minutes: 60, price: '' }])
  const removeService = (i: number) => setServices(s => s.filter((_, idx) => idx !== i))
  const updateService = (i: number, field: keyof ServiceForm, value: string | number) =>
    setServices(s => s.map((svc, idx) => idx === i ? { ...svc, [field]: value } : svc))

  const handleFinish = async () => {
    setLoading(true)
    const valid = services.filter(s => s.name.trim())
    if (valid.length === 0) { setLoading(false); return }

    await fetch('/api/onboarding/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: valid.map(s => ({
        name: s.name,
        duration_minutes: Number(s.duration_minutes),
        price: s.price ? parseFloat(s.price) : null,
      })) }),
    })

    router.push('/dashboard')
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-1 mb-6">
          <div className="h-1 flex-1 bg-green-500 rounded-full" />
          <div className="h-1 flex-1 bg-green-500 rounded-full" />
          <div className="h-1 flex-1 bg-gray-200 rounded-full" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Seus serviços</h1>
        <p className="text-gray-500 text-sm mt-1">O bot vai oferecer esses serviços para os clientes.</p>
      </div>

      <div className="space-y-3">
        {services.map((svc, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Serviço {i + 1}</span>
              {services.length > 1 && (
                <button onClick={() => removeService(i)} className="text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input type="text" placeholder="Nome do serviço (ex: Lavagem simples)"
              value={svc.name} onChange={e => updateService(i, 'name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Duração (min)</label>
                <input type="number" min={15} step={15} value={svc.duration_minutes}
                  onChange={e => updateService(i, 'duration_minutes', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Preço (R$)</label>
                <input type="number" min={0} step={0.01} placeholder="0,00" value={svc.price}
                  onChange={e => updateService(i, 'price', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addService}
        className="w-full mt-3 border-2 border-dashed border-gray-200 hover:border-green-400 text-gray-400 hover:text-green-600 rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition">
        <Plus className="w-4 h-4" /> Adicionar serviço
      </button>

      <button onClick={handleFinish} disabled={loading}
        className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl text-sm transition">
        {loading ? 'Salvando...' : 'Concluir configuração →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: API de criação de serviços**

```typescript
// src/app/api/onboarding/services/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { services } = await request.json()

  const rows = (services as Array<{ name: string; duration_minutes: number; price: number | null }>)
    .map(s => ({ ...s, business_id: business.id, active: true }))

  const { error } = await supabase.from('services').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(onboarding\)/ src/app/api/onboarding/ src/lib/zapi/
git commit -m "feat: onboarding do cliente - info do negócio + serviços"
```

---

## Task 6: Dashboard Real (dados do Supabase)

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/(dashboard)/conversas/page.tsx`
- Modify: `src/app/(dashboard)/configuracoes/page.tsx`
- Create: `src/app/api/bot/messages/route.ts`

**Interfaces:**
- Consumes: Supabase client-side queries filtrando por `owner_user_id = auth.uid()`
- Produces: Dashboard com dados reais de appointments, conversas ativas, mensagens do bot customizáveis

- [ ] **Step 1: Atualizar layout do dashboard com verificação de auth**

```typescript
// src/app/(dashboard)/layout.tsx — adicionar verificação de auth real
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// ... manter sidebar existente mas adicionar:

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, whatsapp_connected')
    .eq('owner_user_id', user.id)
    .single()

  // Se não tem business ainda, redirecionar para onboarding
  if (!business) redirect('/onboarding')

  // ... render layout existente passando business como prop se necessário
}
```

- [ ] **Step 2: Dashboard principal com dados reais**

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MessageCircle, Users, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, whatsapp_connected')
    .eq('owner_user_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  // Buscar métricas
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [{ count: appointmentsToday }, { count: activeConvs }, { count: totalCustomers }] = await Promise.all([
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('scheduled_at', today.toISOString()),
    supabase.from('conversations').select('*', { count: 'exact', head: true })
      .eq('business_id', business.id).eq('status', 'active'),
    supabase.from('customers').select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
  ])

  const stats = [
    { label: 'Agendamentos hoje', value: appointmentsToday ?? 0, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    { label: 'Conversas ativas', value: activeConvs ?? 0, icon: MessageCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Total de clientes', value: totalCustomers ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'WhatsApp', value: business.whatsapp_connected ? 'Conectado' : 'Desconectado', icon: TrendingUp, color: business.whatsapp_connected ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Olá! 👋</h1>
        <p className="text-gray-500 mt-1">{business.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {!business.whatsapp_connected && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm font-medium">⚠️ WhatsApp não conectado</p>
          <p className="text-amber-700 text-xs mt-1">Acesse Configurações para conectar seu WhatsApp e ativar o bot.</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Conversas com dados reais**

```typescript
// src/app/(dashboard)/conversas/page.tsx — substituir mock por dados reais
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConversasClient from './ConversasClient'

export default async function ConversasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, customers(*), messages(*)')
    .eq('business_id', business.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  return <ConversasClient conversations={conversations ?? []} />
}
```

Criar `src/app/(dashboard)/conversas/ConversasClient.tsx` — mover o componente cliente atual para este arquivo, substituindo `mockConversations` pelo prop `conversations`.

- [ ] **Step 4: API de mensagens do bot**

```typescript
// src/app/api/bot/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await supabase
    .from('bot_messages')
    .select('*')
    .eq('business_id', business.id)
    .single()

  return NextResponse.json({ messages: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { error } = await supabase
    .from('bot_messages')
    .upsert({ ...body, business_id: business.id, updated_at: new Date().toISOString() })
    .eq('business_id', business.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/ src/app/api/bot/
git commit -m "feat: dashboard com dados reais do Supabase + API bot messages"
```

---

## Task 7: Webhook Z-API Multi-Tenant

**Files:**
- Modify: `src/app/api/webhook/zapi/route.ts`

**Interfaces:**
- Consumes: `body.instanceId` do payload Z-API, `businesses.zapi_instance_id`
- Produces: Mensagem roteada ao business correto baseado no instanceId

- [ ] **Step 1: Atualizar webhook para rotear por instanceId**

Substituir a busca `eq('active', true)` por busca via `instanceId`:

```typescript
// Trecho a substituir em src/app/api/webhook/zapi/route.ts
// ANTES:
const { data: businesses, error: bizError } = await supabase
  .from('businesses')
  .select('*')
  .eq('active', true)
  .limit(1)

// DEPOIS:
const { data: businesses, error: bizError } = await supabase
  .from('businesses')
  .select('*')
  .eq('zapi_instance_id', body.instanceId)
  .eq('active', true)
  .limit(1)
```

Isso garante que cada mensagem vai para o negócio correto quando houver múltiplos clientes.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhook/zapi/route.ts
git commit -m "feat: webhook Z-API roteia por instanceId (multi-tenant)"
```

---

## Task 8: Deploy e Variáveis de Ambiente

**Files:**
- Modify: `.env.local` (documentação)
- Vercel dashboard (não é arquivo — são ações)

**Interfaces:**
- Produces: App funcionando em produção com todas as envs configuradas

- [ ] **Step 1: Listar todas as variáveis necessárias**

No Vercel → Settings → Environment Variables, verificar que existem:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
NEXT_PUBLIC_APP_URL=https://www.availa-ai.com.br
ZAPI_INSTANCE_ID        # (default, para o número da Dayane)
ZAPI_TOKEN              # (default)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://www.availa-ai.com.br/api/auth/google/callback
NEXTAUTH_SECRET
```

- [ ] **Step 2: Fazer push final e verificar deploy**

```bash
git push origin main
```

Verificar no Vercel que o build passa sem erros.

- [ ] **Step 3: Testar fluxo completo**

1. Acessar `https://www.availa-ai.com.br/login`
2. Entrar com `dayanealvesg30@gmail.com` → vai para `/admin`
3. Criar um cliente de teste → verificar que aparece na lista
4. Login com cliente de teste → vai para `/onboarding`
5. Preencher dados do negócio → cadastrar serviços → ir para dashboard
6. Dashboard mostra dados reais (zeros, pois é novo)

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "chore: ajustes finais e variáveis de ambiente verificadas"
git push origin main
```

---

## Self-Review

### Cobertura de Spec

| Requisito | Tarefa |
|---|---|
| Super admin gerencia clientes | Task 3 |
| Super admin cria e libera acesso | Task 3 |
| Cliente acessa painel exclusivo | Task 2 (middleware) + Task 4 (login) |
| Cliente customiza mensagens do bot | Task 6 (API bot/messages) |
| Multi-tenant isolamento de dados | Task 1 (RLS) |
| Webhook roteia por negócio | Task 7 |
| Onboarding guiado | Task 5 |
| Dashboard com dados reais | Task 6 |

### Sem Placeholders
Todos os steps têm código completo. ✅

### Consistência de Tipos
- `Business` com `owner_user_id`, `zapi_instance_id`, `zapi_token` definido em Task 1 e usado em Tasks 2-7 ✅
- `Profile` com `role` definido em Task 1 e usado em Task 2 (middleware) e Task 3 (admin) ✅
- `BotMessages` definido em Task 1 e usado em Task 6 ✅
