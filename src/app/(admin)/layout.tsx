import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Zap, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ThemeToggle'

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
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-gray-900 dark:text-white font-bold text-sm block">Availa</span>
            <span className="text-gray-400 dark:text-gray-500 text-[10px]">Painel do administrador</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white text-sm transition"
          >
            <Users className="w-4 h-4" />
            Clientes
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <ThemeToggle />
          <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-1 truncate">{user.email}</p>
          <form action="/api/auth/signout" method="POST">
            <button className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white text-sm transition">
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
