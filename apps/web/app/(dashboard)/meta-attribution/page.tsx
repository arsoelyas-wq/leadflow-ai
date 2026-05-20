'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  TrendingUp, Target, DollarSign, Users, Download,
  RefreshCw, ExternalLink, BarChart2, Zap, MousePointer
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

async function downloadAudience(path: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const res   = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const blob  = await res.blob()
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface AttributionRow {
  campaign: string
  source: string
  medium: string
  leads: number
  contacted: number
  proposals: number
  won: number
  revenue: number
  winRate: number
  convRate: number
  avgDeal: number
  fbcPct: number
}

interface Summary {
  totalLeads: number
  totalWon: number
  totalRevenue: number
  fbcCoverage: number
  campaigns: number
}

export default function MetaAttributionPage() {
  const [rows, setRows] = useState<AttributionRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<keyof AttributionRow>('revenue')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/meta-capi/attribution')
      setRows(data.rows || [])
      setSummary(data.summary || null)
    } catch { setRows([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSort = (col: keyof AttributionRow) => {
    if (sort === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSort(col); setSortDir('desc') }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort] as any
    const bv = b[sort] as any
    if (typeof av === 'number') return sortDir === 'desc' ? bv - av : av - bv
    return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv))
  })

  const SortIcon = ({ col }: { col: keyof AttributionRow }) => (
    <span className={`ml-1 text-xs ${sort === col ? 'text-blue-400' : 'text-slate-600'}`}>
      {sort === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-blue-400" /> Meta Reklam Attributionu
          </h1>
          <p className="text-slate-400 mt-1 text-sm">UTM parametrelerinden lead → kazanıldı → gelir zinciri</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Kampanya', value: summary.campaigns, icon: Target, color: 'text-blue-400' },
            { label: 'Toplam Lead', value: summary.totalLeads.toLocaleString('tr-TR'), icon: Users, color: 'text-cyan-400' },
            { label: 'Kazanıldı', value: summary.totalWon.toLocaleString('tr-TR'), icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Toplam Gelir', value: `₺${summary.totalRevenue.toLocaleString('tr-TR')}`, icon: DollarSign, color: 'text-amber-400' },
            { label: 'fbc Kapsama', value: `%${summary.fbcCoverage}`, icon: MousePointer, color: 'text-purple-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className={color} />
                <p className="text-slate-400 text-xs">{label}</p>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* fbc coverage info */}
      {summary && summary.fbcCoverage < 50 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-300 text-sm font-medium">fbc Kapsama Düşük — %{summary.fbcCoverage}</p>
          <p className="text-amber-400/70 text-xs mt-1">
            Leadlerin sadece %{summary.fbcCoverage}&apos;i Facebook tıklama ID&apos;si (fbc) taşıyor.
            Meta reklamlarınıza &apos;?fbclid=&apos; parametresi eklendiğinde attribution doğruluğu artar.
            Frontend&apos;de URL&apos;den otomatik yakalanır.
          </p>
        </div>
      )}

      {/* Campaign table */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <BarChart2 size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Henüz attribution verisi yok</h3>
          <p className="text-slate-400 text-sm">
            Leadler UTM parametresiyle (utm_source, utm_campaign) oluşturulduğunda burada görünür.
            Meta reklamlarınıza UTM ekleyin: <span className="font-mono text-blue-400 text-xs">?utm_source=meta&utm_campaign=kampanya_adi</span>
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  {[
                    { key: 'campaign', label: 'Kampanya' },
                    { key: 'source', label: 'Kaynak' },
                    { key: 'leads', label: 'Lead' },
                    { key: 'contacted', label: 'Temas' },
                    { key: 'proposals', label: 'Teklif' },
                    { key: 'won', label: 'Kazanıldı' },
                    { key: 'winRate', label: 'Kazanma %' },
                    { key: 'revenue', label: 'Gelir' },
                    { key: 'avgDeal', label: 'Ort. Deal' },
                    { key: 'fbcPct', label: 'fbc %' },
                  ].map(({ key, label }) => (
                    <th key={key}
                      className="px-4 py-3 text-left text-slate-400 font-medium text-xs cursor-pointer hover:text-white transition"
                      onClick={() => handleSort(key as keyof AttributionRow)}>
                      {label}<SortIcon col={key as keyof AttributionRow} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{row.campaign}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        row.source === 'meta' || row.source === 'facebook' || row.source === 'instagram'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}>{row.source}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.leads.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{row.contacted}</span>
                        <div className="flex-1 max-w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(row.convRate, 100)}%` }} />
                        </div>
                        <span className="text-slate-500 text-xs">%{row.convRate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.proposals}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">{row.won}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.winRate >= 20 ? 'bg-emerald-500' : row.winRate >= 10 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(row.winRate * 2, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${row.winRate >= 20 ? 'text-emerald-400' : row.winRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                          %{row.winRate}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-medium">
                      {row.revenue > 0 ? `₺${row.revenue.toLocaleString('tr-TR')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.avgDeal > 0 ? `₺${row.avgDeal.toLocaleString('tr-TR')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${row.fbcPct >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        %{row.fbcPct}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Micro-conversion guide */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple-400" /> Mikro-Konversiyon Stratejisi
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              phase: 'Faz 1 — Şimdi',
              title: 'Lead + Contact',
              desc: 'Haftada 50 Purchase altındaysanız. Meta top-funnel veri ile öğrenir.',
              events: ['Lead', 'Contact'],
              color: 'border-blue-500/30 bg-blue-500/5',
              badge: 'bg-blue-500/20 text-blue-300',
            },
            {
              phase: 'Faz 2 — 2-4 hafta',
              title: '+ InitiateCheckout',
              desc: 'Teklif gönderme oranı artınca ekleyin. Daha doğru intent sinyali.',
              events: ['InitiateCheckout', 'ViewContent'],
              color: 'border-amber-500/30 bg-amber-500/5',
              badge: 'bg-amber-500/20 text-amber-300',
            },
            {
              phase: 'Faz 3 — 4-8 hafta',
              title: '+ Purchase (Değerli)',
              desc: 'Haftada 50+ won olduğunda. Value-based bidding ile ROAS maximize.',
              events: ['Purchase + value'],
              color: 'border-emerald-500/30 bg-emerald-500/5',
              badge: 'bg-emerald-500/20 text-emerald-300',
            },
          ].map(({ phase, title, desc, events, color, badge }) => (
            <div key={phase} className={`border rounded-xl p-4 ${color}`}>
              <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2 ${badge}`}>{phase}</p>
              <h4 className="text-white font-medium mb-1">{title}</h4>
              <p className="text-slate-400 text-xs mb-3">{desc}</p>
              <div className="flex flex-wrap gap-1">
                {events.map(e => (
                  <span key={e} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded font-mono">{e}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Audience export */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Custom Audience Export</h3>
          <p className="text-slate-400 text-sm mt-0.5">SHA-256 hashli CSV — Meta Ads Manager&apos;a direkt yükleyin</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => downloadAudience('/api/meta-capi/audience/won', 'meta-audience-won.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-300 text-sm rounded-xl transition">
            <Download size={13} /> Kazanıldı
          </button>
          <button onClick={() => downloadAudience('/api/meta-capi/audience/lost', 'meta-audience-lost.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm rounded-xl transition">
            <Download size={13} /> Kaybedildi
          </button>
          <a href="https://www.facebook.com/ads/manager/audiences" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-300 text-sm rounded-xl transition">
            <ExternalLink size={13} /> Ads Manager
          </a>
        </div>
      </div>
    </div>
  )
}
