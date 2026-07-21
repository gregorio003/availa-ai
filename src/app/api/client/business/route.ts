import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cliente edita o próprio negócio (RLS garante que só mexe no dele)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const fields = ['name', 'address', 'phone', 'niche', 'slot_duration_minutes', 'working_hours']
  const updates: Record<string, unknown> = {}
  for (const f of fields) if (f in body) updates[f] = body[f]

  const { error } = await supabase.from('businesses').update(updates).eq('owner_user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
