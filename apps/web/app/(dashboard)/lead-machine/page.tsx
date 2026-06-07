'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Sparkles, RefreshCw, Plus, Users, Target, Mic, Video, Swords, LineChart, Workflow } from 'lucide-react'
import Link from 'next/link'
import AssistantChat, { AssistantMessage, AssistantLeadResult } from '@/components/AssistantChat'

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps', icon: '🗺️', desc: 'Google Maps işletme veritabanı', color: 'green' },
  { id: 'instagram', label: 'Instagram', icon: '📸', desc: 'Instagram işletme hesapları', color: 'pink' },
  { id: 'facebook', label: 'Facebook', icon: '📘', desc: 'Facebook sayfa sahipleri', color: 'blue' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', desc: 'TikTok işletme hesapları', color: 'black' },
]

const SHORTCUTS = [
  { label: 'Sesli Ajan', desc: 'AI ile kişisel sesli arama', path: '/voice-outreach', icon: Mic, color: 'text-blue-400' },
  { label: 'Video Klonum', desc: 'AI avatarla kişisel video', path: '/video-outreach', icon: Video, color: 'text-purple-400' },
  { label: 'Rakip Radarım', desc: 'Rakip analizi ve hijacking', path: '/competitor', icon: Swords, color: 'text-red-400' },
  { label: 'Satış Akışım', desc: 'Pipeline ve fırsat takibi', path: '/pipeline', icon: Workflow, color: 'text-emerald-400' },
  { label: 'Analizlerim', desc: 'Performans ve rapor', path: '/analytics', icon: LineChart, color: 'text-yellow-400' },
]

export default function LeadMachinePage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<any>(null)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [profile, setProfile] = useState<any>(null)

  // Asistan
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  // Referral
  const [showReferral, setShowReferral] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [referralForm, setReferralForm] = useState({ referrerLeadId:'', companyName:'', contactName:'', phone:'', email:'', sector:'' })
  const [referralLoading, setReferralLoading] = useState(false)

  const showMsg = (type: 'success'|'error', text: string) => {
    setMsg({type,text}); setTimeout(()=>setMsg(null), 6000)
  }

  const loadStats = async () => {
    try {
      const data = await api.get('/api/sources/stats')
      setStats(data)
    } catch {}
  }

  const loadLeads = async () => {
    try {
      const data = await api.get('/api/leads?limit=100')
      setLeads(data.leads || [])
    } catch {}
  }

  useEffect(() => {
    loadStats()
    loadLeads()
    ;(async () => {
      try {
        const data = await api.get('/api/settings/business-profile')
        setProfile(data?.profile || null)
      } catch {}
    })()
  }, [])

  // Kişiselleştirilmiş karşılama — profil yüklendiğinde bir kez kurulur
  useEffect(() => {
    if (messages.length) return
    const sector = profile?.company?.sector || profile?.target?.sectors?.[0]
    const city = profile?.company?.city
    const name = profile?.company?.name

    const greeting = name
      ? `Merhaba ${name}, ben LeadFlow Asistanı. Hangi sektörde, hangi şehirde yeni müşteri arayalım — doğal dille anlatman yeterli.`
      : `Merhaba, ben LeadFlow Asistanı. Doğal dille anlat, gerisini ben hallederim — örn. "İstanbul'da mobilya üreticileri bul, Instagram'dan".`

    const quickReplies = sector
      ? [`${sector} sektöründe ${city || 'İstanbul'}'da müşteri bul`, `${sector} için rakip analizi öner`, 'Bana uygun bir araç öner']
      : ['Mobilya üreticileri bul', 'İstanbul\'da restoranlar', 'Bana bir araç öner']

    setMessages([{ role: 'assistant', text: greeting, quickReplies }])
  }, [profile])

  const handleSend = async (text: string) => {
    const nextMessages: AssistantMessage[] = [...messages, { role: 'user', text }]
    setMessages(nextMessages)
    setChatLoading(true)
    try {
      const history = nextMessages
        .filter(m => m.text)
        .map(m => ({ role: m.role, content: m.text }))

      const data = await api.post('/api/ai/discover', { messages: history, businessProfile: profile })

      if (data.action === 'search' && data.searchParams) {
        const { sector, city, keyword, sources, limit } = data.searchParams
        const finalKeyword = keyword || sector || ''
        const finalSources: string[] = (sources && sources.length) ? sources : ['google_maps']
        const finalCities: string[] = city ? [city] : ['Istanbul']
        const finalLimit = limit || 15

        const results: AssistantLeadResult[] = []
        for (const source of finalSources) {
          for (const c of finalCities) {
            const r = await api.post('/api/sources/scrape', { source, keyword: finalKeyword, city: c, limit: finalLimit })
            results.push({
              source, city: c,
              sourceLabel: SOURCES.find(s => s.id === source)?.label || source,
              added: r.added || 0, found: r.found || 0,
            })
          }
        }

        const totalAdded = results.reduce((a, r) => a + r.added, 0)
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, leadResults: results }])
        loadStats()
        if (totalAdded > 0) showMsg('success', `${totalAdded} yeni lead eklendi!`)
      } else if (data.action === 'suggest_tool' && data.suggestedTool) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, toolSuggestion: data.suggestedTool }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Üzgünüm, bir sorun oluştu: ' + e.message }])
    } finally {
      setChatLoading(false)
    }
  }

  const addReferral = async () => {
    if (!referralForm.companyName || !referralForm.phone) return
    setReferralLoading(true)
    try {
      const data = await api.post('/api/sources/referral', referralForm)
      showMsg('success', data.message)
      setReferralForm({ referrerLeadId:'', companyName:'', contactName:'', phone:'', email:'', sector:'' })
      setShowReferral(false)
      loadStats()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setReferralLoading(false) }
  }

  const sourceStats = stats?.stats || {}
  const totalLeads = stats?.total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles size={24} className="text-emerald-400"/> {t('lead_machine.title','LeadFlow Asistanı')}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {t('lead_machine.subtitle','Doğal dille anlat, ben arayayım — ya da sana en uygun aracı önereyim')}
          </p>
        </div>
        <button onClick={()=>setShowReferral(!showReferral)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition cursor-pointer">
          <Users size={14}/> {t('lead_machine.referral_add','Referans Ekle')}
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Referans Formu */}
      {showReferral && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Users size={14} className="text-purple-400"/> Referans ile Lead Ekle
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t('lead_machine.referans_veren_musteri', 'Referans Veren Müşteri')}</label>
              <select value={referralForm.referrerLeadId}
                onChange={e=>setReferralForm(p=>({...p,referrerLeadId:e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none">
                <option value="">{t('lead_machine.secin_opsiyonel', 'Seçin (opsiyonel)')}</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t('lead_machine.sektor', 'Sektör')}</label>
              <input value={referralForm.sector}
                onChange={e=>setReferralForm(p=>({...p,sector:e.target.value}))}
                placeholder="Mobilya, Tekstil..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"/>
            </div>
            {[
              {key:'companyName',label: t('Şirket Adı *','Şirket Adı *'),ph:'ABC Ltd.'},
              {key:'contactName',label: t('Kişi Adı','Kişi Adı'),ph:'Ahmet Bey'},
              {key:'phone',label:'Telefon *',ph:'05001234567'},
              {key:'email',label:'Email',ph:'info@abc.com'},
            ].map(({key,label,ph})=>(
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input value={(referralForm as any)[key]}
                  onChange={e=>setReferralForm(p=>({...p,[key]:e.target.value}))}
                  placeholder={ph}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"/>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addReferral} disabled={referralLoading||!referralForm.companyName||!referralForm.phone}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition cursor-pointer">
              {referralLoading?<RefreshCw size={12} className="animate-spin"/>:<Plus size={12}/>}
              {referralLoading ? t("lead_machine.adding","Ekleniyor...") : t("lead_machine.add_lead","Lead Ekle")}
            </button>
            <button onClick={()=>setShowReferral(false)}
              className="px-4 py-2 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition cursor-pointer">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Split-screen: sohbet + Pazar Nabzı */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden h-[600px]">
          <AssistantChat messages={messages} loading={chatLoading} onSend={handleSend} />
        </div>

        <div className="lg:col-span-1 space-y-4">
          {/* Pazar Nabzı */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Target size={14} className="text-emerald-400"/> {t('lead_machine.pazar_nabzi','Pazar Nabzı')}
            </h3>
            <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-3">
              <p className="text-2xl font-bold text-emerald-400">{totalLeads}</p>
              <p className="text-slate-400 text-xs">{t('lead_machine.toplam_lead','Toplam Lead')}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SOURCES.map(s => (
                <div key={s.id} className="bg-slate-900 rounded-lg p-2.5 text-center">
                  <p className="text-base">{s.icon}</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{sourceStats[s.id] || 0}</p>
                  <p className="text-slate-500 text-[11px] truncate">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hızlı Erişim — asistanın önerebileceği araçların önizlemesi */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3">{t('lead_machine.hizli_erisim','Hızlı Erişim')}</h3>
            <div className="space-y-1.5">
              {SHORTCUTS.map(s => (
                <Link key={s.path} href={s.path}
                  className="flex items-center gap-2.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-transparent hover:border-slate-700 rounded-lg transition cursor-pointer group">
                  <s.icon size={15} className={`${s.color} flex-shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{s.label}</p>
                    <p className="text-slate-500 text-[11px] truncate">{s.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
