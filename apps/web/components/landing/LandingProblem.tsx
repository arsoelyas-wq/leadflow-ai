'use client'
import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'

const COMPARISON = [
  {
    before: 'Günde saatlerce manuel lead araması',
    after: '7/24 otomatik, sürekli güncellenen lead akışı',
  },
  {
    before: 'Herkese giden, spam görünen şablon mesajlar',
    after: 'Her lead\'e özel, doğal görünen mesajlar',
  },
  {
    before: 'Excel\'de dağınık takip, kaçan fırsatlar',
    after: 'Tek ekranda canlı pipeline ve otomatik hatırlatma',
  },
  {
    before: 'Pahalı SDR ekibi veya ajans gideri',
    after: 'SDR maliyetinin onda biriyle aynı sonuç',
  },
]

export default function LandingProblem() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[13px] font-semibold mb-6">
              Neden Değiştirmelisiniz?
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Manuel satış artık{' '}
              <span className="gradient-text-blue">rekabetçi değil</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              Eski yöntem zaman ve fırsat kaybettiriyor. Fark, ilk haftadan görülüyor.
            </p>
          </div>
        </Reveal>

        {/* Comparison */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {COMPARISON.map((row, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-6 items-center px-6 sm:px-8 py-6">
                <p className="text-[15px] text-slate-500 line-through">{row.before}</p>
                <ArrowRight className="hidden sm:block text-slate-300 flex-shrink-0" size={18} />
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-emerald-600" strokeWidth={3} />
                  </div>
                  <p className="text-[15px] font-semibold text-slate-900">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
          >
            14 Gün Ücretsiz Başla
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
