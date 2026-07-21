import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Business } from '@/types'
import { ClientEditor } from './ClientEditor'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: business } = (await service
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single()) as { data: Business | null }

  if (!business) notFound()

  // E-mail e nome do dono
  let ownerEmail = ''
  let ownerName = ''
  if (business.owner_user_id) {
    const { data: userRes } = await service.auth.admin.getUserById(business.owner_user_id)
    ownerEmail = userRes.user?.email ?? ''
    const { data: profile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', business.owner_user_id)
      .single()
    ownerName = profile?.full_name ?? ''
  }

  return <ClientEditor business={business} ownerEmail={ownerEmail} ownerName={ownerName} />
}
