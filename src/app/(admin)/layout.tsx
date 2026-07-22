import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Zap, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Só super admin entra aqui. Cliente vai para o painel dele.
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 glass border-r border-white/10 flex flex-col shrink-0 rounded-none">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center glow" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
            <Zap className="w-4 h-4 text-[#04140c]" />
          </div>
          <div className="leading-tight">
            <span className="text-white font-semibold text-sm block">Availa<span className="text-emerald-400">.ai</span></span>
            <span className="text-gray-500 text-[10px]">Painel do administrador</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white text-sm transition"
          >
            <Users className="w-4 h-4" />
            Clientes
          </Link>
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <p className="text-xs text-gray-500 px-3 py-1 truncate">{user.email}</p>
          <form action="/api/auth/signout" method="POST">
            <button className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-gray-400 hover:bg-white/5 hover:text-white text-sm transition">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
