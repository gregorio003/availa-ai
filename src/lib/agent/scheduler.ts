import Groq from 'groq-sdk'
import { addMinutes, format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAvailableSlots, createAppointment } from '@/lib/calendar/google'
import type { Business, Service, Conversation, ConversationContext } from '@/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface AgentInput {
  business: Business
  services: Service[]
  conversation: Conversation
  customerName: string | null
  customerMessage: string
}

interface AgentOutput {
  reply: string
  updatedContext: ConversationContext
  appointmentCreated?: {
    scheduled_at: string
    duration_minutes: number
    service_id: string
    google_event_id: string
  }
}

export async function runSchedulingAgent(input: AgentInput): Promise<AgentOutput> {
  const { business, services, conversation, customerName, customerMessage } = input
  const context = conversation.context as ConversationContext

  const servicesText = services
    .map((s, i) => `${i + 1}. ${s.name}${s.price ? ` - R$ ${s.price.toFixed(2)}` : ''} (${s.duration_minutes} min)`)
    .join('\n')

  const systemPrompt = `Você é um assistente de agendamento do ${business.name}, um ${getNicheName(business.niche)}.
Sua função é ajudar clientes a agendar serviços de forma simples e amigável pelo WhatsApp.

SERVIÇOS DISPONÍVEIS:
${servicesText}

ENDEREÇO: ${business.address || 'A confirmar'}

INSTRUÇÕES:
- Seja sempre cordial e use linguagem informal (tutear)
- Mensagens curtas e objetivas (máximo 3 linhas)
- Colete: qual serviço, qual data preferida
- Depois mostre os horários disponíveis
- Confirme o agendamento de forma clara
- Use emojis com moderação 🙂

CONTEXTO ATUAL DA CONVERSA:
${JSON.stringify(context, null, 2)}

DATA/HORA ATUAL: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

Responda APENAS com JSON no formato:
{
  "reply": "mensagem para o cliente",
  "stage": "greeting|service_selection|date_selection|time_selection|confirmation|done",
  "selected_service_id": "id do serviço ou null",
  "selected_date": "YYYY-MM-DD ou null",
  "selected_time": "HH:MM ou null",
  "request_available_slots": true/false,
  "confirm_booking": true/false
}`

  const messages = conversation.messages?.map(m => ({
    role: m.role === 'customer' ? 'user' as const : 'assistant' as const,
    content: m.content,
  })) ?? []

  messages.push({ role: 'user', content: customerMessage })

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 500,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  const rawText = response.choices[0]?.message?.content ?? '{}'

  let parsed: {
    reply: string
    stage: ConversationContext['stage']
    selected_service_id?: string
    selected_date?: string
    selected_time?: string
    request_available_slots?: boolean
    confirm_booking?: boolean
  }

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
  } catch {
    return {
      reply: 'Desculpe, tive um problema. Pode repetir?',
      updatedContext: context,
    }
  }

  const updatedContext: ConversationContext = {
    ...context,
    stage: parsed.stage ?? context.stage,
    selected_service_id: parsed.selected_service_id ?? context.selected_service_id,
    selected_date: parsed.selected_date ?? context.selected_date,
    selected_time: parsed.selected_time ?? context.selected_time,
  }

  // Se o agente quer mostrar slots disponíveis
  if (parsed.request_available_slots && updatedContext.selected_date) {
    const date = parseISO(updatedContext.selected_date)
    if (isValid(date)) {
      const service = services.find(s => s.id === updatedContext.selected_service_id)
      const duration = service?.duration_minutes ?? business.slot_duration_minutes
      const slots = await getAvailableSlots(business, date, duration)

      if (slots.length === 0) {
        return {
          reply: `Não temos horários disponíveis em ${format(date, 'dd/MM', { locale: ptBR })}. Quer tentar outro dia?`,
          updatedContext: { ...updatedContext, selected_date: undefined },
        }
      }

      const slotList = slots.slice(0, 5).map((s, i) => `${i + 1}. ${s.label}`).join('\n')
      return {
        reply: `Horários disponíveis:\n${slotList}\n\nQual prefere? (responda o número)`,
        updatedContext,
      }
    }
  }

  // Se o agente quer confirmar o agendamento
  if (parsed.confirm_booking && updatedContext.selected_service_id && updatedContext.selected_date && updatedContext.selected_time) {
    const service = services.find(s => s.id === updatedContext.selected_service_id)
    if (service) {
      const date = parseISO(updatedContext.selected_date)
      const [hour, min] = updatedContext.selected_time.split(':').map(Number)
      date.setHours(hour, min, 0, 0)

      const endDate = new Date(date)
      endDate.setMinutes(endDate.getMinutes() + service.duration_minutes)

      const googleEventId = await createAppointment(
        business,
        customerName ?? 'Cliente',
        service.name,
        date.toISOString(),
        endDate.toISOString()
      )

      return {
        reply: parsed.reply,
        updatedContext: { ...updatedContext, stage: 'done' },
        appointmentCreated: {
          scheduled_at: date.toISOString(),
          duration_minutes: service.duration_minutes,
          service_id: service.id,
          google_event_id: googleEventId,
        },
      }
    }
  }

  return { reply: parsed.reply, updatedContext }
}

function getNicheName(niche: string): string {
  const names: Record<string, string> = {
    lavajato: 'lavajato',
    sobrancelha: 'estúdio de design de sobrancelhas',
    salao: 'salão de beleza',
    unhas: 'estúdio de unhas',
  }
  return names[niche] ?? 'prestador de serviços'
}
