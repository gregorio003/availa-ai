import { Calendar, Users, MessageCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Mock data — will be replaced with Supabase queries
const mockAppointments = [
  { id: '1', customer: 'Carlos Silva', service: 'Lavagem Completa', time: '09:00', status: 'confirmed' },
  { id: '2', customer: 'Maria Oliveira', service: 'Lavagem Simples', time: '10:00', status: 'confirmed' },
  { id: '3', customer: 'João Pereira', service: 'Polimento', time: '11:00', status: 'confirmed' },
  { id: '4', customer: 'Ana Costa', service: 'Higienização Interna', time: '14:00', status: 'confirmed' },
  { id: '5', customer: 'Pedro Santos', service: 'Lavagem Completa', time: '15:30', status: 'confirmed' },
]

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-gray-100 text-gray-600',
}

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
}

export default function DashboardPage() {
  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Agendamentos hoje"
          value={5}
          subtitle="2 concluídos"
          icon={<Calendar className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Clientes ativos"
          value={48}
          subtitle="+3 esta semana"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Conversas ativas"
          value={3}
          subtitle="Aguardando resposta"
          icon={<MessageCircle className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Receita do mês"
          value="R$ 2.840"
          subtitle="Meta: R$ 4.000"
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Agenda de Hoje</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {mockAppointments.map(apt => (
              <div key={apt.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-16 text-center">
                  <span className="text-lg font-bold text-gray-900">{apt.time}</span>
                </div>
                <div className="w-1 h-10 bg-green-400 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{apt.customer}</p>
                  <p className="text-sm text-gray-500">{apt.service}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[apt.status]}`}>
                  {statusLabels[apt.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions & recent activity */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Bot</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Agendamentos via bot
                </div>
                <span className="font-semibold text-gray-900">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  Mensagens hoje
                </div>
                <span className="font-semibold text-gray-900">47</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Tempo médio de resposta
                </div>
                <span className="font-semibold text-gray-900">2s</span>
              </div>
            </div>
          </div>

          {/* Bot status */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-green-800">Bot ativo</span>
            </div>
            <p className="text-sm text-green-700">
              O assistente está online e respondendo automaticamente no WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
