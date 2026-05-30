'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, Send, Download, AlertTriangle, CheckCircle, Shield } from 'lucide-react'

// ── VAULT SHIELD — hexagonal shield with orbiting invoice cards ───────────────
function VaultShield({ size = 100, overduePct = 0, scanning = false }: { size?: number; overduePct?: number; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 25 : 50)
    return () => clearInterval(t)
  }, [mounted, scanning])
  if (!mounted) return <div style={{ width: size * 2.1, height: size * 2.1, flexShrink: 0 }} />

  const cx = size * 1.05, s = size
  const dangerColor = overduePct > 50 ? '#ef4444' : overduePct > 20 ? '#f59e0b' : '#10b981'
  const rotAngle = tick * (scanning ? 1.2 : 0.4)

  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * Math.PI / 180
    return `${cx + Math.cos(a) * s * 0.48},${cx + Math.sin(a) * s * 0.48}`
  }).join(' ')

  const innerPts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * Math.PI / 180
    return `${cx + Math.cos(a) * s * 0.38},${cx + Math.sin(a) * s * 0.38}`
  }).join(' ')

  const cracks = overduePct > 20 ? [
    `M${cx - 5} ${cx - 10} L${cx + 12} ${cx + 8}`,
    ...(overduePct > 40 ? [`M${cx + 8} ${cx - 15} L${cx - 4} ${cx + 5}`] : []),
    ...(overduePct > 60 ? [`M${cx - 15} ${cx + 5} L${cx + 5} ${cx + 20}`] : []),
  ] : []

  const orbits = [0, 120, 240].map((deg, i) => {
    const a = (deg + rotAngle) * Math.PI / 180
    return { x: cx + Math.cos(a) * s * 0.75, y: cx + Math.sin(a) * s * 0.75, i }
  })

  const orbitColors = ['#ef4444', '#f59e0b', '#10b981']

  return (
    <div style={{ width: s * 2.1, height: s * 2.1, position: 'relative', flexShrink: 0 }}>
      <svg width={s * 2.1} height={s * 2.1}>
        <defs>
          <radialGradient id={`vsGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${dangerColor}00`} />
            <stop offset="100%" stopColor={`${dangerColor}14`} />
          </radialGradient>
          <radialGradient id={`vsBody${s}`} cx="38%" cy="28%" r="65%">
            <stop offset="0%" stopColor={overduePct > 50 ? '#fca5a5' : overduePct > 20 ? '#fde68a' : '#6ee7b7'} />
            <stop offset="60%" stopColor={dangerColor} />
            <stop offset="100%" stopColor={overduePct > 50 ? '#7f1d1d' : overduePct > 20 ? '#78350f' : '#064e3b'} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s} fill={`url(#vsGlow${s})`} />
        <polygon points={hexPts} fill="none" stroke={`${dangerColor}30`} strokeWidth={1.5} />
        <circle cx={cx} cy={cx} r={s * 0.62 + (scanning ? Math.sin(tick * 0.12) * 3 : 0)} fill="none" stroke={`${dangerColor}25`} strokeWidth={1.5} strokeDasharray="5 5" />
        <polygon points={innerPts} fill={`url(#vsBody${s})`} style={{ filter: `drop-shadow(0 0 ${s * 0.18}px ${dangerColor}aa)` }} />
        {cracks.map((d, i) => (
          <path key={i} d={d} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
        ))}
        <rect x={cx - 9} y={cx - 2} width={18} height={13} rx={2} fill="rgba(0,0,0,0.4)" />
        <path d={`M${cx - 5} ${cx - 2} Q${cx - 5} ${cx - 12} ${cx} ${cx - 12} Q${cx + 5} ${cx - 12} ${cx + 5} ${cx - 2}`} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
        <circle cx={cx} cy={cx + 4} r={2} fill="rgba(255,255,255,0.7)" />
        <text x={cx} y={cx + s * 0.52} fill={dangerColor} fontSize={s * 0.08} textAnchor="middle" fontWeight="700">%{overduePct} gecikmiş</text>
        {orbits.map((o, i) => (
          <g key={i}>
            <rect x={o.x - 10} y={o.y - 7} width={20} height={14} rx={3} fill={orbitColors[i]} opacity={0.85}
              style={{ filter: `drop-shadow(0 0 5px ${orbitColors[i]})` }} />
            <text x={o.x} y={o.y + 1} fill="white" fontSize={6} textAnchor="middle" dominantBaseline="middle" fontWeight="800">FAT</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

const BUCKETS = [
  { key: 'current', label: 'Güncel', color: '#10b981' },
  { key: '30', label: '30+ Gün', color: '#f59e0b' },
  { key: '60', label: '60+ Gün', color: '#f97316' },
  { key: '90', label: '90+ Gün', color: '#ef4444' },
]

export default function DebtCollectorPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkSending, setBulkSending] = useState(false)
  const [activeBucket, setActiveBucket] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'invoices' | 'escalation' | 'compliance'>('invoices')
  const [msgTemplate, setMsgTemplate] = useState('reminder')

  useEffect(() => {
    Promise.allSettled([api.get('/api/debt-collector/invoices')]).then(([inv]) => {
      if (inv.status === 'fulfilled') setInvoices(inv.value.invoices || [])
      setLoading(false)
    })
  }, [])

  const getAgingBucket = (daysOverdue: number) => {
    if (daysOverdue <= 0) return 'current'
    if (daysOverdue <= 30) return '30'
    if (daysOverdue <= 60) return '60'
    return '90'
  }

  const enriched = invoices.map(inv => {
    const due = inv.due_date ? new Date(inv.due_date) : null
    const daysOverdue = due ? Math.floor((Date.now() - due.getTime()) / 86400000) : 0
    return { ...inv, daysOverdue, bucket: getAgingBucket(daysOverdue) }
  })

  const filtered = activeBucket === 'all' ? enriched : enriched.filter(i => i.bucket === activeBucket)
  const overdueInvoices = enriched.filter(i => i.daysOverdue > 0)
  const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0)
  const overduePct = enriched.length > 0 ? Math.round((overdueInvoices.length / enriched.length) * 100) : 0

  const sendReminder = async (invoiceId: string) => {
    setSending(invoiceId)
    try { await api.post('/api/debt-collector/send-reminder', { invoiceId, template: msgTemplate }) } catch {}
    setSending(null)
  }

  const bulkSend = async () => {
    if (selected.length === 0) return
    setBulkSending(true)
    try { await api.post('/api/debt-collector/bulk-remind', { invoiceIds: selected, template: msgTemplate }) } catch {}
    setBulkSending(false); setSelected([])
  }

  const generatePaymentLink = (invoice: any) => {
    const link = `${window.location.origin}/pay/${invoice.id}`
    navigator.clipboard?.writeText(link)
    alert(`Ödeme linki kopyalandı: ${link}`)
  }

  const exportOverdue = () => {
    const rows = [['Müşteri', 'Tutar', 'Gecikme Gün', 'Vade'],
      ...overdueInvoices.map(i => [i.company_name || i.lead_id, i.amount, i.daysOverdue, i.due_date])]
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'))
    a.download = `gecikmis-odemeler-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const templates: Record<string, string> = {
    reminder: 'Sayın müşterimiz, vadesi geçen faturanız bulunmaktadır. Lütfen ödemenizi yapın.',
    urgent: '⚠️ ACİL: Faturanız 60+ gün gecikmiş! Lütfen bugün ödeme yapın.',
    legal: '📋 Yasal süreç başlatılacaktır. Son ödeme fırsatı.'
  }

  const bucketCount = (key: string) => enriched.filter(i => i.bucket === key).length
  const bucketAmount = (key: string) => enriched.filter(i => i.bucket === key).reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(8,2,2,0.98),rgba(20,5,5,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(239,68,68,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <VaultShield size={95} overduePct={overduePct} scanning={loading} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>Tahsilat Yönetimi</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>Gecikmiş fatura takibi, otomatik hatırlatma ve yasal süreç yönetimi</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Toplam Fatura', value: enriched.length, color: '#94a3b8' },
                { label: 'Gecikmiş', value: overdueInvoices.length, color: '#ef4444' },
                { label: 'Gecikme %', value: `%${overduePct}`, color: overduePct > 50 ? '#ef4444' : overduePct > 20 ? '#f59e0b' : '#10b981' },
                { label: 'Toplam Borç', value: `₺${totalOverdue.toLocaleString('tr-TR')}`, color: '#f97316' }
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <p style={{ color: m.color, fontSize: 18, fontWeight: 800, margin: 0 }}>{m.value}</p>
                  <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button onClick={exportOverdue} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
              <Download size={13} /> CSV İndir
            </button>
            {selected.length > 0 && (
              <button onClick={bulkSend} disabled={bulkSending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7f1d1d,#ef4444)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {bulkSending ? <RefreshCw size={13} style={{ animation: 'dc-spin 1s linear infinite' }} /> : <Send size={13} />}
                {bulkSending ? 'Gönderiliyor...' : `${selected.length} Hatırlatma`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aging Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'Tümü', color: '#8b5cf6', count: enriched.length, amount: enriched.reduce((s, i) => s + (i.amount || 0), 0) },
          ...BUCKETS.map(b => ({ ...b, count: bucketCount(b.key), amount: bucketAmount(b.key) }))
        ].map(b => (
          <button key={b.key} onClick={() => setActiveBucket(b.key)}
            style={{ padding: '12px 10px', borderRadius: 13, border: `1px solid ${activeBucket === b.key ? b.color + '60' : 'rgba(255,255,255,0.06)'}`, background: activeBucket === b.key ? `${b.color}10` : 'rgba(3,8,22,0.7)', cursor: 'pointer', textAlign: 'left' }}>
            <p style={{ color: b.color, fontSize: 18, fontWeight: 800, margin: 0 }}>{b.count}</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}>{b.label}</p>
            <p style={{ color: '#475569', fontSize: 10, margin: '1px 0 0' }}>₺{b.amount.toLocaleString('tr-TR')}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
        {[{ id: 'invoices', label: '📄 Faturalar' }, { id: 'escalation', label: '⚡ Eskalasyon' }, { id: 'compliance', label: '🛡️ Uyum' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as 'invoices' | 'escalation' | 'compliance')}
            style={{ padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeTab === t.id ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' : 'transparent', color: activeTab === t.id ? '#fff' : '#64748b', boxShadow: activeTab === t.id ? '0 3px 12px rgba(239,68,68,0.3)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#64748b', fontSize: 12, flexShrink: 0 }}>Mesaj Şablonu:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries({ reminder: 'Nazik', urgent: 'Acil', legal: 'Yasal' }).map(([key, label]) => (
                <button key={key} onClick={() => setMsgTemplate(key)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${msgTemplate === key ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, background: msgTemplate === key ? 'rgba(239,68,68,0.12)' : 'transparent', color: msgTemplate === key ? '#f87171' : '#64748b', fontSize: 11, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
            <p style={{ color: '#334155', fontSize: 11, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{templates[msgTemplate]}</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', height: 80, alignItems: 'center' }}><RefreshCw size={22} style={{ color: '#475569', animation: 'dc-spin 1s linear infinite' }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Bu kategoride fatura yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.slice(0, 25).map(inv => {
                const bucketDef = BUCKETS.find(b => b.key === inv.bucket) || { color: '#10b981', label: 'Güncel' }
                const isSel = selected.includes(inv.id)
                return (
                  <div key={inv.id} onClick={() => setSelected(p => isSel ? p.filter(x => x !== inv.id) : [...p, inv.id])}
                    style={{ background: isSel ? 'rgba(239,68,68,0.06)' : 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: `1px solid ${isSel ? 'rgba(239,68,68,0.25)' : bucketDef.color + '18'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, background: isSel ? 'rgba(239,68,68,0.2)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSel && <CheckCircle size={11} color="#ef4444" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.company_name || inv.lead_id || 'Bilinmeyen'}</p>
                        <span style={{ color: bucketDef.color, fontSize: 10, background: `${bucketDef.color}15`, border: `1px solid ${bucketDef.color}30`, borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>{bucketDef.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569' }}>
                        {inv.daysOverdue > 0 && <span style={{ color: bucketDef.color }}>{inv.daysOverdue} gün gecikmiş</span>}
                        {inv.due_date && <span>Vade: {new Date(inv.due_date).toLocaleDateString('tr-TR')}</span>}
                        {inv.status && <span>{inv.status}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ color: inv.daysOverdue > 0 ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: 15, margin: '0 0 6px' }}>₺{(inv.amount || 0).toLocaleString('tr-TR')}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={e => { e.stopPropagation(); generatePaymentLink(inv) }}
                          style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: '#22d3ee', fontSize: 10, cursor: 'pointer' }}>
                          🔗 Link
                        </button>
                        {inv.daysOverdue > 0 && (
                          <button onClick={e => { e.stopPropagation(); sendReminder(inv.id) }} disabled={sending === inv.id}
                            style={{ padding: '4px 8px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#7f1d1d,#ef4444)', color: '#fff', fontSize: 10, cursor: sending === inv.id ? 'not-allowed' : 'pointer' }}>
                            {sending === inv.id ? '...' : '📨 Hatırlat'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'escalation' && (
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 18, padding: 22 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>⚡ Otomatik Eskalasyon Zaman Çizelgesi</h3>
          {[
            { day: 0, label: 'Fatura kesildi', color: '#10b981', desc: 'Otomatik WhatsApp bildirimi gönderildi' },
            { day: 7, label: 'Nazik hatırlatma', color: '#06b6d4', desc: 'Vade yaklaşıyor mesajı' },
            { day: 15, label: 'Vade geldi', color: '#f59e0b', desc: 'Ödeme yapılmadı, acil bildirim' },
            { day: 30, label: '1. Uyarı', color: '#f97316', desc: 'Gecikme faizi hesaplandı, resmi uyarı' },
            { day: 60, label: '2. Uyarı', color: '#ef4444', desc: 'Hesap askıya alma uyarısı' },
            { day: 90, label: 'Yasal süreç', color: '#7f1d1d', desc: 'Avukata iletildi, tahsilat ajansı' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${step.color}18`, border: `1px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: step.color, fontSize: 11, fontWeight: 800 }}>+{step.day}g</span>
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 2px' }}>{step.label}</p>
                <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'compliance' && (
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 18, padding: 22 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>🛡️ Uyum ve Yasal Güvence</h3>
          {[
            { label: 'KVKK Uyumu', status: 'ok', desc: 'Tüm hatırlatmalar KVKK kapsamında gönderiliyor' },
            { label: 'Faiz Hesabı', status: 'ok', desc: 'Yasal gecikme faizi otomatik hesaplanıyor (%9.75)' },
            { label: 'Resmi Uyarı Mektubu', status: 'info', desc: '90+ gün gecikmeli faturalar için otomatik oluşturulabilir' },
            { label: 'Avukat Transferi', status: 'warn', desc: `${enriched.filter(i => i.daysOverdue >= 90).length} fatura yasal eşikte, manuel onay gerekli` },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {item.status === 'ok' ? <CheckCircle size={16} color="#10b981" /> : item.status === 'warn' ? <AlertTriangle size={16} color="#f59e0b" /> : <Shield size={16} color="#06b6d4" />}
              <div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0 }}>{item.label}</p>
                <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes dc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
