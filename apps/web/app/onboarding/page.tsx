'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Zap, Send, ArrowRight, CheckCircle, User, Bot } from 'lucide-react'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

const STEPS = [
  { key: 'sector', question: (name: string) => `Merhaba ${name}! 👋 Ben LeadFlow AI asistanınım. Sizi sisteme alıştırmak için buradayım.\n\nÖncelikle — hangi sektörde faaliyet gösteriyorsunuz?`, type: 'chips', options: ['Dekorasyon / Mobilya', 'Tekstil', 'İnşaat', 'Gıda / Restoran', 'Teknoloji', 'Hizmet', 'Diğer'] },
  { key: 'goal', question: () => 'Harika! LeadFlow AI ile öncelikli hedefiniz ne?', type: 'chips', options: ['Yeni müşteri bulmak', 'Mevcut leadleri takip etmek', 'Kampanya göndermek', 'Hepsini yapmak'] },
  { key: 'channel', question: () => 'Müşterilerinize hangi kanal üzerinden ulaşmayı tercih edersiniz?', type: 'chips', options: ['WhatsApp', 'Email', 'Her ikisi de'] },
  { key: 'city', question: () => 'Hangi şehirde veya bölgede lead arıyorsunuz?', type: 'input', placeholder: 'örn: İstanbul, Ankara...' },
  { key: 'done', question: (name: string, answers: any) => `Mükemmel! ${name}, size özel planınız hazır 🎯\n\n✅ Sektör: ${answers.sector}\n✅ Hedef: ${answers.goal}\n✅ Kanal: ${answers.channel}\n✅ Şehir: ${answers.city}\n\nŞimdi sistemi kullanmaya başlayabilirsiniz. İlk olarak ne yapmak istersiniz?`, type: 'chips', options: ['Lead çekmeye başla', 'Kampanya oluştur', 'WhatsApp bağla', 'Dashboard\'a git'] },
]

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [aiMessages, setAiMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const name = user?.name?.split(' ')[0] || 'Merhaba'

  useEffect(() => {
    // İlk mesajı göster
    setTimeout(() => {
      const firstQ = STEPS[0].question(name, {})
      setMessages([{ role: 'assistant', content: firstQ }])
    }, 500)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages(prev => [...prev, { role, content }])
  }

  const handleAnswer = async (answer: string) => {
    const currentStep = STEPS[step]
    const newAnswers = { ...answers, [currentStep.key]: answer }
    setAnswers(newAnswers)

    addMessage('user', answer)

    if (step === STEPS.length - 2) {
      // Son adım
      setTimeout(() => {
        const finalMsg = STEPS[STEPS.length - 1].question(name, newAnswers)
        addMessage('assistant', finalMsg)
        setStep(STEPS.length - 1)
      }, 600)
    } else if (step === STEPS.length - 1) {
      // Onboarding bitti — yönlendir
      await completeOnboarding(answer, newAnswers)
    } else {
      setTimeout(() => {
        const nextStep = STEPS[step + 1]
        addMessage('assistant', nextStep.question(name, newAnswers))
        setStep(s => s + 1)
      }, 600)
    }
  }

  const completeOnboarding = async (choice: string, finalAnswers: any) => {
    setLoading(true)
    try {
      await api.post('/api/settings', { company_name: finalAnswers.sector })
      await fetch('/api/auth/complete-onboarding', { method: 'POST' }).catch(() => {})
    } catch {}

    setTimeout(() => {
      if (choice === 'Lead çekmeye başla') router.push('/leads/scrape')
      else if (choice === 'Kampanya oluştur') router.push('/campaigns/new')
      else if (choice === 'WhatsApp bağla') router.push('/settings')
      else router.push('/dashboard')
    }, 500)
  }

  const handleInputSubmit = () => {
    if (!input.trim()) return
    if (aiMode) {
      sendAiMessage(input)
    } else {
      handleAnswer(input)
    }
    setInput('')
  }

  const sendAiMessage = async (text: string) => {
    const newMessages: Message[] = [...aiMessages, { role: 'user', content: text }]
    setAiMessages(newMessages)
    addMessage('user', text)
    setLoading(true)

    try {
      const data = await api.post('/api/ai/chat', {
        messages: newMessages,
        context: 'onboarding',
      })
      const reply = data.reply || 'Üzgünüm, bir hata oluştu.'
      setAiMessages(prev => [...prev, { role: 'assistant', content: reply }])
      addMessage('assistant', reply)
    } catch {
      addMessage('assistant', 'Bir hata oluştu, tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = STEPS[Math.min(step, STEPS.length - 1)]
  const isLastStep = step === STEPS.length - 1

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">LeadFlow AI'ya Hoş Geldiniz</h1>
          <p className="text-slate-400 mt-1 text-sm">Size özel kurulum yapıyoruz</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.slice(0, -1).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* Chat */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="h-96 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant' ? 'bg-blue-600' : 'bg-slate-700'
                }`}>
                  {msg.role === 'assistant' ? <Bot size={15} className="text-white" /> : <User size={15} className="text-white" />}
                </div>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'assistant'
                    ? 'bg-slate-800 text-slate-200 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-700/50 p-4">
            {!aiMode && currentStep.type === 'chips' && (
              <div className="flex flex-wrap gap-2 mb-3">
                {currentStep.options?.map(opt => (
                  <button key={opt} onClick={() => handleAnswer(opt)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600/20 border border-slate-600 hover:border-blue-500/50 text-slate-300 hover:text-white text-sm rounded-xl transition">
                    {opt}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInputSubmit()}
                placeholder={aiMode ? 'Bir şey sorun...' : currentStep.placeholder || 'Yazmak için tıklayın...'}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
              <button onClick={handleInputSubmit} disabled={!input.trim() || loading}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl flex items-center justify-center transition">
                <Send size={16} className="text-white" />
              </button>
            </div>

            {!aiMode && !isLastStep && (
              <button onClick={() => setAiMode(true)}
                className="text-slate-500 hover:text-slate-300 text-xs mt-2 transition">
                💬 Soru sormak mı istiyorsunuz? AI asistana sorun →
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <div className="text-center mt-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-slate-600 hover:text-slate-400 text-sm transition">
            Kurulumu atla, direkt giriş yap →
          </button>
        </div>
      </div>
    </div>
  )
}