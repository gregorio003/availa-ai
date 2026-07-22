import Link from 'next/link'
import { Zap, MessageCircle, Calendar, Bot, ArrowRight, TrendingUp } from 'lucide-react'

const WA = 'https://wa.me/5537999181248?text=Ol%C3%A1!%20Quero%20conhecer%20a%20Availa.ai'

const features = [
  { icon: Bot, title: 'Agente de IA 24h', description: 'Responde clientes automaticamente a qualquer hora, sem você precisar parar o trabalho.' },
  { icon: Calendar, title: 'Agenda integrada', description: 'Sincroniza com Google Agenda. Nunca mais agendamento duplicado ou fora de horário.' },
  { icon: MessageCircle, title: 'Via WhatsApp', description: 'Seus clientes já usam WhatsApp. Não precisa instalar nenhum app novo.' },
  { icon: TrendingUp, title: 'Backoffice completo', description: 'Dashboard com agenda, histórico de clientes e conversas em tempo real.' },
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

export default function LandingPage() {
  return (
    <div className="min-h-screen text-gray-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center glow" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
              <Zap className="w-5 h-5 text-[#04140c]" />
            </div>
            <span className="text-lg font-semibold text-white">Availa<span className="text-emerald-400">.ai</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#como-funciona" className="hover:text-white transition">Como funciona</a>
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white font-medium transition">Entrar</Link>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-[#04140c] glow transition"
              style={{ background: 'linear-gradient(135deg,#34d399,#22c55e)' }}>
              Começar grátis
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-8 text-emerald-200"
          style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 10px #34d399' }} />
          Bot de agendamento via WhatsApp com IA
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
          Seu cliente agenda pelo{' '}
          <span className="bg-gradient-to-r from-emerald-300 to-green-500 bg-clip-text text-transparent">WhatsApp.</span>
          <br />Você só aparece.
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          A Availa.ai responde, agenda e confirma horários automaticamente 24h por dia.
          Sem você parar o trabalho para responder mensagem.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={WA} target="_blank" rel="noopener noreferrer"
            className="text-[#04140c] font-semibold px-8 py-3.5 rounded-xl transition flex items-center gap-2 text-lg glow"
            style={{ background: 'linear-gradient(135deg,#34d399,#22c55e)' }}>
            Começar grátis <ArrowRight className="w-5 h-5" />
          </a>
          <a href="#como-funciona" className="text-gray-300 hover:text-white font-medium flex items-center gap-2 transition">
            Ver como funciona
          </a>
        </div>

        {/* Mock WhatsApp chat */}
        <div className="mt-16 max-w-sm mx-auto glass rounded-3xl p-4">
          <div className="rounded-2xl rounded-b-none px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(5,150,105,0.25)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
              <Zap className="w-4 h-4 text-[#04140c]" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Lavajato Silva</p>
              <p className="text-emerald-300/80 text-xs">online</p>
            </div>
          </div>
          <div className="rounded-2xl rounded-t-none p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {[
              { from: 'customer', text: 'Oi! Quero lavar meu carro' },
              { from: 'bot', text: 'Olá! Que tipo de lavagem?\n1. Simples - R$ 30\n2. Completa - R$ 60\n3. Polimento - R$ 150' },
              { from: 'customer', text: 'Completa' },
              { from: 'bot', text: 'Horários na Segunda:\n1. 09:00\n2. 11:00\n3. 14:00\nQual prefere?' },
              { from: 'customer', text: '3' },
              { from: 'bot', text: '✅ Agendado! Segunda às 14h\n📍 Rua das Flores, 123\nTe esperamos! 😊' },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs text-left whitespace-pre-line"
                  style={msg.from === 'customer'
                    ? { background: 'linear-gradient(135deg,rgba(52,211,153,0.9),rgba(16,185,129,0.9))', color: '#04140c' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6e9e8' }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Niches */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-xs font-semibold tracking-[0.2em] uppercase mb-6">Ideal para</p>
          <div className="flex flex-wrap justify-center gap-3">
            {niches.map(n => (
              <span key={n.name} className="glass px-5 py-2.5 rounded-full text-sm font-medium text-gray-200">
                {n.emoji} {n.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Como funciona</h2>
          <p className="text-gray-400 text-lg">Do primeiro contato ao agendamento em menos de 2 minutos</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="glass rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4 text-emerald-300"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
                {step.number}
              </div>
              <h3 className="font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Tudo que você precisa</h2>
            <p className="text-gray-400 text-lg">Configuração em 10 minutos. Sem conhecimento técnico.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div key={i} className="glass glass-hover rounded-2xl p-6 transition">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.22)' }}>
                  <f.icon className="w-5 h-5 text-emerald-300" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="glass rounded-3xl px-6 py-14 text-center">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Pronto para automatizar seus agendamentos?</h2>
            <p className="text-gray-400 text-lg mb-8">
              Configure em 10 minutos e comece a atender clientes automaticamente hoje mesmo. Fale com a gente e descubra como.
            </p>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="text-[#04140c] font-bold px-8 py-4 rounded-xl text-lg transition inline-flex items-center gap-2 glow"
              style={{ background: 'linear-gradient(135deg,#34d399,#22c55e)' }}>
              Começar agora grátis <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
              <Zap className="w-3.5 h-3.5 text-[#04140c]" />
            </div>
            <span className="font-semibold text-gray-300">Availa<span className="text-emerald-400">.ai</span></span>
          </div>
          <p>© {new Date().getFullYear()} Availa.ai · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
