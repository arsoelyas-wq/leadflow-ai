'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Linkedin, Search, RefreshCw, Send, UserPlus, Users, Phone, Instagram, Twitter, Facebook, ChevronDown, ChevronUp, Zap, Copy } from 'lucide-react'

export default function LinkedInPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [persons, setPersons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [batchSearching, setBatchSearching] = useState(false)
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedPersons, setSelectedPersons] = useState<string[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sendingPerson, setSendingPerson] = useState<string | null>(null)
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterLead, setFilterLead] = useState('')

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [l, c, p] = await Promise.allSettled([
        api.get('/api/leads?limit=100'),
        api.get('/api/campaigns'),
        api.get('/api/linkedin/persons'),
      ])
      if (l.status === 'fulfilled') setLeads(l.value.leads || [])
      if (c.status === 'fulfilled') setCampaigns(c.value.campaigns || [])
      if (p.status === 'fulfilled') setPersons(p.value.persons || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const search = async () => {
    if (!selectedLead) return
    setSearching(true)
    setSearchResult(null)
    try {
      const data = await api.post('/api/linkedin/find-decision-makers', { leadId: selectedLead })
      setSearchResult(data)
      showMsg('success', `${data.found} karar verici bulundu!`)
      load()
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSearching(false) }
  }

  const batchSearch = async () => {
    setBatchSearching(true)
    try {
      const data = await api.post('/api/linkedin/find-batch', { limit: 10 })
      showMsg('success', data.message)
      setTimeout(load, 5000)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setBatchSearching(false) }
  }

  const addToCampaign = async () => {
    if (!selectedPersons.length || !selectedCampaign) return
    try {
      const data = await api.post('/api/linkedin/add-to-campaign', {
        personIds: selectedPersons,
        campaignId: selectedCampaign,
      })
      showMsg('success', data.message)
      setSelectedPersons([])
      load()
    } catch (e: any) { showMsg('error', e.message) }
  }

  const sendWhatsApp = async (personId: string) => {
    setSendingPerson(personId)
    try {
      await api.post('/api/linkedin/send-whatsapp', {
        personId,
        message: customMessages[personId] || undefined,
      })
      showMsg('success', 'Mesaj gönderildi!')
    } catch (e: any) { showMsg('error', e.message) }
    finally { setSendingPerson(null) }
  }

  const filteredPersons = filterLead
    ? persons.filter(p => p.lead_id === filterLead)
    : persons

  const decisionPowerColor: Record<string, string> = {
    yüksek: 'text-emerald-400',
    orta: 'text-yellow-400',
    düşük: 'text-slate-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Linkedin size={24} className="text-blue-400" /> LinkedIn Karar Verici Avı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Şirket sahipleri ve karar vericileri bul — WhatsApp numarası + sosyal medya + kampanyaya ekle</p>
        </div>
        <button onClick={batchSearch} disabled={batchSearching}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
          {batchSearching ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {batchSearching ? 'Aranıyor...' : 'Toplu Ara (10 şirket)'}
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {/* Tek Şirket Ara */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">🔍 Tek Şirkette Karar Verici Bul</h2>
        <div className="flex gap-3">
          <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Şirket seçin</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} {l.city ? `— ${l.city}` : ''}</option>)}
          </select>
          <button onClick={search} disabled={searching || !selectedLead}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
            {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            {searching ? 'Aranıyor...' : 'LinkedIn\'de Ara'}
          </button>
        </div>

        {searchResult && (
          <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-blue-300 text-sm font-medium">
              {searchResult.lead} — {searchResult.found} karar verici bulundu
            </p>
          </div>
        )}
      </div>

      {/* Kampanyaya Ekle */}
      {selectedPersons.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
          <p className="text-emerald-300 text-sm flex-1">{selectedPersons.length} kişi seçili</p>
          <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
            <option value="">Kampanya seç</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={addToCampaign} disabled={!selectedCampaign}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
            <UserPlus size={14} /> Kampanyaya Ekle
          </button>
        </div>
      )}

      {/* Kişi Listesi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">
            Bulunan Karar Vericiler ({filteredPersons.length})
          </h2>
          <select value={filterLead} onChange={e => setFilterLead(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none">
            <option value="">Tüm şirketler</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center h-32 items-center"><RefreshCw size={24} className="animate-spin text-slate-400" /></div>
        ) : filteredPersons.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <Linkedin size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Henüz karar verici bulunamadı</p>
            <p className="text-slate-500 text-sm mt-1">Şirket seçip "LinkedIn'de Ara" butonuna tıklayın</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPersons.map(person => (
              <div key={person.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <input type="checkbox" checked={selectedPersons.includes(person.id)}
                    onChange={e => setSelectedPersons(prev => e.target.checked ? [...prev, person.id] : prev.filter(id => id !== person.id))}
                    className="accent-blue-500 shrink-0" />

                  {/* Avatar */}
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {person.name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{person.name}</p>
                      {person.aiAnalysis?.isDecisionMaker && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded">✓ Karar Verici</span>
                      )}
                      {person.aiAnalysis?.decisionPower && (
                        <span className={`text-xs font-medium ${decisionPowerColor[person.aiAnalysis.decisionPower] || 'text-slate-400'}`}>
                          {person.aiAnalysis.decisionPower} güç
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">{person.title} — {person.company}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {person.phone && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Phone size={10} /> {person.phone}
                        </span>
                      )}
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 text-xs flex items-center gap-1 hover:underline">
                          <Linkedin size={10} /> LinkedIn
                        </a>
                      )}
                      {person.instagram_url && (
                        <a href={person.instagram_url} target="_blank" rel="noopener noreferrer"
                          className="text-pink-400 text-xs flex items-center gap-1 hover:underline">
                          <Instagram size={10} /> Instagram
                        </a>
                      )}
                      {person.twitter_url && (
                        <a href={person.twitter_url} target="_blank" rel="noopener noreferrer"
                          className="text-sky-400 text-xs flex items-center gap-1 hover:underline">
                          <Twitter size={10} /> Twitter
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {person.phone ? (
                      <button onClick={() => setExpanded(expanded === person.id ? null : person.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs rounded-lg transition">
                        <Send size={11} /> WA Gönder
                      </button>
                    ) : (
                      <span className="text-slate-500 text-xs px-3 py-1.5 bg-slate-700/50 rounded-lg">Telefon yok</span>
                    )}
                    <button onClick={() => setExpanded(expanded === person.id ? null : person.id)}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                      {expanded === person.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Panel */}
                {expanded === person.id && (
                  <div className="border-t border-slate-700 px-5 py-4 space-y-4">
                    {/* AI Analiz */}
                    {person.aiAnalysis && (
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 rounded-xl p-4">
                          <p className="text-blue-300 text-xs font-medium mb-2">🧠 AI Yaklaşım Stratejisi</p>
                          <p className="text-slate-300 text-sm">{person.aiAnalysis.approachStrategy}</p>
                          {person.aiAnalysis.bestContactTime && (
                            <p className="text-yellow-400 text-xs mt-2">⏰ {person.aiAnalysis.bestContactTime}</p>
                          )}
                        </div>
                        {person.aiAnalysis.personalizedOpener && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                            <p className="text-emerald-300 text-xs font-medium mb-2">💬 Kişisel WA Mesajı</p>
                            <p className="text-white text-sm">{person.aiAnalysis.personalizedOpener}</p>
                            <button onClick={() => setCustomMessages(prev => ({ ...prev, [person.id]: person.aiAnalysis.personalizedOpener }))}
                              className="mt-2 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">Kullan</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* WA Gönder */}
                    {person.phone && (
                      <div className="space-y-2">
                        <textarea
                          value={customMessages[person.id] || person.aiAnalysis?.personalizedOpener || ''}
                          onChange={e => setCustomMessages(prev => ({ ...prev, [person.id]: e.target.value }))}
                          placeholder="WhatsApp mesajı yazın..."
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 resize-none"
                        />
                        <button onClick={() => sendWhatsApp(person.id)} disabled={sendingPerson === person.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
                          {sendingPerson === person.id ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                          WhatsApp Gönder — {person.phone}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}