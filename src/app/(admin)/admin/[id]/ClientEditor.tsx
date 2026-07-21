'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, KeyRound, Trash2, Copy, CheckCircle2, Power } from 'lucide-react'
import type { Business } from '@/types'

const niches = [
  { value: 'lavajato', label: '🚗 Lavajato' },
  { value: 'salao', label: '✂️ Salão de beleza' },
  { value: 'sobrancelha', label: '👁️ Sobrancelhas' },
  { value: 'unhas', label: '💅 Unhas / Manicure' },
]

const inputCls =
  'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition'
const labelCls = 'block text-sm text-gray-600 dark:text-gray-400 mb-1'

export function ClientEditor({
  business,
  ownerEmail,
  ownerName,
}: {
  business: Business
  ownerEmail: string
  ownerName: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const [f, setF] = useState({
    full_name: ownerName,
    email: ownerEmail,
    name: business.name ?? '',
    niche: business.niche ?? 'lavajato',
    address: business.address ?? '',
    phone: business.phone ?? '',
    plan: business.plan ?? 'basico',
    commission_pct: String(business.commission_pct ?? 0),
    employee_count: String(business.employee_count ?? 1),
    max_appointments_per_hour: String(business.max_appointments_per_hour ?? 4),
    requires_advance: business.requires_advance ?? false,
    advance_amount: String(business.advance_amount ?? 0),
    subscription_valid_until: business.subscription_valid_until ?? '',
    active: business.active,
  })
  const set = (k: string, v: string | boolean) => setF((prev) => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError('')
    setMsg('')
    const res = await fetch(`/api/admin/clients/${business.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: f.full_name,
        email: f.email,
        name: f.name,
        niche: f.niche,
        address: f.address || null,
        phone: f.phone || null,
        plan: f.plan,
        commission_pct: parseFloat(f.commission_pct) || 0,
        employee_count: parseInt(f.employee_count) || 1,
        max_appointments_per_hour: parseInt(f.max_appointments_per_hour) || 1,
        requires_advance: f.requires_advance,
        advance_amount: parseFloat(f.advance_amount) || 0,
        subscription_valid_until: f.subscription_valid_until || null,
        active: f.active,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return setError(data.error ?? 'Erro ao salvar')
    setMsg('Alterações salvas!')
    router.refresh()
  }

  const resetPassword = async () => {
    setError('')
    setMsg('')
    const res = await fetch(`/api/admin/clients/${business.id}/reset-password`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return setError(data.error ?? 'Erro ao resetar senha')
    setNewPassword(data.password)
  }

  const remove = async () => {
    if (!confirm(`Remover "${business.name}"? Isso apaga o acesso e todos os dados do cliente. Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/clients/${business.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin')
    else setError('Erro ao remover cliente')
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Voltar para a lista
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{business.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerenciar cliente</p>
        </div>
        <button
          onClick={() => set('active', !f.active)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
            f.active
              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
              : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          <Power className="w-4 h-4" />
          {f.active ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      {/* Dados de acesso */}
      <Section title="Acesso do cliente">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome do responsável</label>
            <input className={inputCls} value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>E-mail de login</label>
            <input className={inputCls} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>
        <button
          onClick={resetPassword}
          className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <KeyRound className="w-4 h-4" /> Resetar senha
        </button>
        {newPassword && (
          <div className="mt-3 bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-lg p-3 text-sm">
            <p className="text-gray-700 dark:text-gray-300 mb-1">Nova senha temporária (envie ao cliente):</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-gray-900 dark:text-white">{newPassword}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`E-mail: ${f.email}\nNova senha: ${newPassword}\nEntre em: https://www.availa-ai.com.br/login`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex items-center gap-1 text-xs text-green-700 dark:text-green-300 hover:underline"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Dados do negócio */}
      <Section title="Negócio">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome do negócio</label>
            <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Segmento</label>
            <select className={inputCls} value={f.niche} onChange={(e) => set('niche', e.target.value)}>
              {niches.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Telefone (WhatsApp)</label>
            <input className={inputCls} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="37999181248" />
          </div>
          <div>
            <label className={labelCls}>Endereço</label>
            <input className={inputCls} value={f.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>
      </Section>

      {/* Regras de capacidade */}
      <Section title="Regras de capacidade">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Funcionários (atendimentos simultâneos)</label>
            <input className={inputCls} type="number" min={1} value={f.employee_count} onChange={(e) => set('employee_count', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Máx. agendamentos por hora</label>
            <input className={inputCls} type="number" min={1} value={f.max_appointments_per_hour} onChange={(e) => set('max_appointments_per_hour', e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-4 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={f.requires_advance} onChange={(e) => set('requires_advance', e.target.checked)} className="w-4 h-4 accent-green-600" />
          Exigir sinal/adiantamento
        </label>
        {f.requires_advance && (
          <div className="mt-3 w-1/2">
            <label className={labelCls}>Valor do sinal (R$)</label>
            <input className={inputCls} type="number" min={0} step={0.01} value={f.advance_amount} onChange={(e) => set('advance_amount', e.target.value)} />
          </div>
        )}
      </Section>

      {/* Assinatura */}
      <Section title="Assinatura & comissão">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Plano</label>
            <select className={inputCls} value={f.plan} onChange={(e) => set('plan', e.target.value)}>
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Comissão (%)</label>
            <input className={inputCls} type="number" min={0} step={0.5} value={f.commission_pct} onChange={(e) => set('commission_pct', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Válido até</label>
            <input className={inputCls} type="date" value={f.subscription_valid_until} onChange={(e) => set('subscription_valid_until', e.target.value)} />
          </div>
        </div>
      </Section>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {msg && <p className="text-green-600 dark:text-green-400 text-sm mb-3">{msg}</p>}

      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-5">
        <button
          onClick={remove}
          className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" /> Remover cliente
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}
