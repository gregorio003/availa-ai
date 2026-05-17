'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// Mock appointments
const mockAppointments = [
  { id: '1', customer: 'Carlos Silva', service: 'Lavagem Completa', date: new Date(), startHour: 9, duration: 90, color: 'bg-green-100 border-green-400 text-green-800' },
  { id: '2', customer: 'Maria Oliveira', service: 'Lavagem Simples', date: new Date(), startHour: 10, duration: 45, color: 'bg-blue-100 border-blue-400 text-blue-800' },
  { id: '3', customer: 'João Pereira', service: 'Polimento', date: addDays(new Date(), 1), startHour: 9, duration: 180, color: 'bg-purple-100 border-purple-400 text-purple-800' },
  { id: '4', customer: 'Ana Costa', service: 'Higienização', date: addDays(new Date(), 2), startHour: 14, duration: 120, color: 'bg-orange-100 border-orange-400 text-orange-800' },
]

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8h to 18h

export default function AgendaPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(currentWeekStart, i))

  const prevWeek = () => setCurrentWeekStart(d => addDays(d, -7))
  const nextWeek = () => setCurrentWeekStart(d => addDays(d, 7))

  const monthLabel = format(currentWeekStart, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg">
            <button onClick={prevWeek} className="p-2 hover:bg-gray-50 rounded-l-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-x border-gray-200"
            >
              Hoje
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-gray-50 rounded-r-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Novo agendamento
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="p-3 text-center text-xs font-medium text-gray-400 uppercase border-r border-gray-100">
            Hora
          </div>
          {weekDays.map(day => {
            const isToday = isSameDay(day, new Date())
            return (
              <div key={day.toISOString()} className="p-3 text-center border-r border-gray-100 last:border-r-0">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </p>
                <p className={cn(
                  'text-lg font-bold mt-0.5',
                  isToday ? 'text-green-600' : 'text-gray-900'
                )}>
                  {format(day, 'd')}
                </p>
                {isToday && <div className="w-1.5 h-1.5 bg-green-500 rounded-full mx-auto mt-1" />}
              </div>
            )
          })}
        </div>

        {/* Time slots */}
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-7 border-b border-gray-100 min-h-[60px]">
            <div className="p-2 text-xs text-gray-400 text-center border-r border-gray-100 font-medium pt-3">
              {hour}:00
            </div>
            {weekDays.map(day => {
              const dayApts = mockAppointments.filter(
                apt => isSameDay(apt.date, day) && apt.startHour === hour
              )
              return (
                <div key={day.toISOString()} className="border-r border-gray-100 last:border-r-0 p-1 relative">
                  {dayApts.map(apt => (
                    <div
                      key={apt.id}
                      className={cn(
                        'rounded-md border-l-2 p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity',
                        apt.color
                      )}
                    >
                      <p className="font-semibold truncate">{apt.customer}</p>
                      <p className="truncate opacity-75">{apt.service}</p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
