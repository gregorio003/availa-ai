import { redirect } from 'next/navigation'
import { getCurrentUserAndBusiness } from '@/lib/auth/business'
import type { Service } from '@/types'
import { ServicosClient } from './ServicosClient'

export const dynamic = 'force-dynamic'

export default async function ServicosPage() {
  const { user, business, supabase } = await getCurrentUserAndBusiness()
  if (!user) redirect('/login')
  if (!business) redirect('/login')

  const { data: services } = (await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })) as { data: Service[] | null }

  return <ServicosClient initialServices={services ?? []} />
}
