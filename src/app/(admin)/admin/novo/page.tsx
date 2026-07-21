'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Copy, CheckCircle2 } from 'lucide-react'

const niches = [
  { value: 'lavajato', label: '🚗 Lavajato' },
  { value: 'salao', label: '✂️ Salão de beleza' },
  { value: 'sobrancelha', label: '👁️ Sobrancelhas' },
  { value: 'unhas', label: '💅 Unhas / Manicure' },
]

function randomPassword() {
  return 'Availa' + Math.random().toString(36).slice(2, 8) + '!'
}

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: randomPassword(),
    business_name: '',
    niche: 'lavajato',
    commission_pct: '1',
    subscription_valid_until: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        commission_pct: parseFloat(form.commission_pct) || 0,
        subscription_valid_until: form.subscription_valid_until || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar cliente')
      setLoading(false)
      return
    }

    setDone({ email: form.email, password: form.password })
    setLoading(false)
  }

  if (done) {
    return (
      <div className="max-w-md">
        <div className="bg-gray-900 border border-green-800 rounded-2xl p-6">
          <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
          <h1 className="text-xl font-bold text-white mb-1">Cliente criado! 🎉</h1>
          <p className="text-gray-400 text-sm mb-5">
            Envie estes dados de acesso para o cliente. Ele entra em{' '}
            <span className="text-gray-200">availa-ai.com.br/login</span> e configura o negócio dele.
          </p>
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">E-mail</span><span className="text-white">{done.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Senha temporária</span><span className="text-white font-mono">{done.password}</span></div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`Acesso Availa.ai\nE-mail: ${done.email}\nSenha: ${done.password}\nEntre em: https://www.availa-ai.com.br/login`)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar dados de acesso'}
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            Voltar para a lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Novo cliente</h1>
      <p className="text-gray-500 text-sm mb-6">Cria o acesso e o estabelecimento do cliente.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome do responsável" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="Maria Silva" required />
        <Field label="E-mail de acesso" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="maria@exemplo.com" required />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Senha temporária</label>
          <div className="flex gap-2">
            <input
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-500"
            />
            <button type="button" onClick={() => set('password', randomPassword())} className="px-3 text-xs text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800">
              Gerar
            </button>
          </div>
        </div>
        <Field label="Nome do negócio" value={form.business_name} onChange={(v) => set('business_name', v)} placeholder="Lavajato do João" required />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Segmento</label>
          <select value={form.niche} onChange={(e) => set('niche', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
            {niches.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Comissão (%)</label>
            <input type="number" min={0} step={0.5} value={form.commission_pct} onChange={(e) => set('commission_pct', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Válido até</label>
            <input type="date" value={form.subscription_valid_until} onChange={(e) => set('subscription_valid_until', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg text-sm transition">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar cliente'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
      />
    </div>
  )
}
