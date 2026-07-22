'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X, DollarSign } from 'lucide-react'

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
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

const addDays = (key: string, n: number) => {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (key: string) => {
  const wd = new Date(key + 'T12:00:00Z').getUTCDay()
  return addDays(key, -((wd + 6) % 7))
}
const weekdayShort = (key: string) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short' }).replace('.', '')
const rangeLabel = (start: string) => {
  const end = addDays(start, 6)
  const f = (k: string, opt: Intl.DateTimeFormatOptions) => new Date(k + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', ...opt })
  return `${f(start, { day: '2-digit' })}–${f(end, { day: '2-digit', month: 'long', year: 'numeric' })}`
}

const HOUR_START = 6
const HOUR_END = 21
const HOUR_PX = 56

// posiciona lado a lado quem se sobrepõe (lanes)
function withLanes(appts: Appt[]) {
  const sorted = [...appts].sort((a, b) => brMinutes(a.scheduled_at) - brMinutes(b.scheduled_at))
  const laneEnd: number[] = []
  const placed = sorted.map((a) => {
    const s = brMinutes(a.scheduled_at)
    const e = s + a.duration_minutes
    let lane = laneEnd.findIndex((end) => end <= s)
    if (lane === -1) {
      lane = laneEnd.length
      laneEnd.push(e)
    } else laneEnd[lane] = e
    return { a, lane, s, e }
  })
  return { placed, lanes: Math.max(1, laneEnd.length) }
}

export function AgendaClient({ initial }: { initial: Appt[] }) {
  const [appts, setAppts] = useState<Appt[]>(initial)
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayKey()))
  const [busyId, setBusyId] = useState<string | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = todayKey()
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id)
    const res = await fetch(`/api/client/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusyId(null)
    if (!res.ok) return
    if (body.status === 'cancelled') setAppts((a) => a.filter((x) => x.id !== id))
    else setAppts((a) => a.map((x) => (x.id === id ? { ...x, ...body } : x)))
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-gray-500 text-sm capitalize">{rangeLabel(weekStart)}</p>
        </div>
        <div className="flex items-center glass rounded-lg overflow-hidden">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button onClick={() => setWeekStart(mondayOf(todayKey()))} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition border-x border-black/10 dark:border-white/10">
            Hoje
          </button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="glass rounded-xl flex-1 overflow-auto">
        {/* Cabeçalho dos dias */}
        <div className="grid sticky top-0 z-20 backdrop-blur-xl" style={{ gridTemplateColumns: `48px repeat(7, 1fr)`, background: 'rgba(20,24,23,0.6)' }}>
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

        {/* Corpo: horas + colunas */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
          {/* coluna de horas */}
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="text-[10px] text-gray-400 text-right pr-1.5 border-r border-black/10 dark:border-white/10" style={{ height: HOUR_PX }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* 7 colunas de dias */}
          {days.map((day) => {
            const dayAppts = appts.filter((a) => brDayKey(a.scheduled_at) === day)
            const { placed, lanes } = withLanes(dayAppts)
            return (
              <div key={day} className="relative border-r border-black/10 dark:border-white/10">
                {/* linhas das horas */}
                {hours.map((h) => (
                  <div key={h} className="border-b border-black/[0.06] dark:border-white/[0.06]" style={{ height: HOUR_PX }} />
                ))}
                {/* blocos */}
                {placed.map(({ a, lane, s }) => {
                  const top = ((s - HOUR_START * 60) / 60) * HOUR_PX
                  const height = Math.max(30, (a.duration_minutes / 60) * HOUR_PX - 3)
                  const width = 100 / lanes
                  const done = a.status === 'completed'
                  return (
                    <div
                      key={a.id}
                      className={`absolute rounded-md border-l-2 px-1.5 py-1 overflow-hidden group ${
                        done ? 'border-gray-400 bg-black/[0.04] dark:bg-white/[0.03] opacity-70' : 'border-emerald-500 bg-emerald-500/10'
                      }`}
                      style={{ top, height, left: `calc(${lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                    >
                      <p className="text-[10px] text-gray-500 leading-tight">{brHM(a.scheduled_at)}</p>
                      <p className={`text-[11px] font-semibold leading-tight truncate ${done ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {a.customers?.name ?? a.customers?.phone ?? 'Cliente'}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-tight truncate">{a.services?.name ?? 'Serviço'}</p>

                      {/* pago / pendente */}
                      <button
                        onClick={() => patch(a.id, { paid: !a.paid })}
                        disabled={busyId === a.id}
                        className={`mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded ${
                          a.paid ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        <DollarSign className="w-2.5 h-2.5" />
                        {a.paid ? 'Pago' : 'Pendente'}
                      </button>

                      {/* ações (aparecem no hover) */}
                      {!done && (
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => patch(a.id, { status: 'completed' })} disabled={busyId === a.id}
                            className="p-0.5 rounded bg-emerald-500 text-[#04140c]" title="Concluir">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => patch(a.id, { status: 'cancelled' })} disabled={busyId === a.id}
                            className="p-0.5 rounded bg-black/10 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-red-500" title="Cancelar">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
