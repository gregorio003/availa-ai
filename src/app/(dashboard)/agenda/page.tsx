import { redirect } from 'next/navigation'
import { getCurrentUserAndBusiness } from '@/lib/auth/business'
import { AgendaClient, type Appt } from './AgendaClient'

export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const { user, business, supabase } = await getCurrentUserAndBusiness()
  if (!user) redirect('/login')
  if (!business) redirect('/login')

  // Janela: 30 dias atrás até 90 dias à frente
  const from = new Date(Date.now() - 30 * 86400000).toISOString()
  const to = new Date(Date.now() + 90 * 86400000).toISOString()

  const { data } = (await supabase
    .from('appointments')
    .select('id,scheduled_at,duration_minutes,status,price,paid,services(name),customers(name,phone)')
    .eq('business_id', business.id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
    .order('scheduled_at', { ascending: true })) as { data: Appt[] | null }

  return <AgendaClient initial={data ?? []} />
}
