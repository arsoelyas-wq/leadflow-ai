'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { ChevronDown, Search, Check, Globe2, Languages } from 'lucide-react'

// ── ÜLKE VERİSİ ───────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code:'TR', name:'Türkiye',         flag:'tr', lang:'tr', currency:'TRY', region:'Yakın Çevre' },
  { code:'DE', name:'Almanya',         flag:'de', lang:'de', currency:'EUR', region:'Avrupa' },
  { code:'GB', name:'İngiltere',       flag:'gb', lang:'en', currency:'GBP', region:'Avrupa' },
  { code:'FR', name:'Fransa',          flag:'fr', lang:'fr', currency:'EUR', region:'Avrupa' },
  { code:'NL', name:'Hollanda',        flag:'nl', lang:'nl', currency:'EUR', region:'Avrupa' },
  { code:'IT', name:'İtalya',          flag:'it', lang:'it', currency:'EUR', region:'Avrupa' },
  { code:'ES', name:'İspanya',         flag:'es', lang:'es', currency:'EUR', region:'Avrupa' },
  { code:'PL', name:'Polonya',         flag:'pl', lang:'pl', currency:'PLN', region:'Avrupa' },
  { code:'US', name:'ABD',             flag:'us', lang:'en', currency:'USD', region:'Amerika' },
  { code:'CA', name:'Kanada',          flag:'ca', lang:'en', currency:'CAD', region:'Amerika' },
  { code:'AE', name:'BAE',             flag:'ae', lang:'ar', currency:'AED', region:'Körfez' },
  { code:'SA', name:'Suudi Arabistan', flag:'sa', lang:'ar', currency:'SAR', region:'Körfez' },
  { code:'QA', name:'Katar',           flag:'qa', lang:'ar', currency:'QAR', region:'Körfez' },
  { code:'KW', name:'Kuveyt',          flag:'kw', lang:'ar', currency:'KWD', region:'Körfez' },
  { code:'EG', name:'Mısır',           flag:'eg', lang:'ar', currency:'EGP', region:'Afrika' },
  { code:'MA', name:'Fas',             flag:'ma', lang:'fr', currency:'MAD', region:'Afrika' },
  { code:'KZ', name:'Kazakistan',      flag:'kz', lang:'ru', currency:'KZT', region:'Orta Asya' },
  { code:'AZ', name:'Azerbaycan',      flag:'az', lang:'az', currency:'AZN', region:'Orta Asya' },
  { code:'UZ', name:'Özbekistan',      flag:'uz', lang:'uz', currency:'UZS', region:'Orta Asya' },
  { code:'RU', name:'Rusya',           flag:'ru', lang:'ru', currency:'RUB', region:'Orta Asya' },
  { code:'CN', name:'Çin',             flag:'cn', lang:'zh', currency:'CNY', region:'Asya' },
  { code:'JP', name:'Japonya',         flag:'jp', lang:'ja', currency:'JPY', region:'Asya' },
  { code:'IN', name:'Hindistan',       flag:'in', lang:'en', currency:'INR', region:'Asya' },
]

const LANGUAGES = [
  { code:'tr', name:'Türkçe',     native:'Türkçe' },
  { code:'en', name:'İngilizce',  native:'English' },
  { code:'de', name:'Almanca',    native:'Deutsch' },
  { code:'fr', name:'Fransızca',  native:'Français' },
  { code:'ar', name:'Arapça',     native:'العربية' },
  { code:'ru', name:'Rusça',      native:'Русский' },
  { code:'es', name:'İspanyolca', native:'Español' },
  { code:'it', name:'İtalyanca',  native:'Italiano' },
  { code:'nl', name:'Hollandaca', native:'Nederlands' },
  { code:'pl', name:'Lehçe',      native:'Polski' },
  { code:'zh', name:'Çince',      native:'中文' },
  { code:'ja', name:'Japonca',    native:'日本語' },
]

const REGIONS = ['Tümü','Avrupa','Amerika','Körfez','Asya','Orta Asya','Afrika']

// ── FLAG IMAGE ────────────────────────────────────────────────────────────────
function Flag({ code, size = 20 }: { code: string; size?: number }) {
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.75)
  if (err) return <Globe2 size={size - 4} color="#64748b" />
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`}
      alt={code} width={size} height={h}
      style={{ borderRadius: 3, objectFit:'cover', display:'block', flexShrink:0 }}
      onError={() => setErr(true)}
    />
  )
}

export default function TopBar() {
  const { user } = useAuth()

  const [countryCode, setCountryCode] = useState('TR')
  const [langCode,    setLangCode]    = useState('tr')
  const [saving,      setSaving]      = useState(false)

  const [showCountry, setShowCountry] = useState(false)
  const [showLang,    setShowLang]    = useState(false)
  const [countryQ,    setCountryQ]    = useState('')
  const [region,      setRegion]      = useState('Tümü')

  const countryRef = useRef<HTMLDivElement>(null)
  const langRef    = useRef<HTMLDivElement>(null)

  // Init from user/localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lf_country') || (user as any)?.countryCode || 'TR'
    const savedLang = localStorage.getItem('lf_lang') || (user as any)?.languageCode || 'tr'
    setCountryCode(saved)
    setLangCode(savedLang)
  }, [user])

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setShowCountry(false)
      if (langRef.current    && !langRef.current.contains(e.target as Node))    setShowLang(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectCountry = useCallback(async (code: string, defaultLang: string) => {
    setShowCountry(false)
    setCountryCode(code)
    setLangCode(defaultLang)
    localStorage.setItem('lf_country', code)
    localStorage.setItem('lf_lang', defaultLang)
    setSaving(true)
    try {
      await api.patch('/api/platforms/my-country', { country_code: code })
    } catch {}
    setSaving(false)
  }, [])

  const selectLang = useCallback(async (code: string) => {
    setShowLang(false)
    setLangCode(code)
    localStorage.setItem('lf_lang', code)
    try {
      await api.patch('/api/platforms/my-country', { language_code: code })
    } catch {}
  }, [])

  const currentCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]
  const currentLang    = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0]

  const filteredCountries = COUNTRIES.filter(c => {
    const matchQ = !countryQ || c.name.toLowerCase().includes(countryQ.toLowerCase()) || c.code.toLowerCase().includes(countryQ.toLowerCase())
    const matchR = region === 'Tümü' || c.region === region
    return matchQ && matchR
  })

  const pill = (onClick: () => void, children: React.ReactNode, active: boolean) => (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:10, border:`1px solid ${active?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`, background:active?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.04)', cursor:'pointer', transition:'all 0.15s', color:'#e2e8f0', fontSize:12, fontWeight:500, whiteSpace:'nowrap' as const }}>
      {children}
    </button>
  )

  const dropdown = {
    position:'absolute' as const, top:'calc(100% + 6px)', right:0, zIndex:1000,
    background:'linear-gradient(135deg,#0d111f,#090d1a)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:16, boxShadow:'0 20px 50px rgba(0,0,0,0.7)', overflow:'hidden',
    animation:'tb-fade 0.16s ease',
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, position:'relative' }}>

      {/* ── ÜLKE SEÇİCİ ── */}
      <div ref={countryRef} style={{ position:'relative' }}>
        {pill(() => { setShowCountry(!showCountry); setShowLang(false) },
          <>
            <Flag code={currentCountry.flag} size={18} />
            <span>{currentCountry.code}</span>
            {saving && <span style={{ width:6,height:6,borderRadius:'50%',background:'#f59e0b',animation:'tb-pulse 1s infinite' }}/>}
            <ChevronDown size={11} style={{ opacity:0.5, transform:showCountry?'rotate(180deg)':'none', transition:'transform 0.2s' }}/>
          </>,
          showCountry
        )}

        {showCountry && (
          <div style={{ ...dropdown, width:380 }}>
            {/* Search + Bölge */}
            <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ position:'relative', marginBottom:10 }}>
                <Search size={13} color="#475569" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                <input
                  autoFocus
                  value={countryQ} onChange={e => setCountryQ(e.target.value)}
                  placeholder="Ülke ara..."
                  style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'7px 10px 7px 32px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' as const }}
                />
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
                {REGIONS.map(r => (
                  <button key={r} onClick={() => setRegion(r)}
                    style={{ padding:'3px 9px', borderRadius:20, border:`1px solid ${region===r?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.06)'}`, background:region===r?'rgba(59,130,246,0.12)':'transparent', color:region===r?'#93c5fd':'#64748b', fontSize:10, cursor:'pointer', fontWeight:region===r?700:400 }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Country list */}
            <div style={{ maxHeight:280, overflowY:'auto', padding:'6px 8px' }}>
              {filteredCountries.map(c => {
                const isActive = c.code === countryCode
                return (
                  <button key={c.code} onClick={() => selectCountry(c.code, c.lang)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9, border:'none', background:isActive?'rgba(59,130,246,0.12)':'transparent', cursor:'pointer', transition:'background 0.12s', textAlign:'left' as const }}>
                    <Flag code={c.flag} size={22} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:isActive?'#93c5fd':'#e2e8f0', fontSize:13, fontWeight:isActive?700:400, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{c.name}</p>
                      <p style={{ color:'#334155', fontSize:10, margin:0 }}>{c.currency} · {c.region}</p>
                    </div>
                    {isActive && <Check size={14} color="#60a5fa" style={{ flexShrink:0 }}/>}
                  </button>
                )
              })}
              {!filteredCountries.length && (
                <p style={{ color:'#334155', fontSize:12, textAlign:'center', padding:'16px 0' }}>Sonuç bulunamadı</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── DİL SEÇİCİ ── */}
      <div ref={langRef} style={{ position:'relative' }}>
        {pill(() => { setShowLang(!showLang); setShowCountry(false) },
          <>
            <Languages size={13} style={{ opacity:0.7 }}/>
            <span style={{ textTransform:'uppercase' as const }}>{currentLang.code}</span>
            <ChevronDown size={11} style={{ opacity:0.5, transform:showLang?'rotate(180deg)':'none', transition:'transform 0.2s' }}/>
          </>,
          showLang
        )}

        {showLang && (
          <div style={{ ...dropdown, width:220 }}>
            <div style={{ padding:'8px 8px' }}>
              {LANGUAGES.map(l => {
                const isActive = l.code === langCode
                return (
                  <button key={l.code} onClick={() => selectLang(l.code)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, border:'none', background:isActive?'rgba(59,130,246,0.12)':'transparent', cursor:'pointer', transition:'background 0.12s', textAlign:'left' as const }}>
                    <div style={{ flex:1 }}>
                      <p style={{ color:isActive?'#93c5fd':'#e2e8f0', fontSize:13, fontWeight:isActive?700:400, margin:0 }}>{l.native}</p>
                      <p style={{ color:'#334155', fontSize:10, margin:0 }}>{l.name}</p>
                    </div>
                    {isActive && <Check size={13} color="#60a5fa"/>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tb-fade  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes tb-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
