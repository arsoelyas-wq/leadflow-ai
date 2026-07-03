'use client'
import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, Gift } from 'lucide-react'
import { useRouter } from 'next/navigation'

const SECTORS = [
  'Tekstil & Konfeksiyon',
  'İnşaat & Gayrimenkul',
  'İthalat & İhracat',
  'B2B SaaS',
  'Dijital Ajans',
  'E-Ticaret',
  'Diğer',
]

const SESSION_KEY = 'sovlo_exit_popup_shown'

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [sector, setSector] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownRef = useRef(false)

  useEffect(() => {
    // Sadece bir kez göster (session başına)
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return

    const handleMouseLeave = (e: MouseEvent) => {
      // Kullanıcı sayfadan çıkmaya çalışıyor (fare üst tarafa gidiyor)
      if (e.clientY <= 5 && !shownRef.current) {
        shownRef.current = true
        timerRef.current = setTimeout(() => setVisible(true), 300)
      }
    }

    // Alternatif: 40 saniye sonra + %60 scroll geçildiyse göster
    const handleScroll = () => {
      const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (scrollPct > 0.6 && !shownRef.current) {
        shownRef.current = true
        timerRef.current = setTimeout(() => setVisible(true), 2000)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('scroll', handleScroll)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('scroll', handleScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const close = () => {
    setVisible(false)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, '1')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, '1')
    }
    // Analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'exit_intent_submit', { sector, page: 'landing' })
    }
    // Redirect to register after 1.5s
    setTimeout(() => {
      router.push(`/register?ref=exit-intent&sector=${encodeURIComponent(sector)}`)
    }, 1500)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'exitPopupIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-violet-500" />

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          aria-label="Kapat"
        >
          <X size={13} className="text-slate-500" />
        </button>

        <div className="p-7">
          {!submitted ? (
            <>
              {/* Gift badge */}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <Gift size={22} className="text-blue-600" />
              </div>

              <h3 className="text-[22px] font-black text-slate-900 leading-tight mb-2">
                Ayrılmadan önce —
              </h3>
              <p className="text-[15px] text-slate-600 leading-relaxed mb-6">
                <strong className="text-blue-600">Sektörünüzdeki ilk 50 lead&apos;i ücretsiz</strong> görmek ister misiniz?
                Email adresinizi bırakın, hemen hazırlayalım.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="" disabled>Sektörünüzü seçin...</option>
                  {SECTORS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="is@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[14px] font-bold flex items-center gap-1.5 btn-glow flex-shrink-0"
                  >
                    Al
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>

              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Spam yok. İstediğiniz zaman çıkabilirsiniz.
              </p>
            </>
          ) : (
            <div className="py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#10b981" opacity="0.15"/>
                  <path d="M6 12l4 4 8-8" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-[19px] font-black text-slate-900 mb-2">Harika!</h3>
              <p className="text-[14px] text-slate-500">
                Lead listeniz hazırlanıyor. Sizi kayıt sayfasına yönlendiriyoruz…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
