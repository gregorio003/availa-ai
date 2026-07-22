/**
 * Utilitários de fuso horário para o Brasil (UTC-3, sem horário de verão).
 * O servidor (Vercel) roda em UTC — precisamos converter para/da hora local BR.
 */

const BR_OFFSET_MS = 3 * 60 * 60 * 1000
export const BR_OFFSET = '-03:00'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "Agora" no horário do Brasil: data ISO (YYYY-MM-DD) e minutos desde a meia-noite. */
export function nowInBrazil(): { iso: string; minutes: number; date: Date } {
  const br = new Date(Date.now() - BR_OFFSET_MS)
  return {
    iso: `${br.getUTCFullYear()}-${pad(br.getUTCMonth() + 1)}-${pad(br.getUTCDate())}`,
    minutes: br.getUTCHours() * 60 + br.getUTCMinutes(),
    date: br,
  }
}

/** Minutos desde a meia-noite (horário BR) de um instante UTC. */
export function brazilMinutesOfDay(utc: Date): number {
  const br = new Date(utc.getTime() - BR_OFFSET_MS)
  return br.getUTCHours() * 60 + br.getUTCMinutes()
}

/** Data ISO (YYYY-MM-DD) no horário BR de um instante UTC. */
export function brazilDateISO(utc: Date): string {
  const br = new Date(utc.getTime() - BR_OFFSET_MS)
  return `${br.getUTCFullYear()}-${pad(br.getUTCMonth() + 1)}-${pad(br.getUTCDate())}`
}

/** Constrói o instante UTC (ISO) a partir de uma data BR + horário "HH:MM". */
export function scheduledAtISO(dateISO: string, hhmm: string): string {
  return new Date(`${dateISO}T${hhmm}:00${BR_OFFSET}`).toISOString()
}

/** Limites do dia BR (início e fim) como ISO UTC, para consultas. */
export function brazilDayBoundsISO(dateISO: string): { start: string; end: string } {
  return {
    start: new Date(`${dateISO}T00:00:00${BR_OFFSET}`).toISOString(),
    end: new Date(`${dateISO}T23:59:59${BR_OFFSET}`).toISOString(),
  }
}
