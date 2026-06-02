'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Play, Pause, RefreshCw, Settings, MessageCircle,
  Activity, AlertTriangle, CheckCircle, Clock, TrendingUp,
  User, Zap, Phone, Mail, Building2, ChevronRight,
  BarChart3, Sparkles, Send, UserCheck, XCircle, Eye,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface AgentProfile {
  user_id: string
  product_description: string
  target_customer: string
  pain_solved: string
  price_range_min: number
  price_range_max: number
  price_currency: string
  value_props: string[]
  proposal_template: string | null
  escalation_triggers: string[]
  auto_reply_enabled: boolean
  auto_proposal_enabled: boolean
  voice_call_enabled: boolean
  video_msg_enabled: boolean
  is_active: boolean
  leads_processed: number
  messages_sent: number
  replies_received: number
  proposals_sent: number
  deals_escalated: number
}

interface Conversation {
  id: string
  lead_id: string
  channel: string
  ai_mode: 'active' | 'paused' | 'human_takeover' | 'completed' | 'not_interested'
  turn_count: number
  last_intent: string | null
  last_ai_message: string | null
  last_human_message: string | null
  escalated: boolean
  escalation_reason: string | null
  updated_at: string
  leads: { company_name: string; phone: string; email: string; city: string; score: number; status: string } | null
  ai_agent_research: { confidence_score: number; summary: string } | null
}

interface AgentRun {
  id: string
  lead_id: string | null
  event_type: string
  channel: string | null
  content: string | null
  intent: string | null
  created_at: string
  leads: { company_name: string } | null
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  active:          'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  human_takeover:  'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  completed:       'bg-slate-500/15 text-slate-400 border border-slate-500/25',
  paused:          'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  not_interested:  'bg-red-500/15 text-red-400 border border-red-500/25',
}

const MODE_LABELS: Record<string, string> = {
  active:         'AI Aktif',
  human_takeover: 'İnsan Devralması',
  completed:      'Tamamlandı',
  paused:         'Duraklatıldı',
  not_interested: 'İlgilenmedi',
}

const EVENT_ICONS: Record<string, any> = {
  research_started:    Clock,
  research_complete:   CheckCircle,
  outreach_sent:       Send,
  reply_received:      MessageCircle,
  intent_detected:     Zap,
  ai_reply_sent:       Bot,
  proposal_sent:       Send,
  escalated:           AlertTriangle,
  agent_activated:     Play,
  agent_deactivated:   Pause,
  ai_resumed:          RefreshCw,
  error:               XCircle,
  completed:           CheckCircle,
  skipped_low_confidence: Eye,
}

const EVENT_COLORS: Record<string, string> = {
  research_complete:   'text-blue-400',
  outreach_sent:       'text-emerald-400',
  ai_reply_sent:       'text-violet-400',
  proposal_sent:       'text-amber-400',
  escalated:           'text-orange-400',
  error:               'text-red-400',
  agent_activated:     'text-emerald-400',
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [tab, setTab] = useState<'setup' | 'conversations' | 'activity' | 'escalations'>('setup')
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [convStats, setConvStats] = useState({ total: 0, active: 0, human_takeover: 0, completed: 0 })
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [convFilter, setConvFilter] = useState<string>('')

  // Setup form state
  const [form, setForm] = useState({
    product_description: '',
    target_customer: '',
    pain_solved: '',
    price_range_min: '',
    price_range_max: '',
    price_currency: '₺',
    value_props_raw: '',
    proposal_template: '',
    escalation_triggers_raw: 'görüşelim,fiyat ver,tamam,alalım,anlaşalım,ne zaman,toplantı',
    auto_reply_enabled: true,
    auto_proposal_enabled: false,
    voice_call_enabled: false,
    video_msg_enabled: false,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, convsRes, runsRes] = await Promise.all([
        api.get('/api/ai-agent/status'),
        api.get('/api/ai-agent/conversations'),
        api.get('/api/ai-agent/runs?limit=50'),
      ])
      const prof: AgentProfile | null = statusRes.data?.profile
      if (prof) {
        setProfile(prof)
        setForm({
          product_description: prof.product_description || '',
          target_customer: prof.target_customer || '',
          pain_solved: prof.pain_solved || '',
          price_range_min: String(prof.price_range_min || ''),
          price_range_max: String(prof.price_range_max || ''),
          price_currency: prof.price_currency || '₺',
          value_props_raw: (prof.value_props || []).join('\n'),
          proposal_template: prof.proposal_template || '',
          escalation_triggers_raw: (prof.escalation_triggers || []).join(','),
          auto_reply_enabled: prof.auto_reply_enabled,
          auto_proposal_enabled: prof.auto_proposal_enabled,
          voice_call_enabled: prof.voice_call_enabled,
          video_msg_enabled: prof.video_msg_enabled,
        })
      }
      setConvStats(statusRes.data?.convStats || { total: 0, active: 0, human_takeover: 0, completed: 0 })
      setConversations(convsRes.data?.conversations || [])
      setRuns(runsRes.data?.runs || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/api/ai-agent/setup', {
        product_description: form.product_description,
        target_customer: form.target_customer,
        pain_solved: form.pain_solved,
        price_range_min: Number(form.price_range_min) || 0,
        price_range_max: Number(form.price_range_max) || 0,
        price_currency: form.price_currency,
        value_props: form.value_props_raw.split('\n').map(s => s.trim()).filter(Boolean),
        proposal_template: form.proposal_template || null,
        escalation_triggers: form.escalation_triggers_raw.split(',').map(s => s.trim()).filter(Boolean),
        auto_reply_enabled: form.auto_reply_enabled,
        auto_proposal_enabled: form.auto_proposal_enabled,
        voice_call_enabled: form.voice_call_enabled,
        video_msg_enabled: form.video_msg_enabled,
      })
      await fetchAll()
    } catch {}
    setSaving(false)
  }

  const handleToggle = async () => {
    if (!profile) return
    setToggling(true)
    try {
      await api.post('/api/ai-agent/toggle', { active: !profile.is_active })
      await fetchAll()
    } catch {}
    setToggling(false)
  }

  const handleTakeover = async (leadId: string) => {
    await api.post(`/api/ai-agent/takeover/${leadId}`, { reason: 'Manuel devralma' })
    await fetchAll()
  }

  const handleResume = async (leadId: string) => {
    await api.post(`/api/ai-agent/resume/${leadId}`, {})
    await fetchAll()
  }

  const handleResearch = async (leadId: string) => {
    await api.post(`/api/ai-agent/research/${leadId}`, {})
    await fetchAll()
  }

  const filteredConvs = convFilter
    ? conversations.filter(c => c.ai_mode === convFilter)
    : conversations

  const escalations = conversations.filter(c => c.ai_mode === 'human_takeover')

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return 'Az önce'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}dk önce`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}sa önce`
    return d.toLocaleDateString('tr-TR')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <Bot className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t('agent.ai_satis_ajani', 'AI Satış Ajanı')}</h1>
            <p className="text-sm text-slate-400">{t('agent.724_otonom_lead_arastirma', '7/24 otonom lead araştırma, iletişim ve dönüşüm')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${profile.is_active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-slate-600/30 text-slate-400 border border-slate-600/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${profile.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {profile.is_active ? 'Çalışıyor' : 'Devre Dışı'}
            </span>
          )}
          {profile && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${profile.is_active ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}
            >
              {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : profile.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {profile.is_active ? 'Durdur' : 'Başlat'}
            </button>
          )}
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Lead İşlendi', value: profile.leads_processed, icon: User, color: 'text-blue-400' },
            { label: 'Mesaj Gönderildi', value: profile.messages_sent, icon: Send, color: 'text-emerald-400' },
            { label: 'Yanıt Alındı', value: profile.replies_received, icon: MessageCircle, color: 'text-violet-400' },
            { label: 'Teklif Gönderildi', value: profile.proposals_sent, icon: BarChart3, color: 'text-amber-400' },
            { label: 'Devralınan', value: profile.deals_escalated, icon: AlertTriangle, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 w-fit">
        {([
          { key: 'setup', label: 'Kurulum', icon: Settings },
          { key: 'conversations', label: 'Konuşmalar', icon: MessageCircle, badge: convStats.active },
          { key: 'activity', label: 'Aktivite', icon: Activity },
          { key: 'escalations', label: 'Devralınacaklar', icon: AlertTriangle, badge: escalations.length, badgeColor: 'bg-orange-500' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${tab === t.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {'badge' in t && t.badge > 0 && (
              <span className={`${(t as any).badgeColor || 'bg-violet-500'} text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SETUP TAB ── */}
      {tab === 'setup' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> Ürün / Hizmet Bilgileri
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('agent.urun_hizmet_aciklamasi', 'Ürün / Hizmet Açıklaması *')}</label>
                <textarea
                  value={form.product_description}
                  onChange={e => setForm(f => ({ ...f, product_description: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder={t('agent.orn_akustik_duvar_paneli', 'Örn: Akustik duvar paneli — ofis, kafe ve okullarda ses yalıtımı sağlar')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('agent.hedef_musteri', 'Hedef Müşteri *')}</label>
                <textarea
                  value={form.target_customer}
                  onChange={e => setForm(f => ({ ...f, target_customer: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder={t('agent.orn_insaat_firmalari_mima', 'Örn: İnşaat firmaları, mimarlık ofisleri, kafe ve restoran işletmeleri')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('agent.cozdugu_problem', 'Çözdüğü Problem *')}</label>
                <textarea
                  value={form.pain_solved}
                  onChange={e => setForm(f => ({ ...f, pain_solved: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder={t('agent.orn_gurultu_kirliligi_ses', 'Örn: Gürültü kirliliği, ses sızıntısı, müşteri şikayetleri')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('agent.deger_onerileri_her_satir', 'Değer Önerileri (her satıra bir tane)')}</label>
                <textarea
                  value={form.value_props_raw}
                  onChange={e => setForm(f => ({ ...f, value_props_raw: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder={t('agent.hizli_montaj1010_yil_gara', 'Hızlı montaj&#10;10 yıl garanti&#10;Ücretsiz numune')}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Min Fiyat</label>
                <input
                  type="number"
                  value={form.price_range_min}
                  onChange={e => setForm(f => ({ ...f, price_range_min: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Max Fiyat</label>
                <input
                  type="number"
                  value={form.price_range_max}
                  onChange={e => setForm(f => ({ ...f, price_range_max: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Para Birimi</label>
                <select
                  value={form.price_currency}
                  onChange={e => setForm(f => ({ ...f, price_currency: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="₺">₺ TL</option>
                  <option value="$">$ USD</option>
                  <option value="€">€ EUR</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Otomasyon Ayarları
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {([
                { key: 'auto_reply_enabled', label: 'Otomatik Yanıt', desc: 'Gelen mesajlara AI otomatik cevap verir' },
                { key: 'auto_proposal_enabled', label: 'Otomatik Teklif', desc: 'Fiyat sorusunda otomatik teklif şablonu gönderir' },
                { key: 'voice_call_enabled', label: 'AI Sesli Arama', desc: 'Hazır lead için otomatik sesli arama başlatır' },
                { key: 'video_msg_enabled', label: 'Video Mesaj', desc: 'Kişiselleştirilmiş AI video mesajı gönderir' },
              ] as const).map(opt => (
                <div key={opt.key} className="flex items-start gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                  <button
                    onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                    className={`mt-0.5 relative w-10 h-5 rounded-full transition-colors shrink-0 ${form[opt.key] ? 'bg-violet-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form[opt.key] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <div>
                    <div className="text-sm font-medium text-white">{opt.label}</div>
                    <div className="text-xs text-slate-400">{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                İnsan Devralma Tetikleyicileri <span className="normal-case text-slate-500">{t('agent.virgulle_ayir', '(virgülle ayır)')}</span>
              </label>
              <input
                value={form.escalation_triggers_raw}
                onChange={e => setForm(f => ({ ...f, escalation_triggers_raw: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                placeholder={t('agent.goruselimfiyat_vertamamal', 'görüşelim,fiyat ver,tamam,alalım')}
              />
              <p className="text-xs text-slate-500">{t('agent.bu_kelimeleri_iceren_mesa', 'Bu kelimeleri içeren mesajlar geldiğinde AI durup sizi uyarır')}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('agent.teklif_sablonu_istege_bag', 'Teklif Şablonu (isteğe bağlı)')}</label>
              <textarea
                value={form.proposal_template}
                onChange={e => setForm(f => ({ ...f, proposal_template: e.target.value }))}
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                placeholder={t('agent.merhaba_company_size_ozel', 'Merhaba {company}! Size özel fiyatımız {price_min}-{price_max} {currency} arasındadır...')}
              />
              <p className="text-xs text-slate-500">{t('agent.kullanilabilir_degiskenle', 'Kullanılabilir değişkenler: &#123;company&#125;, &#123;price_min&#125;, &#123;price_max&#125;, &#123;currency&#125;')}</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.product_description || !form.target_customer || !form.pain_solved}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {profile ? 'Güncelle & Kaydet' : 'Ajanı Kur'}
            </button>
          </div>
        </div>
      )}

      {/* ── CONVERSATIONS TAB ── */}
      {tab === 'conversations' && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: '', label: `Tümü (${convStats.total})` },
              { value: 'active', label: `AI Aktif (${convStats.active})` },
              { value: 'human_takeover', label: `Devralındı (${convStats.human_takeover})` },
              { value: 'completed', label: `Tamamlandı (${convStats.completed})` },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setConvFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${convFilter === f.value ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('agent.henuz_konusma_yok', 'Henüz konuşma yok')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConvs.map(conv => (
                <div key={conv.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white text-sm">{conv.leads?.company_name || '—'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[conv.ai_mode]}`}>
                            {MODE_LABELS[conv.ai_mode] || conv.ai_mode}
                          </span>
                          {conv.ai_agent_research?.confidence_score ? (
                            <span className="text-xs text-slate-400">{conv.ai_agent_research.confidence_score}% emin</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {conv.leads?.city} · {conv.turn_count} tur · {fmtTime(conv.updated_at)}
                          {conv.last_intent && ` · ${conv.last_intent}`}
                        </div>
                        {conv.last_human_message && (
                          <p className="text-xs text-slate-500 mt-1 truncate max-w-sm">
                            💬 {conv.last_human_message}
                          </p>
                        )}
                        {conv.escalation_reason && (
                          <p className="text-xs text-amber-400 mt-1">⚡ {conv.escalation_reason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.ai_mode === 'active' && (
                        <button
                          onClick={() => handleTakeover(conv.lead_id)}
                          className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg text-xs font-medium transition-colors border border-amber-500/20"
                        >
                          Devral
                        </button>
                      )}
                      {conv.ai_mode === 'human_takeover' && (
                        <button
                          onClick={() => handleResume(conv.lead_id)}
                          className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg text-xs font-medium transition-colors border border-emerald-500/20"
                        >
                          AI'ya ver
                        </button>
                      )}
                      <button
                        onClick={() => handleResearch(conv.lead_id)}
                        className="px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-500/20"
                      >
                        Araştır
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <div className="space-y-1.5">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('agent.henuz_aktivite_yok', 'Henüz aktivite yok')}</p>
            </div>
          ) : (
            runs.map(run => {
              const Icon = EVENT_ICONS[run.event_type] || Activity
              const color = EVENT_COLORS[run.event_type] || 'text-slate-400'
              return (
                <div key={run.id} className="flex items-start gap-3 px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-colors">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-300 font-medium">{run.event_type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-slate-500 shrink-0">{fmtTime(run.created_at)}</span>
                    </div>
                    {run.leads?.company_name && (
                      <span className="text-xs text-slate-400">{run.leads.company_name}</span>
                    )}
                    {run.content && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{run.content}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── ESCALATIONS TAB ── */}
      {tab === 'escalations' && (
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('agent.devralinacak_konusma_yok', 'Devralınacak konuşma yok — AI her şeyi hallediyor! 🎉')}</p>
            </div>
          ) : (
            escalations.map(conv => (
              <div key={conv.id} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{conv.leads?.company_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {conv.leads?.city} · {conv.turn_count} tur ·
                        <span className="text-amber-400 ml-1">{fmtTime(conv.updated_at)}</span>
                      </div>
                      {conv.escalation_reason && (
                        <div className="mt-2 px-3 py-1.5 bg-amber-500/10 rounded-lg text-sm text-amber-300 font-medium">
                          {conv.escalation_reason}
                        </div>
                      )}
                      {conv.last_human_message && (
                        <p className="text-sm text-slate-300 mt-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/30">
                          "{conv.last_human_message}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {conv.leads?.phone && (
                      <a
                        href={`https://wa.me/${conv.leads.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> WhatsApp'ta Aç
                      </a>
                    )}
                    <button
                      onClick={() => handleResume(conv.lead_id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" /> AI'ya Bırak
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
