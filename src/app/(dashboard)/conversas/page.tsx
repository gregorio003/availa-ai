'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Clock, CheckCircle, XCircle, Bot, User, Send, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const mockConversations = [
  {
    id: '1',
    customer: 'Carlos Silva',
    phone: '(11) 99999-0001',
    lastMessage: 'Segunda às 14h. Muito obrigado!',
    lastMessageTime: '14:32',
    status: 'completed',
    unread: 0,
    messages: [
      { role: 'customer', content: 'Oi, quero lavar meu carro', time: '14:20' },
      { role: 'assistant', content: 'Olá! Que tipo de lavagem você prefere?\n1. Lavagem Simples - R$ 30\n2. Lavagem Completa - R$ 60\n3. Polimento - R$ 150', time: '14:20' },
      { role: 'customer', content: 'Completa', time: '14:22' },
      { role: 'assistant', content: 'Ótimo! Para qual dia você prefere?', time: '14:22' },
      { role: 'customer', content: 'Segunda que vem', time: '14:25' },
      { role: 'assistant', content: 'Horários disponíveis na Segunda, 18/05:\n1. Segunda, 18/05 às 08:00\n2. Segunda, 18/05 às 09:00\n3. Segunda, 18/05 às 14:00\n4. Segunda, 18/05 às 15:00\n\nQual prefere? (responda o número)', time: '14:25' },
      { role: 'customer', content: '3', time: '14:30' },
      { role: 'assistant', content: '✅ Agendado com sucesso!\n\n📅 Segunda, 18/05 às 14h\n🚗 Lavagem Completa\n📍 Rua das Flores, 123\n\nTe esperamos! Qualquer dúvida é só falar 😊', time: '14:30' },
      { role: 'customer', content: 'Segunda às 14h. Muito obrigado!', time: '14:32' },
    ]
  },
  {
    id: '2',
    customer: 'Maria Oliveira',
    phone: '(11) 99999-0002',
    lastMessage: 'Qual o endereço exato?',
    lastMessageTime: '15:10',
    status: 'active',
    unread: 1,
    messages: [
      { role: 'customer', content: 'Boa tarde! Quero agendar uma lavagem', time: '15:05' },
      { role: 'assistant', content: 'Boa tarde! Que tipo de lavagem você prefere?\n1. Lavagem Simples - R$ 30\n2. Lavagem Completa - R$ 60', time: '15:05' },
      { role: 'customer', content: 'Simples mesmo', time: '15:08' },
      { role: 'assistant', content: 'Para qual dia prefere?', time: '15:08' },
      { role: 'customer', content: 'Qual o endereço exato?', time: '15:10' },
    ]
  },
  {
    id: '3',
    customer: 'João Pereira',
    phone: '(11) 99999-0003',
    lastMessage: 'Oi quero agendar polimento',
    lastMessageTime: '09:45',
    status: 'active',
    unread: 0,
    messages: [
      { role: 'customer', content: 'Oi quero agendar polimento', time: '09:45' },
    ]
  },
]

const statusConfig = {
  active: { label: 'Ativa', color: 'text-green-600 bg-green-50', icon: Clock },
  completed: { label: 'Concluída', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  abandoned: { label: 'Abandonada', color: 'text-gray-500 bg-gray-50', icon: XCircle },
}

export default function ConversasPage() {
  const [selectedId, setSelectedId] = useState(mockConversations[0].id)
  const [manualMode, setManualMode] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, typeof mockConversations[0]['messages']>>(
    Object.fromEntries(mockConversations.map(c => [c.id, c.messages]))
  )
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selected = mockConversations.find(c => c.id === selectedId)!
  const isManual = manualMode[selectedId] ?? false
  const currentMessages = messages[selectedId] ?? []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, currentMessages])

  const toggleManualMode = () => {
    setManualMode(prev => ({ ...prev, [selectedId]: !isManual }))
  }

  const sendMessage = () => {
    if (!input.trim()) return
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), { role: 'owner', content: input.trim(), time: now }]
    }))
    setInput('')
  }

  return (
    <div className="h-full flex">
      {/* Conversation list */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Conversas</h1>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-gray-100">
          {mockConversations.map(conv => {
            const status = statusConfig[conv.status as keyof typeof statusConfig]
            const Icon = status.icon
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  'w-full text-left p-4 hover:bg-gray-50 transition-colors',
                  selectedId === conv.id && 'bg-green-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                    {conv.customer[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">{conv.customer}</span>
                      <span className="text-xs text-gray-400">{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Icon className="w-3 h-3" />
                      <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', status.color)}>
                        {status.label}
                      </span>
                      {manualMode[conv.id] && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-orange-600 bg-orange-50">
                          Manual
                        </span>
                      )}
                      {conv.unread > 0 && (
                        <span className="ml-auto text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
            {selected.customer[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{selected.customer}</p>
            <p className="text-sm text-gray-500">{selected.phone}</p>
          </div>
          <button
            onClick={toggleManualMode}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isManual
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {isManual ? (
              <>
                <Bot className="w-4 h-4" />
                Voltar ao Bot
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                Assumir conversa
              </>
            )}
          </button>
        </div>

        {/* Manual mode banner */}
        {isManual && (
          <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700">
              <span className="font-semibold">Modo manual ativo</span> — O bot está pausado. Você está respondendo diretamente.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {currentMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'customer' ? 'justify-start' : 'justify-end'
              )}
            >
              {msg.role !== 'customer' && (
                <div className="mr-2 flex flex-col items-end justify-end mb-1">
                  {msg.role === 'owner' ? (
                    <span className="text-xs text-orange-500 font-medium mb-1">Você</span>
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-green-400 mb-1" />
                  )}
                </div>
              )}
              <div
                className={cn(
                  'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line',
                  msg.role === 'customer'
                    ? 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                    : msg.role === 'owner'
                    ? 'bg-orange-500 text-white rounded-tr-sm'
                    : 'bg-green-600 text-white rounded-tr-sm'
                )}
              >
                <p>{msg.content}</p>
                <p className={cn(
                  'text-xs mt-1 text-right',
                  msg.role === 'customer' ? 'text-gray-400' : 'text-white/70'
                )}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or info bar */}
        {isManual ? (
          <div className="bg-white border-t border-gray-200 p-3 flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Bot className="w-4 h-4 text-green-500" />
              <span>Gerenciado automaticamente pelo agente de IA</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
