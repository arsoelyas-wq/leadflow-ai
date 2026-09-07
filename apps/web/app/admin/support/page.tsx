'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string; ticket_number: number; user_email: string; user_name: string
  category: string; title: string; description?: string; priority: string; status: string
  attachments?: { name: string; dataUrl: string; type: string }[]
  admin_reply?: string; admin_name?: string; admin_replied_at?: string
  created_at: string; updated_at: string; resolved_at?: string
  conversation_id?: string
}

const STATUS_OPTS = [
  { value: 'all',         label: 'Tümü',       dot: '#64748b' },
  { value: 'open',        label: 'Açık',        dot: '#2563eb' },
  { value: 'in_progress', label: 'İşlemde',     dot: '#d97706' },
  { value: 'waiting',     label: 'Bekliyor',    dot: '#7c3aed' },
  { value: 'resolved',    label: 'Çözüldü',     dot: '#059669' },
  { value: 'closed',      label: 'Kapatıldı',   dot: '#64748b' },
]
const STATUS_COLORS: Record<string, { c: string; bg: string }> = {
  open:        { c: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  in_progress: { c: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  waiting:     { c: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  resolved:    { c: '#059669', bg: 'rgba(5,150,105,0.1)' },
  closed:      { c: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Açık', in_progress: 'İşlemde', waiting: 'Bekliyor', resolved: 'Çözüldü', closed: 'Kapatıldı',
}
const PRIORITY_LABELS: Record<string, { l: string; c: string }> = {
  low:    { l: '⚪ Düşük',  c: '#64748b' },
  normal: { l: '🔵 Normal', c: '#2563eb' },
  high:   { l: '🟠 Yüksek', c: '#d97706' },
  urgent: { l: '🔴 Acil',   c: '#dc2626' },
}
const CATEGORY_LABELS: Record<string, string> = {
  technical: '🔧 Teknik', billing: '💳 Fatura', feature: '💡 Özellik', account: '👤 Hesap', general: '💬 Genel',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = { background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '10px 14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit', resize: 'vertical' as const }

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSupportPage() {
  const [tab, setTab] = useState<'tickets' | 'dm'>('tickets')

  // DM state (original functionality)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [msg, setMsg] = useState({ title: '', body: '', href: '/dashboard' })
  const [sending, setSending] = useState(false)
  const [dmResult, setDmResult] = useState('')

  // Ticket state
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [filterStatus, setFilterStatus] = useState('all')
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [savingReply, setSavingReply] = useState(false)
  const [replyResult, setReplyResult] = useState('')
  const [viewImg, setViewImg] = useState<string | null>(null)

  useEffect(() => {
    adminApi.users({ limit: '200' }).then(d => setUsers(d.users || [])).catch(() => {}).finally(() => setLoadingUsers(false))
  }, [])

  useEffect(() => {
    if (tab !== 'tickets') return
    loadTickets()
  }, [tab, filterStatus])

  async function loadTickets() {
    setLoadingTickets(true)
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
      const d: any = await adminApi.get(`/api/support/admin/tickets${params}`)
      setTickets(d.tickets || [])
      setStatusCounts(d.statusCounts || {})
    } catch {}
    setLoadingTickets(false)
  }

  async function loadTicketDetail(id: string) {
    setLoadingDetail(true); setReplyText(''); setReplyResult(''); setNewStatus('')
    try {
      const d: any = await adminApi.get(`/api/support/admin/tickets/${id}`)
      setSelectedTicket(d.ticket)
      setNewStatus(d.ticket.status)
    } catch {}
    setLoadingDetail(false)
  }

  async function saveReply() {
    if (!selectedTicket) return
    setSavingReply(true); setReplyResult('')
    try {
      const body: any = { status: newStatus }
      if (replyText.trim()) body.admin_reply = replyText.trim()
      const d: any = await adminApi.patch(`/api/support/admin/tickets/${selectedTicket.id}`, body)
      setSelectedTicket(prev => prev ? { ...prev, ...d.ticket, admin_reply: d.ticket.admin_reply || prev.admin_reply } : null)
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: d.ticket.status, admin_reply: d.ticket.admin_reply || t.admin_reply } : t))
      setReplyResult('✅ Kaydedildi')
      if (replyText.trim()) setReplyText('')
    } catch (e: any) {
      setReplyResult('❌ ' + (e.message || 'Hata'))
    }
    setSavingReply(false)
  }

  const sendDM = async () => {
    if (!selected || !msg.title || !msg.body) return
    setSending(true)
    try {
      await adminApi.broadcast({ ...msg, target_plan: 'all', _user_ids: [selected.id] })
      setDmResult(`✅ ${selected.email} kullanıcısına mesaj gönderildi`)
      setMsg({ title: '', body: '', href: '/dashboard' })
    } catch (e: any) { setDmResult('❌ ' + e.message) }
    setSending(false)
  }

  const filteredUsers = search ? users.filter(u => u.email?.includes(search) || u.name?.includes(search) || u.company?.includes(search)) : users.slice(0, 20)

  const totalOpen = (statusCounts.open || 0) + (statusCounts.in_progress || 0)

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>🎧 Destek Merkezi</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Destek talepleri ve kullanıcı iletişimi</p>
        </div>
        {totalOpen > 0 && (
          <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12, fontWeight: 700 }}>
            {totalOpen} açık talep
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ v: 'tickets', l: '🎫 Destek Talepleri' }, { v: 'dm', l: '💬 Kullanıcı DM' }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: tab === t.v ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(255,255,255,0.04)', color: tab === t.v ? '#fff' : '#64748b' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── TICKETS TAB ── */}
      {tab === 'tickets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Left: Ticket List */}
          <div>
            {/* Status filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {STATUS_OPTS.map(s => (
                <button key={s.value} onClick={() => setFilterStatus(s.value)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, borderColor: filterStatus === s.value ? s.dot : 'rgba(255,255,255,0.08)', background: filterStatus === s.value ? `${s.dot}20` : 'transparent', color: filterStatus === s.value ? s.dot : '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {s.label}
                  {s.value !== 'all' && statusCounts[s.value] ? (
                    <span style={{ background: s.dot, color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 9 }}>{statusCounts[s.value]}</span>
                  ) : null}
                </button>
              ))}
            </div>

            <div style={card}>
              {loadingTickets ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 32 }}>Yükleniyor...</div>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 32, fontSize: 13 }}>Bu filtrede talep yok</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tickets.map(t => {
                    const sc = STATUS_COLORS[t.status] || STATUS_COLORS.open
                    const isActive = selectedTicket?.id === t.id
                    return (
                      <button key={t.id} onClick={() => loadTicketDetail(t.id)}
                        style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: `1px solid ${isActive ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`, background: isActive ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>#{t.ticket_number}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, color: sc.c, background: sc.bg }}>{STATUS_LABELS[t.status] || t.status}</span>
                              {t.priority === 'urgent' && <span style={{ fontSize: 10, color: '#dc2626' }}>🔴</span>}
                              {t.admin_reply && <span style={{ fontSize: 9, color: '#059669', fontWeight: 700 }}>✓ Yanıtlandı</span>}
                            </div>
                            <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                            <p style={{ color: '#475569', fontSize: 11, margin: '3px 0 0' }}>{t.user_email || t.user_name} · {new Date(t.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                          </div>
                          <span style={{ fontSize: 12 }}>{CATEGORY_LABELS[t.category]?.split(' ')[0] || '💬'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Ticket Detail */}
          <div>
            {!selectedTicket ? (
              <div style={{ ...card, textAlign: 'center', padding: 48, color: '#334155' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎫</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Sol taraftan bir talep seçin</p>
              </div>
            ) : loadingDetail ? (
              <div style={{ ...card, textAlign: 'center', padding: 48, color: '#475569' }}>Yükleniyor...</div>
            ) : (
              <div style={card}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>#{selectedTicket.ticket_number}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12, color: STATUS_COLORS[selectedTicket.status]?.c || '#64748b', background: STATUS_COLORS[selectedTicket.status]?.bg || 'rgba(100,116,139,0.1)' }}>{STATUS_LABELS[selectedTicket.status] || selectedTicket.status}</span>
                      <span style={{ fontSize: 11, color: PRIORITY_LABELS[selectedTicket.priority]?.c || '#64748b' }}>{PRIORITY_LABELS[selectedTicket.priority]?.l || selectedTicket.priority}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
                    </div>
                    <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{selectedTicket.title}</h2>
                  </div>
                  {selectedTicket.conversation_id && (
                    <a href={`/admin/support/conv/${selectedTicket.conversation_id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#c084fc', textDecoration: 'none', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      💬 AI Konuşma
                    </a>
                  )}
                </div>

                {/* User info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(selectedTicket.user_name || selectedTicket.user_email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedTicket.user_name || 'Adsız Kullanıcı'}</p>
                    <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{selectedTicket.user_email}</p>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', textAlign: 'right' }}>
                    <div>{new Date(selectedTicket.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div>{new Date(selectedTicket.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Açıklama</p>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {selectedTicket.description || '(Açıklama yok)'}
                  </div>
                </div>

                {/* Attachments */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Ekran Görüntüleri ({selectedTicket.attachments.length})</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selectedTicket.attachments.map((att, i) => (
                        <button key={i} onClick={() => setViewImg(att.dataUrl)} style={{ padding: 0, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', overflow: 'hidden', background: 'none' }}>
                          <img src={att.dataUrl} alt={att.name} style={{ display: 'block', width: 100, height: 80, objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing admin reply */}
                {selectedTicket.admin_reply && (
                  <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p style={{ color: '#34d399', fontSize: 11, fontWeight: 700, margin: '0 0 6px' }}>✅ Mevcut Admin Yanıtı — {selectedTicket.admin_name} · {selectedTicket.admin_replied_at ? new Date(selectedTicket.admin_replied_at).toLocaleDateString('tr-TR') : ''}</p>
                    <p style={{ color: '#a7f3d0', fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedTicket.admin_reply}</p>
                  </div>
                )}

                {/* Status + Reply form */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Durum Güncelle</label>
                      <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inp, padding: '9px 12px', resize: 'none', cursor: 'pointer' }}>
                        {STATUS_OPTS.filter(s => s.value !== 'all').map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      Admin Yanıtı {selectedTicket.admin_reply ? '(Güncelle)' : ''}
                    </label>
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4}
                      placeholder={selectedTicket.admin_reply ? 'Yeni yanıt yazarak güncelle...' : 'Kullanıcıya görünecek yanıtı yazın...'}
                      style={inp} />
                  </div>

                  {replyResult && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: replyResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: replyResult.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 12 }}>
                      {replyResult}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveReply} disabled={savingReply}
                      style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', cursor: savingReply ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: savingReply ? 0.7 : 1 }}>
                      {savingReply ? 'Kaydediliyor...' : '💾 Kaydet & Güncelle'}
                    </button>
                    <Link href={selectedTicket.user_email ? `/admin/users?q=${selectedTicket.user_email}` : '/admin/users'}
                      style={{ padding: '11px 16px', borderRadius: 10, background: 'rgba(139,92,246,0.15)', color: '#c084fc', textDecoration: 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                      👤 Kullanıcı
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DM TAB (original) ── */}
      {tab === 'dm' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>👤 Kullanıcı Seç</h3>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Email, isim veya şirket ara..." style={{ ...inp, marginBottom: 12, resize: 'none' }} />
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {filteredUsers.map(u => (
                <div key={u.id} onClick={() => setSelected(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 3, background: selected?.id === u.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selected?.id === u.id ? 'rgba(59,130,246,0.3)' : 'transparent'}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(u.name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || '—'}</div>
                    <div style={{ color: '#475569', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <span style={{ padding: '2px 6px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: '#c084fc', flexShrink: 0 }}>{u.plan_type}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={card}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>
                💬 {selected ? `${selected.name || selected.email}'e Mesaj` : 'Kullanıcı Seçin'}
              </h3>
              {selected ? (
                <>
                  {dmResult && <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 12, background: dmResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: dmResult.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 12 }}>{dmResult}</div>}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Başlık</label>
                    <input value={msg.title} onChange={e => setMsg({ ...msg, title: e.target.value })} placeholder="Mesaj başlığı" style={{ ...inp, resize: 'none' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Mesaj</label>
                    <textarea value={msg.body} onChange={e => setMsg({ ...msg, body: e.target.value })} rows={4} placeholder="Kullanıcıya gönderilecek mesaj..." style={inp} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={sendDM} disabled={sending} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                      {sending ? 'Gönderiliyor...' : '💬 Bildirim Gönder'}
                    </button>
                    <Link href={`/admin/users/${selected.id}`} style={{ padding: '10px 16px', borderRadius: 9, background: 'rgba(139,92,246,0.2)', color: '#c084fc', textDecoration: 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      👤 Profil
                    </Link>
                  </div>
                </>
              ) : (
                <div style={{ color: '#334155', fontSize: 13, padding: 20, textAlign: 'center' }}>Sol taraftan bir kullanıcı seçin</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {viewImg && (
        <div onClick={() => setViewImg(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={viewImg} alt="Ek" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  )
}
