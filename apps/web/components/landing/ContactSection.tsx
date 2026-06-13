'use client'
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Mail, MessageCircle, MapPin, Clock, Send, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

const SUBJECTS = ['Genel Soru', 'Satış & Fiyatlandırma', 'Teknik Destek', 'Ortaklık & İş Birliği', 'Diğer']

const CONTACT_INFO = [
  { icon: Mail, label: 'E-posta', value: 'destek@leadflow.ai', href: 'mailto:destek@leadflow.ai' },
  { icon: MessageCircle, label: 'WhatsApp', value: '+90 500 000 00 00', href: 'https://wa.me/905000000000' },
  { icon: MapPin, label: 'Ofis', value: 'Maslak, İstanbul, Türkiye', href: null },
  { icon: Clock, label: 'Çalışma Saatleri', value: 'Pzt - Cum, 09:00 - 18:00 (GMT+3)', href: null },
]

const initialForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  subject: SUBJECTS[0],
  message: '',
}

type Status = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors'

const labelClass = 'block text-[13px] font-semibold text-slate-700 mb-1.5'

export default function ContactSection() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const update = (field: keyof typeof initialForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin.')
        setStatus('error')
        return
      }

      setStatus('success')
      setForm(initialForm)
    } catch {
      setErrorMessage('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
      setStatus('error')
    }
  }

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('leadflow:open-chat'))
  }

  return (
    <section className="pb-20 lg:pb-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Form */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 lg:p-10">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <h3 className="text-[22px] font-bold text-slate-900 mb-2">Mesajınız Alındı!</h3>
                <p className="text-[15px] text-slate-500 leading-relaxed max-w-sm mb-6">
                  Teşekkürler! Ekibimiz mesajınızı inceleyip 24 saat içinde size geri dönüş yapacak.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-[14px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Yeni Mesaj Gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[24px] lg:text-[28px] font-black text-slate-900 tracking-tight mb-1">
                    Mesaj Gönderin
                  </h2>
                  <p className="text-[14px] text-slate-500">
                    Formu doldurun, ekibimiz size en kısa sürede dönüş yapsın.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className={labelClass}>
                      Ad Soyad <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={update('name')}
                      placeholder="Adınız Soyadınız"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className={labelClass}>
                      Şirket
                    </label>
                    <input
                      id="company"
                      type="text"
                      value={form.company}
                      onChange={update('company')}
                      placeholder="Şirket Adı"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      E-posta <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={update('email')}
                      placeholder="ornek@sirketiniz.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Telefon
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={update('phone')}
                      placeholder="+90 5XX XXX XX XX"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className={labelClass}>
                    Konu
                  </label>
                  <select
                    id="subject"
                    value={form.subject}
                    onChange={update('subject')}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className={labelClass}>
                    Mesaj <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={update('message')}
                    placeholder="Size nasıl yardımcı olabiliriz?"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {status === 'error' && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow disabled:opacity-60 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      Mesajı Gönder
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Live chat CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-6 text-white shadow-lg shadow-blue-500/20">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                <MessageCircle size={18} />
              </div>
              <h3 className="text-[17px] font-bold mb-1.5">Hemen Canlı Sohbet Başlatın</h3>
              <p className="text-[13px] text-blue-100 leading-relaxed mb-4">
                Sorularınıza anında yanıt almak için AI destekli canlı sohbet asistanımızla konuşun.
              </p>
              <button
                onClick={openChat}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 text-[13px] font-bold hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Canlı Sohbeti Aç
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Contact info */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 flex flex-col gap-5">
              {CONTACT_INFO.map(item => {
                const Icon = item.icon
                const href = item.href
                const body = (
                  <>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {item.label}
                    </div>
                    <div className="text-[14px] font-semibold text-slate-800">
                      {item.value}
                    </div>
                  </>
                )
                return (
                  <div key={item.label} className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-blue-600" />
                    </div>
                    <div>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith('http') ? '_blank' : undefined}
                          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {body}
                        </a>
                      ) : body}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
