'use client'
import { X, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const PROBLEMS = [
  'Günde 8+ saat manuel lead araması',
  'Kişiselleştirilmemiş, spam görünen mesajlar',
  'Excel/sheet ile dağınık lead takibi',
  'Pahalı SDR ekibi veya freelance gideri',
  'Hangi kanalın işe yaradığını bilememek',
  'Kampanya sonuçlarını takip edememek',
]

const SOLUTIONS = [
  '7/24 otomatik lead toplama — siz uyurken bile',
  'Claude AI ile her müşteriye özel, doğal mesajlar',
  'Pipeline, skor ve durum takibi tek ekranda',
  'SDR maliyetinin onda biri ile aynı sonuç',
  'WhatsApp, Email, SMS — tek platformdan',
  'Canlı analitik, ROI ve dönüşüm raporu',
]

export default function LandingProblem() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[13px] font-semibold mb-6">
            Neden Değiştirmelisiniz?
          </div>
          <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
            Manuel satış artık{' '}
            <span className="gradient-text-blue">rekabetçi değil</span>
          </h2>
          <p className="text-[17px] text-slate-500 leading-relaxed">
            Rakipleriniz AI ile otomatik büyürken siz hâlâ saatler harcıyorsanız, fark her geçen gün açılıyor.
          </p>
        </div>

        {/* Comparison */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Old Way */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-7 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                <X size={16} className="text-rose-500" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-900">Eski Yol</div>
                <div className="text-[12px] text-slate-400">Manuel, yavaş ve pahalı</div>
              </div>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              {PROBLEMS.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X size={10} className="text-rose-500" strokeWidth={3} />
                  </div>
                  <span className="text-[14px] text-slate-500 leading-snug">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Way */}
          <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden shadow-sm relative">
            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.15)' }} />

            <div className="px-7 py-5 border-b border-emerald-50 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04), transparent)' }}>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={16} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-900">LeadFlow AI ile</div>
                <div className="text-[12px] text-emerald-600 font-medium">Otomatik, hızlı ve ölçeklenebilir</div>
              </div>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              {SOLUTIONS.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle size={10} className="text-emerald-500" />
                  </div>
                  <span className="text-[14px] text-slate-700 leading-snug font-medium">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
          >
            Farkı Hemen Gör — Ücretsiz Başla
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  )
}
