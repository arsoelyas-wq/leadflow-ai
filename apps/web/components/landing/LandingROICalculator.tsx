'use client'
import { useState, useMemo } from 'react'
import { Calculator, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'

function formatTRY(n: number): string {
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₺${(n / 1_000).toFixed(0)}K`
  return `₺${n.toFixed(0)}`
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[14px] font-semibold text-slate-700">{label}</span>
        <span className="text-[15px] font-black text-blue-600">{format(value)}</span>
      </div>
      <div className="relative h-2 bg-slate-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-md -translate-y-1/2 pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  )
}

export default function LandingROICalculator() {
  const [manualLeads, setManualLeads] = useState(100)
  const [dealSize, setDealSize] = useState(25000)
  const [teamCost, setTeamCost] = useState(50000)

  const result = useMemo(() => {
    const currentConversion = 0.04         // %4 ortalama
    const sovloConversion  = 0.12          // %12 Sovlo ile
    const sovloLeadMult    = 8             // 8x daha fazla lead

    const currentDeals   = Math.round(manualLeads * currentConversion)
    const sovloLeads     = Math.round(manualLeads * sovloLeadMult)
    const sovloDeals     = Math.round(sovloLeads  * sovloConversion)

    const currentRevenue = currentDeals * dealSize
    const sovloRevenue   = sovloDeals   * dealSize

    const sovloCost     = 199            // Growth planı
    const costSavings   = Math.max(0, teamCost - sovloCost)
    const extraRevenue  = sovloRevenue - currentRevenue
    const totalBenefit  = extraRevenue + costSavings
    const roi           = sovloCost > 0 ? Math.round((totalBenefit / sovloCost) * 100) : 0

    return { currentDeals, sovloLeads, sovloDeals, currentRevenue, sovloRevenue, costSavings, extraRevenue, roi }
  }, [manualLeads, dealSize, teamCost])

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[13px] font-semibold mb-6">
              <Calculator size={13} />
              ROI Hesaplayıcı
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Sizin için ne kadar{' '}
              <span className="gradient-text-blue">kazandırır?</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed max-w-xl mx-auto">
              Rakamlarınızı girin, Sovlo AI&apos;ın size kattığı değeri hesaplayalım.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Inputs */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-[16px] font-bold text-slate-900 mb-6">Mevcut Durumunuz</h3>

              <Slider
                label="Ayda kaç lead ile çalışıyorsunuz?"
                value={manualLeads}
                min={10}
                max={500}
                step={10}
                format={v => `${v} lead`}
                onChange={setManualLeads}
              />

              <Slider
                label="Ortalama anlaşma değeri"
                value={dealSize}
                min={5000}
                max={500000}
                step={5000}
                format={formatTRY}
                onChange={setDealSize}
              />

              <Slider
                label="Aylık satış ekibi maliyeti"
                value={teamCost}
                min={0}
                max={200000}
                step={5000}
                format={v => v === 0 ? 'Ekip yok' : formatTRY(v)}
                onChange={setTeamCost}
              />

              <p className="text-[12px] text-slate-400 mt-2">
                * Hesaplama: %4 → %12 dönüşüm artışı, 8x daha fazla lead. Gerçek sonuçlar sektöre göre değişir.
              </p>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {/* Comparison cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200">
                  <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Şu an</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[11px] text-slate-400">Aylık lead</div>
                      <div className="text-[20px] font-black text-slate-700">{manualLeads}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Kapanan deal</div>
                      <div className="text-[20px] font-black text-slate-700">{result.currentDeals}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Aylık gelir</div>
                      <div className="text-[20px] font-black text-slate-700">{formatTRY(result.currentRevenue)}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="text-[12px] font-bold text-white/70 uppercase tracking-wider mb-3">Sovlo ile</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[11px] text-white/60">Aylık lead</div>
                      <div className="text-[20px] font-black">{result.sovloLeads}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-white/60">Kapanan deal</div>
                      <div className="text-[20px] font-black">{result.sovloDeals}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-white/60">Aylık gelir</div>
                      <div className="text-[20px] font-black">{formatTRY(result.sovloRevenue)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROI summary */}
              <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp size={16} className="text-emerald-600" />
                  </div>
                  <span className="text-[15px] font-bold text-slate-900">Aylık Kazanç Özeti</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-slate-500">Ek gelir potansiyeli</span>
                    <span className="text-[14px] font-bold text-emerald-600">+{formatTRY(result.extraRevenue)}</span>
                  </div>
                  {result.costSavings > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-slate-500">Maliyet tasarrufu</span>
                      <span className="text-[14px] font-bold text-emerald-600">+{formatTRY(result.costSavings)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-slate-500">Sovlo maliyeti</span>
                    <span className="text-[14px] font-semibold text-slate-400">-₺199</span>
                  </div>
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-slate-900">Tahmini ROI</span>
                    <span className="text-[22px] font-black text-emerald-600">%{result.roi.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[15px] font-bold btn-glow"
              >
                Bu ROI&apos;yi Gerçeğe Dönüştür
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
