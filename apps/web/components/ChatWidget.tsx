'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Zap, ArrowRight, Loader2 } from 'lucide-react'

interface Message {
  role: 'assistant' | 'user'
  content: string
  options?: string[]
}

const FLOW: { key: string; text: string; options?: string[] }[] = [
  {
    key: 'welcome',
    text: 'Merhaba! ðŸ‘‹ Ben LeadFlow AI. Size birkaÃ§ soru soracaÄŸÄ±m ve iÅŸinize nasÄ±l yardÄ±mcÄ± olabileceÄŸimi gÃ¶stereceÄŸim.\n\nHangi sektÃ¶rde faaliyet gÃ¶steriyorsunuz?',
    options: ['Dekorasyon / Mobilya', 'Tekstil / Giyim', 'Ä°nÅŸaat / YapÄ±', 'GÄ±da / Restoran', 'Teknoloji', 'Hizmet SektÃ¶rÃ¼', 'DiÄŸer']
  },
  {
    key: 'goal',
    text: 'Harika! Peki ÅŸu an en bÃ¼yÃ¼k zorluÄŸunuz ne?',
    options: ['Yeni mÃ¼ÅŸteri bulmak zor', 'MÃ¼ÅŸterilere ulaÅŸmak zaman alÄ±yor', 'Rakipler Ã¶nÃ¼me geÃ§iyor', 'SatÄ±ÅŸ sÃ¼recim verimsiz']
  },
  {
    key: 'city',
    text: 'AnladÄ±m. Hangi ÅŸehirde veya bÃ¶lgede mÃ¼ÅŸteri arÄ±yorsunuz?',
    options: ['Ä°stanbul', 'Ankara', 'Ä°zmir', 'Bursa', 'Antalya', 'DiÄŸer ÅŸehir']
  },
  {
    key: 'size',
    text: 'Son olarak â€” ayda kaÃ§ yeni mÃ¼ÅŸteri kazanmak istersiniz?',
    options: ['5-10 mÃ¼ÅŸteri', '10-30 mÃ¼ÅŸteri', '30-50 mÃ¼ÅŸteri', '50+ mÃ¼ÅŸteri']
  },
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [pulse, setPulse] = useState(true)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          role: 'assistant',
          content: FLOW[0].text,
          options: FLOW[0].options
        }])
      }, 400)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Pulse durur 5 saniye sonra
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000)
    return () => clearTimeout(t)
  }, [])

  const handleOption = (option: string) => {
    const currentFlow = FLOW[step]
    const newAnswers = { ...answers, [currentFlow.key]: option }
    setAnswers(newAnswers)

    setMessages(prev => [...prev, { role: 'user', content: option }])
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      if (step < FLOW.length - 1) {
        const next = FLOW[step + 1]
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: next.text,
          options: next.options
        }])
        setStep(s => s + 1)
      } else {
        // Son adÄ±m â€” AI ile Ã¶zel mesaj Ã¼ret
        generateFinalMessage(newAnswers)
      }
    }, 800)
  }

  const generateFinalMessage = async (finalAnswers: Record<string, string>) => {
    setLoading(true)
    try {
      const response = await fetch('https://leadflow-ai-production.up.railway.app/api/ai/sales-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers })
      })
      const data = await response.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || getFallbackMessage(finalAnswers)
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: getFallbackMessage(finalAnswers)
      }])
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  const getFallbackMessage = (ans: Record<string, string>) => {
    return `MÃ¼kemmel! Ä°ÅŸte size Ã¶zel planÄ±m ðŸŽ¯\n\n${ans.city} bÃ¶lgesinde ${ans.welcome} sektÃ¶rÃ¼nde faaliyet gÃ¶steren iÅŸletmeler iÃ§in LeadFlow AI ÅŸunlarÄ± yapabilir:\n\nâœ… Google Maps'ten otomatik potansiyel mÃ¼ÅŸteri bulur\nâœ… WhatsApp ile kiÅŸiselleÅŸtirilmiÅŸ mesaj gÃ¶nderir\nâœ… ${ans.size} hedefine ulaÅŸmanÄ±za yardÄ±mcÄ± olur\n\nÃœcretsiz baÅŸlayÄ±n, ilk 50 lead hediyemiz! ðŸŽ`
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!open && pulse && (
          <div className="bg-white text-slate-800 text-sm font-medium px-4 py-2 rounded-2xl shadow-lg animate-bounce">
            ðŸ’¬ Size nasÄ±l yardÄ±mcÄ± olabilirim?
          </div>
        )}
        <button
          onClick={() => { setOpen(o => !o); setPulse(false) }}
          className="relative w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-2xl flex items-center justify-center transition-all"
        >
          {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
          {!open && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
          )}
          {!open && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-[#0d1117] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">LeadFlow AI Asistan</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="text-blue-200 text-xs">Ã‡evrimiÃ§i</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/60 hover:text-white transition">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm'
                  : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-line'
                }`}>
                  {msg.content}
                  {msg.role === 'assistant' && msg.options && step === messages.filter(m => m.role === 'assistant').length - 1 && !done && (
                    <div className="flex flex-col gap-1.5 mt-3">
                      {msg.options.map(opt => (
                        <button key={opt} onClick={() => handleOption(opt)}
                          className="text-left px-3 py-2 bg-slate-700 hover:bg-blue-600/30 border border-slate-600 hover:border-blue-500/50 text-slate-300 hover:text-white text-xs rounded-xl transition">
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* CTA when done */}
          {done && (
            <div className="p-4 border-t border-slate-700/50">
              <a href="/register"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
                <Zap size={15} /> Ãœcretsiz BaÅŸla â€” 50 Kredi Hediye
                <ArrowRight size={15} />
              </a>
              <p className="text-center text-slate-500 text-xs mt-2">Kredi kartÄ± gerekmez</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}