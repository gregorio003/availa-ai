'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | null)
    const current = saved ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setTheme(current)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className={
        className ??
        'flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition'
      }
    >
      {mounted && theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4" /> Tema claro
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" /> Tema escuro
        </>
      )}
    </button>
  )
}
