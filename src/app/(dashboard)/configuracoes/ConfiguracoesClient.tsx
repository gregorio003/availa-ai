'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Save, Bot, CheckCircle, ExternalLink, Loader2, MessageSquare } from 'lucide-react'
import type { Business, BotMessages, WorkingHours, DayHours } from '@/types'

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'mon', label: 'Segunda-feira' },
  { key: 'tue', label: 'Terça-feira' },
  { key: 'wed', label: 'Quarta-feira' },
  { key: 'thu', label: 'Quinta-feira' },
  { key: 'fri', label: 'Sexta-feira' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

const BOT_FIELDS: { key: keyof BotMessages; label: string; hint: string }[] = [
  { key: 'greeting', label: 'Saudação inicial', hint: 'Primeira mensagem quando o cliente chama no WhatsApp' },
  { key: 'service_prompt', label: 'Pergunta do serviço', hint: 'Quando o bot pergunta qual serviço o cliente quer' },
  { key: 'date_prompt', label: 'Pergunta da data', hint: 'Quando o bot pergunta o dia' },
  { key: 'time_prompt', label: 'Pergunta do horário', hint: 'Quando o bot pergunta o horário' },
  { key: 'confirmation', label: 'Confirmação do agendamento', hint: 'Mensagem quando o agendamento é confirmado' },
  { key: 'advance_message', label: 'Mensagem de sinal', hint: 'Quando é necessário adiantamento (se ativado)' },
]

function GoogleCalendarSection() {
  const searchParams = useSearchParams()
  const connected = searchParams.get('calendar') === 'connected'
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Google Agenda</label>
      {connected ? (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-4 py-3 rounded-lg">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Agenda conectada!</p>
            <p className="text-xs opacity-80 mt-0.5">O bot já verifica horários disponíveis automaticamente.</p>
          </div>
        </div>
      ) : (
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
        >
          Conectar Google Agenda
          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
        </a>
      )}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500'

export function ConfiguracoesClient({ business, botMessages }: { business: Business; botMessages: BotMessages | null }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [biz, setBiz] = useState({
    name: business.name ?? '',
    address: business.address ?? '',
    phone: business.phone ?? '',
    slot_duration_minutes: business.slot_duration_minutes ?? 30,
  })
  const [hours, setHours] = useState<WorkingHours>(business.working_hours)
  const [msgs, setMsgs] = useState<Record<string, string>>({
    greeting: botMessages?.greeting ?? '',
    service_prompt: botMessages?.service_prompt ?? '',
    date_prompt: botMessages?.date_prompt ?? '',
    time_prompt: botMessages?.time_prompt ?? '',
    confirmation: botMessages?.confirmation ?? '',
    advance_message: botMessages?.advance_message ?? '',
  })

  const setDay = (key: keyof WorkingHours, patch: Partial<DayHours> | null) => {
    setHours((prev) => ({
      ...prev,
      [key]: patch === null ? null : { start: '08:00', end: '18:00', ...(prev[key] ?? {}), ...patch },
    }))
  }

  const saveAll = async () => {
    setSaving(true)
    setError('')
    try {
      const r1 = await fetch('/api/client/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...biz, working_hours: hours }),
      })
      if (!r1.ok) throw new Error((await r1.json()).error)

      const r2 = await fetch('/api/client/bot-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgs),
      })
      if (!r2.ok) throw new Error((await r2.json()).error)

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-gray-500 text-sm">Dados do negócio, horários e mensagens do bot.</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="space-y-6">
        {/* Dados do negócio */}
        <Section title="Dados do negócio">
          <div className="space-y-4">
            <Field label="Nome do estabelecimento" value={biz.name} onChange={(v) => setBiz({ ...biz, name: v })} />
            <Field label="Endereço" value={biz.address} onChange={(v) => setBiz({ ...biz, address: v })} />
            <Field label="Telefone (WhatsApp)" value={biz.phone} onChange={(v) => setBiz({ ...biz, phone: v })} placeholder="37999181248" />
          </div>
        </Section>

        {/* Horário de funcionamento */}
        <Section title="Horário de funcionamento">
          <div className="space-y-2.5">
            {DAYS.map((d) => {
              const day = hours?.[d.key]
              const closed = !day
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-700 dark:text-gray-300">{d.label}</span>
                  <input
                    type="time"
                    value={day?.start ?? ''}
                    disabled={closed}
                    onChange={(e) => setDay(d.key, { start: e.target.value })}
                    className="px-2 py-1.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded text-sm text-gray-900 dark:text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-gray-400 text-sm">até</span>
                  <input
                    type="time"
                    value={day?.end ?? ''}
                    disabled={closed}
                    onChange={(e) => setDay(d.key, { end: e.target.value })}
                    className="px-2 py-1.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded text-sm text-gray-900 dark:text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => setDay(d.key, closed ? {} : null)}
                    className={`text-xs px-2 py-1 rounded ${
                      closed
                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    }`}
                  >
                    {closed ? 'Fechado' : 'Aberto'}
                  </button>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Mensagens do bot */}
        <Section title="Mensagens do bot" icon={<MessageSquare className="w-5 h-5 text-green-600" />}>
          <p className="text-xs text-gray-500 mb-4">Personalize o que o bot escreve no WhatsApp dos seus clientes.</p>
          <div className="space-y-4">
            {BOT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</label>
                <p className="text-xs text-gray-400 mb-1">{f.hint}</p>
                <textarea
                  value={msgs[f.key as string] ?? ''}
                  onChange={(e) => setMsgs({ ...msgs, [f.key]: e.target.value })}
                  rows={2}
                  className={inputCls + ' resize-none'}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Bot / agenda */}
        <Section title="Bot e agenda" icon={<Bot className="w-5 h-5 text-green-600" />}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duração padrão do slot (min)</label>
              <input
                type="number"
                min={5}
                value={biz.slot_duration_minutes}
                onChange={(e) => setBiz({ ...biz, slot_duration_minutes: Number(e.target.value) })}
                className={inputCls + ' w-32'}
              />
            </div>
            <Suspense fallback={<div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
              <GoogleCalendarSection />
            </Suspense>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-white/[0.04] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  )
}
