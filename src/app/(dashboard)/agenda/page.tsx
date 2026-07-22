import { redirect } from 'next/navigation'
import { Calendar, Clock, User } from 'lucide-react'
import { getCurrentUserAndBusiness } from '@/lib/auth/business'
import { brazilDayBoundsISO, nowInBrazil } from '@/lib/utils/time'

export const dynamic = 'force-dynamic'

interface ApptRow {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  price: number | null
  notes: string | null
  services: { name: string } | null
  customers: { name: string | null; phone: string } | null
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long' })
const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

export default async function AgendaPage() {
  const { user, business, supabase } = await getCurrentUserAndBusiness()
  if (!user) redirect('/login')
  if (!business) redirect('/login')

  const { start } = brazilDayBoundsISO(nowInBrazil().iso)
  const { data } = (await supabase
    .from('appointments')
    .select('id,scheduled_at,duration_minutes,status,price,notes,services(name),customers(name,phone)')
    .eq('business_id', business.id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', start)
    .order('scheduled_at', { ascending: true })) as { data: ApptRow[] | null }

  const appts = data ?? []

  // Agrupa por dia (horário BR)
  const groups = new Map<string, ApptRow[]>()
  for (const a of appts) {
    const k = dayKey(a.scheduled_at)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(a)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
        <p className="text-gray-500 text-sm mt-1">Próximos agendamentos do seu negócio.</p>
      </div>

      {appts.length === 0 ? (
        <div className="text-center py-20 text-gray-500 border border-dashed border-gray-300 dark:border-white/10 rounded-2xl">
          <Calendar className="w-9 h-9 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p>Nenhum agendamento ainda.</p>
          <p className="text-sm mt-1">Quando o bot agendar, aparece aqui.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([, dayAppts]) => (
            <div key={dayAppts[0].id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-3 first-letter:uppercase">
                {fmtDay(dayAppts[0].scheduled_at)}
              </p>
              <div className="space-y-2.5">
                {dayAppts.map((a) => (
                  <div key={a.id} className="glass rounded-xl p-4 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-16 shrink-0">
                      <Clock className="w-4 h-4 text-emerald-500 mb-0.5" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmtTime(a.scheduled_at)}</span>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-gray-200 dark:border-white/10 pl-4">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{a.services?.name ?? 'Serviço'}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {a.customers?.name ?? a.customers?.phone ?? 'Cliente'}
                        <span className="text-gray-400">· {a.duration_minutes} min</span>
                      </p>
                    </div>
                    {a.price != null && (
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                        R$ {Number(a.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
