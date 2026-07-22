'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  Settings,
  Wrench,
  LogOut,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/servicos', label: 'Serviços', icon: Wrench },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/conversas', label: 'Conversas', icon: MessageCircle },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar({ businessName, email }: { businessName: string; email: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 glass border-r border-white/10 flex flex-col shrink-0 rounded-none">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center glow" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
            <Zap className="w-5 h-5 text-[#04140c]" />
          </div>
          <span className="text-xl font-semibold text-white">Availa<span className="text-emerald-400">.ai</span></span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Agendamentos inteligentes</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-sm font-semibold text-green-700 dark:text-green-300 shrink-0">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{businessName}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
