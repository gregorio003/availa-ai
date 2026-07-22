import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = ['confirmed', 'completed', 'cancelled', 'no_show']

// Atualiza o status de um agendamento (RLS garante que é do negócio do cliente)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if ('status' in body) {
    if (!ALLOWED.includes(body.status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    updates.status = body.status
  }
  if ('paid' in body) updates.paid = !!body.paid

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const { error } = await supabase.from('appointments').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
