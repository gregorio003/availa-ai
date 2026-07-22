import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runBotTurn, type BotContext } from '@/lib/agent/bot'
import type { BusyInterval } from '@/lib/agent/availability'
import { brazilDayBoundsISO, brazilMinutesOfDay } from '@/lib/utils/time'
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
  const serviceList = (services ?? []) as Service[]

  const body = await request.json()
  const history: { role: 'user' | 'assistant'; content: string }[] = body.history ?? []
  const message: string = body.message ?? ''
  const context: BotContext = body.context ?? {}

  // Disponibilidade usa os agendamentos REAIS do dia (horário do Brasil)
  const getBusyForDate = async (dateISO: string): Promise<BusyInterval[]> => {
    const { start, end } = brazilDayBoundsISO(dateISO)
    const { data: appts } = await supabase
      .from('appointments')
      .select('scheduled_at,duration_minutes,status')
      .eq('business_id', business.id)
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .neq('status', 'cancelled')
    return (appts ?? []).map((a) => {
      const startMin = brazilMinutesOfDay(new Date(a.scheduled_at as string))
      return { startMin, endMin: startMin + (a.duration_minutes as number) }
    })
  }

  try {
    const result = await runBotTurn({
      business,
      services: serviceList,
      botMessages: (botMessages ?? null) as BotMessages | null,
      history,
      userMessage: message,
      context,
      getBusyForDate,
    })

    // Se o bot confirmou, GRAVA o agendamento de verdade
    if (result.booking) {
      const service = serviceList.find((s) => s.id === result.booking!.service_id)
      const price = service?.price != null ? Number(service.price) : null
      const commission = price != null ? Number(((price * Number(business.commission_pct)) / 100).toFixed(2)) : null

      const collected = result.booking.collected ?? {}
      const collectedName = collected.name || 'Cliente (simulação)'
      const extraNotes = Object.entries(collected)
        .filter(([k]) => k !== 'name')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
      const notes = ['Simulação (Testar bot)', extraNotes].filter(Boolean).join(' — ')

      // cliente de simulação (reutilizado por telefone único)
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', business.id)
        .eq('phone', 'simulacao')
        .maybeSingle()
      if (!customer) {
        const { data: c } = await supabase
          .from('customers')
          .insert({ business_id: business.id, phone: 'simulacao', name: collectedName })
          .select('id')
          .single()
        customer = c
      } else if (collected.name) {
        await supabase.from('customers').update({ name: collectedName }).eq('id', customer.id)
      }

      // evita duplicar se a IA confirmar em mais de uma mensagem
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('business_id', business.id)
        .eq('service_id', result.booking.service_id)
        .eq('scheduled_at', result.booking.scheduled_at)
        .neq('status', 'cancelled')
        .maybeSingle()

      if (customer && !existing) {
        await supabase.from('appointments').insert({
          business_id: business.id,
          customer_id: customer.id,
          service_id: result.booking.service_id,
          scheduled_at: result.booking.scheduled_at,
          duration_minutes: result.booking.duration_minutes,
          status: 'confirmed',
          price,
          commission_amount: commission,
          notes,
        })
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no agente' }, { status: 500 })
  }
}
