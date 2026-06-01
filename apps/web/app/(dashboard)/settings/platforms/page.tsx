'use client'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import {
  Globe, Check, RefreshCw, Search, Lock, ChevronDown,
  ShieldCheck, Star, AlertTriangle, Key, Globe2, CheckCircle
} from 'lucide-react'

// ── TİP ETİKETLERİ ───────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string }> = {
  search:       { label:'Arama',          color:'#3b82f6' },
  directory:    { label:'Dizin',           color:'#8b5cf6' },
  professional: { label:'Profesyonel Ağ', color:'#0a66c2' },
  social:       { label:'Sosyal Medya',   color:'#e1306c' },
  b2b:          { label:'B2B Dizin',      color:'#f59e0b' },
  review:       { label:'İnceleme',       color:'#10b981' },
  complaint:    { label:'Şikayet',        color:'#ef4444' },
  marketplace:  { label:'Pazar Yeri',     color:'#f97316' },
  government:   { label:'Resmi/Devlet',   color:'#1565c0' },
  financial:    { label:'Finans',         color:'#047857' },
  news:         { label:'Haber',          color:'#94a3b8' },
  video:        { label:'Video',          color:'#ff0000' },
}

const REGIONS = ['Tümü','Avrupa','Amerika','Körfez','Asya','Orta Asya','Afrika']

// ── FLAG IMAGE ────────────────────────────────────────────────────────────────
function FlagImg({ code, size = 28 }: { code: string; size?: number }) {
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.75)
  if (err) return <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>🌍</span>
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`}
      alt={code} width={size} height={h}
      style={{ borderRadius: 4, objectFit:'cover', display:'block', flexShrink:0 }}
      onError={() => setErr(true)}
    />
  )
}

export default function PlatformsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [countries, setCountries] = useState<any[]>([])
  const [currentCountry, setCurrentCountry] = useState<any>(null)
  const [platforms, setPlatforms] = useState<any[]>([])
  const [grouped, setGrouped] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState('Tümü')
  const [typeFilter, setTypeFilter] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [c, mc, p] = await Promise.allSettled([
      api.get('/api/platforms/countries'),
      api.get('/api/platforms/my-country'),
      api.get(`/api/platforms/available?country=${(user as any)?.countryCode || 'TR'}`),
    ])
    if (c.status === 'fulfilled') setCountries((c.value as any).countries || [])
    if (mc.status === 'fulfilled') setCurrentCountry(mc.value)
    if (p.status === 'fulfilled') {
      setPlatforms((p.value as any).platforms || [])
      setGrouped((p.value as any).grouped || {})
    }
    setLoading(false)
  }, [user])

  useEffect(() => { loadAll() }, [loadAll])

  const selectCountry = async (code: string) => {
    setShowCountryPicker(false)
    setSaving('country')
    try {
      const data: any = await api.patch('/api/platforms/my-country', { country_code: code })
      setCurrentCountry(data.country)
      showMsg('success', `Ülke ${data.country.name} olarak güncellendi. Sayfayı yenileyin.`)
      // Reload platforms for new country
      const p: any = await api.get(`/api/platforms/available?country=${code}`)
      setPlatforms(p.platforms || [])
      setGrouped(p.grouped || {})
    } catch(e:any) { showMsg('error', e.message) }
    setSaving(null)
  }

  const togglePlatform = async (platformId: string, enabled: boolean, canDisable: boolean, isGlobal: boolean) => {
    if (!canDisable || isGlobal) return
    setSaving(platformId)
    try {
      await api.patch('/api/platforms/settings', { platform_id: platformId, enabled })
      setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, enabled } : p))
      setGrouped(prev => {
        const next = { ...prev }
        for (const type in next) {
          next[type] = next[type].map(p => p.id === platformId ? { ...p, enabled } : p)
        }
        return next
      })
      setSavedOk(platformId)
      setTimeout(() => setSavedOk(null), 2000)
    } catch(e:any) { showMsg('error', e.message) }
    setSaving(null)
  }

  // Filters
  const filteredPlatforms = platforms.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'Tümü' && TYPE_META[p.type]?.label !== typeFilter) return false
    return true
  })

  const filteredCountries = countries.filter(c => {
    if (countrySearch && !c.name.toLowerCase().includes(countrySearch.toLowerCase()) && !c.code.toLowerCase().includes(countrySearch.toLowerCase())) return false
    if (regionFilter !== 'Tümü' && c.region !== regionFilter) return false
    return true
  })

  const allTypes = ['Tümü', ...Array.from(new Set(platforms.map(p => TYPE_META[p.type]?.label).filter(Boolean)))]
  const globalPlatforms  = filteredPlatforms.filter(p => p.is_global)
  const localPlatforms   = filteredPlatforms.filter(p => !p.is_global)

  const card = { background:'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16 } as const
  const inp  = { background:'#060a1c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:'0 0 5px' }}>Ülke & Platform Ayarları</h1>
          <p style={{ color:'#475569', fontSize:13, margin:0 }}>Aktif ülkenizi seçin — sistem o ülkeye özel kaynaklarla çalışır</p>
        </div>
        <button onClick={loadAll} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'#64748b', fontSize:12, cursor:'pointer' }}>
          <RefreshCw size={12} style={{ animation:loading?'pl-spin 1s linear infinite':'none' }}/> Yenile
        </button>
      </div>

      {msg && (
        <div style={{ padding:'10px 16px', background:msg.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.28)':'rgba(239,68,68,0.28)'}`, borderRadius:10 }}>
          <p style={{ color:msg.type==='success'?'#34d399':'#f87171', fontSize:12, margin:0 }}>{msg.text}</p>
        </div>
      )}

      {/* Aktif Ülke Seçici */}
      <div style={{ ...card, padding:'20px 24px', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {currentCountry && <FlagImg code={currentCountry.code || currentCountry.country_code || 'TR'} size={44} />}
            <div>
              <p style={{ color:'#64748b', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 4px' }}>Aktif Ülke</p>
              <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:'0 0 3px' }}>
                {loading ? '...' : currentCountry?.name || 'Türkiye'}
              </h2>
              <div style={{ display:'flex', gap:12, fontSize:12, color:'#475569' }}>
                <span>💰 {currentCountry?.currency || 'TRY'}</span>
                <span>🌐 {currentCountry?.language || 'tr'}</span>
                <span>🕐 {currentCountry?.timezone?.split('/')[1] || 'Istanbul'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowCountryPicker(!showCountryPicker)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:11, border:'1px solid rgba(59,130,246,0.3)', background:'rgba(59,130,246,0.1)', color:'#93c5fd', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <Globe2 size={15} /> Ülke Değiştir <ChevronDown size={13} style={{ transform:showCountryPicker?'rotate(180deg)':'none', transition:'transform 0.2s' }}/>
          </button>
        </div>

        {/* Country Picker Dropdown */}
        {showCountryPicker && (
          <div style={{ marginTop:16, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:16 }}>
            {/* Region + search */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegionFilter(r)}
                  style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${regionFilter===r?'rgba(59,130,246,0.45)':'rgba(255,255,255,0.07)'}`, background:regionFilter===r?'rgba(59,130,246,0.14)':'transparent', color:regionFilter===r?'#93c5fd':'#64748b', fontSize:12, cursor:'pointer' }}>
                  {r}
                </button>
              ))}
              <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                placeholder="Ülke ara..." style={{ ...inp, padding:'5px 12px', fontSize:12, marginLeft:'auto', width:160 }}/>
            </div>

            {/* Country grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, maxHeight:320, overflowY:'auto' }}>
              {filteredCountries.map(c => {
                const isActive = (currentCountry?.code || currentCountry?.country_code) === c.code
                return (
                  <button key={c.code} onClick={() => selectCountry(c.code)} disabled={saving === 'country'}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:11, border:`1px solid ${isActive?'rgba(59,130,246,0.45)':'rgba(255,255,255,0.06)'}`, background:isActive?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.02)', cursor:'pointer', textAlign:'left', transition:'all 0.12s' }}>
                    <FlagImg code={c.code} size={22}/>
                    <div style={{ minWidth:0 }}>
                      <p style={{ color:isActive?'#93c5fd':'#fff', fontSize:12, fontWeight:isActive?700:400, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                      <p style={{ color:'#334155', fontSize:10, margin:0 }}>{c.currency}</p>
                    </div>
                    {isActive && <Check size={12} color="#60a5fa" style={{ flexShrink:0 }}/>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Platform Filtreler */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, maxWidth:240 }}>
          <Search size={13} color="#475569" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Platform ara..."
            style={{ ...inp, paddingLeft:30, width:'100%', boxSizing:'border-box' as const, fontSize:12 }}/>
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {allTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ padding:'5px 11px', borderRadius:20, border:`1px solid ${typeFilter===t?'rgba(139,92,246,0.45)':'rgba(255,255,255,0.07)'}`, background:typeFilter===t?'rgba(139,92,246,0.14)':'transparent', color:typeFilter===t?'#a78bfa':'#64748b', fontSize:11, cursor:'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* GLOBAL PLATFORMLAR */}
      <div style={{ ...card, padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Globe size={15} color="#64748b"/>
          <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>Global Platformlar</h3>
          <span style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#34d399', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>Her ülkede aktif</span>
          <Lock size={12} color="#334155" style={{ marginLeft:4 }}/>
          <span style={{ color:'#334155', fontSize:11 }}>Kapatılamaz</span>
        </div>
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[0,1,2,3,4,5,6,7].map(i => <div key={i} style={{ height:56, background:'rgba(255,255,255,0.03)', borderRadius:10 }}/>)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {globalPlatforms.map(p => {
              const tm = TYPE_META[p.type] || { label:'Diğer', color:'#64748b' }
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.1)', borderRadius:11 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', flexShrink:0, boxShadow:'0 0 6px #10b98166' }}/>
                  <div style={{ minWidth:0 }}>
                    <p style={{ color:'#fff', fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                    <p style={{ color:tm.color, fontSize:10, margin:0 }}>{tm.label}</p>
                  </div>
                  <Lock size={10} color="#334155" style={{ flexShrink:0, marginLeft:'auto' }}/>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ÜLKEYE ÖZEL PLATFORMLAR */}
      <div style={{ ...card, padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          {currentCountry && <FlagImg code={currentCountry.code || currentCountry.country_code || 'TR'} size={20}/>}
          <h3 style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>
            {currentCountry?.name || 'Türkiye'} Platformları
          </h3>
          <span style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#93c5fd', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
            {localPlatforms.length} platform
          </span>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ height:60, background:'rgba(255,255,255,0.03)', borderRadius:10 }}/>)}
          </div>
        ) : localPlatforms.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'#334155' }}>
            <Globe size={28} style={{ margin:'0 auto 10px', display:'block' }}/>
            <p style={{ fontSize:13, margin:0 }}>Bu ülkeye özel platform bulunamadı</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {localPlatforms.map(p => {
              const tm = TYPE_META[p.type] || { label:'Diğer', color:'#64748b' }
              const isSaving = saving === p.id
              const isOk    = savedOk === p.id
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:'rgba(255,255,255,0.03)', border:`1px solid ${p.enabled?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.03)'}`, borderRadius:12, opacity:p.enabled?1:0.55, transition:'all 0.2s' }}>
                  {/* Status dot */}
                  <div style={{ width:8, height:8, borderRadius:'50%', background:p.enabled?'#10b981':'#334155', flexShrink:0, boxShadow:p.enabled?'0 0 6px #10b98166':'none', transition:'all 0.2s' }}/>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0 }}>{p.name}</p>
                      <span style={{ background:`${tm.color}15`, color:tm.color, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>{tm.label}</span>
                      {p.countries?.length > 1 && p.countries[0] !== '*' && (
                        <span style={{ color:'#334155', fontSize:10 }}>+{p.countries.length - 1} ülke</span>
                      )}
                    </div>
                    {p.url && <p style={{ color:'#334155', fontSize:11, margin:'2px 0 0' }}>{p.url}</p>}
                  </div>

                  {/* Toggle */}
                  {isOk ? (
                    <CheckCircle size={16} color="#10b981"/>
                  ) : isSaving ? (
                    <RefreshCw size={15} color="#475569" style={{ animation:'pl-spin 1s linear infinite' }}/>
                  ) : (
                    <button onClick={() => togglePlatform(p.id, !p.enabled, p.can_disable, p.is_global)}
                      disabled={!p.can_disable || p.is_global}
                      style={{ width:42, height:22, borderRadius:11, border:'none', cursor:p.can_disable&&!p.is_global?'pointer':'not-allowed', position:'relative', transition:'background 0.2s', background:p.enabled?'#10b981':'rgba(100,116,139,0.3)', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:3, left:p.enabled?21:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Özet */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Toplam Platform', value:platforms.length, color:'#94a3b8' },
            { label:'Aktif Platform',  value:platforms.filter(p=>p.enabled).length, color:'#10b981' },
            { label:'Kapalı Platform', value:platforms.filter(p=>!p.enabled).length, color:'#f59e0b' },
          ].map(m => (
            <div key={m.label} style={{ ...card, padding:'14px 18px', textAlign:'center' }}>
              <p style={{ color:m.color, fontSize:22, fontWeight:800, margin:0 }}>{m.value}</p>
              <p style={{ color:'#475569', fontSize:11, margin:'3px 0 0' }}>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pl-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
