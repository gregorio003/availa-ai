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

// Edita um estabelecimento (e opcionalmente dados do dono). `id` = business.id
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await request.json()
  const service = createServiceClient()

  // Campos do negócio que podem ser editados
  const businessFields = [
    'name', 'niche', 'address', 'phone', 'plan', 'commission_pct',
    'subscription_status', 'subscription_valid_until', 'employee_count',
    'max_appointments_per_hour', 'requires_advance', 'advance_amount', 'active',
  ]
  const updates: Record<string, unknown> = {}
  for (const f of businessFields) {
    if (f in body) updates[f] = body[f]
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await service.from('businesses').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Buscar o dono para atualizar nome/email se enviados
  const { data: business } = await service.from('businesses').select('owner_user_id').eq('id', id).single()
  const ownerId = business?.owner_user_id as string | null

  if (ownerId) {
    if (typeof body.full_name === 'string') {
      await service.from('profiles').update({ full_name: body.full_name }).eq('id', ownerId)
    }
    if (typeof body.email === 'string' && body.email) {
      const { error: emailErr } = await service.auth.admin.updateUserById(ownerId, { email: body.email })
      if (emailErr) return NextResponse.json({ error: `E-mail: ${emailErr.message}` }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}

// Remove o cliente por completo (negócio + usuário)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const service = createServiceClient()

  const { data: business } = await service.from('businesses').select('owner_user_id').eq('id', id).single()
  const ownerId = business?.owner_user_id as string | null

  // Apaga o negócio (cascata: serviços, conversas, mensagens, agendamentos, bot_messages)
  await service.from('businesses').delete().eq('id', id)

  // Apaga o usuário do dono (cascata: profile)
  if (ownerId) {
    await service.auth.admin.deleteUser(ownerId)
  }

  return NextResponse.json({ ok: true })
}
