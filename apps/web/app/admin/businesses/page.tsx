'use client'
import { useEffect, useState, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''

const s = {
  card:    { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20 } as React.CSSProperties,
  inp:     { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#e2e8f0', fontSize:13, padding:'8px 12px', outline:'none', fontFamily:'inherit' } as React.CSSProperties,
  th:      { padding:'10px 14px', textAlign:'left' as const, fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.08em', color:'#475569', borderBottom:'1px solid rgba(255,255,255,0.05)' } as React.CSSProperties,
  td:      { padding:'10px 14px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', verticalAlign:'top' as const } as React.CSSProperties,
}

export default function BusinessesPage() {
  const [stats, setStats]       = useState<any>(null)
  const [items, setItems]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [city, setCity]         = useState('')
  const [sector, setSector]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const headers = { Authorization: `Bearer ${getToken()}` }

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/businesses/stats`, { headers })
      if (!r.ok) return
      setStats(await r.json())
    } catch {}
  }, [])

  const loadItems = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (search) params.set('search', search)
      if (city)   params.set('city', city)
      if (sector) params.set('sector', sector)
      const r = await fetch(`${API}/api/admin/businesses?${params}`, { headers })
      if (!r.ok) { setError('Veri yüklenemedi'); setLoading(false); return }
      const d = await r.json()
      setItems(d.items || [])
      setTotal(d.total || 0)
      setPage(p)
    } catch { setError('Bağlantı hatası') }
    setLoading(false)
  }, [search, city, sector])

  useEffect(() => { loadStats(); loadItems(1) }, [])

  const totalPages = Math.ceil(total / 50)

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', margin: 0 }}>🏢 Global Business Havuzu</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0' }}>
          Tüm müşterilerin lead aramasından otomatik biriken business veritabanı
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#60a5fa' }}>{(stats.total || 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Toplam Business</div>
          </div>
          <div style={{ ...s.card }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top 5 Şehir</div>
            {(stats.byCity || []).slice(0, 5).map((c: any) => (
              <div key={c.city} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{c.city}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ ...s.card }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top 5 Sektör</div>
            {(stats.bySector || []).slice(0, 5).map((c: any) => (
              <div key={c.sector} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{c.sector || 'other'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...s.inp, flex: 2, minWidth: 180 }}
          placeholder="Firma adı ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadItems(1)}
        />
        <input
          style={{ ...s.inp, flex: 1, minWidth: 120 }}
          placeholder="Şehir filtrele"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadItems(1)}
        />
        <input
          style={{ ...s.inp, flex: 1, minWidth: 120 }}
          placeholder="Sektör filtrele"
          value={sector}
          onChange={e => setSector(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadItems(1)}
        />
        <button
          onClick={() => loadItems(1)}
          style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Filtrele
        </button>
        <button
          onClick={() => { setSearch(''); setCity(''); setSector(''); setTimeout(() => loadItems(1), 50) }}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Temizle
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#93c5fd' }}>
        💡 Bu veriler otomatik birikir — her lead araması sonuçları buraya da kaydedilir. 3 ay sonra cache-first sistemi ile Google Places maliyeti %90 düşecek.
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            {loading ? 'Yükleniyor...' : `${total.toLocaleString()} business`}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={page <= 1}
                onClick={() => loadItems(page - 1)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.4 : 1, fontFamily: 'inherit' }}
              >← Önceki</button>
              <span style={{ fontSize: 12, color: '#475569' }}>{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => loadItems(page + 1)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page >= totalPages ? 0.4 : 1, fontFamily: 'inherit' }}
              >Sonraki →</button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Firma</th>
                <th style={s.th}>Şehir</th>
                <th style={s.th}>Sektör</th>
                <th style={s.th}>Telefon</th>
                <th style={s.th}>Website</th>
                <th style={s.th}>Rating</th>
                <th style={s.th}>Kaynak</th>
                <th style={s.th}>Eklenme</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#475569', padding: 40 }}>
                    {total === 0
                      ? 'Henüz kayıt yok. Kullanıcılar lead aradıkça burası dolacak.'
                      : 'Sonuç bulunamadı'}
                  </td>
                </tr>
              ) : items.map((b: any) => (
                <tr key={b.id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...s.td, fontWeight: 600, color: '#f1f5f9', maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.company_name}</div>
                  </td>
                  <td style={s.td}>{b.city || '—'}</td>
                  <td style={s.td}>
                    {b.sector_normalized
                      ? <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>{b.sector_normalized}</span>
                      : '—'}
                  </td>
                  <td style={s.td}>{b.phone ? <a href={`tel:${b.phone}`} style={{ color: '#34d399', textDecoration: 'none' }}>{b.phone}</a> : '—'}</td>
                  <td style={{ ...s.td, maxWidth: 160 }}>
                    {b.website
                      ? <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {b.website.replace(/^https?:\/\//, '').split('/')[0]}
                        </a>
                      : '—'}
                  </td>
                  <td style={s.td}>
                    {b.rating
                      ? <span style={{ color: '#fbbf24', fontWeight: 700 }}>★ {b.rating}</span>
                      : '—'}
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 5 }}>{b.source || '—'}</span>
                  </td>
                  <td style={{ ...s.td, color: '#475569', fontSize: 11 }}>
                    {b.created_at ? new Date(b.created_at).toLocaleDateString('tr-TR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
