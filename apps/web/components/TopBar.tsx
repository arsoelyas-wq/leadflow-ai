'use client'
import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { ChevronDown, Search, Check, Globe2, X } from 'lucide-react'

const COUNTRIES = [
  { code:'TR', name:'Türkiye',         flag:'tr', lang:'tr', currency:'TRY', symbol:'₺', region:'Yakın Çevre' },
  { code:'DE', name:'Almanya',         flag:'de', lang:'de', currency:'EUR', symbol:'€', region:'Avrupa' },
  { code:'GB', name:'İngiltere',       flag:'gb', lang:'en', currency:'GBP', symbol:'£', region:'Avrupa' },
  { code:'FR', name:'Fransa',          flag:'fr', lang:'fr', currency:'EUR', symbol:'€', region:'Avrupa' },
  { code:'NL', name:'Hollanda',        flag:'nl', lang:'nl', currency:'EUR', symbol:'€', region:'Avrupa' },
  { code:'IT', name:'İtalya',          flag:'it', lang:'it', currency:'EUR', symbol:'€', region:'Avrupa' },
  { code:'ES', name:'İspanya',         flag:'es', lang:'es', currency:'EUR', symbol:'€', region:'Avrupa' },
  { code:'PL', name:'Polonya',         flag:'pl', lang:'pl', currency:'PLN', symbol:'zł', region:'Avrupa' },
  { code:'US', name:'ABD',             flag:'us', lang:'en', currency:'USD', symbol:'$', region:'Amerika' },
  { code:'CA', name:'Kanada',          flag:'ca', lang:'en', currency:'CAD', symbol:'C$', region:'Amerika' },
  { code:'AE', name:'BAE',             flag:'ae', lang:'ar', currency:'AED', symbol:'د.إ', region:'Körfez' },
  { code:'SA', name:'Suudi Arabistan', flag:'sa', lang:'ar', currency:'SAR', symbol:'﷼', region:'Körfez' },
  { code:'QA', name:'Katar',           flag:'qa', lang:'ar', currency:'QAR', symbol:'ر.ق', region:'Körfez' },
  { code:'KW', name:'Kuveyt',          flag:'kw', lang:'ar', currency:'KWD', symbol:'د.ك', region:'Körfez' },
  { code:'EG', name:'Mısır',           flag:'eg', lang:'ar', currency:'EGP', symbol:'£', region:'Afrika' },
  { code:'MA', name:'Fas',             flag:'ma', lang:'fr', currency:'MAD', symbol:'د.م.', region:'Afrika' },
  { code:'KZ', name:'Kazakistan',      flag:'kz', lang:'ru', currency:'KZT', symbol:'₸', region:'Orta Asya' },
  { code:'AZ', name:'Azerbaycan',      flag:'az', lang:'az', currency:'AZN', symbol:'₼', region:'Orta Asya' },
  { code:'UZ', name:'Özbekistan',      flag:'uz', lang:'uz', currency:'UZS', symbol:'лв', region:'Orta Asya' },
  { code:'RU', name:'Rusya',           flag:'ru', lang:'ru', currency:'RUB', symbol:'₽', region:'Orta Asya' },
  { code:'CN', name:'Çin',             flag:'cn', lang:'zh', currency:'CNY', symbol:'¥', region:'Asya' },
  { code:'JP', name:'Japonya',         flag:'jp', lang:'ja', currency:'JPY', symbol:'¥', region:'Asya' },
  { code:'IN', name:'Hindistan',       flag:'in', lang:'en', currency:'INR', symbol:'₹', region:'Asya' },
]

const LANGUAGES = [
  { code:'tr', name:'Türkçe',    native:'Türkçe'    },
  { code:'en', name:'İngilizce', native:'English'   },
  { code:'de', name:'Almanca',   native:'Deutsch'   },
  { code:'fr', name:'Fransızca', native:'Français'  },
  { code:'ar', name:'Arapça',    native:'العربية'   },
  { code:'ru', name:'Rusça',     native:'Русский'   },
  { code:'es', name:'İspanyolca',native:'Español'   },
  { code:'it', name:'İtalyanca', native:'Italiano'  },
  { code:'nl', name:'Hollandaca',native:'Nederlands' },
  { code:'pl', name:'Lehçe',     native:'Polski'    },
  { code:'zh', name:'Çince',     native:'中文'       },
  { code:'ja', name:'Japonca',   native:'日本語'     },
]

const REGIONS = ['Tümü','Avrupa','Amerika','Körfez','Asya','Orta Asya','Afrika']

function FlagImg({ code, size = 20 }: { code: string; size?: number }) {
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.75)
  if (err) return <Globe2 size={size - 2} color="#64748b"/>
  return (
    <img src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`}
      alt={code} width={size} height={h}
      style={{ borderRadius: 3, objectFit:'cover', display:'block', flexShrink:0 }}
      onError={() => setErr(true)}/>
  )
}

export default function TopBar() {
  const { lang, countryCode, setLang, setCountry } = useI18n()
  const [showCountry, setShowCountry] = useState(false)
  const [showLang,    setShowLang]    = useState(false)
  const [query,       setQuery]       = useState('')
  const [region,      setRegion]      = useState('Tümü')
  const [saving,      setSaving]      = useState(false)

  const countryRef = useRef<HTMLDivElement>(null)
  const langRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setShowCountry(false)
      if (langRef.current    && !langRef.current.contains(e.target as Node))    setShowLang(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const currentC = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]
  const currentL = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  const handleCountry = async (c: typeof COUNTRIES[0]) => {
    setShowCountry(false); setQuery(''); setSaving(true)
    setCountry(c.code, c.lang)
    setTimeout(() => setSaving(false), 800)
  }

  const handleLang = (l: typeof LANGUAGES[0]) => {
    setShowLang(false)
    setLang(l.code)
  }

  const filteredC = COUNTRIES.filter(c => {
    const q = query.toLowerCase()
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    const matchR = region === 'Tümü' || c.region === region
    return matchQ && matchR
  })

  const btn = (onClick: ()=>void, children: React.ReactNode, active: boolean) => (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'5px 11px', borderRadius:8, cursor:'pointer',
      border:`1px solid ${active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
      background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
      color:'#e2e8f0', fontSize:12, fontWeight:500,
      transition:'all 0.15s', whiteSpace:'nowrap' as const,
    }}>
      {children}
    </button>
  )

  const panel: React.CSSProperties = {
    position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:9999,
    background:'#0d111f', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:16, boxShadow:'0 24px 60px rgba(0,0,0,0.7)',
    animation:'tb-in 0.16s ease',
  }

  return (
    <>
      <style>{`
        @keyframes tb-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        @keyframes tb-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      <div style={{ display:'flex', alignItems:'center', gap:6 }}>

        {/* ── ÜLKE / PAZAR SEÇİCİ ── */}
        <div ref={countryRef} style={{ position:'relative' }}>
          {btn(() => { setShowCountry(!showCountry); setShowLang(false) },
            <>
              <FlagImg code={currentC.flag} size={16}/>
              <span style={{ maxWidth:72, overflow:'hidden', textOverflow:'ellipsis' }}>{currentC.name}</span>
              {saving && <span style={{ width:5,height:5,borderRadius:'50%',background:'#f59e0b',animation:'tb-dot 1s infinite' }}/>}
              <ChevronDown size={10} style={{ opacity:.5, transform: showCountry ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}/>
            </>,
            showCountry
          )}

          {showCountry && (
            <div style={{ ...panel, width:400 }}>

              {/* Arama + Bölge */}
              <div style={{ padding:'12px 12px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ position:'relative', marginBottom:8 }}>
                  <Search size={12} color="#475569" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder="Ülke veya kod ara..."
                    style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 9px 6px 28px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' as const }}/>
                  {query && <button onClick={()=>setQuery('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#475569' }}><X size={12}/></button>}
                </div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' as const }}>
                  {REGIONS.map(r=>(
                    <button key={r} onClick={()=>setRegion(r)} style={{ padding:'3px 8px', borderRadius:20, border:`1px solid ${r===region?'rgba(59,130,246,.4)':'rgba(255,255,255,.07)'}`, background:r===region?'rgba(59,130,246,.12)':'transparent', color:r===region?'#93c5fd':'#64748b', fontSize:10, cursor:'pointer', fontWeight:r===region?700:400 }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste */}
              <div style={{ maxHeight:300, overflowY:'auto', padding:'6px 8px' }}>
                {filteredC.length === 0 ? (
                  <p style={{ color:'#334155', fontSize:12, textAlign:'center', padding:'16px 0' }}>Sonuç bulunamadı</p>
                ) : filteredC.map(c => {
                  const active = c.code === countryCode
                  return (
                    <button key={c.code} onClick={() => handleCountry(c)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9, border:'none', background:active?'rgba(59,130,246,.12)':'transparent', cursor:'pointer', transition:'background .12s', textAlign:'left' as const }}>
                      <FlagImg code={c.flag} size={22}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:active?'#93c5fd':'#e2e8f0', fontSize:13, fontWeight:active?700:400, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{c.name}</p>
                        <p style={{ color:'#334155', fontSize:10, margin:0 }}>{c.symbol} {c.currency} · {c.region}</p>
                      </div>
                      {active && <Check size={13} color="#60a5fa" style={{ flexShrink:0 }}/>}
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
                <p style={{ color:'#334155', fontSize:10, margin:0 }}>Seçilen pazar, AI mesaj ve arama kaynaklarını belirler</p>
              </div>
            </div>
          )}
        </div>

        {/* ── DİL SEÇİCİ ── */}
        <div ref={langRef} style={{ position:'relative' }}>
          {btn(() => { setShowLang(!showLang); setShowCountry(false) },
            <>
              <Globe2 size={13} style={{ opacity:.7 }}/>
              <span style={{ textTransform:'uppercase' as const }}>{currentL.code}</span>
              <ChevronDown size={10} style={{ opacity:.5, transform:showLang?'rotate(180deg)':'none', transition:'transform .2s' }}/>
            </>,
            showLang
          )}

          {showLang && (
            <div style={{ ...panel, width:240 }}>
              <div style={{ padding:'6px 8px' }}>
                <p style={{ color:'#334155', fontSize:10, padding:'6px 10px 4px', margin:0 }}>
                  Arayüz dili
                </p>
                {LANGUAGES.map(l => {
                  const active = l.code === lang
                  return (
                    <button key={l.code} onClick={() => handleLang(l)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, border:'none', background:active?'rgba(59,130,246,.12)':'transparent', cursor:'pointer', transition:'background .12s', textAlign:'left' as const }}>
                      <div style={{ flex:1 }}>
                        <p style={{ color:active?'#93c5fd':'#e2e8f0', fontSize:13, fontWeight:active?700:400, margin:0 }}>{l.native}</p>
                        <p style={{ color:'#475569', fontSize:10, margin:'1px 0 0' }}>{l.name}</p>
                      </div>
                      {active && <Check size={13} color="#60a5fa"/>}
                    </button>
                  )
                })}
              </div>
              <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
                <p style={{ color:'#334155', fontSize:10, margin:0 }}>Arayüz ve AI mesaj dilini değiştirir</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
