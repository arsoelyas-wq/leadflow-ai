'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Smartphone, Send, RefreshCw, CheckCircle, ExternalLink, Search, X } from 'lucide-react'

const PROVIDERS = [
  { key: 'netgsm', label: 'NetGSM', flag: '🇹🇷', desc: 'Türkiye', website: 'https://www.netgsm.com.tr', fields: ['api_key', 'api_secret', 'sender_id'] },
  { key: 'vonage', label: 'Vonage', flag: '🌍', desc: 'Global', website: 'https://www.vonage.com', fields: ['api_key', 'api_secret', 'sender_id'] },
  { key: 'messagebird', label: 'MessageBird', flag: '🌍', desc: 'Global', website: 'https://www.messagebird.com', fields: ['api_key', 'sender_id'] },
  { key: 'twilio', label: 'Twilio', flag: '🌍', desc: 'Global', website: 'https://www.twilio.com', fields: ['api_key', 'api_secret', 'sender_id'] },
  { key: 'infobip', label: 'Infobip', flag: '🌍', desc: 'Global', website: 'https://www.infobip.com', fields: ['api_key', 'base_url', 'sender_id'] },
  { key: 'aws_sns', label: 'AWS SNS', flag: '☁️', desc: 'Global', website: 'https://aws.amazon.com/sns', fields: ['api_key', 'api_secret', 'region', 'sender_id'] },
  { key: 'custom_http', label: 'Özel HTTP API', flag: '⚙️', desc: 'Herhangi', website: '', fields: ['endpoint', 'api_key', 'method', 'sender_id'] },
]

const FIELD_LABELS: Record<string, string> = {
  api_key: 'API Key / Account SID / Kullanıcı No',
  api_secret: 'API Secret / Auth Token / Şifre',
  sender_id: 'Gönderen ID / Başlık',
  phone_number: 'Telefon Numarası (+1xxx)',
  base_url: 'Base URL (Infobip için)',
  region: 'AWS Region (us-east-1)',
  method: 'HTTP Method (POST/GET)',
  endpoint: 'API Endpoint URL',
}

const SMS_TEMPLATES = [
  { label: 'Tanışma', text: 'Merhaba {{firma}}! {{sehir}} bölgesinde toptancılara özel teklifimiz var. Detaylar için bize ulaşın.' },
  { label: 'Kampanya', text: '{{firma}} için özel fiyat! Bu ay %15 indirim. Sınırlı stok. Detay için hemen yazın.' },
  { label: 'Hatırlatıcı', text: 'Sayın {{firma}}, görüşmemizi hatırlatmak istedim. Uygun zamanınızda arayabilirsiniz.' },
]

function smsSegments(text: string) {
  const gsm7 = /^[\x00-\x7FÀ-ÆÈ-ÏÑ-ÖØ-Ýà-æè-ïñ-öø-ýÿΑ-ΡΣ-Ωα-ω€ŠšŽž€]*$/
  const isGSM = gsm7.test(text)
  const perSegment = isGSM ? 160 : 70
  const perMulti = isGSM ? 153 : 67
  const len = text.length
  if (len === 0) return { segments: 0, charsPerSegment: perSegment, isUnicode: !isGSM }
  if (len <= perSegment) return { segments: 1, charsPerSegment: perSegment, isUnicode: !isGSM }
  return { segments: Math.ceil(len / perMulti), charsPerSegment: perMulti, isUnicode: !isGSM }
}

export default function SMSPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'send' | 'provider' | 'history'>('send')
  const [selectedProvider, setSelectedProvider] = useState('netgsm')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const load = async () => {
    try {
      const [s, l, c, st] = await Promise.allSettled([
        api.get('/api/sms/settings'),
        api.get('/api/leads?limit=1000'),
        api.get('/api/sms/campaigns'),
        api.get('/api/sms/stats'),
      ])
      if (s.status === 'fulfilled' && s.value.configured) {
        setSelectedProvider(s.value.settings.provider)
        setConfig(s.value.settings)
      }
      if (l.status === 'fulfilled') setLeads((l.value.leads || []).filter((lead: any) => lead.phone))
      if (c.status === 'fulfilled') setCampaigns(c.value.campaigns || [])
      if (st.status === 'fulfilled') setStats(st.value)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const provider = PROVIDERS.find(p => p.key === selectedProvider)!

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.post('/api/sms/settings', { provider: selectedProvider, ...config })
      showMsg('success', `${provider.label} ayarları kaydedildi!`)
      setActiveTab('send')
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const testSMS = async () => {
    if (!testPhone) return
    setTesting(true)
    try { await api.post('/api/sms/test', { testPhone }); showMsg('success', 'Test SMS gönderildi!') }
    catch (e: any) { showMsg('error', e.message) }
    finally { setTesting(false) }
  }

  const sendSMS = async () => {
    if (!message || !selectedLeads.length) return
    setSending(true)
    try {
      const d = await api.post('/api/sms/send', {
        message, leadIds: selectedLeads,
        ...(isScheduled && scheduleAt ? { scheduledAt: new Date(scheduleAt).toISOString() } : {}),
      })
      showMsg('success', d.message)
      setSelectedLeads([])
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const filteredLeads = leads.filter(l =>
    !leadSearch || l.company_name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch)
  )

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.includes(l.id))
  const toggleFilteredAll = () => {
    if (allFilteredSelected) {
      setSelectedLeads(prev => prev.filter(id => !filteredLeads.some(l => l.id === id)))
    } else {
      setSelectedLeads(prev => [...new Set([...prev, ...filteredLeads.map(l => l.id)])])
    }
  }

  const smsInfo = smsSegments(message)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone size={24} className="text-green-400" /> SMS Kampanyası
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{t('sms_campaigns.netgsm_vonage_twilio_ve_d', 'NetGSM, Vonage, Twilio ve daha fazlasıyla toplu SMS')}</p>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats?.totalSent || 0}</p>
          <p className="text-slate-400 text-xs mt-1">{t('sms_campaigns.gonderilen', 'Gönderilen')}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{campaigns.length}</p>
          <p className="text-slate-400 text-xs mt-1">Kampanya</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className={`text-lg font-bold ${stats?.configured ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats?.configured ? `✅ ${PROVIDERS.find(p => p.key === stats.provider)?.label || stats.provider}` : '❌ Bağlı Değil'}
          </p>
          <p className="text-slate-400 text-xs mt-1">{t('sms_campaigns.sms_saglayicisi', 'SMS Sağlayıcısı')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'send', label: '📱 SMS Gönder' },
          { key: 'provider', label: '⚙️ Sağlayıcı' },
          { key: 'history', label: '📋 Geçmiş' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 text-sm rounded-xl border transition ${activeTab === key ? 'bg-green-600 border-green-500 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* SMS Send Tab */}
      {activeTab === 'send' && (
        <>
          {!stats?.configured && (
            <div className="bg-slate-800/50 border border-yellow-500/20 rounded-xl p-6 text-center">
              <p className="text-4xl mb-3">📱</p>
              <p className="text-white font-medium mb-1">{t('sms_campaigns.sms_saglayicisi_baglanmam', 'SMS Sağlayıcısı Bağlanmamış')}</p>
              <p className="text-slate-400 text-sm mb-4">{t('sms_campaigns.netgsm_vonage_twilio_veya', 'NetGSM, Vonage, Twilio veya diğer sağlayıcıları bağlayın')}</p>
              <button onClick={() => setActiveTab('provider')}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition">
                SMS Sağlayıcısı Ekle
              </button>
            </div>
          )}

          {stats?.configured && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Message panel */}
              <div className="space-y-4">
                {/* Templates */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-white font-semibold text-sm mb-3">{t('sms_campaigns.hazir_sablonlar', 'Hazır Şablonlar')}</p>
                  <div className="space-y-2">
                    {SMS_TEMPLATES.map(tpl => (
                      <button key={tpl.label} onClick={() => setMessage(tpl.text)}
                        className={`w-full p-3 rounded-xl border text-left transition ${message === tpl.text ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'}`}>
                        <p className="text-white text-xs font-medium">{tpl.label}</p>
                        <p className="text-slate-400 text-xs mt-0.5 truncate">{tpl.text}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
                  <h2 className="text-white font-semibold">Mesaj</h2>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder={'{{firma}}, size özel teklifimiz var! Detaylar için bize ulaşın.'}
                    rows={5}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 resize-none" />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 space-y-0.5">
                      <div className={`font-medium ${smsInfo.segments > 1 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        {message.length} karakter · {smsInfo.segments} SMS{smsInfo.isUnicode ? ' (Unicode)' : ''}
                      </div>
                      {smsInfo.segments > 1 && (
                        <div className="text-slate-500">Segment başı {smsInfo.charsPerSegment} karakter</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      <code className="text-green-400">{`{{firma}}`}</code> <code className="text-green-400">{`{{sehir}}`}</code>
                    </div>
                  </div>
                  {/* Zamanlama */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => setIsScheduled(false)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${!isScheduled ? 'bg-green-600 border-green-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
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

                  <button onClick={sendSMS} disabled={sending || !message || !selectedLeads.length || (isScheduled && !scheduleAt)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                    {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {sending ? 'Gönderiliyor...' : isScheduled ? `${selectedLeads.length} Kişiye Zamanla` : `${selectedLeads.length} Kişiye Gönder`}
                  </button>
                </div>
              </div>

              {/* Lead selector */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold">Alıcılar ({selectedLeads.length}/{leads.length})</h2>
                  <button onClick={toggleFilteredAll} className="text-green-400 text-xs hover:underline">
                    {allFilteredSelected ? 'Kaldır' : 'Tümünü Seç'}
                  </button>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                    placeholder="Firma veya telefon ara..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-white text-xs focus:outline-none focus:border-green-500 transition" />
                  {leadSearch && (
                    <button onClick={() => setLeadSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto max-h-80">
                  {filteredLeads.map(lead => (
                    <label key={lead.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                        onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                        className="accent-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{lead.company_name}</p>
                        <p className="text-slate-400 text-xs">{lead.phone}</p>
                      </div>
                    </label>
                  ))}
                  {filteredLeads.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-4">{t('sms_campaigns.lead_bulunamadi', 'Lead bulunamadı')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Provider Settings Tab */}
      {activeTab === 'provider' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">{t('sms_campaigns.sms_saglayicisi_sec_bagla', 'SMS Sağlayıcısı Seç & Bağla')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {PROVIDERS.map(p => (
                <button key={p.key} onClick={() => setSelectedProvider(p.key)}
                  className={`p-3 rounded-xl border text-left transition ${selectedProvider === p.key ? 'bg-green-600/20 border-green-500' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{p.flag}</span>
                    <span className="text-white text-xs font-medium">{p.label}</span>
                  </div>
                  <p className="text-slate-400 text-xs">{p.desc}</p>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-0.5 text-blue-400 text-xs mt-1 hover:underline">
                      <ExternalLink size={9} /> Kayıt Ol
                    </a>
                  )}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-3">
              {provider.fields.map(field => (
                <div key={field}>
                  <label className="text-slate-400 text-xs mb-1 block">{FIELD_LABELS[field] || field}</label>
                  <input
                    type={field.includes('secret') || field.includes('pass') ? 'password' : 'text'}
                    value={config[field] || ''}
                    onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={FIELD_LABELS[field] || field}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="flex gap-2 flex-1">
                <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
                  placeholder="+905001234567"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
                <button onClick={testSMS} disabled={testing || !testPhone}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                  {testing ? <RefreshCw size={12} className="animate-spin" /> : '📱'} Test
                </button>
              </div>
              <button onClick={saveSettings} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-400 space-y-1">
              {selectedProvider === 'netgsm' && <>
                <p>📌 <strong className="text-white">NetGSM:</strong>{t('sms_campaigns.netgsmcomtr_uye_ol_api_ku', 'netgsm.com.tr → Üye Ol → API Kullanıcı No ve Şifrenizi girin')}</p>
                <p>{t('sms_campaigns.gonderen_basligini_netgsm', '📌 Gönderen başlığını NetGSM panelinden onaylatmanız gerekiyor')}</p>
              </>}
              {selectedProvider === 'vonage' && <p>📌 <strong className="text-white">Vonage:</strong> dashboard.nexmo.com → API Keys → API Key ve Secret girin</p>}
              {selectedProvider === 'twilio' && <>
                <p>📌 <strong className="text-white">Twilio:</strong> console.twilio.com → Account SID ve Auth Token girin</p>
                <p>{t('sms_campaigns.phone_number_twilioaposda', '📌 Phone Number: Twilio&apos;dan aldığınız numara (+1xxx formatında)')}</p>
              </>}
              {selectedProvider === 'infobip' && <>
                <p>📌 <strong className="text-white">Infobip:</strong> portal.infobip.com → API Key ve Base URL girin</p>
                <p>{t('sms_campaigns.base_url_xxxxxapiinfobipc', '📌 Base URL: xxxxx.api.infobip.com formatında')}</p>
              </>}
              {selectedProvider === 'aws_sns' && <>
                <p>📌 <strong className="text-white">AWS SNS:</strong>{t('sms_campaigns.iam_access_key_olusturun', 'IAM → Access Key oluşturun → SNS izni verin')}</p>
                <p>📌 Region: us-east-1, eu-west-1 vb.</p>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
              <Smartphone size={36} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">{t('sms_campaigns.henuz_kampanya_yok', 'Henüz kampanya yok')}</p>
            </div>
          ) : campaigns.map((c: any) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex-1">
                <p className="text-white text-sm truncate">{c.message}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {new Date(c.sent_at).toLocaleDateString('tr-TR')} · {c.provider}
                </p>
              </div>
              <div className="flex gap-3 text-xs flex-shrink-0">
                <span className="text-emerald-400">{c.sent_count} ✓</span>
                {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} ✗</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
