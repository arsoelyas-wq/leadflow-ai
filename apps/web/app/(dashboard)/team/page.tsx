'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Users, Plus, RefreshCw, Trash2, CheckCircle, Target, MessageSquare,
  PhoneCall, ChevronRight, X, Star, TrendingUp, TrendingDown, Award,
  BarChart2, AlertTriangle, ArrowLeft, Save, Activity, Shield, Edit2
} from 'lucide-react'

const ROLES = [
  { key: 'admin', label: 'Yönetici', color: 'text-red-400', bg: 'bg-red-500/10' },
  { key: 'manager', label: 'Müdür', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'sales', label: 'Satış Temsilcisi', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'support', label: 'Destek', color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'readonly', label: 'Görüntüleyici', color: 'text-slate-400', bg: 'bg-slate-500/10' },
]

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

function ScorePill({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-slate-500">—</span>
  const c = score >= 80 ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
    : score >= 60 ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
    : score >= 40 ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
    : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c}`}>{score}</span>
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const c = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{score}/100</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full ${c} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' }
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-teal-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ── ÜÇÜNCÜ EKRAN: Üye Detay ──────────────────────────────
function MemberDetail({ member, onBack, onRefresh }: { member: any; onBack: () => void; onRefresh: () => void }) {
  const [report, setReport] = useState<any>(null)
  const [analyses, setAnalyses] = useState<any[]>([])
  const [tiMember, setTiMember] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [analyzing, setAnalyzing] = useState(false)
  const [tab, setTab] = useState<'overview' | 'conversations' | 'coaching'>('overview')
  const [showAddLine, setShowAddLine] = useState(false)
  const [newLine, setNewLine] = useState({ number: '', type: 'whatsapp' })
  const [editWa, setEditWa] = useState(false)
  const [waPhone, setWaPhone] = useState(member.wa_phone || '')
  const [savingLine, setSavingLine] = useState(false)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => { loadAll() }, [days])

  async function loadAll() {
    setLoading(true)
    try {
      // team-intelligence üyesini bul veya oluştur
      const r = await fetch(`${API}/api/team-intelligence/members`, { headers: authH() })
      const d = await r.json()
      let ti = (d.members || []).find((m: any) => m.email === member.email || m.name === member.name)

      if (!ti) {
        // Yoksa oluştur
        const cr = await fetch(`${API}/api/team-intelligence/members`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({ name: member.name, email: member.email, role: member.role, wa_phone: member.wa_phone || '' })
        })
        ti = (await cr.json()).member
      }

      setTiMember(ti)
      setWaPhone(ti?.wa_phone || member.wa_phone || '')
      setLines(ti?.phone_lines?.filter((l: any) => l.is_active) || [])

      if (ti) {
        const [rr, ar] = await Promise.allSettled([
          fetch(`${API}/api/team-intelligence/member-report/${ti.id}?days=${days}`, { headers: authH() }),
          fetch(`${API}/api/team-intelligence/analyses?memberId=${ti.id}&limit=50`, { headers: authH() }),
        ])
        if (rr.status === 'fulfilled' && (rr.value as any).ok) setReport(await (rr.value as any).json())
        if (ar.status === 'fulfilled') setAnalyses((await (ar.value as any).json()).analyses || [])
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function saveWaPhone() {
    if (!tiMember) return
    setSavingLine(true)
    try {
      await fetch(`${API}/api/team-intelligence/members/${tiMember.id}`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ wa_phone: waPhone })
      })
      setEditWa(false)
      setMsg('WhatsApp numarası kaydedildi')
      setTimeout(() => setMsg(''), 3000)
      loadAll()
    } catch (e: any) { setMsg(e.message) }
    setSavingLine(false)
  }

  async function addLine() {
    if (!tiMember || !newLine.number) return
    setSavingLine(true)
    try {
      await fetch(`${API}/api/team-intelligence/members/${tiMember.id}/lines`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify(newLine)
      })
      setNewLine({ number: '', type: 'whatsapp' })
      setShowAddLine(false)
      setMsg('Hat eklendi')
      setTimeout(() => setMsg(''), 3000)
      loadAll()
    } catch (e: any) { setMsg(e.message) }
    setSavingLine(false)
  }

  async function deleteLine(lineId: string) {
    if (!tiMember) return
    await fetch(`${API}/api/team-intelligence/members/${tiMember.id}/lines/${lineId}`, {
      method: 'DELETE', headers: authH()
    })
    loadAll()
  }

  async function analyzeNow() {
    if (!tiMember) return
    setAnalyzing(true)
    try {
      const r = await fetch(`${API}/api/team-intelligence/analyze-whatsapp`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ memberId: tiMember.id, days })
      })
      const d = await r.json()
      setMsg(d.message || `${d.analyzed} konuşma analiz edildi`)
      setTimeout(() => setMsg(''), 4000)
      loadAll()
    } catch (e: any) { setMsg(e.message) }
    setAnalyzing(false)
  }

  const getRoleInfo = (key: string) => ROLES.find(r => r.key === key) || ROLES[2]
  const roleInfo = getRoleInfo(member.role)
  const scoreColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : s >= 40 ? 'text-orange-400' : 'text-red-400'
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
        <ArrowLeft className="w-4 h-4"/> Ekip Listesi
      </button>

      {msg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">{msg}</div>
      )}

      {/* Profil Kartı */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={member.name} size="xl"/>
            <div>
              <h2 className="text-2xl font-bold text-white">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.bg} ${roleInfo.color}`}>{roleInfo.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${member.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {member.active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-1">{member.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
            <button onClick={analyzeNow} disabled={analyzing || !tiMember}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-xl disabled:opacity-50">
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Activity className="w-4 h-4"/>}
              Analiz Et
            </button>
            <button onClick={loadAll} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl">
              <RefreshCw className="w-4 h-4 text-slate-300"/>
            </button>
          </div>
        </div>

        {/* İletişim Hatları Yönetimi */}
        <div className="border-t border-slate-700 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">İletişim Hatları</h3>
            <button onClick={() => setShowAddLine(!showAddLine)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30">
              <Plus className="w-3 h-3"/> Hat Ekle
            </button>
          </div>

          {/* WhatsApp Ana Numara */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 flex items-center gap-2 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
              <MessageSquare className="w-4 h-4 text-teal-400 shrink-0"/>
              <div className="flex-1">
                <div className="text-xs text-teal-400 font-medium mb-1">WhatsApp Numarası</div>
                {editWa ? (
                  <div className="flex items-center gap-2">
                    <input value={waPhone} onChange={e => setWaPhone(e.target.value)}
                      placeholder="905551234567"
                      className="flex-1 bg-slate-900 border border-teal-500/30 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-400"/>
                    <button onClick={saveWaPhone} disabled={savingLine}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-lg flex items-center gap-1">
                      <Save className="w-3 h-3"/> Kaydet
                    </button>
                    <button onClick={() => { setEditWa(false); setWaPhone(tiMember?.wa_phone || '') }}
                      className="p-1.5 text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-mono">{waPhone || 'Eklenmemiş'}</span>
                    <button onClick={() => setEditWa(true)}
                      className="p-1 text-slate-500 hover:text-teal-400">
                      <Edit2 className="w-3 h-3"/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ek Hatlar */}
          <div className="space-y-2">
            {lines.map((line: any) => (
              <div key={line.id} className={`flex items-center justify-between p-3 rounded-xl border ${line.type === 'whatsapp' ? 'bg-teal-500/8 border-teal-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
                <div className="flex items-center gap-2">
                  {line.type === 'whatsapp'
                    ? <MessageSquare className="w-4 h-4 text-teal-400"/>
                    : <PhoneCall className="w-4 h-4 text-amber-400"/>}
                  <div>
                    <div className={`text-xs font-medium ${line.type === 'whatsapp' ? 'text-teal-400' : 'text-amber-400'}`}>
                      {line.type === 'whatsapp' ? 'WhatsApp' : 'Telefon Hattı'}
                    </div>
                    <div className="text-sm text-white font-mono">{line.number}</div>
                  </div>
                </div>
                <button onClick={() => deleteLine(line.id)} className="p-1.5 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
          </div>

          {/* Hat Ekleme Formu */}
          {showAddLine && (
            <div className="mt-3 p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
              <h4 className="text-sm font-medium text-white">Yeni Hat Ekle</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Numara</label>
                  <input value={newLine.number} onChange={e => setNewLine({ ...newLine, number: e.target.value })}
                    placeholder="905551234567 veya 0212xxxxxxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Hat Türü</label>
                  <select value={newLine.type} onChange={e => setNewLine({ ...newLine, type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Telefon</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addLine} disabled={savingLine || !newLine.number}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
                  {savingLine ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
                  Ekle
                </button>
                <button onClick={() => setShowAddLine(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit">
        {[['overview','Genel Bakış'],['conversations','Konuşmalar'],['coaching','Koçluk']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2"/> Yükleniyor...
        </div>
      ) : (
        <>
          {/* GENEL BAKIŞ */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Toplam Analiz', value: report?.total_analyses || 0 },
                  { label: 'WhatsApp', value: report?.whatsapp_count || 0 },
                  { label: 'Telefon', value: report?.phone_count || 0 },
                  { label: 'Genel Skor', value: report?.avg_score || '—', highlight: true },
                  { label: 'Satış Tekniği', value: report?.scores?.sales_technique || '—' },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                    <div className={`text-2xl font-bold ${highlight && report?.avg_score ? scoreColor(report.avg_score) : 'text-white'}`}>{value}</div>
                    <div className="text-xs text-slate-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {report?.avg_score ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400"/> Performans Puanlaması
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ScoreBar label="Profesyonellik" score={report.scores?.professionalism || 0}/>
                    <ScoreBar label="Satış Tekniği" score={report.scores?.sales_technique || 0}/>
                    <ScoreBar label="Empati & Dinleme" score={report.scores?.empathy || 0}/>
                    <ScoreBar label="Kapanış Tekniği" score={report.scores?.closing || 0}/>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-3 flex-wrap">
                    {report.avg_score >= 80 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
                        <Star className="w-3.5 h-3.5 text-emerald-400"/>
                        <span className="text-emerald-400 text-sm font-medium">Yüksek Performans</span>
                      </div>
                    )}
                    {report.avg_score >= 60 && report.avg_score < 80 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400"/>
                        <span className="text-amber-400 text-sm font-medium">Gelişiyor</span>
                      </div>
                    )}
                    {report.avg_score < 60 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 border border-red-500/30 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400"/>
                        <span className="text-red-400 text-sm font-medium">Koçluk Gerekiyor</span>
                      </div>
                    )}
                    <span className="text-slate-400 text-sm">Son {days} gün: <strong className={scoreColor(report.avg_score)}>{report.avg_score}/100</strong></span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center">
                  <BarChart2 className="w-10 h-10 text-slate-600 mx-auto mb-2"/>
                  <p className="text-slate-400 text-sm mb-3">Henüz analiz yok</p>
                  <button onClick={analyzeNow} disabled={analyzing || !tiMember}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-xl disabled:opacity-50 flex items-center gap-2 mx-auto">
                    {analyzing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Activity className="w-4 h-4"/>}
                    Şimdi Analiz Et
                  </button>
                </div>
              )}

              {report?.outcomes && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Satış', value: report.outcomes.sale, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Geri Arama', value: report.outcomes.callback, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Satış Yok', value: report.outcomes.no_sale, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Bilinmiyor', value: report.outcomes.unknown, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-600/30' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} border rounded-2xl p-4 text-center`}>
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-slate-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KONUŞMALAR */}
          {tab === 'conversations' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {analyses.map(a => (
                  <div key={a.id} onClick={() => setSelectedAnalysis(a)}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all ${selectedAnalysis?.id === a.id ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {a.channel === 'whatsapp'
                          ? <MessageSquare className="w-3.5 h-3.5 text-teal-400"/>
                          : <PhoneCall className="w-3.5 h-3.5 text-amber-400"/>}
                        <span className="text-xs font-medium text-white">{a.customer_phone}</span>
                      </div>
                      <ScorePill score={a.overall_score}/>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{a.summary || 'Özet yok'}</p>
                    <div className="text-xs text-slate-600 mt-1.5">
                      {new Date(a.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {analyses.length === 0 && (
                  <div className="text-center py-12 text-slate-600">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">Henüz analiz yok</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-3">
                {selectedAnalysis?.overall_score ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-5 max-h-[700px] overflow-y-auto">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {selectedAnalysis.channel === 'whatsapp'
                            ? <span className="text-xs px-2 py-0.5 bg-teal-500/15 text-teal-400 rounded-full">WhatsApp</span>
                            : <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full">Telefon</span>}
                          {selectedAnalysis.outcome === 'sale' && <span className="text-xs px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full">Satış</span>}
                        </div>
                        <div className="text-white font-semibold">{selectedAnalysis.customer_phone}</div>
                        {selectedAnalysis.duration_seconds > 0 && (
                          <div className="text-xs text-slate-400">{Math.round(selectedAnalysis.duration_seconds / 60)} dakika</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-black ${scoreColor(selectedAnalysis.overall_score)}`}>{selectedAnalysis.overall_score}</div>
                        <div className="text-xs text-slate-500">/ 100</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-blue-600/50 pl-3">{selectedAnalysis.summary}</p>
                    <div className="space-y-2">
                      <ScoreBar label="Profesyonellik" score={selectedAnalysis.professionalism_score || 0}/>
                      <ScoreBar label="Satış Tekniği" score={selectedAnalysis.sales_technique_score || 0}/>
                      <ScoreBar label="Empati" score={selectedAnalysis.empathy_score || 0}/>
                      <ScoreBar label="Kapanış" score={selectedAnalysis.closing_score || 0}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedAnalysis.strengths?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Güçlü Yönler</h4>
                          {selectedAnalysis.strengths.map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs mb-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"/>
                              <span className="text-slate-300">{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedAnalysis.weaknesses?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Zayıf Yönler</h4>
                          {selectedAnalysis.weaknesses.map((w: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs mb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"/>
                              <span className="text-slate-300">{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedAnalysis.lost_opportunities?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Kaçırılan Fırsatlar</h4>
                        {selectedAnalysis.lost_opportunities.map((o: any, i: number) => (
                          <div key={i} className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl mb-2">
                            <div className="text-xs font-medium text-amber-300 mb-1">{o.moment}</div>
                            <div className="text-xs text-slate-400">{o.suggestion}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedAnalysis.recommendations?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Öneriler</h4>
                        {selectedAnalysis.recommendations.map((r: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs mb-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5"/>
                            <span className="text-slate-300">{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-600">
                    <div className="text-center">
                      <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                      <p className="text-sm">Sol listeden bir konuşma seç</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KOÇLUK */}
          {tab === 'coaching' && report && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4"/> Güçlü Yönler
                </h3>
                <div className="space-y-2.5">
                  {report.top_strengths?.map((s: any) => (
                    <div key={s.text} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"/>
                      <span className="text-xs text-slate-300 flex-1">{s.text}</span>
                      <span className="text-xs text-emerald-400 shrink-0">{s.count}x</span>
                    </div>
                  ))}
                  {!report.top_strengths?.length && <p className="text-xs text-slate-600">Veri yok</p>}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-4">
                  <TrendingDown className="w-4 h-4"/> Gelişim Alanları
                </h3>
                <div className="space-y-2.5">
                  {report.top_weaknesses?.map((w: any) => (
                    <div key={w.text} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"/>
                      <span className="text-xs text-slate-300 flex-1">{w.text}</span>
                      <span className="text-xs text-red-400 shrink-0">{w.count}x</span>
                    </div>
                  ))}
                  {!report.top_weaknesses?.length && <p className="text-xs text-slate-600">Veri yok</p>}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4"/> Koçluk Önerileri
                </h3>
                <div className="space-y-2.5">
                  {report.top_recommendations?.map((r: any) => (
                    <div key={r.text} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5"/>
                      <span className="text-xs text-slate-300">{r.text}</span>
                    </div>
                  ))}
                  {!report.top_recommendations?.length && <p className="text-xs text-slate-600">Veri yok</p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── ANA SAYFA ─────────────────────────────────────────────
export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedMember, setSelectedMember] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'sales', password: '', wa_phone: '' })
  const [saving, setSaving] = useState(false)
  const [detailMember, setDetailMember] = useState<any>(null)
  const [memberScores, setMemberScores] = useState<Record<string, number | null>>({})

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [m, s, l] = await Promise.allSettled([
        api.get('/api/team/members'),
        api.get('/api/team/stats'),
        api.get('/api/leads?limit=100&status=new'),
      ])
      if (m.status === 'fulfilled') {
        const mems = m.value.members || []
        setMembers(mems)
        // Her üye için AI skor çek
        const scores: Record<string, number | null> = {}
        await Promise.allSettled(mems.map(async (mem: any) => {
          try {
            const r = await fetch(`${API}/api/team-intelligence/member-report/${mem.id}?days=30`, { headers: authH() })
            if (r.ok) {
              const d = await r.json()
              scores[mem.id] = d.avg_score || null
            }
          } catch {}
        }))
        setMemberScores(scores)
      }
      if (s.status === 'fulfilled') setStats(s.value)
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const addMember = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      await api.post('/api/team/members', form)
      // team-intelligence'a da ekle
      await fetch(`${API}/api/team-intelligence/members`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role, wa_phone: form.wa_phone })
      })
      showMsg('success', `${form.name} ekibe eklendi!`)
      setShowAdd(false)
      setForm({ name: '', email: '', role: 'sales', password: '', wa_phone: '' })
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/api/team/members/${id}`, { active: !active })
      showMsg('success', !active ? 'Üye aktif edildi' : 'Üye devre dışı bırakıldı')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Üyeyi silmek istediğinize emin misiniz?')) return
    try {
      await api.delete(`/api/team/members/${id}`)
      showMsg('success', 'Üye silindi')
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const assignLeads = async () => {
    if (!selectedMember || !selectedLeads.length) return
    try {
      await api.post('/api/team/assign-leads', { memberId: selectedMember, leadIds: selectedLeads })
      showMsg('success', `${selectedLeads.length} lead atandı!`)
      setShowAssign(false)
      setSelectedLeads([])
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const getRoleInfo = (key: string) => ROLES.find(r => r.key === key) || ROLES[2]

  if (detailMember) {
    return <MemberDetail member={detailMember} onBack={() => { setDetailMember(null); load() }} onRefresh={load}/>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-blue-400"/> Ekip Yönetimi
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Satış ekibini yönet — yetki ver — lead ata — performans takip et</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAssign(!showAssign)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition">
            <Target size={14}/> Lead Ata
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
            <Plus size={14}/> Üye Ekle
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-slate-400 text-xs mt-1">Toplam Üye</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            <p className="text-slate-400 text-xs mt-1">Aktif</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-white text-xs font-medium mb-2">Rol Dağılımı</p>
            {Object.entries(stats.byRole || {}).map(([role, count]: any) => (
              <div key={role} className="flex items-center justify-between text-xs">
                <span className={getRoleInfo(role).color}>{getRoleInfo(role).label}</span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Yeni Ekip Üyesi</h2>
          <div className="grid lg:grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Ad Soyad *', ph: 'Ahmet Yılmaz', type: 'text' },
              { key: 'email', label: 'Email *', ph: 'ahmet@sirket.com', type: 'text' },
              { key: 'wa_phone', label: 'WhatsApp Numarası', ph: '905551234567', type: 'text' },
              { key: 'password', label: 'Şifre', ph: 'Boş bırakılırsa LeadFlow2024!', type: 'password' },
            ].map(({ key, label, ph, type }) => (
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block flex items-center gap-1">
                  {key === 'wa_phone' && <MessageSquare className="w-3 h-3 text-teal-400"/>}
                  {label}
                </label>
                <input type={type} value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>
            ))}
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Rol</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addMember} disabled={saving || !form.name || !form.email}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg">
              {saving ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Lead Ata</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Ekip Üyesi</label>
              <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Seçin</option>
                {members.filter(m => m.active).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({getRoleInfo(m.role).label})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Leadler ({selectedLeads.length} seçili)</label>
              <div className="max-h-32 overflow-y-auto bg-slate-900 rounded-lg p-2 space-y-1">
                {leads.slice(0, 20).map(l => (
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                      className="accent-purple-500"/>
                    <span className="text-white text-xs truncate">{l.company_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={assignLeads} disabled={!selectedMember || !selectedLeads.length}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-lg">
              {selectedLeads.length} Lead Ata
            </button>
            <button onClick={() => setShowAssign(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg">İptal</button>
          </div>
        </div>
      )}

      {/* Üye Listesi */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">Ekip Üyeleri ({members.length})</h2>
        {loading ? (
          <div className="flex justify-center h-20 items-center">
            <RefreshCw size={20} className="animate-spin text-slate-400"/>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
            <Users size={36} className="text-slate-600 mx-auto mb-2"/>
            <p className="text-slate-400">Henüz ekip üyesi yok</p>
          </div>
        ) : members.map(member => {
          const roleInfo = getRoleInfo(member.role)
          const score = memberScores[member.id] || null
          return (
            <div key={member.id} className="bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 flex items-center gap-4 transition-all">
              <Avatar name={member.name} size="md"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{member.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.bg} ${roleInfo.color}`}>{roleInfo.label}</span>
                  {!member.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Pasif</span>}
                  {member.leads_count > 0 && <span className="text-xs text-blue-400">{member.leads_count} lead</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  <span>{member.email}</span>
                  {member.wa_phone && (
                    <span className="flex items-center gap-1 text-teal-400">
                      <MessageSquare className="w-3 h-3"/>{member.wa_phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {score !== null ? (
                  <div className="text-center mr-1">
                    <ScorePill score={score}/>
                    <div className="text-xs text-slate-500 mt-0.5">AI Skor</div>
                  </div>
                ) : null}
                <button onClick={() => toggleActive(member.id, member.active)}
                  className={`p-1.5 rounded-lg transition ${member.active ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-400'}`}>
                  <CheckCircle size={14}/>
                </button>
                <button onClick={() => deleteMember(member.id)}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                  <Trash2 size={14}/>
                </button>
                <button onClick={() => setDetailMember(member)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium">
                  Detay <ChevronRight className="w-3 h-3"/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}