'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Save, Plus, Trash2, Bot, Calendar, Clock, CheckCircle, ExternalLink } from 'lucide-react'

const DAYS = [
  { key: 'mon', label: 'Segunda-feira' },
  { key: 'tue', label: 'Terça-feira' },
  { key: 'wed', label: 'Quarta-feira' },
  { key: 'thu', label: 'Quinta-feira' },
  { key: 'fri', label: 'Sexta-feira' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

const initialServices = [
  { id: '1', name: 'Lavagem Simples', duration: 45, price: 30 },
  { id: '2', name: 'Lavagem Completa', duration: 90, price: 60 },
  { id: '3', name: 'Polimento', duration: 180, price: 150 },
  { id: '4', name: 'Higienização Interna', duration: 120, price: 100 },
]

export default function ConfiguracoesPage() {
  const [services, setServices] = useState(initialServices)
  const [saved, setSaved] = useState(false)
  const searchParams = useSearchParams()
  const calendarConnected = searchParams.get('calendar') === 'connected'

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id))
  }

  const addService = () => {
    setServices(prev => [...prev, { id: Date.now().toString(), name: 'Novo Serviço', duration: 60, price: 0 }])
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500">Gerencie os dados do seu negócio e do bot</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Business info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Negócio</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do estabelecimento</label>
              <input
                type="text"
                defaultValue="Lavajato do João"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input
                type="text"
                defaultValue="Rua das Flores, 123 - São Paulo/SP"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nicho</label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="lavajato">Lavajato</option>
                <option value="sobrancelha">Design de Sobrancelhas</option>
                <option value="salao">Salão de Beleza</option>
                <option value="unhas">Estúdio de Unhas</option>
              </select>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Serviços</h2>
            <button
              onClick={addService}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar serviço
            </button>
          </div>
          <div className="space-y-3">
            {services.map(service => (
              <div key={service.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  defaultValue={service.name}
                  className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    defaultValue={service.duration}
                    className="w-16 px-2 py-1 bg-white border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-500">min</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">R$</span>
                  <input
                    type="number"
                    defaultValue={service.price}
                    className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={() => removeService(service.id)}
                  className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Working hours */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Horário de Funcionamento</h2>
          <div className="space-y-3">
            {DAYS.map(day => (
              <div key={day.key} className="flex items-center gap-4">
                <span className="w-36 text-sm font-medium text-gray-700">{day.label}</span>
                <input
                  type="time"
                  defaultValue={day.key === 'sun' ? '' : '08:00'}
                  disabled={day.key === 'sun'}
                  className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="text-gray-400">até</span>
                <input
                  type="time"
                  defaultValue={day.key === 'sun' ? '' : day.key === 'sat' ? '13:00' : '18:00'}
                  disabled={day.key === 'sun'}
                  className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
                {day.key === 'sun' && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Fechado</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bot settings */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configurações do Bot</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração padrão do slot (minutos)
              </label>
              <input
                type="number"
                defaultValue={60}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Google Calendar</label>
              {calendarConnected ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Agenda conectada com sucesso!</p>
                    <p className="text-xs text-green-600 mt-0.5">O bot já está verificando horários disponíveis automaticamente.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a
                    href="/api/auth/google"
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Conectar Google Agenda
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                  <p className="text-xs text-gray-500">O bot usará sua agenda para verificar horários disponíveis</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
