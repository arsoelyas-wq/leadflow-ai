'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

const PLAN_COLOR: Record<string, string> = { starter: '#64748b', growth: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('')
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string, string> = { page: String(page), limit: '50' }
      if (debouncedSearch) p.search = debouncedSearch
      if (plan) p.plan = plan
      const data = await adminApi.users(p)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch {} finally { setLoading(false) }
  }, [page, debouncedSearch, plan])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [debouncedSearch, plan])

  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>👥 Kullanıcılar</h1>
          <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>{total.toLocaleString()} toplam kullanıcı</p>
        </div>
        <button onClick={load} style={{ ...inp, cursor: 'pointer', padding: '9px 16px' }}>🔄 Yenile</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Email, isim veya şirket ara..."
            style={{ ...inp, paddingLeft: 36, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <select value={plan} onChange={e => setPlan(e.target.value)} style={{ ...inp, minWidth: 140 }}>
          <option value="">Tüm Planlar</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Kullanıcı', 'Plan', 'Kredi', 'Ülke', 'Kayıt', 'Detay'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left' as const, fontSize: 10, fontWeight: 800, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={6} style={{ padding: 16 }}>
                  <div style={{ height: 32, background: 'rgba(255,255,255,0.025)', borderRadius: 8 }} />
                </td></tr>
              ))
            ) : users.map(u => {
              const left = (u.credits_total || 0) - (u.credits_used || 0)
              const pct = u.credits_total ? Math.min(100, Math.max(0, Math.round((left / u.credits_total) * 100))) : 0
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.025)', transition: 'background 0.1s' }}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.name || '—'}</div>
                        <div style={{ color: '#475569', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${PLAN_COLOR[u.plan_type] || '#64748b'}20`, color: PLAN_COLOR[u.plan_type] || '#64748b', border: `1px solid ${PLAN_COLOR[u.plan_type] || '#64748b'}30` }}>
                      {u.plan_type}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: pct < 20 ? '#ef4444' : '#e2e8f0' }}>{left.toLocaleString()}</div>
                    <div style={{ height: 3, width: 56, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct < 20 ? '#ef4444' : '#3b82f6', borderRadius: 2 }} />
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: '#64748b', fontSize: 12 }}>{u.country_code || '—'}</td>
                  <td style={{ padding: '13px 16px', color: '#64748b', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <Link href={`/admin/users/${u.id}`} style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600, textDecoration: 'none', padding: '5px 10px', borderRadius: 7, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      Detay →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#334155' }}>Kullanıcı bulunamadı</div>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ color: '#475569', fontSize: 13 }}>{(page-1)*50+1}–{Math.min(page*50,total)} / {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['← Önceki', page === 1, () => setPage(p => Math.max(1,p-1))], ['Sonraki →', page*50 >= total, () => setPage(p => p+1)]].map(([label, disabled, action]: any) => (
              <button key={label as string} onClick={action} disabled={disabled} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, opacity: disabled ? 0.4 : 1, fontFamily: 'inherit' }}>{label as string}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
