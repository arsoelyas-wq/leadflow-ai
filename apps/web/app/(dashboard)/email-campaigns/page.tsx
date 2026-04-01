'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Mail, Send, RefreshCw, Plus, Settings, CheckCircle, Sparkles, Eye } from 'lucide-react'

const SMTP_PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, hint: 'App Password kullanın: myaccount.google.com/security' },
  { name: 'Yandex', host: 'smtp.yandex.com', port: 465, hint: 'Yandex şifrenizi kullanın' },
  { name: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, hint: 'Microsoft hesap şifrenizi kullanın' },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 465, hint: 'App Password gerekli' },
  { name: 'Özel SMTP', host: '', port: 587, hint: 'Hosting sağlayıcınızdan SMTP bilgilerini alın' },
]

export default function EmailCampaignsPage() {
  const [stats, setStats] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'send'|'settings'|'campaigns'>('send')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const [smtp, setSmtp] = useState({ smtp_host:'', smtp_port:587, smtp_user:'', smtp_pass:'', from_name:'', from_email:'' })
  const [email, setEmail] = useState({ subject:'', html:'', text:'', goal:'' })

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),6000) }

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, l, st] = await Promise.allSettled([
        api.get('/api/email/stats'),
        api.get('/api/email/campaigns'),
        api.get('/api/leads?limit=200'),
        api.get('/api/email/settings'),
      ])
      if (s.status==='fulfilled') setStats(s.value)
      if (c.status==='fulfilled') setCampaigns(c.value.campaigns||[])
      if (l.status==='fulfilled') setLeads(l.value.leads?.filter((l:any)=>l.email)||[])
      if (st.status==='fulfilled' && st.value.settings) {
        setSettings(st.value.settings)
        setSmtp(prev=>({...prev, ...st.value.settings}))
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const saveSmtp = async () => {
    setSaving(true)
    try {
      await api.post('/api/email/settings', smtp)
      showMsg('success', 'SMTP ayarları kaydedildi!')
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const testSmtp = async () => {
    setTesting(true)
    try {
      await api.post('/api/email/settings', smtp)
      const r = await api.post('/api/email/test', {})
      showMsg('success', r.message)
    } catch (e:any) { showMsg('error', e.message) }
    finally { setTesting(false) }
  }

  const generateContent = async () => {
    if (!email.subject) return showMsg('error', 'Önce konu yazın')
    setGenerating(true)
    try {
      const r = await api.post('/api/email/generate', { subject: email.subject, goal: email.goal })
      if (r.content) {
        setEmail(p=>({...p, html: r.content.html, text: r.content.text, subject: r.content.subject||p.subject }))
        showMsg('success', 'AI email içeriği oluşturuldu!')
      }
    } catch (e:any) { showMsg('error', e.message) }
    finally { setGenerating(false) }
  }

  const sendCampaign = async () => {
    if (!email.subject || !email.html || !selectedLeads.length) return showMsg('error', 'Konu, içerik ve en az 1 lead seçin')
    setSending(true)
    try {
      const r = await api.post('/api/email/send', { subject: email.subject, html: email.html, text: email.text, leadIds: selectedLeads })
      showMsg('success', r.message)
      setEmail({subject:'',html:'',text:'',goal:''})
      setSelectedLeads([])
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSending(false) }
  }

  const selectAll = () => setSelectedLeads(leads.map(l=>l.id))
  const clearAll = () => setSelectedLeads([])

  const presetClick = (preset: any) => {
    setSmtp(p=>({...p, smtp_host: preset.host, smtp_port: preset.port}))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail size={24} className="text-blue-400"/> Email Kampanya
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Kendi SMTP sunucunuzdan profesyonel email gönderin</p>
        </div>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
            <p className="text-slate-400 text-xs mt-1">Toplam Kampanya</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.totalSent}</p>
            <p className="text-slate-400 text-xs mt-1">Gönderilen Email</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${stats.configured?'text-emerald-400':'text-red-400'}`}>
              {stats.configured ? '✅ Bağlı' : '❌ Bağlı Değil'}
            </p>
            <p className="text-slate-400 text-xs mt-1">{stats.fromEmail || 'SMTP Durumu'}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          {key:'send',label:'📧 Email Gönder'},
          {key:'settings',label:'⚙️ SMTP Ayarları'},
          {key:'campaigns',label:'📋 Geçmiş'},
        ].map(({key,label})=>(
          <button key={key} onClick={()=>setActiveTab(key as any)}
            className={`px-4 py-2 text-sm rounded-xl border transition ${activeTab===key?'bg-blue-600 border-blue-500 text-white':'border-slate-700 text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* SMTP Ayarları */}
      {activeTab==='settings' && (
        <div className="space-y-4">
          {/* Hazır Ayarlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <p className="text-white font-semibold mb-3">🚀 Hızlı Kurulum</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {SMTP_PRESETS.map(preset=>(
                <button key={preset.name} onClick={()=>presetClick(preset)}
                  className={`p-2.5 rounded-lg border text-center text-xs transition ${smtp.smtp_host===preset.host?'bg-blue-600/20 border-blue-500 text-white':'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {preset.name}
                </button>
              ))}
            </div>
            {smtp.smtp_host && (
              <p className="text-yellow-400 text-xs">{SMTP_PRESETS.find(p=>p.host===smtp.smtp_host)?.hint}</p>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <p className="text-white font-semibold">SMTP Bağlantı Bilgileri</p>
            <div className="grid lg:grid-cols-2 gap-4">
              {[
                {k:'smtp_host',l:'SMTP Sunucu *',p:'smtp.gmail.com'},
                {k:'smtp_port',l:'Port',p:'587',type:'number'},
                {k:'smtp_user',l:'Kullanıcı Adı / Email *',p:'info@sirket.com'},
                {k:'smtp_pass',l:'Şifre / App Password *',p:'••••••••',type:'password'},
                {k:'from_name',l:'Gönderen Adı',p:'Şirket Adı'},
                {k:'from_email',l:'Gönderen Email',p:'info@sirket.com'},
              ].map(({k,l,p,type})=>(
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1.5 block">{l}</label>
                  <input type={type||'text'} value={(smtp as any)[k]}
                    onChange={e=>setSmtp(prev=>({...prev,[k]:type==='number'?parseInt(e.target.value):e.target.value}))}
                    placeholder={p}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={saveSmtp} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                {saving?<RefreshCw size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
                {saving?'Kaydediliyor...':'Kaydet'}
              </button>
              <button onClick={testSmtp} disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
                {testing?<RefreshCw size={14} className="animate-spin"/>:<Send size={14}/>}
                {testing?'Test Ediliyor...':'Test Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Gönder */}
      {activeTab==='send' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sol — Email içeriği */}
          <div className="lg:col-span-2 space-y-4">
            {!stats?.configured && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-sm">
                ⚠️ Önce SMTP ayarlarını yapın → <button onClick={()=>setActiveTab('settings')} className="underline">Ayarlar</button>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold">📧 Email İçeriği</p>
                <button onClick={generateContent} disabled={generating||!email.subject}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                  {generating?<RefreshCw size={11} className="animate-spin"/>:<Sparkles size={11}/>}
                  {generating?'Üretiliyor...':'AI ile Üret'}
                </button>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Konu *</label>
                <input value={email.subject} onChange={e=>setEmail(p=>({...p,subject:e.target.value}))}
                  placeholder="Özel Teklif — Sadece Sizin İçin!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Hedef (AI için)</label>
                <input value={email.goal} onChange={e=>setEmail(p=>({...p,goal:e.target.value}))}
                  placeholder="Mobilya satışı, toplantı daveti, indirim duyurusu..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-xs">HTML İçerik *</label>
                  <button onClick={()=>setPreview(!preview)} className="text-blue-400 text-xs flex items-center gap-1">
                    <Eye size={10}/> {preview?'Kodu Göster':'Önizle'}
                  </button>
                </div>
                {preview ? (
                  <div className="bg-white rounded-lg p-4 min-h-32" dangerouslySetInnerHTML={{__html: email.html}}/>
                ) : (
                  <textarea value={email.html} onChange={e=>setEmail(p=>({...p,html:e.target.value}))}
                    placeholder="<h2>Merhaba {isim},</h2><p>...</p>"
                    rows={8}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none font-mono"/>
                )}
                <p className="text-slate-500 text-xs mt-1">Kişiselleştirme: {'{isim}'} → alıcı adı, {'{sirket}'} → şirket adı</p>
              </div>

              <button onClick={sendCampaign} disabled={sending||!email.subject||!email.html||!selectedLeads.length}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition font-medium">
                {sending?<RefreshCw size={14} className="animate-spin"/>:<Send size={14}/>}
                {sending?`Gönderiliyor...`:`${selectedLeads.length} Kişiye Gönder`}
              </button>
            </div>
          </div>

          {/* Sağ — Lead seçimi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">👥 Alıcılar ({selectedLeads.length}/{leads.length})</p>
              <div className="flex gap-1">
                <button onClick={selectAll} className="text-xs text-blue-400 hover:underline">Tümü</button>
                <span className="text-slate-600">|</span>
                <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">Temizle</button>
              </div>
            </div>
            {leads.length===0 ? (
              <p className="text-slate-400 text-xs">Email adresi olan lead bulunamadı</p>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {leads.map(l=>(
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e=>setSelectedLeads(prev=>e.target.checked?[...prev,l.id]:prev.filter(id=>id!==l.id))}
                      className="accent-blue-500"/>
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

      {/* Geçmiş Kampanyalar */}
      {activeTab==='campaigns' && (
        <div className="space-y-3">
          {campaigns.length===0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-10 text-center">
              <Mail size={36} className="text-slate-600 mx-auto mb-2"/>
              <p className="text-slate-400">Henüz kampanya yok</p>
            </div>
          ) : campaigns.map(c=>(
            <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-white font-medium">{c.subject}</p>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{new Date(c.sent_at).toLocaleString('tr-TR')}</span>
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