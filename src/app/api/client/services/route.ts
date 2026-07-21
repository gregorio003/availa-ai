import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cria um serviço no negócio do cliente logado
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'Sem negócio' }, { status: 404 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('services')
    .insert({
      business_id: business.id,
      name: body.name ?? 'Novo serviço',
      duration_minutes: Number(body.duration_minutes) || 60,
      price: body.price != null ? Number(body.price) : null,
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ service: data }, { status: 201 })
}
