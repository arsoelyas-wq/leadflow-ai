'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { MARKET_SLUGS } from '@/lib/market-pages'
import { Globe2, Edit3, ExternalLink, Plus, Eye, EyeOff, Trash2 } from 'lucide-react'

type PageSummary = {
  id: string
  slug: string
  locale: string
  is_published: boolean
  hero_headline: string
  updated_at: string
}

export default function MarketPagesListPage() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      const data = await api.get('/api/market-pages')
      setPages(data.pages || [])
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createPage = async (slug: string) => {
    if (creating) return
    setCreating(true)
    try {
      const market = MARKET_SLUGS[slug]
      await api.post('/api/market-pages', { slug, locale: market.locale })
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  const deletePage = async (slug: string) => {
    if (!confirm(`/${slug} pazar sayfasını silmek istediğinize emin misiniz?`)) return
    try {
      await api.delete(`/api/market-pages/${slug}`)
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const existingSlugs = new Set(pages.map(p => p.slug))
  const availableMarkets = Object.entries(MARKET_SLUGS).filter(([slug]) => !existingSlugs.has(slug))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Globe2 size={18} className="text-blue-400" />
          </div>
          Pazar Sayfaları
        </h1>
        <p className="text-slate-400 mt-1.5 text-sm">
          Her ülke için ayrı pazarlama sayfası oluşturun. Her pazar farklı içerik, fiyat ve videoyla çalışır.
        </p>
      </div>

      {/* Active pages */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : pages.length > 0 ? (
        <div className="space-y-3">
          {pages.map(p => {
            const market = MARKET_SLUGS[p.slug]
            return (
              <div key={p.id} className="bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-xl p-5 flex items-center justify-between gap-4 transition-colors">
                {/* Market info */}
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-3xl flex-shrink-0">{market?.flag || '🌍'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-white font-semibold">{market?.name || p.slug.toUpperCase()}</span>
                      <code className="text-slate-500 text-xs bg-slate-700/50 px-2 py-0.5 rounded font-mono">/{p.slug}</code>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        p.is_published
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                          : 'bg-slate-700/60 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.is_published ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {p.is_published ? 'Yayında' : 'Taslak'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5 truncate">
                      {p.hero_headline || 'Henüz başlık eklenmedi'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.is_published && (
                    <a
                      href={`/${p.slug}`} target="_blank" rel="noreferrer"
                      className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                      title={`/${p.slug} sayfasını gör`}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => deletePage(p.slug)}
                    className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Link
                    href={`/market-pages/${p.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-blue-200 text-sm font-semibold rounded-lg transition"
                  >
                    <Edit3 size={14} /> Düzenle
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-12 text-center">
          <Globe2 size={36} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Henüz pazar sayfası yok</h3>
          <p className="text-slate-400 text-sm">Aşağıdan bir ülke seçerek ilk pazar sayfanızı oluşturun</p>
        </div>
      )}

      {/* Add new market */}
      {availableMarkets.length > 0 && (
        <div>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Plus size={14} /> Yeni Pazar Ekle
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableMarkets.map(([slug, market]) => (
              <button
                key={slug}
                onClick={() => createPage(slug)}
                disabled={creating}
                className="flex flex-col items-center gap-2.5 p-4 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-xl transition cursor-pointer disabled:opacity-50 group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{market.flag}</span>
                <span className="text-white text-sm font-medium">{market.name}</span>
                <code className="text-slate-500 text-xs font-mono">/{slug}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-blue-600/5 border border-blue-500/15 rounded-xl p-6">
        <h3 className="text-blue-300 font-semibold mb-3 text-sm">💡 Nasıl Çalışır?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
          <div><span className="text-white font-medium block mb-1">1. Pazar Oluşturun</span>Ülke seçin ve sayfanızı hazırlayın</div>
          <div><span className="text-white font-medium block mb-1">2. İçerik Ekleyin</span>O ülkeye özel hero, video, fiyat, referanslar</div>
          <div><span className="text-white font-medium block mb-1">3. Yayınlayın</span>Linki o ülkede paylaşın, her market izole çalışır</div>
        </div>
      </div>
    </div>
  )
}
