import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('businesses').select('id').eq('owner_user_id', userId).maybeSingle()
  return data?.id as string | undefined
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = await getBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'Sem negócio' }, { status: 404 })

  const { data } = await supabase.from('bot_messages').select('*').eq('business_id', businessId).maybeSingle()
  return NextResponse.json({ messages: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = await getBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'Sem negócio' }, { status: 404 })

  const body = await request.json()
  const fields = ['greeting', 'service_prompt', 'date_prompt', 'time_prompt', 'confirmation', 'advance_message', 'persona', 'return_message']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const f of fields) if (typeof body[f] === 'string') updates[f] = body[f]
  if (Array.isArray(body.collect_fields)) updates.collect_fields = body.collect_fields

  const { error } = await supabase.from('bot_messages').update(updates).eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
