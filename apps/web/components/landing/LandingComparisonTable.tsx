'use client'
import { Check, X, Minus, Zap } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'

type CellValue = true | false | 'partial' | string

const FEATURES: { label: string; sub?: string; sovlo: CellValue; manual: CellValue; basic: CellValue; data: CellValue }[] = [
  { label: 'Google Maps Lead Toplama',  sub: 'Otomatik, filtreli', sovlo: true,      manual: false,      basic: false,     data: 'partial'   },
  { label: 'WhatsApp Kampanya',         sub: 'Resmi WABA API',    sovlo: true,       manual: false,      basic: false,     data: false       },
  { label: 'AI Mesaj Kişiselleştirme', sub: 'Her alıcıya özgün', sovlo: true,       manual: 'partial',  basic: false,     data: false       },
  { label: 'Çok Kanallı Outreach',      sub: 'WA + Email + SMS',  sovlo: true,       manual: false,      basic: 'partial', data: 'partial'   },
  { label: 'Pipeline & CRM',            sub: 'Yerleşik, tam entegre', sovlo: true,   manual: false,      basic: false,     data: 'partial'   },
  { label: 'Aylık Lead Kapasitesi',     sovlo: '3,000+',          manual: '~200',    basic: '~500',      data: '~1,000'    },
  { label: 'Türkçe Pazar Desteği',      sub: 'Yerel dil + veri',  sovlo: true,       manual: true,       basic: false,     data: false       },
  { label: 'Kurulum Süresi',            sovlo: '8 dakika',        manual: '2-4 hafta', basic: '1-2 gün', data: '1-2 gün'  },
  { label: 'Başlangıç Maliyeti',        sovlo: '₺199/ay',         manual: '₺25K+/ay', basic: '$99/ay',  data: '$49/ay'    },
]

const COLS = [
  {
    key: 'sovlo' as const,
    label: 'Sovlo AI',
    sub: 'Önerilen',
    highlight: true,
  },
  {
    key: 'manual' as const,
    label: 'Manuel Ekip',
    sub: 'Geleneksel yöntem',
    highlight: false,
  },
  {
    key: 'basic' as const,
    label: 'Email Araçları',
    sub: 'Tek kanallı çözümler',
    highlight: false,
  },
  {
    key: 'data' as const,
    label: 'Veri Sağlayıcılar',
    sub: 'Sadece veri, otomasyon yok',
    highlight: false,
  },
]

function Cell({ value, highlight }: { value: CellValue; highlight: boolean }) {
  if (value === true)
    return (
      <div className="flex justify-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${highlight ? 'bg-blue-500' : 'bg-emerald-100'}`}>
          <Check size={13} className={highlight ? 'text-white' : 'text-emerald-600'} strokeWidth={2.5} />
        </div>
      </div>
    )
  if (value === false)
    return (
      <div className="flex justify-center">
        <X size={15} className="text-slate-300" strokeWidth={2} />
      </div>
    )
  if (value === 'partial')
    return (
      <div className="flex justify-center">
        <Minus size={15} className="text-amber-400" strokeWidth={2.5} />
      </div>
    )
  return (
    <span className={`text-[13px] font-bold ${highlight ? 'text-blue-600' : 'text-slate-600'}`}>
      {value}
    </span>
  )
}

export default function LandingComparisonTable() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[13px] font-semibold mb-6">
              <Zap size={13} className="fill-blue-500 text-blue-500" />
              Neden Sovlo AI?
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Diğer yöntemlerle{' '}
              <span className="gradient-text-blue">karşılaştırın</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Manuel satış ekiplerinden email araçlarına, veri sağlayıcılarına kadar — Sovlo AI neden farklı?
            </p>
          </div>
        </Reveal>

        <Reveal>
          {/* ── Mobil: Sovlo AI özellik listesi ── */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl px-4 py-2.5 shadow-lg shadow-blue-500/20 inline-flex items-center gap-2">
                <Zap size={13} className="text-white fill-white" />
                <span className="text-white text-[14px] font-black">Sovlo AI</span>
                <span className="text-blue-200 text-[11px] font-medium ml-1">Önerilen</span>
              </div>
              <span className="text-slate-400 text-[12px]">Manuel Ekip</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {FEATURES.map((row, i) => (
                <div key={row.label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < FEATURES.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800 leading-snug">{row.label}</div>
                    {row.sub && <div className="text-[11px] text-slate-400 mt-0.5">{row.sub}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Cell value={row.sovlo} highlight={true} />
                    <div className="w-px h-5 bg-slate-100"/>
                    <Cell value={row.manual} highlight={false} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-4 text-[11px] text-slate-400 justify-center">
                <span className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </div>Sovlo AI
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check size={9} className="text-emerald-600" strokeWidth={3} />
                  </div>Var
                </span>
                <span className="flex items-center gap-1.5">
                  <Minus size={11} className="text-amber-400" strokeWidth={2.5} />Kısmi
                </span>
                <span className="flex items-center gap-1.5">
                  <X size={11} className="text-slate-300" strokeWidth={2} />Yok
                </span>
              </div>
              <Link href="/register"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[14px] font-bold btn-glow">
                14 Gün Ücretsiz Dene
              </Link>
            </div>
          </div>

          {/* ── Masaüstü: 5 sütunlu tam tablo ── */}
          <div className="hidden sm:block overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Header */}
              <div className="grid grid-cols-5 mb-2">
                <div className="col-span-1" />
                {COLS.map(col => (
                  <div key={col.key} className="col-span-1 px-3 pb-4 text-center">
                    {col.highlight ? (
                      <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl px-3 py-3 shadow-lg shadow-blue-500/20">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <div className="w-4 h-4 rounded-md bg-white/20 flex items-center justify-center">
                            <Zap size={9} className="text-white fill-white" />
                          </div>
                          <span className="text-white text-[13px] font-black">{col.label}</span>
                        </div>
                        <span className="text-blue-200 text-[11px] font-medium">{col.sub}</span>
                      </div>
                    ) : (
                      <div className="py-3">
                        <div className="text-[13px] font-bold text-slate-600 mb-1">{col.label}</div>
                        <div className="text-[11px] text-slate-400">{col.sub}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {FEATURES.map((row, i) => (
                  <div key={row.label}
                    className={`grid grid-cols-5 items-center ${i < FEATURES.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="col-span-1 px-5 py-4">
                      <div className="text-[14px] font-semibold text-slate-800 leading-tight">{row.label}</div>
                      {row.sub && <div className="text-[11px] text-slate-400 mt-0.5">{row.sub}</div>}
                    </div>
                    <div className="col-span-1 px-3 py-4 text-center bg-blue-50/60 border-x border-blue-100">
                      <Cell value={row.sovlo} highlight={true} />
                    </div>
                    {(['manual', 'basic', 'data'] as const).map(key => (
                      <div key={key} className="col-span-1 px-3 py-4 text-center">
                        <Cell value={row[key]} highlight={false} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-5 text-[12px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check size={9} className="text-emerald-600" strokeWidth={3} />
                    </div>Tam destek
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Minus size={13} className="text-amber-400" strokeWidth={2.5} />Kısmi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <X size={12} className="text-slate-300" strokeWidth={2} />Yok
                  </span>
                </div>
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold btn-glow">
                  14 Gün Ücretsiz Dene
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
