'use client'
import { Check, X, Minus } from 'lucide-react'
import Link from 'next/link'
import Reveal from './Reveal'

type CellValue = true | false | 'partial' | string

const FEATURES = [
  { label: 'Google Maps Lead Scraping',    sovlo: true,      sdr: false,     hunter: false,    apollo: 'partial' },
  { label: 'WhatsApp Kampanya',            sovlo: true,      sdr: false,     hunter: false,    apollo: false     },
  { label: 'AI Mesaj Kişiselleştirme',     sovlo: true,      sdr: false,     hunter: false,    apollo: 'partial' },
  { label: 'Email Outreach',               sovlo: true,      sdr: 'partial', hunter: true,     apollo: true      },
  { label: 'LinkedIn DM',                  sovlo: true,      sdr: 'partial', hunter: false,    apollo: 'partial' },
  { label: 'Pipeline CRM',                 sovlo: true,      sdr: false,     hunter: false,    apollo: true      },
  { label: 'Lead Scraping (Aylık)',        sovlo: '3,000+',  sdr: '~200',    hunter: '500',    apollo: '1,000'   },
  { label: 'Türkçe Destek',               sovlo: true,      sdr: true,      hunter: false,    apollo: false     },
  { label: 'Kurulum Süresi',              sovlo: '8 dk',    sdr: '2-4 hafta', hunter: '1 gün', apollo: '1 gün'  },
  { label: 'Aylık Maliyet',              sovlo: '₺199',    sdr: '₺25K+',   hunter: '$99',    apollo: '$49'     },
]

function Cell({ value }: { value: CellValue }) {
  if (value === true)
    return <Check size={16} className="text-emerald-500 mx-auto" strokeWidth={2.5} />
  if (value === false)
    return <X size={15} className="text-slate-300 mx-auto" strokeWidth={2} />
  if (value === 'partial')
    return <Minus size={15} className="text-amber-400 mx-auto" strokeWidth={2.5} />
  return <span className="text-[13px] font-semibold text-slate-700">{value}</span>
}

export default function LandingComparisonTable() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold mb-6">
              Neden Sovlo AI?
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Alternatiflere göre{' '}
              <span className="gradient-text-blue">neden farklı?</span>
            </h2>
            <p className="text-[17px] text-slate-500 leading-relaxed max-w-xl mx-auto">
              Sovlo AI; Hunter.io, Apollo.io ve manuel SDR ekibine kıyasla neler sunuyor?
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-4 text-[13px] font-bold text-slate-500 w-[35%]">Özellik</th>
                  <th className="px-4 py-4 text-center text-[13px] font-black text-white w-[17%]">
                    <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg px-3 py-1.5">
                      Sovlo AI
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-[13px] font-semibold text-slate-500 w-[16%]">Manuel SDR</th>
                  <th className="px-4 py-4 text-center text-[13px] font-semibold text-slate-500 w-[16%]">Hunter.io</th>
                  <th className="px-4 py-4 text-center text-[13px] font-semibold text-slate-500 w-[16%]">Apollo.io</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-5 py-3.5 text-[14px] font-medium text-slate-700">{row.label}</td>
                    <td className="px-4 py-3.5 text-center bg-blue-50/40">
                      <Cell value={row.sovlo} />
                    </td>
                    <td className="px-4 py-3.5 text-center"><Cell value={row.sdr} /></td>
                    <td className="px-4 py-3.5 text-center"><Cell value={row.hunter} /></td>
                    <td className="px-4 py-3.5 text-center"><Cell value={row.apollo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Legend + CTA */}
        <Reveal>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5 text-[12px] text-slate-400">
              <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" strokeWidth={2.5} /> Tam destek</span>
              <span className="flex items-center gap-1.5"><Minus size={13} className="text-amber-400" strokeWidth={2.5} /> Kısmi destek</span>
              <span className="flex items-center gap-1.5"><X size={12} className="text-slate-300" strokeWidth={2} /> Desteklenmiyor</span>
            </div>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold btn-glow"
            >
              14 Gün Ücretsiz Dene
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
