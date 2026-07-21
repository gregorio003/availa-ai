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

// Ativa/desativa o acesso de um estabelecimento. `id` = business.id
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await request.json()
  const service = createServiceClient()

  const allowed: Record<string, unknown> = {}
  if (typeof body.active === 'boolean') allowed.active = body.active
  if (typeof body.commission_pct === 'number') allowed.commission_pct = body.commission_pct
  if (typeof body.subscription_valid_until === 'string' || body.subscription_valid_until === null)
    allowed.subscription_valid_until = body.subscription_valid_until

  const { error } = await service.from('businesses').update(allowed).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
