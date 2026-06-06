'use client'
import Link from 'next/link'
import { ArrowRight, Play, CheckCircle, TrendingUp, Users, Zap } from 'lucide-react'

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[600px] mx-auto animate-float">
      {/* Browser chrome */}
      <div className="bg-slate-200 rounded-t-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 bg-slate-100 rounded-lg py-1.5 px-3">
          <p className="text-slate-400 text-[11px] text-center font-medium">app.leadflow.ai/dashboard</p>
        </div>
      </div>

      {/* Dashboard UI */}
      <div
        className="rounded-b-2xl overflow-hidden shadow-2xl"
        style={{ background: '#060a14', height: 400 }}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div
            className="flex-shrink-0 flex flex-col items-center py-4 gap-3"
            style={{ width: 54, background: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Zap size={14} className="text-white fill-white" />
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20 mt-2" />
            {[0,1,2,3,4,5,6,7].map(i => (
              <div
                key={i}
                className={`w-7 h-1.5 rounded-full transition-colors ${i === 0 ? 'bg-blue-500' : 'bg-white/10'}`}
                style={{ width: i === 0 ? 28 : 20 }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-[12px] font-bold">Dashboard</div>
                <div className="text-white/30 text-[9px]">Hoşgeldiniz, Ahmet Bey</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                  <span className="text-emerald-400 text-[8px] font-semibold">Canlı</span>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: '2,847', l: 'Lead', c: '#3b82f6' },
                { v: '₺874K', l: 'Pipeline', c: '#10b981' },
                { v: '%87', l: 'Dönüşüm', c: '#8b5cf6' },
                { v: '4,203', l: 'Kredi', c: '#f59e0b' },
              ].map(s => (
                <div key={s.l} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[11px] font-extrabold" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-white/25 text-[8px] mt-0.5">{s.l}</div>
                  <div className="mt-1.5 flex items-end gap-px h-5">
                    {[3,5,4,7,5,8,6,9].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 8}%`, background: `${s.c}50` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart + Funnel */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 100px' }}>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-white/30 text-[8px] mb-2 font-semibold">Mesaj Trendi — Son 14 gün</div>
                <div className="flex items-end gap-0.5 h-10">
                  {[3,5,4,6,5,8,7,9,8,11,9,12,11,14].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${h * 6}%`,
                        background: i >= 12 ? 'rgba(59,130,246,0.9)' : i >= 10 ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.25)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-white/30 text-[8px] mb-2 font-semibold">Pipeline</div>
                {[
                  { l: 'Yeni', p: 100, c: '#3b82f6' },
                  { l: 'İletişim', p: 72, c: '#8b5cf6' },
                  { l: 'Teklif', p: 48, c: '#f59e0b' },
                  { l: 'Kapandı', p: 28, c: '#10b981' },
                ].map(s => (
                  <div key={s.l} className="mb-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-white/25 text-[7px]">{s.l}</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.p}%`, background: s.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead list */}
            <div className="rounded-xl p-3 flex-1 min-h-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white/30 text-[8px] mb-2 font-semibold">Son Leadler</div>
              <div className="flex flex-col gap-1">
                {[
                  { n: 'Türk Tekstil A.Ş.', s: 'Kazanıldı', c: '#10b981', sc: 95 },
                  { n: 'Metro Yapı Ltd.', s: 'Aktif', c: '#3b82f6', sc: 78 },
                  { n: 'Digital GmbH', s: 'İletişim', c: '#f59e0b', sc: 62 },
                  { n: 'SaaS Startup TR', s: 'Yeni', c: '#8b5cf6', sc: 45 },
                ].map(lead => (
                  <div key={lead.n} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-lg flex items-center justify-center text-[7px] font-bold text-blue-300" style={{ background: 'rgba(59,130,246,0.15)' }}>
                        {lead.n[0]}
                      </div>
                      <span className="text-white/50 text-[8px]">{lead.n}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-8 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${lead.sc}%`, background: lead.c }} />
                      </div>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${lead.c}20`, color: lead.c }}>{lead.s}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification — top right */}
      <div className="absolute -top-4 -right-4 lg:-right-8 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2.5 border border-slate-100 animate-float-delayed z-10">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-800">Yeni Lead!</p>
          <p className="text-[9px] text-slate-400">Metro Yapı Ltd. — Tekstil</p>
        </div>
      </div>

      {/* Floating stat — bottom left */}
      <div className="absolute -bottom-4 -left-4 lg:-left-6 bg-white rounded-2xl shadow-xl p-3 border border-slate-100 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users size={14} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800">147 mesaj gönderildi</p>
            <p className="text-[9px] text-slate-400">Son 24 saatte · %91 teslim</p>
          </div>
        </div>
      </div>

      {/* Glow effect behind mockup */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-3xl"
        style={{ background: 'radial-gradient(circle at 50% 50%, #3b82f6, #7c3aed)' }}
      />
    </div>
  )
}

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* Background dot grid */}
      <div className="absolute inset-0 dot-grid opacity-40" />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT — Value prop */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
              <span className="text-blue-700 text-[13px] font-semibold">Yapay Zeka Destekli B2B Lead Platformu</span>
            </div>

            {/* Headline */}
            <h1 className="text-[42px] sm:text-[52px] lg:text-[58px] xl:text-[64px] font-black leading-[1.04] tracking-[-0.03em] text-slate-900 mb-6">
              Doğru Müşteriye,{' '}
              <span className="gradient-text-blue">Doğru Anda</span>{' '}
              Ulaş
            </h1>

            {/* Subheadline */}
            <p className="text-[17px] lg:text-[18px] text-slate-500 leading-[1.7] mb-8 max-w-lg">
              Google Maps&apos;ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş kampanyalar yürüt.{' '}
              <strong className="text-slate-700 font-semibold">2,847+ firma</strong> LeadFlow AI ile satışlarını otomatize ediyor.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
              >
                14 Gün Ücretsiz Başla
                <ArrowRight size={16} />
              </Link>

              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-semibold hover:bg-slate-200 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
                  <Play size={10} className="text-slate-700 fill-slate-700 ml-0.5" />
                </div>
                Demo İzle
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-4">
              {[
                'Kredi kartı gerekmez',
                '2,847+ aktif firma',
                'İstediğin an iptal',
              ].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[13px] text-slate-500 font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Dashboard mockup */}
          <div className="relative lg:ml-4 mt-8 lg:mt-0">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
