import { createClient } from '@/lib/supabase/server'
import type { Business } from '@/types'

/**
 * Retorna o usuário logado e o negócio (business) do qual ele é dono.
 * Usa o client autenticado (RLS garante o isolamento por tenant).
 */
export async function getCurrentUserAndBusiness() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, business: null, supabase }

  const { data: business } = (await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()) as { data: Business | null }

  return { user, business, supabase }
}
