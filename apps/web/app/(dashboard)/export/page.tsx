'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Globe2, Search, RefreshCw, Plus, Send, Phone, MessageSquare,
  Mail, ChevronRight, CheckCircle, Target, Zap, Users, BarChart2,
  ArrowRight, Filter, Download, Copy, Play, X, Star
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

const REGIONS = ['Tümü', 'Avrupa', 'Körfez', 'Amerika', 'Orta Asya', 'Asya', 'Afrika']

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  { key: 'email', label: 'Email', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'call', label: 'Telefon', icon: Phone, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
]

export default function ExportPage() {
  const [tab, setTab] = useState<'find' | 'leads' | 'campaigns' | 'messages'>('find')
  const [countries, setCountries] = useState<any[]>([])
  const [exportLeads, setExportLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Find form
  const [selectedCountry, setSelectedCountry] = useState<any>(null)
  const [selectedRegion, setSelectedRegion] = useState('Tümü')
  const [sector, setSector] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedChannel, setSelectedChannel] = useState('whatsapp')
  const [campaignName, setCampaignName] = useState('')
  const [generatingMsg, setGeneratingMsg] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, any>>({})
  const [filterCountry, setFilterCountry] = useState('')

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [c, l, ca] = await Promise.allSettled([
        fetch(`${API}/api/export/countries`, { headers: authH() }),
        fetch(`${API}/api/export/export-leads?limit=100`, { headers: authH() }),
        fetch(`${API}/api/export/campaigns`, { headers: authH() }),
      ])
      if (c.status === 'fulfilled') { const d = await (c.value as any).json(); setCountries(d.countries || []) }
      if (l.status === 'fulfilled') { const d = await (l.value as any).json(); setExportLeads(d.leads || []) }
      if (ca.status === 'fulfilled') { const d = await (ca.value as any).json(); setCampaigns(d.campaigns || []) }
    } catch {}
    setLoading(false)
  }

  async function searchLeads() {
    if (!selectedCountry || !sector) return showMsg('error', 'Ülke ve sektör seçin')
    setSearching(true)
    try {
      const r = await fetch(`${API}/api/export/find-leads`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ countryCode: selectedCountry.code, sector })
      })
      const d = await r.json()
      showMsg('success', d.message)
      setTimeout(loadAll, 8000)
    } catch (e: any) { showMsg('error', e.message) }
    setSearching(false)
  }

  async function generateMessage(leadId: string) {
    setGeneratingMsg(leadId)
    try {
      const r = await fetch(`${API}/api/export/generate-message`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ leadId, countryCode: filterCountry || undefined, channel: selectedChannel })
      })
      const d = await r.json()
      setMessages(prev => ({ ...prev, [leadId]: d.message }))
    } catch (e: any) { showMsg('error', e.message) }
    setGeneratingMsg(null)
  }

  async function createCampaign() {
    if (!selectedLeads.length) return showMsg('error', 'En az 1 lead seçin')
    if (!selectedCountry && !filterCountry) return showMsg('error', 'Ülke seçin')
    try {
      const r = await fetch(`${API}/api/export/create-campaign`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          name: campaignName,
          countryCode: selectedCountry?.code || filterCountry,
          leadIds: selectedLeads,
          channel: selectedChannel,
        })
      })
      const d = await r.json()
      if (d.ok) { showMsg('success', d.message); loadAll(); setTab('campaigns'); setSelectedLeads([]) }
      else showMsg('error', d.error)
    } catch (e: any) { showMsg('error', e.message) }
  }

  const filteredCountries = selectedRegion === 'Tümü'
    ? countries
    : countries.filter(c => c.region === selectedRegion)

  const filteredLeads = filterCountry
    ? exportLeads.filter(l => l.country_code === filterCountry)
    : exportLeads

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Globe2 className="w-4 h-4"/>
            </div>
            İhracat Zekası
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hedef ülkede müşteri bul, kendi dilinde mesaj gönder, kampanya başlat</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-medium">
            {exportLeads.length} ihracat leadi
          </span>
          <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg font-medium">
            {campaigns.length} kampanya
          </span>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-800/40 border border-slate-700 p-1 rounded-xl w-fit">
        {[['find','🌍 Müşteri Bul'],['leads','👥 İhracat Leadleri'],['campaigns','🚀 Kampanyalar'],['messages','💬 Mesajlar']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* MÜŞTERI BUL */}
      {tab === 'find' && (
        <div className="space-y-5">
          {/* Bölge filtreleri */}
          <div className="flex gap-2 flex-wrap">
            {REGIONS.map(r => (
              <button key={r} onClick={() => setSelectedRegion(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${selectedRegion === r ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {r}
              </button>
            ))}
          </div>

          {/* Ülke seçimi */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredCountries.map(country => (
              <button key={country.code} onClick={() => setSelectedCountry(selectedCountry?.code === country.code ? null : country)}
                className={`p-3 rounded-2xl border text-left transition-all ${selectedCountry?.code === country.code
                  ? 'bg-emerald-600/20 border-emerald-500/50'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                <div className="text-2xl mb-1.5">{country.flag}</div>
                <div className="text-white text-xs font-semibold truncate">{country.name}</div>
                <div className="text-slate-500 text-xs">{country.currency}</div>
                {selectedCountry?.code === country.code && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-1"/>
                )}
              </button>
            ))}
          </div>

          {/* Sektör + Ara */}
          {selectedCountry && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedCountry.flag}</span>
                <div>
                  <h3 className="text-white font-semibold">{selectedCountry.name}'de Müşteri Ara</h3>
                  <p className="text-slate-400 text-xs">Dil: {selectedCountry.language.toUpperCase()} · Para birimi: {selectedCountry.currency}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <input value={sector} onChange={e => setSector(e.target.value)}
                  placeholder="Sektör girin (örn: mobilya, tekstil, inşaat malzemeleri)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"/>
                <button onClick={searchLeads} disabled={searching || !sector}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium">
                  {searching ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                  {searching ? 'Aranıyor...' : 'Ara'}
                </button>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400">
                → Google Maps'ten {selectedCountry.name}'deki {sector || 'sektör'} firmalarını bulacak ve leadlerinize ekleyecek
              </div>
            </div>
          )}

          {/* İstatistikler */}
          {exportLeads.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(exportLeads.reduce((acc: any, l) => {
                acc[l.country] = (acc[l.country] || 0) + 1; return acc;
              }, {})).slice(0, 4).map(([country, count]: any) => {
                const c = countries.find(x => x.name === country)
                return (
                  <div key={country} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">{c?.flag || '🌍'}</span>
                    <div>
                      <div className="text-white font-semibold">{count}</div>
                      <div className="text-slate-500 text-xs">{country}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* İHRACAT LEADLERİ */}
      {tab === 'leads' && (
        <div className="space-y-4">
          {/* Filtreler */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">Tüm Ülkeler</option>
              {[...new Set(exportLeads.map(l => l.country_code))].map(code => {
                const c = countries.find(x => x.code === code)
                return <option key={code} value={code}>{c?.flag} {c?.name || code}</option>
              })}
            </select>

            {/* Kanal seçimi */}
            <div className="flex gap-2">
              {CHANNELS.map(ch => (
                <button key={ch.key} onClick={() => setSelectedChannel(ch.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${selectedChannel === ch.key ? ch.bg + ' ' + ch.color : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <ch.icon className="w-3.5 h-3.5"/> {ch.label}
                </button>
              ))}
            </div>

            {selectedLeads.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400">{selectedLeads.length} seçili</span>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  placeholder="Kampanya adı"
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none w-40"/>
                <button onClick={createCampaign}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-medium">
                  <Zap className="w-3.5 h-3.5"/> Kampanya Oluştur
                </button>
              </div>
            )}
          </div>

          {/* Lead listesi */}
          <div className="space-y-2">
            {filteredLeads.map(lead => {
              const country = countries.find(c => c.code === lead.country_code)
              const hasMsg = messages[lead.id]
              return (
                <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedLeads.includes(lead.id)}
                      onChange={e => setSelectedLeads(prev => e.target.checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id))}
                      className="accent-emerald-500 w-4 h-4"/>
                    <span className="text-2xl shrink-0">{country?.flag || '🌍'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{lead.company_name}</div>
                      <div className="text-slate-500 text-xs flex items-center gap-2 mt-0.5">
                        <span>{country?.name || lead.country}</span>
                        {lead.sector && <span>· {lead.sector}</span>}
                        {lead.phone && <span className="text-teal-400">· {lead.phone}</span>}
                        {lead.website && <span className="text-blue-400 truncate">· {lead.website}</span>}
                      </div>
                    </div>
                    <button onClick={() => generateMessage(lead.id)} disabled={generatingMsg === lead.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-xl">
                      {generatingMsg === lead.id ? <RefreshCw className="w-3 h-3 animate-spin"/> : <MessageSquare className="w-3 h-3"/>}
                      Mesaj Üret
                    </button>
                  </div>
                  {hasMsg && (
                    <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-700">
                      {hasMsg.subject && <div className="text-slate-400 text-xs mb-1">Konu: <span className="text-white">{hasMsg.subject}</span></div>}
                      <p className="text-slate-300 text-sm leading-relaxed">{hasMsg.body}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => navigator.clipboard.writeText(hasMsg.body)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                          <Copy className="w-3 h-3"/> Kopyala
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filteredLeads.length === 0 && (
              <div className="text-center py-16 text-slate-600">
                <Globe2 className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Henüz ihracat leadi yok</p>
                <button onClick={() => setTab('find')} className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1 mx-auto">
                  Müşteri Bul <ArrowRight className="w-4 h-4"/>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KAMPANYALAR */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.map(c => {
            const country = countries.find(x => x.code === c.country_code)
            const ch = CHANNELS.find(x => x.key === c.channel)
            return (
              <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{country?.flag || '🌍'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : c.status === 'running' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'}`}>
                        {c.status === 'completed' ? 'Tamamlandı' : c.status === 'running' ? 'Devam ediyor' : 'Taslak'}
                      </span>
                      {ch && <span className={`text-xs px-2 py-0.5 rounded-full border ${ch.bg} ${ch.color}`}>{ch.label}</span>}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      {country?.name} · {c.lead_count} lead · {new Date(c.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl">
                    <Play className="w-3.5 h-3.5"/> Başlat
                  </button>
                </div>
              </div>
            )
          })}
          {campaigns.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Henüz kampanya yok</p>
              <button onClick={() => setTab('leads')} className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1 mx-auto">
                Lead seç ve kampanya oluştur <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MESAJLAR */}
      {tab === 'messages' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3"/>
            <p className="text-slate-400 text-sm">Leadler sekmesinde lead seç → Mesaj Üret → Kampanya oluştur</p>
            <button onClick={() => setTab('leads')} className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1 mx-auto">
              Leadlere git <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}