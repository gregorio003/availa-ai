import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, MessageCircle, Users, Wrench, MessageSquareWarning, ArrowRight } from 'lucide-react'
import { getCurrentUserAndBusiness } from '@/lib/auth/business'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { user, business, supabase } = await getCurrentUserAndBusiness()
  if (!user) redirect('/login')
  if (!business) redirect('/login')

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [servicesCount, customersCount, apptToday, activeConvs] = await Promise.all([
    supabase.from('services').select('*', { count: 'exact', head: true }).eq('business_id', business.id).eq('active', true),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', business.id),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString()),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'active'),
  ])

  const stats = [
    { label: 'Agendamentos hoje', value: apptToday.count ?? 0, icon: Calendar, href: '/agenda' },
    { label: 'Conversas ativas', value: activeConvs.count ?? 0, icon: MessageCircle, href: '/conversas' },
    { label: 'Clientes', value: customersCount.count ?? 0, icon: Users, href: '/clientes' },
    { label: 'Serviços ativos', value: servicesCount.count ?? 0, icon: Wrench, href: '/servicos' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {business.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Aqui está o resumo do seu atendimento automático.</p>
      </div>

      {/* Aviso de WhatsApp desconectado */}
      {!business.whatsapp_connected && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-5 flex items-start gap-3">
          <MessageSquareWarning className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">WhatsApp ainda não conectado</p>
            <p className="text-amber-700 dark:text-amber-300/80 text-sm mt-0.5">
              Assim que o WhatsApp for conectado, o bot começa a responder e agendar automaticamente. Enquanto isso, cadastre seus serviços e personalize as mensagens.
            </p>
            <Link href="/servicos" className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200 text-sm font-medium mt-2 hover:underline">
              Cadastrar serviços <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-sm hover:border-green-400 dark:hover:border-green-700 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <s.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-gray-500 text-sm">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
