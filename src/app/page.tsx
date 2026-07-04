import Link from 'next/link'
import { Zap, MessageCircle, Calendar, Bot, CheckCircle, Star, ArrowRight, Clock, Users, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'Agente de IA 24h',
    description: 'Responde clientes automaticamente a qualquer hora, sem você precisar parar o trabalho.',
  },
  {
    icon: Calendar,
    title: 'Agenda integrada',
    description: 'Sincroniza com Google Agenda. Nunca mais agendamento duplicado ou fora de horário.',
  },
  {
    icon: MessageCircle,
    title: 'Via WhatsApp',
    description: 'Seus clientes já usam WhatsApp. Não precisa instalar nenhum app novo.',
  },
  {
    icon: TrendingUp,
    title: 'Backoffice completo',
    description: 'Dashboard com agenda, histórico de clientes e conversas em tempo real.',
  },
]

const niches = [
  { emoji: '🚗', name: 'Lavajatos' },
  { emoji: '💅', name: 'Unhas' },
  { emoji: '✂️', name: 'Salões' },
  { emoji: '👁️', name: 'Sobrancelhas' },
  { emoji: '🐾', name: 'Pet shops' },
  { emoji: '💪', name: 'Personal trainers' },
]

const steps = [
  { number: '01', title: 'Cliente manda mensagem', description: 'No WhatsApp normal do seu negócio' },
  { number: '02', title: 'IA entende e responde', description: 'Pergunta serviço, data e horário preferido' },
  { number: '03', title: 'Agenda é criada', description: 'Salva no Google Agenda automaticamente' },
  { number: '04', title: 'Você só aparece', description: 'Cliente atendido, horário garantido' },
]

const plans = [
  {
    name: 'Starter',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para começar',
    features: ['1 prestador', '200 conversas/mês', 'Google Agenda', 'Suporte via chat'],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 97',
    period: '/mês',
    description: 'Mais popular',
    features: ['Até 3 profissionais', '500 conversas/mês', 'Google Agenda', 'Relatórios', 'Suporte prioritário'],
    cta: 'Testar 14 dias grátis',
    highlight: true,
  },
  {
    name: 'Business',
    price: 'R$ 197',
    period: '/mês',
    description: 'Para crescer',
    features: ['Profissionais ilimitados', 'Conversas ilimitadas', 'Google Agenda', 'API própria', 'Suporte dedicado'],
    cta: 'Falar com vendas',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Availa.ai</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#como-funciona" className="hover:text-gray-900 transition">Como funciona</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Entrar
            </Link>
            <a
              href="https://wa.me/5537999181248?text=Ol%C3%A1!%20Quero%20conhecer%20a%20Availa.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Começar grátis
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Bot de agendamento via WhatsApp com IA
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Seu cliente agenda pelo{' '}
          <span className="text-green-600">WhatsApp.</span>
          <br />Você só aparece.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          A Availa.ai responde, agenda e confirma horários automaticamente 24h por dia.
          Sem você parar o trabalho para responder mensagem.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://wa.me/5537999181248?text=Ol%C3%A1!%20Quero%20conhecer%20a%20Availa.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3.5 rounded-xl transition flex items-center gap-2 text-lg"
          >
            Começar grátis
            <ArrowRight className="w-5 h-5" />
          </a>
          <a href="#como-funciona" className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2">
            Ver como funciona
          </a>
        </div>

        {/* Mock WhatsApp chat */}
        <div className="mt-16 max-w-sm mx-auto bg-gray-100 rounded-3xl p-4 shadow-2xl">
          <div className="bg-green-700 rounded-2xl rounded-b-none px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Lavajato Silva</p>
              <p className="text-green-200 text-xs">online</p>
            </div>
          </div>
          <div className="bg-[#e5ddd5] rounded-2xl rounded-t-none p-4 space-y-3">
            {[
              { from: 'customer', text: 'Oi! Quero lavar meu carro' },
              { from: 'bot', text: 'Olá! Que tipo de lavagem?\n1. Simples - R$ 30\n2. Completa - R$ 60\n3. Polimento - R$ 150' },
              { from: 'customer', text: 'Completa' },
              { from: 'bot', text: 'Horários disponíveis na Segunda:\n1. 09:00\n2. 11:00\n3. 14:00\nQual prefere?' },
              { from: 'customer', text: '3' },
              { from: 'bot', text: '✅ Agendado! Segunda às 14h\n📍 Rua das Flores, 123\nTe esperamos! 😊' },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs text-left whitespace-pre-line shadow-sm ${
                  msg.from === 'customer' ? 'bg-[#dcf8c6] text-gray-800' : 'bg-white text-gray-800'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Niches */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm font-medium mb-6">IDEAL PARA</p>
          <div className="flex flex-wrap justify-center gap-4">
            {niches.map(n => (
              <span key={n.name} className="bg-white border border-gray-200 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                {n.emoji} {n.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Como funciona</h2>
          <p className="text-gray-500 text-lg">Do primeiro contato ao agendamento em menos de 2 minutos</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Tudo que você precisa</h2>
            <p className="text-gray-500 text-lg">Configuração em 10 minutos. Sem conhecimento técnico.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="bg-green-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para automatizar seus agendamentos?
          </h2>
          <p className="text-green-100 text-lg mb-8">
            Configure em 10 minutos. Primeiro mês grátis. Sem cartão de crédito.
          </p>
          <a
            href="https://wa.me/5537999181248?text=Ol%C3%A1!%20Quero%20conhecer%20a%20Availa.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-green-700 hover:bg-green-50 font-bold px-8 py-4 rounded-xl text-lg transition inline-flex items-center gap-2"
          >
            Começar agora grátis
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-700">Availa.ai</span>
          </div>
          <p>© {new Date().getFullYear()} Availa.ai · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
