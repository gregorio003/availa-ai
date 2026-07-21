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

function randomPassword() {
  return 'Availa' + Math.random().toString(36).slice(2, 8) + '!'
}

// Reseta a senha do dono do estabelecimento. `id` = business.id
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const service = createServiceClient()

  const { data: business } = await service.from('businesses').select('owner_user_id').eq('id', id).single()
  const ownerId = business?.owner_user_id as string | null
  if (!ownerId) return NextResponse.json({ error: 'Cliente sem usuário vinculado' }, { status: 400 })

  const password = randomPassword()
  const { error } = await service.auth.admin.updateUserById(ownerId, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ password })
}
