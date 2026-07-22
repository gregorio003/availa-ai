import { redirect } from 'next/navigation'
import { RefreshCw, Phone, Send, Clock } from 'lucide-react'
import { getCurrentUserAndBusiness } from '@/lib/auth/business'
import type { BotMessages } from '@/types'

export const dynamic = 'force-dynamic'

interface Row {
  scheduled_at: string
  customer_id: string
  customers: { name: string | null; phone: string } | null
}

const DAY = 86400000

function waLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '')
  if (!digits.startsWith('55')) digits = '55' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export default async function RetornosPage() {
  const { user, business, supabase } = await getCurrentUserAndBusiness()
  if (!user) redirect('/login')
  if (!business) redirect('/login')

  const { data: botMessages } = (await supabase
    .from('bot_messages')
    .select('return_message')
    .eq('business_id', business.id)
    .maybeSingle()) as { data: Pick<BotMessages, 'return_message'> | null }

  const returnDays = business.return_days ?? 30
  const returnMsg = botMessages?.return_message ?? 'Olá {nome}! Que tal agendar de novo?'

  const { data } = (await supabase
    .from('appointments')
    .select('scheduled_at,customer_id,customers(name,phone)')
    .eq('business_id', business.id)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: false })) as { data: Row[] | null }

  const now = Date.now()
  // por cliente: última visita passada e se tem visita futura
  const byCustomer = new Map<string, { name: string | null; phone: string; last: number; hasFuture: boolean }>()
  for (const r of data ?? []) {
    if (!r.customers || r.customers.phone === 'simulacao') continue
    const t = new Date(r.scheduled_at).getTime()
    const cur = byCustomer.get(r.customer_id) ?? { name: r.customers.name, phone: r.customers.phone, last: 0, hasFuture: false }
    if (t > now) cur.hasFuture = true
    else if (t > cur.last) cur.last = t
    byCustomer.set(r.customer_id, cur)
  }

  const due = [...byCustomer.values()]
    .filter((c) => c.last > 0 && !c.hasFuture && now - c.last >= returnDays * DAY)
    .map((c) => ({ ...c, days: Math.floor((now - c.last) / DAY) }))
    .sort((a, b) => b.days - a.days)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-emerald-500" /> Retornos
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Clientes sem agendamento há mais de {returnDays} dias — na hora de chamar de volta. Você decide quem contatar.
        </p>
      </div>

      {due.length === 0 ? (
        <div className="text-center py-20 text-gray-500 border border-dashed border-gray-300 dark:border-white/10 rounded-2xl">
          <RefreshCw className="w-9 h-9 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p>Nenhum cliente para retorno por enquanto.</p>
          <p className="text-sm mt-1">Conforme os clientes atendidos ficarem {returnDays}+ dias sem voltar, aparecem aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {due.map((c, i) => {
            const first = (c.name ?? 'cliente').split(' ')[0]
            const msg = returnMsg.replace(/\{nome\}/gi, first)
            return (
              <div key={i} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name ?? c.phone}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> {c.phone}
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5" /> há {c.days} dias
                    </span>
                  </p>
                </div>
                <a
                  href={waLink(c.phone, msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#04140c] font-semibold text-sm px-4 py-2 rounded-lg glow shrink-0"
                  style={{ background: 'linear-gradient(135deg,#34d399,#22c55e)' }}
                >
                  <Send className="w-4 h-4" /> Chamar de volta
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
