'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Upload, Play, Square,
  CheckCircle, AlertTriangle, RefreshCw, Plus, Trash2, Settings,
  Users, Clock, TrendingUp, X, ChevronRight, Zap, Volume2,
  BarChart2, Activity, Shield, Star, ArrowRight
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH(json = true) {
  const h: any = { Authorization: `Bearer ${getToken()}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

// ── STATUS BADGE ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-400' },
    calling: { label: 'Arıyor', cls: 'bg-blue-500/15 text-blue-400 animate-pulse' },
    initiating: { label: 'Başlatılıyor', cls: 'bg-amber-500/15 text-amber-400' },
    'no-answer': { label: 'Cevap Yok', cls: 'bg-slate-500/15 text-slate-400' },
    busy: { label: 'Meşgul', cls: 'bg-orange-500/15 text-orange-400' },
    failed: { label: 'Başarısız', cls: 'bg-red-500/15 text-red-400' },
    transferred: { label: 'Transfer', cls: 'bg-purple-500/15 text-purple-400' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

// ── NUMARA DOĞRULAMA MODAL ────────────────────────────────
function VerifyModal({ onClose, onVerified }: { onClose: () => void; onVerified: (phone: string) => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendCode() {
    if (!phone) return
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/api/voice/verify/send`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ phone })
      })
      const d = await r.json()
      if (d.ok) setStep('code')
      else setError(d.error)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function confirmCode() {
    if (!code) return
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/api/voice/verify/confirm`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ phone, code })
      })
      const d = await r.json()
      if (d.ok) { onVerified(d.phone); onClose() }
      else setError(d.error)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-400"/> Numara Doğrula
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Aramalarınızda görünecek telefon numaranızı girin. SMS ile doğrulama kodu göndereceğiz.</p>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Telefon Numarası</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="05551234567"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 text-lg tracking-wider"
                onKeyDown={e => e.key === 'Enter' && sendCode()}/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={sendCode} disabled={loading || !phone}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Phone className="w-4 h-4"/>}
              Doğrulama Kodu Gönder
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm"><strong className="text-white">{phone}</strong> numarasına 4 haneli kod gönderdik.</p>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Doğrulama Kodu</label>
              <input value={code} onChange={e => setCode(e.target.value)}
                placeholder="1234" maxLength={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 text-3xl tracking-widest text-center"
                onKeyDown={e => e.key === 'Enter' && confirmCode()}/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={confirmCode} disabled={loading || code.length < 4}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
              Onayla
            </button>
            <button onClick={() => setStep('phone')} className="w-full text-slate-400 text-sm hover:text-white">
              ← Numarayı değiştir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ANA SAYFA ─────────────────────────────────────────────
export default function VoicePage() {
  const [tab, setTab] = useState<'dial' | 'campaign' | 'calls' | 'settings'>('dial')
  const [numbers, setNumbers] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showVerify, setShowVerify] = useState(false)
  const [calling, setCalling] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [cloning, setCloning] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedCaller, setSelectedCaller] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(5)
  const [previewText, setPreviewText] = useState('Merhaba, nasılsınız? Kısa bir bilgi vermek istiyorum.')

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [n, l, c, ca, s, st] = await Promise.allSettled([
        fetch(`${API}/api/voice/numbers`, { headers: authH() }),
        api.get('/api/leads?limit=200&has_phone=true'),
        fetch(`${API}/api/voice/calls?limit=20`, { headers: authH() }),
        fetch(`${API}/api/voice/campaigns`, { headers: authH() }),
        fetch(`${API}/api/voice/settings`, { headers: authH() }),
        fetch(`${API}/api/voice/stats`, { headers: authH() }),
      ])
      if (n.status === 'fulfilled') { const d = await (n.value as any).json(); setNumbers(d.numbers || []) }
      if (l.status === 'fulfilled') setLeads((l.value as any).leads || [])
      if (c.status === 'fulfilled') { const d = await (c.value as any).json(); setCalls(d.calls || []) }
      if (ca.status === 'fulfilled') { const d = await (ca.value as any).json(); setCampaigns(d.campaigns || []) }
      if (s.status === 'fulfilled') { const d = await (s.value as any).json(); setSettings(d.settings || {}) }
      if (st.status === 'fulfilled') { const d = await (st.value as any).json(); setStats(d) }
    } catch {}
    setLoading(false)
  }

  async function makeSingleCall() {
    if (!selectedLead) return showMsg('error', 'Lead seçin')
    setCalling(true)
    try {
      const r = await fetch(`${API}/api/voice/call/single`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadId: selectedLead, callerId: selectedCaller || undefined })
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Arama başlatıldı!'); setTimeout(loadAll, 3000) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCalling(false)
  }

  async function startCampaign() {
    if (!selectedLeads.length) return showMsg('error', 'En az 1 lead seçin')
    setCampaignRunning(true)
    try {
      const r = await fetch(`${API}/api/voice/call/campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          leadIds: selectedLeads,
          callerId: selectedCaller || undefined,
          campaignName: campaignName || undefined,
          delayMinutes,
        })
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCampaignRunning(false)
  }

  async function cloneVoice() {
    if (!fileRef.current?.files?.[0]) return showMsg('error', 'Ses dosyası seçin')
    setCloning(true)
    try {
      const form = new FormData()
      form.append('audio', fileRef.current.files[0])
      form.append('name', settings.agent_name || 'Sesim')
      const r = await fetch(`${API}/api/voice/clone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', 'Sesiniz klonlandı!'); loadAll() }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
    setCloning(false)
  }

  async function previewVoice() {
    setPreviewing(true)
    try {
      const r = await fetch(`${API}/api/voice/preview`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ text: previewText })
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        if (audioRef.current) { audioRef.current.src = url; audioRef.current.play() }
      } else showMsg('error', 'Ses önizleme başarısız')
    } catch (e: any) { showMsg('error', e.message) }
    setPreviewing(false)
  }

  async function saveSettings() {
    try {
      await fetch(`${API}/api/voice/settings`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify(settings)
      })
      showMsg('success', 'Ayarlar kaydedildi')
    } catch (e: any) { showMsg('error', e.message) }
  }

  async function deleteNumber(id: string) {
    await fetch(`${API}/api/voice/numbers/${id}`, { method: 'DELETE', headers: authH() })
    loadAll()
  }

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
  const leadsWithPhone = leads.filter(l => l.phone)

  return (
    <div className="space-y-6 min-h-screen">
      {showVerify && <VerifyModal onClose={() => setShowVerify(false)} onVerified={() => { loadAll(); showMsg('success', 'Numara doğrulandı!') }}/>}
      <audio ref={audioRef} className="hidden"/>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4"/>
            </div>
            AI Sesli Arama
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerçek insan sesiyle otomatik satış araması</p>
        </div>
        <button onClick={() => setShowVerify(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-400 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4"/> Numara Ekle
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Toplam Arama', value: stats.total, color: 'text-white' },
            { label: 'Tamamlanan', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Olumlu', value: stats.positive, color: 'text-teal-400' },
            { label: 'Cevap Yok', value: stats.no_answer, color: 'text-slate-400' },
            { label: 'Toplam Süre', value: `${stats.totalMinutes}dk`, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bağlı Numaralar */}
      {numbers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Bağlı numaralar:</span>
          {numbers.map(n => (
            <div key={n.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-xl">
              <CheckCircle className="w-3 h-3 text-teal-400"/>
              <span className="text-teal-400 text-sm font-mono">{n.phone}</span>
              <button onClick={() => deleteNumber(n.id)} className="text-slate-600 hover:text-red-400 ml-1">
                <X className="w-3 h-3"/>
              </button>
            </div>
          ))}
        </div>
      )}

      {numbers.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0"/>
          <div>
            <p className="text-amber-300 text-sm font-medium">Henüz numara eklenmemiş</p>
            <p className="text-amber-400/60 text-xs">Arama yapabilmek için telefon numaranızı doğrulayın</p>
          </div>
          <button onClick={() => setShowVerify(true)}
            className="ml-auto px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl text-sm font-medium shrink-0">
            Numara Ekle →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit">
        {[['dial','📞 Tek Arama'],['campaign','🚀 Kampanya'],['calls','📋 Aramalar'],['settings','⚙️ Ayarlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* TEK ARAMA */}
      {tab === 'dial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-teal-400"/> Tek Lead Ara
            </h3>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Lead Seç</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="">Lead seçin (telefonu olanlar)</option>
                {leadsWithPhone.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Arayan Numara</label>
              <select value={selectedCaller} onChange={e => setSelectedCaller(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="">Varsayılan (+19784325322)</option>
                {numbers.map(n => <option key={n.id} value={n.phone}>{n.phone}</option>)}
              </select>
            </div>
            <button onClick={makeSingleCall} disabled={calling || !selectedLead}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {calling ? <><RefreshCw className="w-4 h-4 animate-spin"/> Aranıyor...</> : <><Phone className="w-4 h-4"/> Şimdi Ara</>}
            </button>
          </div>

          {/* Ses Önizleme */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400"/> Ses Önizleme
            </h3>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Test Metni</label>
              <textarea value={previewText} onChange={e => setPreviewText(e.target.value)}
                rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"/>
            </div>
            <button onClick={previewVoice} disabled={previewing}
              className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {previewing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
              Sesi Dinle
            </button>
          </div>
        </div>
      )}

      {/* KAMPANYA */}
      {tab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400"/> Toplu Arama Kampanyası
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Kampanya Adı</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  placeholder="Nisan 2026 Kampanyası"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Aramalar Arası Bekleme</label>
                <select value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                  <option value={2}>2 dakika</option>
                  <option value={5}>5 dakika</option>
                  <option value={10}>10 dakika</option>
                  <option value={15}>15 dakika</option>
                  <option value={30}>30 dakika</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Arayan Numara</label>
              <select value={selectedCaller} onChange={e => setSelectedCaller(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">Varsayılan (+19784325322)</option>
                {numbers.map(n => <option key={n.id} value={n.phone}>{n.phone}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Lead Listesi ({selectedLeads.length} seçili)</label>
                <button onClick={() => setSelectedLeads(leadsWithPhone.map(l => l.id))}
                  className="text-xs text-teal-400 hover:text-teal-300">Tümünü Seç</button>
              </div>
              <div className="max-h-48 overflow-y-auto bg-slate-900 rounded-xl p-2 space-y-1">
                {leadsWithPhone.map(l => (
                  <label key={l.id} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-800 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                      className="accent-teal-500"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{l.company_name}</div>
                      <div className="text-slate-500 text-xs font-mono">{l.phone}</div>
                    </div>
                  </label>
                ))}
                {!leadsWithPhone.length && <p className="text-slate-600 text-xs text-center py-4">Telefon numarası olan lead bulunamadı</p>}
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <p>→ Her lead için Claude otomatik satış scripti üretir</p>
              <p>→ Aramalar arası {delayMinutes} dakika beklenir (doğal görünmek için)</p>
              <p>→ Tahmini süre: {Math.round(selectedLeads.length * (delayMinutes + 3))} dakika</p>
            </div>
            <button onClick={startCampaign} disabled={campaignRunning || !selectedLeads.length}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              {campaignRunning ? <><RefreshCw className="w-4 h-4 animate-spin"/> Kampanya çalışıyor...</> : <><Zap className="w-4 h-4"/> {selectedLeads.length} Lead'i Ara</>}
            </button>
          </div>

          {/* Kampanya listesi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">Geçmiş Kampanyalar</h3>
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="p-3 bg-slate-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-xs font-medium truncate">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {c.status === 'completed' ? 'Bitti' : 'Devam'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{c.calls_made}/{c.total_leads} arama</div>
                  <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.total_leads ? (c.calls_made / c.total_leads) * 100 : 0}%` }}/>
                  </div>
                </div>
              ))}
              {!campaigns.length && <p className="text-slate-600 text-xs text-center py-4">Henüz kampanya yok</p>}
            </div>
          </div>
        </div>
      )}

      {/* ARAMALAR */}
      {tab === 'calls' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Arama Geçmişi</h3>
            <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-white">
              <RefreshCw className="w-4 h-4"/>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500 text-xs">
                  <th className="text-left px-4 py-3">Lead</th>
                  <th className="text-left px-4 py-3">Numara</th>
                  <th className="text-center px-4 py-3">Durum</th>
                  <th className="text-center px-4 py-3">Süre</th>
                  <th className="text-center px-4 py-3">Sonuç</th>
                  <th className="text-right px-4 py-3">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="text-white text-xs font-medium">{c.leads?.company_name || '—'}</div>
                      <div className="text-slate-500 text-xs">{c.leads?.contact_name || ''}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.callee_number}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={c.status}/></td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      {c.duration_seconds ? `${Math.round(c.duration_seconds / 60)}dk ${c.duration_seconds % 60}sn` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.outcome === 'positive' || c.outcome === 'sale'
                        ? <span className="text-emerald-400 text-xs font-medium">✓ Olumlu</span>
                        : c.outcome === 'negative'
                        ? <span className="text-red-400 text-xs">Olumsuz</span>
                        : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!calls.length && (
              <div className="text-center py-12 text-slate-600">
                <Phone className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Henüz arama yapılmamış</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AYARLAR */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Temsilci Ayarları */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400"/> Temsilci Profili
            </h3>
            {[
              { key: 'agent_name', label: 'Temsilci Adı', ph: 'Ahmet' },
              { key: 'company_name', label: 'Şirket Adı', ph: 'Şirketinizin adı' },
              { key: 'product_description', label: 'Ürün/Hizmet', ph: 'Ne sattığınızı kısaca açıklayın' },
              { key: 'transfer_number', label: 'Transfer Numarası', ph: 'İnsan temsilciye bağlanma numarası' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
                <input value={settings[key] || ''} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>
            ))}
            <button onClick={saveSettings}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium">
              Kaydet
            </button>
          </div>

          {/* Ses Klonlama */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-teal-400"/> Ses Klonlama
            </h3>
            {settings.voice_name ? (
              <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-teal-400"/>
                <div>
                  <div className="text-teal-400 text-sm font-medium">Ses klonlandı ✓</div>
                  <div className="text-slate-400 text-xs">{settings.voice_name}</div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                Henüz ses klonlanmamış — varsayılan Türkçe ses kullanılıyor
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-slate-400">30 saniye - 3 dakika ses kaydı yükleyin. Sistem kendi sesinizle konuşacak.</p>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-teal-500/50 transition cursor-pointer"
                onClick={() => fileRef.current?.click()}>
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">Ses dosyası seçin</p>
                <p className="text-slate-600 text-xs mt-1">MP3, WAV, M4A — max 10MB</p>
                <input ref={fileRef} type="file" accept="audio/*" className="hidden"/>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Önizleme Metni</label>
              <input value={previewText} onChange={e => setPreviewText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
            </div>
            <div className="flex gap-2">
              <button onClick={cloneVoice} disabled={cloning}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {cloning ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Mic className="w-4 h-4"/>}
                Klonla
              </button>
              <button onClick={previewVoice} disabled={previewing}
                className="flex-1 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {previewing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
                Dinle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}