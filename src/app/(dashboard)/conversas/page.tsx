'use client'

import { useState } from 'react'
import { MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react'
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
  const selected = mockConversations.find(c => c.id === selectedId)!

  return (
    <div className="h-full flex">
      {/* Conversation list */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
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
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
            {selected.customer[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{selected.customer}</p>
            <p className="text-sm text-gray-500">{selected.phone}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {selected.messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'customer' ? 'justify-start' : 'justify-end'
              )}
            >
              <div
                className={cn(
                  'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line',
                  msg.role === 'customer'
                    ? 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                    : 'bg-green-600 text-white rounded-tr-sm'
                )}
              >
                <p>{msg.content}</p>
                <p className={cn(
                  'text-xs mt-1 text-right',
                  msg.role === 'customer' ? 'text-gray-400' : 'text-green-200'
                )}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Info bar */}
        <div className="bg-white border-t border-gray-200 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MessageCircle className="w-4 h-4 text-green-500" />
            <span>Gerenciado automaticamente pelo agente de IA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
