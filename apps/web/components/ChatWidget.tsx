'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, ChevronRight } from 'lucide-react'

interface Message {
  role: 'bot' | 'user'
  text: string
  options?: string[]
}

const STEPS = [
  {
    key: 'sector',
    question: 'Merhaba! 👋 Hangi sektördesiniz?',
    options: ['Toptan Ticaret', 'Üretim / Fabrika', 'İnşaat / Yapı', 'Hizmet Sektörü', 'Diğer'],
  },
  {
    key: 'goal',
    question: 'En büyük sorunun ne?',
    options: ['Yeni müşteri bulamıyorum', 'Müşterilerle iletişim zor', 'Satış takibi karmaşık', 'Rakiplerimden gerideyim'],
  },
  {
    key: 'city',
    question: 'Hangi şehirde faaliyet gösteriyorsunuz?',
    options: ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Diğer'],
  },
  {
    key: 'size',
    question: 'Aylık kaç yeni müşteriye ulaşmak istersiniz?',
    options: ['10-50', '50-100', '100-300', '300+'],
  },
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [unread, setUnread] = useState(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  // İlk açılışta ilk soruyu göster
  useEffect(() => {
    if (open && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          role: 'bot',
          text: STEPS[0].question,
          options: STEPS[0].options,
        }])
      }, 400)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // 3 sn sonra widget'ı pulse et
  useEffect(() => {
    const t = setTimeout(() => setUnread(1), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleOption = async (option: string) => {
    const currentStep = STEPS[step]
    const newAnswers = { ...answers, [currentStep.key]: option }
    setAnswers(newAnswers)

    // Kullanıcı mesajını ekle
    setMessages(prev => [...prev, { role: 'user', text: option }])

    const nextStep = step + 1

    if (nextStep < STEPS.length) {
      // Sonraki soruyu göster
      setStep(nextStep)
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: STEPS[nextStep].question,
          options: STEPS[nextStep].options,
        }])
      }, 600)
    } else {
      // Tüm sorular bitti — AI yanıtı al
      setStep(nextStep)
      setLoading(true)

      try {
        const res = await fetch('/api/ai/sales-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: newAnswers }),
        })
        const data = await res.json()
        setMessages(prev => [...prev, {
          role: 'bot',
          text: data.message || 'LeadFlow AI tam size göre! Hemen başlayalım. 🚀',
        }])
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'bot',
            text: '📧 Email adresinizi bırakın, 14 günlük ücretsiz denemenizi başlatalım!',
          }])
          setDone(true)
        }, 1000)
      } catch {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: 'LeadFlow AI ile her ay yüzlerce yeni müşteriye ulaşabilirsiniz! 🚀\n\n14 gün ücretsiz deneyin.',
        }])
        setDone(true)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) return
    setEmailSent(true)
    setMessages(prev => [...prev, { role: 'user', text: email }])
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '✅ Harika! Sizi en kısa sürede arayacağız. Şimdi ücretsiz denemeye başlayabilirsiniz! 🎉',
      }])
    }, 500)
  }

  return (
    <>
      {/* Açık/kapalı buton */}
      <div className="fixed bottom-6 right-6 z-50">
        {!open && (
          <button
            onClick={() => { setOpen(true); setUnread(0) }}
            className="relative w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <MessageSquare size={22} className="text-white" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold animate-bounce">
                {unread}
              </span>
            )}
          </button>
        )}

        {/* Chat penceresi */}
        {open && (
          <div className="w-80 sm:w-96 bg-[#0F1520] border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
            style={{ height: '520px' }}>

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageSquare size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">LeadFlow AI</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-blue-100 text-xs">Çevrimiçi</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm'
                    : 'space-y-2'
                  }`}>
                    {msg.role === 'bot' ? (
                      <>
                        <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </div>
                        {msg.options && step <= STEPS.indexOf(STEPS.find(s => s.question === msg.text) || STEPS[0]) && (
                          <div className="space-y-1.5 mt-2">
                            {msg.options.map(opt => (
                              <button
                                key={opt}
                                onClick={() => handleOption(opt)}
                                className="w-full text-left px-3 py-2 bg-slate-800/80 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/50 text-slate-300 hover:text-white rounded-xl text-xs transition flex items-center justify-between group"
                              >
                                {opt}
                                <ChevronRight size={12} className="text-slate-600 group-hover:text-blue-400 transition" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Email input veya CTA */}
            <div className="p-3 border-t border-slate-700/50">
              {done && !emailSent ? (
                <div className="flex gap-2">
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                    placeholder="email@sirketiniz.com"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!email.includes('@')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl transition"
                  >
                    <Send size={15} className="text-white" />
                  </button>
                </div>
              ) : emailSent ? (
                <a href="/register"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition">
                  Ücretsiz Başla 🚀
                </a>
              ) : (
                <p className="text-center text-slate-600 text-xs">Seçeneklerden birini seçin</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}