'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Mail, Send, RefreshCw, CheckCircle, Sparkles, Eye, Search, X } from 'lucide-react'

const SMTP_PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, hint: 'App Password kullanın: myaccount.google.com/security' },
  { name: 'Yandex', host: 'smtp.yandex.com', port: 465, hint: 'Yandex şifrenizi kullanın' },
  { name: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, hint: 'Microsoft hesap şifrenizi kullanın' },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 465, hint: 'App Password gerekli' },
  { name: 'Özel SMTP', host: '', port: 587, hint: 'Hosting sağlayıcınızdan SMTP bilgilerini alın' },
]

const EMAIL_TEMPLATES = [
  { label: 'Tanışma', subject: 'İş Birliği Teklifi', html: '<h2>Merhaba {{firma}},</h2><p>Firmanızı araştırırken iş birliği potansiyeli gördüm. Toptancılara özel fiyat listemizi paylaşmak istiyoruz.</p><p>Bir görüşme ayarlayabilir miyiz?</p>' },
  { label: 'Özel Teklif', subject: '{{firma}} için Özel Fiyat', html: '<h2>Sayın {{firma}} Yetkilileri,</h2><p>Size özel hazırladığımız teklifi paylaşmak istiyoruz.</p><p>Bu ay toptancılara özel <strong>%15 indirim</strong> uyguluyoruz.</p>' },
  { label: 'Takip', subject: 'Görüşmemiz Hakkında', html: '<h2>Merhaba {{firma}},</h2><p>Geçen hafta yazdığım emaile dönmediniz. Merak ettiğiniz bir şey var mı?</p><p>Size yardımcı olmaktan memnuniyet duyarım.</p>' },
]

export default function EmailCampaignsPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'send' | 'settings' | 'campaigns'>('send')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', from_name: '', from_email: '' })
  const [email, setEmail] = useState({ subject: '', html: '', text: '', goal: '' })

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, l, st] = await Promise.allSettled([
        api.get('/api/email/stats'),
        api.get('/api/email/campaigns'),
        api.get('/api/leads?limit=500'),
        api.get('/api/email/settings'),
      ])
      if (s.status === 'fulfilled') setStats(s.value)
      if (c.status === 'fulfilled') setCampaigns(c.value.campaigns || [])
      if (l.status === 'fulfilled') setLeads((l.value.leads || []).filter((l: any) => l.email))
      if (st.status === 'fulfilled' && st.value.settings) {
        setSmtp(prev => ({ ...prev, ...st.value.settings }))
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const saveSmtp = async () => {
    setSaving(true)
    try { await api.post('/api/email/settings', smtp); showMsg('success', 'SMTP ayarları kaydedildi!'); load() }
    catch (e: any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const testSmtp = async () => {
    setTesting(true)
    try {
      await api.post('/api/email/settings', smtp)
      const r = await api.post('/api/email/test', {})
      showMsg('success', r.message)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setTesting(false) }
  }

  const generateContent = async () => {
    if (!email.subject) return showMsg('error', 'Önce konu yazın')
    setGenerating(true)
    try {
      const r = await api.post('/api/email/generate', { subject: email.subject, goal: email.goal })
      if (r.content) {
        setEmail(p => ({ ...p, html: r.content.html, text: r.content.text, subject: r.content.subject || p.subject }))
        showMsg('success', 'AI email içeriği oluşturuldu!')
      }
    } catch (e: any) { showMsg('error', e.message) }
    finally { setGenerating(false) }
  }

  const sendCampaign = async () => {
    if (!email.subject || !email.html || !selectedLeads.length)
      return showMsg('error', 'Konu, içerik ve en az 1 lead seçin')
    setSending(true)
    try {
      const r = await api.post('/api/email/send', {
        subject: email.subject, html: email.html, text: email.text, leadIds: selectedLeads,
        ...(isScheduled && scheduleAt ? { scheduledAt: new Date(scheduleAt).toISOString() } : {}),
      })
      showMsg('success', r.message)
      setEmail({ subject: '', html: '', text: '', goal: '' })
      setSelectedLeads([])
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const applyTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
    setEmail(p => ({ ...p, subject: tpl.subject, html: tpl.html }))
  }

  const filteredLeads = leads.filter(l =>
    !leadSearch ||
    l.company_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.email?.toLowerCase().includes(leadSearch.toLowerCase())
  )

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.includes(l.id))
  const toggleFilteredAll = () => {
    if (allFilteredSelected) {
      setSelectedLeads(prev => prev.filter(id => !filteredLeads.some(l => l.id === id)))
    } else {
      setSelectedLeads(prev => [...new Set([...prev, ...filteredLeads.map(l => l.id)])])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail size={24} className="text-blue-400" /> Email Kampanya
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{t('email_campaigns.kendi_smtp_sunucunuzdan_p', 'Kendi SMTP sunucunuzdan profesyonel email gönderin')}</p>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
            <p className="text-slate-400 text-xs mt-1">Toplam Kampanya</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.totalSent}</p>
            <p className="text-slate-400 text-xs mt-1">{t('email_campaigns.gonderilen_email', 'Gönderilen Email')}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${stats.configured ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.configured ? '✅ Bağlı' : '❌ Bağlı Değil'}
            </p>
            <p className="text-slate-400 text-xs mt-1">{stats.fromEmail || 'SMTP Durumu'}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'send', label: '📧 Email Gönder' },
          { key: 'settings', label: '⚙️ SMTP Ayarları' },
          { key: 'campaigns', label: '📋 Geçmiş' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 text-sm rounded-xl border transition ${activeTab === key ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* SMTP Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <p className="text-white font-semibold mb-3">{t('email_campaigns.hizli_kurulum', 'Hızlı Kurulum')}</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {SMTP_PRESETS.map(preset => (
                <button key={preset.name} onClick={() => setSmtp(p => ({ ...p, smtp_host: preset.host, smtp_port: preset.port }))}
                  className={`p-2.5 rounded-lg border text-center text-xs transition ${smtp.smtp_host === preset.host ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {preset.name}
                </button>
              ))}
            </div>
            {smtp.smtp_host && (
              <p className="text-yellow-400 text-xs">{SMTP_PRESETS.find(p => p.host === smtp.smtp_host)?.hint}</p>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <p className="text-white font-semibold">{t('email_campaigns.smtp_baglanti_bilgileri', 'SMTP Bağlantı Bilgileri')}</p>
            <div className="grid lg:grid-cols-2 gap-4">
              {[
                { k: 'smtp_host', l: 'SMTP Sunucu *', p: 'smtp.gmail.com' },
                { k: 'smtp_port', l: 'Port', p: '587', type: 'number' },
                { k: 'smtp_user', l: 'Kullanıcı Adı / Email *', p: 'info@sirket.com' },
                { k: 'smtp_pass', l: 'Şifre / App Password *', p: '••••••••', type: 'password' },
                { k: 'from_name', l: 'Gönderen Adı', p: 'Şirket Adı' },
                { k: 'from_email', l: 'Gönderen Email', p: 'info@sirket.com' },
              ].map(({ k, l, p, type }) => (
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1.5 block">{l}</label>
                  <input type={type || 'text'} value={(smtp as any)[k]}
                    onChange={e => setSmtp(prev => ({ ...prev, [k]: type === 'number' ? parseInt(e.target.value) : e.target.value }))}
                    placeholder={p}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={saveSmtp} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={testSmtp} disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {testing ? 'Test Ediliyor...' : 'Test Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email */}
      {activeTab === 'send' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {!stats?.configured && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-sm">
                ⚠️ Önce SMTP ayarlarını yapın →{' '}
                <button onClick={() => setActiveTab('settings')} className="underline">Ayarlar</button>
              </div>
            )}

            {/* Template library */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <p className="text-white font-semibold text-sm mb-3">{t('email_campaigns.hazir_sablonlar', 'Hazır Şablonlar')}</p>
              <div className="grid grid-cols-3 gap-2">
                {EMAIL_TEMPLATES.map(tpl => (
                  <button key={tpl.label} onClick={() => applyTemplate(tpl)}
                    className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl text-left transition">
                    <p className="text-white text-xs font-medium">{tpl.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">{tpl.subject}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold">{t('email_campaigns.email_icerigi', 'Email İçeriği')}</p>
                <button onClick={generateContent} disabled={generating || !email.subject}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                  {generating ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {generating ? 'Üretiliyor...' : 'AI ile Üret'}
                </button>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Konu *</label>
                <input value={email.subject} onChange={e => setEmail(p => ({ ...p, subject: e.target.value }))}
                  placeholder={t('email_campaigns.ozel_teklif_sadece_sizin', 'Özel Teklif — Sadece Sizin İçin!')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t('email_campaigns.hedef_ai_icin', 'Hedef (AI için)')}</label>
                <input value={email.goal} onChange={e => setEmail(p => ({ ...p, goal: e.target.value }))}
                  placeholder={t('email_campaigns.mobilya_satisi_toplanti_d', 'Mobilya satışı, toplantı daveti, indirim duyurusu...')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-xs">{t('email_campaigns.html_icerik', 'HTML İçerik *')}</label>
                  <button onClick={() => setPreview(!preview)} className="text-blue-400 text-xs flex items-center gap-1">
                    <Eye size={10} /> {preview ? 'Kodu Göster' : 'Önizle'}
                  </button>
                </div>
                {preview ? (
                  <div className="bg-white rounded-lg p-4 min-h-32" dangerouslySetInnerHTML={{ __html: email.html }} />
                ) : (
                  <textarea value={email.html} onChange={e => setEmail(p => ({ ...p, html: e.target.value }))}
                    placeholder={'<h2>Merhaba {{firma}},</h2><p>...</p>'}
                    rows={8}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none font-mono" />
                )}
                <p className="text-slate-500 text-xs mt-1">
                  Kişiselleştirme: <code className="text-blue-300">{`{{firma}}`}</code>{t('email_campaigns.sirket_adi', '→ şirket adı,')}<code className="text-blue-300">{`{{isim}}`}</code> → kişi adı
                </p>
              </div>

              {/* Zamanlama */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setIsScheduled(false)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${!isScheduled ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    ⚡ Hemen
                  </button>
                  <button onClick={() => setIsScheduled(true)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${isScheduled ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    🗓 Zamanla
                  </button>
                </div>
                {isScheduled && (
                  <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                )}
              </div>

              <button onClick={sendCampaign} disabled={sending || !email.subject || !email.html || !selectedLeads.length || (isScheduled && !scheduleAt)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition font-medium">
                {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? 'Gönderiliyor...' : isScheduled ? `${selectedLeads.length} Kişiye Zamanla` : `${selectedLeads.length} Kişiye Gönder`}
              </button>
            </div>
          </div>

          {/* Lead selector */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Alıcılar ({selectedLeads.length}/{leads.length})</p>
              <button onClick={toggleFilteredAll} className="text-xs text-blue-400 hover:underline">
                {allFilteredSelected ? 'Kaldır' : 'Tümü'}
              </button>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                placeholder="Firma veya email ara..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition" />
              {leadSearch && (
                <button onClick={() => setLeadSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
            {filteredLeads.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">{t('email_campaigns.email_adresi_olan_lead_bu', 'Email adresi olan lead bulunamadı')}</p>
            ) : (
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[400px]">
                {filteredLeads.map(l => (
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))}
                      className="accent-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs truncate">{l.company_name}</p>
                      <p className="text-slate-400 text-xs truncate">{l.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'campaigns' && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
              <Mail size={36} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">{t('email_campaigns.henuz_kampanya_yok', 'Henüz kampanya yok')}</p>
            </div>
          ) : campaigns.map(c => (
            <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-white font-medium">{c.subject}</p>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{new Date(c.sent_at).toLocaleString()}</span>
                  <span className="text-emerald-400">{c.sent_count} gönderildi</span>
                  {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} başarısız</span>}
                  {c.from_email && <span>{c.from_email}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
