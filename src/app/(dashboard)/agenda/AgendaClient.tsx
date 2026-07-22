'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react'

export interface Appt {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  price: number | null
  services: { name: string } | null
  customers: { name: string | null; phone: string } | null
}

// ---- helpers de data (BR = America/Sao_Paulo) ----
const brDayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
const brTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

// aritmética de datas em cima de "YYYY-MM-DD" usando meio-dia UTC (estável)
const addDays = (key: string, n: number) => {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (key: string) => {
  const wd = new Date(key + 'T12:00:00Z').getUTCDay() // 0=dom
  return addDays(key, -((wd + 6) % 7))
}
const weekdayShort = (key: string) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short' }).replace('.', '')
const monthLabel = (key: string) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' })

export function AgendaClient({ initial }: { initial: Appt[] }) {
  const [appts, setAppts] = useState<Appt[]>(initial)
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayKey()))
  const [busyId, setBusyId] = useState<string | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = todayKey()

  const setStatus = async (id: string, status: string) => {
    setBusyId(id)
    const res = await fetch(`/api/client/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusyId(null)
    if (res.ok) {
      if (status === 'cancelled') setAppts((a) => a.filter((x) => x.id !== id))
      else setAppts((a) => a.map((x) => (x.id === id ? { ...x, status } : x)))
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-gray-500 capitalize">{monthLabel(weekStart)}</p>
        </div>
        <div className="flex items-center glass rounded-lg overflow-hidden">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setWeekStart(mondayOf(todayKey()))}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition border-x border-black/10 dark:border-white/10"
          >
            Hoje
          </button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-3 overflow-auto">
        {days.map((day) => {
          const isToday = day === today
          const dayAppts = appts
            .filter((a) => brDayKey(a.scheduled_at) === day)
            .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
          return (
            <div key={day} className="glass rounded-xl p-2.5 min-h-[140px] flex flex-col">
              <div className={`text-center pb-2 mb-2 border-b ${isToday ? 'border-emerald-500/40' : 'border-black/10 dark:border-white/10'}`}>
                <p className="text-[11px] uppercase text-gray-500">{weekdayShort(day)}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                  {day.slice(8, 10)}
                </p>
              </div>
              <div className="space-y-2 flex-1">
                {dayAppts.length === 0 && <p className="text-[11px] text-gray-400 text-center mt-2">—</p>}
                {dayAppts.map((a) => {
                  const done = a.status === 'completed'
                  return (
                    <div
                      key={a.id}
                      className={`rounded-lg border-l-2 p-2 text-xs ${
                        done
                          ? 'border-gray-400 bg-black/[0.03] dark:bg-white/[0.02] opacity-70'
                          : 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-gray-500 mb-0.5">
                        <Clock className="w-3 h-3" />
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{brTime(a.scheduled_at)}</span>
                      </div>
                      <p className={`font-semibold truncate ${done ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {a.customers?.name ?? a.customers?.phone ?? 'Cliente'}
                      </p>
                      <p className="truncate text-gray-500">{a.services?.name ?? 'Serviço'}</p>

                      {done ? (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                          <Check className="w-3 h-3" /> Concluído
                        </p>
                      ) : (
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            onClick={() => setStatus(a.id, 'completed')}
                            disabled={busyId === a.id}
                            className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-1 rounded transition"
                          >
                            <Check className="w-3 h-3" /> Concluir
                          </button>
                          <button
                            onClick={() => setStatus(a.id, 'cancelled')}
                            disabled={busyId === a.id}
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-500 hover:bg-red-500/10 px-1.5 py-1 rounded transition"
                            title="Cancelar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
