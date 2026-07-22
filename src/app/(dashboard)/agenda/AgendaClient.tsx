'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X, DollarSign, Clock, User, Phone, Wrench, CalendarDays, CheckCircle2 } from 'lucide-react'

export interface Appt {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  price: number | null
  paid: boolean
  services: { name: string } | null
  customers: { name: string | null; phone: string } | null
}

// ---- datas em horário BR (America/Sao_Paulo) ----
const brDayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
const brHM = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false })
const brMinutes = (iso: string) => {
  const [h, m] = brHM(iso).split(':').map(Number)
  return h * 60 + m
}
const brFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long' })
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

const addDays = (key: string, n: number) => {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (key: string) => addDays(key, -((new Date(key + 'T12:00:00Z').getUTCDay() + 6) % 7))
const weekdayShort = (key: string) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short' }).replace('.', '')
const rangeLabel = (start: string) => {
  const end = addDays(start, 6)
  const f = (k: string, o: Intl.DateTimeFormatOptions) => new Date(k + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', ...o })
  return `${f(start, { day: '2-digit' })}–${f(end, { day: '2-digit', month: 'long', year: 'numeric' })}`
}

const HOUR_START = 6
const HOUR_END = 21
const HOUR_PX = 60

function withLanes(appts: Appt[]) {
  const sorted = [...appts].sort((a, b) => brMinutes(a.scheduled_at) - brMinutes(b.scheduled_at))
  const laneEnd: number[] = []
  const placed = sorted.map((a) => {
    const s = brMinutes(a.scheduled_at)
    const e = s + a.duration_minutes
    let lane = laneEnd.findIndex((end) => end <= s)
    if (lane === -1) { lane = laneEnd.length; laneEnd.push(e) } else laneEnd[lane] = e
    return { a, lane, s }
  })
  return { placed, lanes: Math.max(1, laneEnd.length) }
}

export function AgendaClient({ initial }: { initial: Appt[] }) {
  const [appts, setAppts] = useState<Appt[]>(initial)
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayKey()))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = todayKey()
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)
  const sel = appts.find((a) => a.id === selId) ?? null

  // resumo da semana
  const weekAppts = appts.filter((a) => days.includes(brDayKey(a.scheduled_at)))
  const revenue = weekAppts.reduce((s, a) => s + (a.price ?? 0), 0)
  const pending = weekAppts.filter((a) => !a.paid).length
  const doneCount = weekAppts.filter((a) => a.status === 'completed').length

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id)
    const res = await fetch(`/api/client/appointments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setBusyId(null)
    if (!res.ok) return
    if (body.status === 'cancelled') {
      setAppts((a) => a.filter((x) => x.id !== id))
      setSelId(null)
    } else setAppts((a) => a.map((x) => (x.id === id ? { ...x, ...body } : x)))
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-gray-500 text-sm capitalize">{rangeLabel(weekStart)}</p>
        </div>
        <div className="flex items-center glass rounded-lg overflow-hidden">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
          <button onClick={() => setWeekStart(mondayOf(todayKey()))} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition border-x border-black/10 dark:border-white/10">Hoje</button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
        </div>
      </div>

      {/* Resumo da semana */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Stat icon={<CalendarDays className="w-4 h-4" />} label="Agendamentos" value={String(weekAppts.length)} />
        <Stat icon={<DollarSign className="w-4 h-4" />} label="Faturamento previsto" value={`R$ ${revenue.toFixed(2)}`} accent />
        <Stat icon={<Clock className="w-4 h-4" />} label="Pgto. pendente" value={String(pending)} />
        <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="Concluídos" value={String(doneCount)} />
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Calendário */}
        <div className="glass rounded-xl flex-1 overflow-auto min-w-0">
          <div className="grid sticky top-0 z-20 backdrop-blur-xl" style={{ gridTemplateColumns: `52px repeat(7, 1fr)`, background: 'rgba(15,20,18,0.55)' }}>
            <div className="border-b border-r border-black/10 dark:border-white/10" />
            {days.map((day) => {
              const isToday = day === today
              return (
                <div key={day} className={`text-center py-2 border-b border-r border-black/10 dark:border-white/10 ${isToday ? 'bg-emerald-500/10' : ''}`}>
                  <p className="text-[10px] uppercase text-gray-500">{weekdayShort(day)}</p>
                  <p className={`text-base font-bold ${isToday ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{day.slice(8, 10)}</p>
                </div>
              )
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
            <div>
              {hours.map((h) => (
                <div key={h} className="text-[10px] text-gray-400 text-right pr-1.5 border-r border-black/10 dark:border-white/10 -mt-1.5" style={{ height: HOUR_PX }}>{h}:00</div>
              ))}
            </div>
            {days.map((day) => {
              const dayAppts = appts.filter((a) => brDayKey(a.scheduled_at) === day)
              const { placed, lanes } = withLanes(dayAppts)
              return (
                <div key={day} className="relative border-r border-black/10 dark:border-white/10">
                  {hours.map((h) => <div key={h} className="border-b border-black/[0.06] dark:border-white/[0.06]" style={{ height: HOUR_PX }} />)}
                  {placed.map(({ a, lane, s }) => {
                    const top = ((s - HOUR_START * 60) / 60) * HOUR_PX
                    const height = Math.max(34, (a.duration_minutes / 60) * HOUR_PX - 3)
                    const width = 100 / lanes
                    const done = a.status === 'completed'
                    const isSel = a.id === selId
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelId(a.id)}
                        className={`absolute rounded-md border-l-[3px] px-1.5 py-1 text-left overflow-hidden transition ${
                          done ? 'border-gray-400 bg-black/[0.05] dark:bg-white/[0.04] opacity-70'
                          : a.paid ? 'border-emerald-500 bg-emerald-500/12' : 'border-amber-500 bg-amber-500/12'
                        } ${isSel ? 'ring-2 ring-emerald-400' : ''}`}
                        style={{ top, height, left: `calc(${lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                      >
                        <p className="text-[10px] text-gray-500 leading-none mb-0.5">{brHM(a.scheduled_at)}</p>
                        <p className={`text-[11px] font-semibold leading-tight truncate ${done ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {a.customers?.name ?? a.customers?.phone ?? 'Cliente'}
                        </p>
                        {height > 44 && <p className="text-[10px] text-gray-500 leading-tight truncate">{a.services?.name ?? ''}</p>}
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mt-0.5 ${a.paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Painel de detalhes */}
        {sel && (
          <div className="glass rounded-xl w-80 shrink-0 p-5 overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold">Agendamento</p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight capitalize">{brFullDate(sel.scheduled_at)}</h2>
                <p className="text-gray-500 text-sm">{brHM(sel.scheduled_at)} · {sel.duration_minutes} min</p>
              </div>
              <button onClick={() => setSelId(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-sm">
              <Info icon={<User className="w-4 h-4" />} label="Cliente" value={sel.customers?.name ?? '—'} />
              <Info icon={<Phone className="w-4 h-4" />} label="Telefone" value={sel.customers?.phone ?? '—'} />
              <Info icon={<Wrench className="w-4 h-4" />} label="Serviço" value={sel.services?.name ?? '—'} />
              <Info icon={<DollarSign className="w-4 h-4" />} label="Valor" value={sel.price != null ? `R$ ${Number(sel.price).toFixed(2)}` : '—'} />
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => patch(sel.id, { paid: !sel.paid })}
                disabled={busyId === sel.id}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
                  sel.paid ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                  : 'text-[#04140c] glow'
                }`}
                style={sel.paid ? undefined : { background: 'linear-gradient(135deg,#34d399,#22c55e)' }}
              >
                <DollarSign className="w-4 h-4" />
                {sel.paid ? 'Marcar como pendente' : 'Marcar como pago'}
              </button>

              {sel.status === 'completed' ? (
                <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-black/5 dark:bg-white/5 text-gray-500">
                  <CheckCircle2 className="w-4 h-4" /> Atendimento concluído
                </div>
              ) : (
                <button onClick={() => patch(sel.id, { status: 'completed' })} disabled={busyId === sel.id}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition">
                  <Check className="w-4 h-4" /> Concluir atendimento
                </button>
              )}

              <button onClick={() => { if (confirm('Cancelar este agendamento?')) patch(sel.id, { status: 'cancelled' }) }} disabled={busyId === sel.id}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition">
                <X className="w-4 h-4" /> Cancelar agendamento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mb-1">{icon}{label}</div>
      <p className={`text-xl font-bold ${accent ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-gray-900 dark:text-white font-medium truncate">{value}</p>
      </div>
    </div>
  )
}
