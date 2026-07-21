import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Forbidden', status: 403 as const }
  return { user }
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const service = createServiceClient()
  const { data: businesses } = await service
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ clients: businesses ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const { email, password, full_name, business_name, niche, commission_pct, subscription_valid_until } = body as {
    email: string
    password: string
    full_name: string
    business_name: string
    niche: string
    commission_pct: number
    subscription_valid_until: string | null
  }

  if (!email || !password || !business_name) {
    return NextResponse.json({ error: 'E-mail, senha e nome do negócio são obrigatórios' }, { status: 400 })
  }

  const service = createServiceClient()

  // 1) Cria o usuário do cliente no Supabase Auth (já confirmado)
  const { data: created, error: userError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (userError || !created.user) {
    return NextResponse.json({ error: userError?.message ?? 'Erro ao criar usuário' }, { status: 400 })
  }

  // 2) Cria o estabelecimento do cliente
  const { data: business, error: bizError } = await service
    .from('businesses')
    .insert({
      owner_user_id: created.user.id,
      name: business_name,
      niche: niche || 'lavajato',
      commission_pct: commission_pct ?? 0,
      subscription_valid_until: subscription_valid_until,
      active: true,
    })
    .select()
    .single()

  if (bizError) {
    // rollback do usuário para não deixar órfão
    await service.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: bizError.message }, { status: 400 })
  }

  // 3) Cria as mensagens padrão do bot para esse negócio
  await service.from('bot_messages').insert({ business_id: business.id })

  return NextResponse.json({ business, userId: created.user.id }, { status: 201 })
}
