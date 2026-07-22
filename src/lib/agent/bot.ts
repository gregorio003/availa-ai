import Groq from 'groq-sdk'
import { computeAvailableSlots, weekdayKey, type BusyInterval } from './availability'
import type { Business, Service, BotMessages, WorkingHours } from '@/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export interface BotContext {
  stage?: 'greeting' | 'service_selection' | 'date_selection' | 'time_selection' | 'confirmation' | 'done'
  selected_service_id?: string
  selected_date?: string
  selected_time?: string
}

export interface BotTurnInput {
  business: Business
  services: Service[]
  botMessages: BotMessages | null
  history: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  context: BotContext
  getBusyForDate: (dateISO: string) => Promise<BusyInterval[]>
}

export interface BotTurnOutput {
  reply: string
  context: BotContext
  booking?: { service_id: string; scheduled_at: string; duration_minutes: number }
}

const nicheName: Record<string, string> = {
  lavajato: 'lavajato',
  sobrancelha: 'estúdio de design de sobrancelhas',
  salao: 'salão de beleza',
  unhas: 'estúdio de unhas',
}

function todayInfo() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return { iso: `${now.getFullYear()}-${mm}-${dd}`, now }
}

async function slotsForDate(
  business: Business,
  service: Service | undefined,
  dateISO: string,
  getBusy: (d: string) => Promise<BusyInterval[]>
) {
  const date = new Date(dateISO + 'T00:00:00')
  const window = (business.working_hours as WorkingHours)[weekdayKey(date)] ?? null
  const busy = await getBusy(dateISO)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : null
  return computeAvailableSlots({
    window,
    serviceDurationMin: service?.duration_minutes ?? business.slot_duration_minutes,
    stepMin: business.slot_duration_minutes,
    rules: { employeeCount: business.employee_count, maxPerHour: business.max_appointments_per_hour },
    busy,
    nowMin,
  })
}

export async function runBotTurn(input: BotTurnInput): Promise<BotTurnOutput> {
  const { business, services, botMessages, history, userMessage, context, getBusyForDate } = input
  const { iso: todayISO, now } = todayInfo()

  const servicesText = services
    .map((s, i) => `${i + 1}. [id:${s.id}] ${s.name}${s.price ? ` - R$ ${Number(s.price).toFixed(2)}` : ''} (${s.duration_minutes} min)`)
    .join('\n')

  const tone = botMessages?.greeting
    ? `Estilo de saudação do negócio (use como referência de tom): "${botMessages.greeting}"`
    : ''

  const systemPrompt = `Você é o atendente virtual de "${business.name}", um ${nicheName[business.niche] ?? 'prestador de serviços'}.
Ajude o cliente a agendar de forma simples e amigável, como no WhatsApp. Trate por "você", mensagens curtas (máx 3 linhas), emojis com moderação.
${tone}

SERVIÇOS:
${servicesText || '(nenhum serviço cadastrado)'}
ENDEREÇO: ${business.address || 'a confirmar'}
DATA/HORA ATUAL: ${now.toLocaleString('pt-BR')} (hoje = ${todayISO})

Fluxo: descubra o SERVIÇO, depois a DATA (YYYY-MM-DD), depois mostre HORÁRIOS reais, depois confirme.
NUNCA invente horários — quando tiver serviço e data, peça os horários com "request_slots": true.

Responda SOMENTE com JSON:
{
 "reply": "mensagem ao cliente",
 "stage": "greeting|service_selection|date_selection|time_selection|confirmation|done",
 "selected_service_id": "id ou null",
 "selected_date": "YYYY-MM-DD ou null",
 "selected_time": "HH:MM ou null",
 "request_slots": true/false,
 "confirm_booking": true/false
}`

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  let parsed: {
    reply?: string
    stage?: BotContext['stage']
    selected_service_id?: string | null
    selected_date?: string | null
    selected_time?: string | null
    request_slots?: boolean
    confirm_booking?: boolean
  } = {}

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.3,
      messages,
    })
    const raw = res.choices[0]?.message?.content ?? '{}'
    parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
  } catch {
    return { reply: 'Desculpe, tive um probleminha. Pode repetir? 🙂', context }
  }

  const next: BotContext = {
    stage: parsed.stage ?? context.stage,
    selected_service_id: parsed.selected_service_id ?? context.selected_service_id,
    selected_date: parsed.selected_date ?? context.selected_date,
    selected_time: parsed.selected_time ?? context.selected_time,
  }

  // Mostrar horários REAIS calculados pelo motor
  if (parsed.request_slots && next.selected_date) {
    const service = services.find((s) => s.id === next.selected_service_id)
    const slots = await slotsForDate(business, service, next.selected_date, getBusyForDate)
    if (slots.length === 0) {
      return {
        reply: 'Poxa, não temos horários livres nesse dia. 😕 Quer tentar outra data?',
        context: { ...next, selected_date: undefined, stage: 'date_selection' },
      }
    }
    const list = slots.slice(0, 6).map((s, i) => `${i + 1}. ${s.time}`).join('\n')
    return {
      reply: `Horários disponíveis:\n${list}\n\nQual prefere? (responda o número ou o horário)`,
      context: { ...next, stage: 'time_selection' },
    }
  }

  // Confirmar agendamento
  if (parsed.confirm_booking && next.selected_service_id && next.selected_date && next.selected_time) {
    const service = services.find((s) => s.id === next.selected_service_id)
    if (service) {
      const [h, m] = next.selected_time.split(':').map(Number)
      const dt = new Date(next.selected_date + 'T00:00:00')
      dt.setHours(h || 0, m || 0, 0, 0)
      return {
        reply: parsed.reply || botMessages?.confirmation || '✅ Agendado com sucesso! Te esperamos. 😊',
        context: { ...next, stage: 'done' },
        booking: { service_id: service.id, scheduled_at: dt.toISOString(), duration_minutes: service.duration_minutes },
      }
    }
  }

  return { reply: parsed.reply || 'Certo! 🙂', context: next }
}
