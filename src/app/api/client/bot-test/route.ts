import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runBotTurn, type BotContext } from '@/lib/agent/bot'
import type { BusyInterval } from '@/lib/agent/availability'
import type { Business, Service, BotMessages } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = (await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()) as { data: Business | null }
  if (!business) return NextResponse.json({ error: 'Sem negócio' }, { status: 404 })

  const [{ data: services }, { data: botMessages }] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('active', true),
    supabase.from('bot_messages').select('*').eq('business_id', business.id).maybeSingle(),
  ])

  const body = await request.json()
  const history: { role: 'user' | 'assistant'; content: string }[] = body.history ?? []
  const message: string = body.message ?? ''
  const context: BotContext = body.context ?? {}

  // Disponibilidade usa os agendamentos REAIS do dia (mas o teste não cria nenhum)
  const getBusyForDate = async (dateISO: string): Promise<BusyInterval[]> => {
    const start = new Date(dateISO + 'T00:00:00')
    const end = new Date(dateISO + 'T23:59:59')
    const { data: appts } = await supabase
      .from('appointments')
      .select('scheduled_at,duration_minutes,status')
      .eq('business_id', business.id)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .neq('status', 'cancelled')
    return (appts ?? []).map((a) => {
      const d = new Date(a.scheduled_at as string)
      const startMin = d.getHours() * 60 + d.getMinutes()
      return { startMin, endMin: startMin + (a.duration_minutes as number) }
    })
  }

  try {
    const result = await runBotTurn({
      business,
      services: (services ?? []) as Service[],
      botMessages: (botMessages ?? null) as BotMessages | null,
      history,
      userMessage: message,
      context,
      getBusyForDate,
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no agente' }, { status: 500 })
  }
}
