import { redirect } from 'next/navigation'
import { getCurrentUserAndBusiness } from '@/lib/auth/business'
import type { BotMessages } from '@/types'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const { user, business, supabase } = await getCurrentUserAndBusiness()
  if (!user) redirect('/login')
  if (!business) redirect('/login')

  const { data: botMessages } = (await supabase
    .from('bot_messages')
    .select('*')
    .eq('business_id', business.id)
    .maybeSingle()) as { data: BotMessages | null }

  return <ConfiguracoesClient business={business} botMessages={botMessages} />
}
