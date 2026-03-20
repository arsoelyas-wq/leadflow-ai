'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Globe, RefreshCw, Copy, Languages, Zap } from 'lucide-react'

const COUNTRIES = [
  { code: 'TR', flag: '🇹🇷', name: 'Türkiye' },
  { code: 'DE', flag: '🇩🇪', name: 'Almanya' },
  { code: 'AE', flag: '🇦🇪', name: 'BAE' },
  { code: 'US', flag: '🇺🇸', name: 'ABD' },
  { code: 'SA', flag: '🇸🇦', name: 'S. Arabistan' },
  { code: 'GB', flag: '🇬🇧', name: 'İngiltere' },
  { code: 'FR', flag: '🇫🇷', name: 'Fransa' },
  { code: 'KZ', flag: '🇰🇿', name: 'Kazakistan' },
]

export default function CulturalPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('DE')
  const [message, setMessage] = useState('')
  const [adapting, setAdapting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [translateMsg, setTranslateMsg] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['DE', 'AE', 'US'])
  const [translating, setTranslating] = useState(false)
  const [translations, setTranslations] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 5000)
  }

  useEffect(() => {
    api.get('/api/leads?limit=100').then(d => setLeads(d.leads || [])).catch(() => {})
    api.get('/api/cultural/profiles').then(d => setProfiles(d.profiles || {})).catch(() => {})
  }, [])

  const adapt = async () => {
    if (!selectedLead || !selectedCountry || !message) return
    setAdapting(true)
    try {
      const data = await api.post('/api/cultural/adapt', { leadId: selectedLead, targetCountry: selectedCountry, message })
      setResult(data)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setAdapting(false) }
  }

  const translateAll = async () => {
    if (!translateMsg || !selectedCountries.length) return
    setTranslating(true)
    try {
      const data = await api.post('/api/cultural/translate-campaign', { message: translateMsg, countries: selectedCountries })
      setTranslations(data.translations)
    } catch (e: any) { showMsg('error', e.message) }
    finally { setTranslating(false) }
  }

  const selectedProfile = profiles[selectedCountry]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe size={24} className="text-cyan-400" /> Kültürel Uyum & Çeviri
        </h1>
        <p className="text-slate-400 mt-1 text-sm">50+ dil, kültürel uyum, global kampanya çevirisi</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tek Mesaj Uyarlama */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Languages size={16} className="text-cyan-400" /> Lead İçin Kültürel Uyarlama
          </h2>

          <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
            <option value="">Lead seçin</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
          </select>

          <div>
            <label className="text-slate-400 text-xs mb-2 block">Hedef Ülke</label>
            <div className="grid grid-cols-4 gap-2">
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => setSelectedCountry(c.code)}
                  className={`py-2 rounded-lg border text-xs transition ${selectedCountry === c.code ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {c.flag} {c.name}
                </button>
              ))}
            </div>
          </div>

          {selectedProfile && (
            <div className="p-3 bg-slate-900/50 rounded-lg text-xs space-y-1">
              <p className="text-cyan-300 font-medium">{COUNTRIES.find(c => c.code === selectedCountry)?.flag} {selectedProfile.language}</p>
              <p className="text-slate-400">İletişim: {selectedProfile.communication}</p>
              <p className="text-slate-400">Karar: {selectedProfile.decisionStyle}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedProfile.tips?.map((t: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
            placeholder="Uyarlanacak mesajı yazın..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />

          <button onClick={adapt} disabled={adapting || !selectedLead || !message}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {adapting ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {adapting ? 'Uyarlanıyor...' : 'Kültüre Uyarla'}
          </button>

          {result?.adapted && (
            <div className="space-y-3">
              <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-cyan-300 text-xs font-medium">Uyarlanmış Mesaj ({result.country})</p>
                  <button onClick={() => navigator.clipboard.writeText(result.adapted.adaptedMessage)}
                    className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition"><Copy size={12} /></button>
                </div>
                <p className="text-white text-sm">{result.adapted.adaptedMessage}</p>
                {result.adapted.translatedMessage && (
                  <p className="text-slate-400 text-xs mt-2 italic">Türkçe: {result.adapted.translatedMessage}</p>
                )}
              </div>
              {result.adapted.culturalTips?.map((tip: string, i: number) => (
                <p key={i} className="text-slate-400 text-xs">💡 {tip}</p>
              ))}
              {result.adapted.bestSendTime && (
                <p className="text-blue-400 text-xs">⏰ En iyi gönderim: {result.adapted.bestSendTime}</p>
              )}
            </div>
          )}
        </div>

        {/* Toplu Çeviri */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Globe size={16} className="text-purple-400" /> Kampanya Çevirisi
          </h2>

          <textarea value={translateMsg} onChange={e => setTranslateMsg(e.target.value)} rows={3}
            placeholder="Çevrilecek kampanya mesajı..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />

          <div>
            <label className="text-slate-400 text-xs mb-2 block">Hedef Ülkeler</label>
            <div className="grid grid-cols-4 gap-2">
              {COUNTRIES.map(c => (
                <button key={c.code}
                  onClick={() => setSelectedCountries(prev => prev.includes(c.code) ? prev.filter(x => x !== c.code) : [...prev, c.code])}
                  className={`py-2 rounded-lg border text-xs transition ${selectedCountries.includes(c.code) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {c.flag} {c.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={translateAll} disabled={translating || !translateMsg || !selectedCountries.length}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
            {translating ? <RefreshCw size={14} className="animate-spin" /> : <Languages size={14} />}
            {translating ? 'Çevriliyor...' : `${selectedCountries.length} Dile Çevir`}
          </button>

          {translations && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(translations).map(([country, data]: any) => (
                <div key={country} className="p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-xs font-medium">
                      {COUNTRIES.find(c => c.code === country)?.flag} {data.language}
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(data.message)}
                      className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"><Copy size={11} /></button>
                  </div>
                  <p className="text-white text-xs">{data.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}