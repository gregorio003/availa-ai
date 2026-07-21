'use client'

import { useState } from 'react'
import { Plus, Clock, Trash2, Loader2, Check, Wrench } from 'lucide-react'
import type { Service } from '@/types'

type Draft = { id: string; name: string; duration_minutes: number; price: number | null; isNew?: boolean; dirty?: boolean }

export function ServicosClient({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Draft[]>(
    initialServices.map((s) => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes, price: s.price }))
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const update = (id: string, patch: Partial<Draft>) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, dirty: true } : s)))

  const addService = () => {
    setServices((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', duration_minutes: 60, price: 0, isNew: true, dirty: true },
    ])
  }

  const saveService = async (s: Draft) => {
    if (!s.name.trim()) return setError('Dê um nome ao serviço antes de salvar.')
    setSavingId(s.id)
    setError('')
    try {
      if (s.isNew) {
        const res = await fetch('/api/client/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: s.name, duration_minutes: s.duration_minutes, price: s.price }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, id: data.service.id, isNew: false, dirty: false } : x)))
      } else {
        const res = await fetch(`/api/client/services/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: s.name, duration_minutes: s.duration_minutes, price: s.price }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, dirty: false } : x)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSavingId(null)
    }
  }

  const removeService = async (s: Draft) => {
    if (s.isNew) {
      setServices((prev) => prev.filter((x) => x.id !== s.id))
      return
    }
    if (!confirm(`Remover "${s.name}"?`)) return
    const res = await fetch(`/api/client/services/${s.id}`, { method: 'DELETE' })
    if (res.ok) setServices((prev) => prev.filter((x) => x.id !== s.id))
    else setError('Erro ao remover')
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Serviços</h1>
          <p className="text-gray-500 text-sm mt-1">Os serviços que o bot oferece aos seus clientes no WhatsApp.</p>
        </div>
        <button
          onClick={addService}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Adicionar serviço
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <input
              value={s.name}
              onChange={(e) => update(s.id, { name: e.target.value })}
              placeholder="Nome do serviço"
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <input
                type="number"
                min={5}
                value={s.duration_minutes}
                onChange={(e) => update(s.id, { duration_minutes: Number(e.target.value) })}
                className="w-16 px-2 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-xs text-gray-500">min</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">R$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={s.price ?? 0}
                onChange={(e) => update(s.id, { price: Number(e.target.value) })}
                className="w-20 px-2 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={() => saveService(s)}
              disabled={!s.dirty || savingId === s.id}
              className="p-2 rounded-lg text-white bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 transition"
              title="Salvar"
            >
              {savingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => removeService(s)}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 transition"
              title="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {services.length === 0 && (
          <div className="text-center py-16 text-gray-500 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
            <p>Nenhum serviço cadastrado.</p>
            <button onClick={addService} className="text-green-600 dark:text-green-400 hover:text-green-500 text-sm mt-2">
              Adicionar o primeiro →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
