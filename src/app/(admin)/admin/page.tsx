import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserPlus, CheckCircle2, XCircle, MessageCircle } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Business } from '@/types'

export const dynamic = 'force-dynamic'

const nicheLabels: Record<string, string> = {
  lavajato: '🚗 Lavajato',
  salao: '✂️ Salão',
  sobrancelha: '👁️ Sobrancelhas',
  unhas: '💅 Unhas',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Lista todos os estabelecimentos (usa service client após o layout já validar super_admin)
  const service = createServiceClient()
  const { data: businesses } = (await service
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })) as { data: Business[] | null }

  const list = businesses ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{list.length} estabelecimento(s) cadastrado(s)</p>
        </div>
        <Link
          href="/admin/novo"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <UserPlus className="w-4 h-4" />
          Novo cliente
        </Link>
      </div>

      <div className="space-y-3">
        {list.map((b) => (
          <div
            key={b.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-gray-900 dark:text-white font-semibold truncate">{b.name}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {nicheLabels[b.niche] ?? b.niche} · plano {b.plan} · comissão {b.commission_pct}%
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {b.subscription_valid_until
                  ? `Válido até ${new Date(b.subscription_valid_until).toLocaleDateString('pt-BR')}`
                  : 'Sem validade definida'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  b.whatsapp_connected ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {b.whatsapp_connected ? 'WhatsApp on' : 'WhatsApp off'}
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  b.active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {b.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {b.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div className="text-center py-16 text-gray-500 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
            <p>Nenhum cliente cadastrado ainda.</p>
            <Link href="/admin/novo" className="text-green-600 dark:text-green-400 hover:text-green-500 text-sm mt-2 inline-block">
              Cadastrar primeiro cliente →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
