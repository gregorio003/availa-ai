'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Loader2, RotateCcw } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }
type Ctx = Record<string, unknown>

export default function TestarBotPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [context, setContext] = useState<Ctx>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Carrega a saudação configurada como primeira mensagem
  useEffect(() => {
    fetch('/api/client/bot-messages')
      .then((r) => r.json())
      .then((d) => {
        if (d.messages?.greeting) setMessages([{ role: 'assistant', content: d.messages.greeting }])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const history = messages
    setMessages((m) => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch('/api/client/bot-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message: text, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      setContext(data.context ?? {})
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ ' + (e instanceof Error ? e.message : 'Erro') }])
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setContext({})
    fetch('/api/client/bot-messages')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages?.greeting ? [{ role: 'assistant', content: d.messages.greeting }] : []))
      .catch(() => setMessages([]))
  }

  return (
    <div className="p-8 h-full flex flex-col max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Testar bot</h1>
          <p className="text-gray-500 text-sm">Converse como se fosse o cliente. Os horários são calculados de verdade pelas suas regras.</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <RotateCcw className="w-4 h-4" /> Reiniciar
        </button>
      </div>

      {/* Chat */}
      <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
            <Bot className="w-4 h-4 text-[#04140c]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Simulação do bot</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">online</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 min-h-[300px]">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-10">Envie uma mensagem para começar. Ex: “Oi, quero agendar”.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line"
                style={
                  m.role === 'user'
                    ? { background: 'linear-gradient(135deg,#34d399,#22c55e)', color: '#04140c', borderBottomRightRadius: 4 }
                    : undefined
                }
              >
                <span className={m.role === 'user' ? '' : 'text-gray-800 dark:text-gray-100'}>{m.content}</span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 text-gray-500 text-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> digitando...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-black/10 dark:border-white/10 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Digite como cliente..."
            rows={1}
            className="flex-1 px-3 py-2.5 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl text-[#04140c] glow disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg,#34d399,#22c55e)' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
