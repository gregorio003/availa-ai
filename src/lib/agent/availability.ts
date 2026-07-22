/**
 * Motor de disponibilidade do Availa — lógica PURA (sem I/O, testável).
 *
 * Diferencial: combina as DUAS regras configuráveis pelo dono:
 *  1. Funcionários simultâneos (employeeCount): quantos atendimentos podem
 *     acontecer ao MESMO tempo (ex: 2 funcionários = 2 carros em paralelo).
 *  2. Teto de agendamentos por hora (maxPerHour): quantos agendamentos podem
 *     COMEÇAR dentro da mesma hora do relógio.
 *
 * Todos os tempos são "minutos desde a meia-noite" para manter puro e sem fuso.
 */

export interface DayWindow {
  start: string // "08:00"
  end: string // "18:00"
}

export interface BusyInterval {
  startMin: number
  endMin: number
}

export interface AvailabilityRules {
  employeeCount: number
  maxPerHour: number
}

export interface SlotResult {
  minutes: number // início em minutos desde a meia-noite
  time: string // "14:30"
}

export function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Máximo de intervalos ocupados que cobrem qualquer instante dentro de [s, e). */
function maxOverlap(busy: BusyInterval[], s: number, e: number): number {
  // Instantes candidatos: o início da janela e o início de cada ocupado dentro dela.
  const instants = [s, ...busy.map((b) => b.startMin).filter((x) => x >= s && x < e)]
  let max = 0
  for (const x of instants) {
    let count = 0
    for (const b of busy) if (b.startMin <= x && b.endMin > x) count++
    if (count > max) max = count
  }
  return max
}

export function computeAvailableSlots(params: {
  window: DayWindow | null
  serviceDurationMin: number
  stepMin: number
  rules: AvailabilityRules
  busy: BusyInterval[]
  nowMin?: number | null // se hoje, exclui horários já passados
}): SlotResult[] {
  const { window, serviceDurationMin, stepMin, rules, busy } = params
  if (!window) return [] // fechado neste dia

  const open = parseHHMM(window.start)
  const close = parseHHMM(window.end)
  const step = Math.max(5, stepMin || 30)
  const dur = Math.max(5, serviceDurationMin || 30)
  const employees = Math.max(1, rules.employeeCount || 1)
  const maxPerHour = Math.max(1, rules.maxPerHour || 1)
  const nowMin = params.nowMin ?? null

  const results: SlotResult[] = []

  for (let t = open; t + dur <= close; t += step) {
    if (nowMin != null && t < nowMin) continue // já passou

    const end = t + dur

    // Regra 1 — funcionários simultâneos
    if (maxOverlap(busy, t, end) >= employees) continue

    // Regra 2 — teto por hora (agendamentos que começam na mesma hora do relógio)
    const hourStart = Math.floor(t / 60) * 60
    const startsInHour = busy.filter((b) => b.startMin >= hourStart && b.startMin < hourStart + 60).length
    if (startsInHour >= maxPerHour) continue

    results.push({ minutes: t, time: formatHHMM(t) })
  }

  return results
}

/** Nome do dia da semana (0=domingo) no formato das working_hours. */
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

export function weekdayKey(date: Date): WeekdayKey {
  return WEEKDAY_KEYS[date.getDay()]
}
