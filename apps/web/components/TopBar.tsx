'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n, LOCALE_MAP } from '@/lib/i18n'
import { ChevronDown, Search, Check, Globe2, X, Link, Copy, CheckCircle } from 'lucide-react'

const COUNTRIES = [
  { locale:'tr_TR', name:'Türkiye',         flag:'tr', region:'Yakın Çevre', symbol:'₺' },
  { locale:'de_DE', name:'Almanya',          flag:'de', region:'Avrupa',      symbol:'€' },
  { locale:'en_GB', name:'İngiltere',        flag:'gb', region:'Avrupa',      symbol:'£' },
  { locale:'fr_FR', name:'Fransa',           flag:'fr', region:'Avrupa',      symbol:'€' },
  { locale:'nl_NL', name:'Hollanda',         flag:'nl', region:'Avrupa',      symbol:'€' },
  { locale:'it_IT', name:'İtalya',           flag:'it', region:'Avrupa',      symbol:'€' },
  { locale:'es_ES', name:'İspanya',          flag:'es', region:'Avrupa',      symbol:'€' },
  { locale:'pl_PL', name:'Polonya',          flag:'pl', region:'Avrupa',      symbol:'zł' },
  { locale:'en_US', name:'ABD',              flag:'us', region:'Amerika',     symbol:'$' },
  { locale:'ar_AE', name:'BAE',              flag:'ae', region:'Körfez',      symbol:'د.إ' },
  { locale:'ar_SA', name:'Suudi Arabistan',  flag:'sa', region:'Körfez',      symbol:'﷼' },
  { locale:'ru_RU', name:'Rusya',            flag:'ru', region:'Orta Asya',   symbol:'₽' },
  { locale:'zh_CN', name:'Çin',              flag:'cn', region:'Asya',        symbol:'¥' },
  { locale:'ja_JP', name:'Japonya',          flag:'jp', region:'Asya',        symbol:'¥' },
]

const LANGUAGES = [
  { locale:'tr_TR', native:'Türkçe',     flag:'tr' },
  { locale:'en_US', native:'English',    flag:'us' },
  { locale:'de_DE', native:'Deutsch',    flag:'de' },
  { locale:'fr_FR', native:'Français',   flag:'fr' },
  { locale:'ar_AE', native:'العربية',    flag:'ae' },
  { locale:'ru_RU', native:'Русский',    flag:'ru' },
  { locale:'es_ES', native:'Español',    flag:'es' },
  { locale:'it_IT', native:'Italiano',   flag:'it' },
  { locale:'nl_NL', native:'Nederlands', flag:'nl' },
  { locale:'pl_PL', native:'Polski',     flag:'pl' },
  { locale:'zh_CN', native:'中文',        flag:'cn' },
  { locale:'ja_JP', native:'日本語',      flag:'jp' },
]

const REGIONS = ['Tümü','Avrupa','Amerika','Körfez','Asya','Orta Asya','Yakın Çevre']

function FlagImg({ code, size = 20 }: { code: string; size?: number }) {
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.75)
  if (err) return <Globe2 size={size - 4} color="#94a3b8" />
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code}.png`}
      alt={code} width={size} height={h}
      style={{ borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  )
}

/* ── LIGHT DESIGN TOKENS ── */
const L = {
  pillBg:         '#ffffff',
  pillBorder:     '#e2e8f0',
  pillBorderActive: '#bfdbfe',
  pillBgActive:   '#eff6ff',
  pillText:       '#475569',
  pillTextActive: '#1d4ed8',
  panelBg:        '#ffffff',
  panelBorder:    '#e2e8f0',
  panelShadow:    '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
  panelRadius:    14,
  inputBg:        '#f8fafc',
  inputBorder:    '#e2e8f0',
  inputText:      '#0f172a',
  inputPlaceholder: '#94a3b8',
  text1:          '#0f172a',
  text2:          '#475569',
  text3:          '#94a3b8',
  divider:        '#f1f5f9',
  rowHover:       '#f8fafc',
  rowActive:      '#eff6ff',
  rowActiveText:  '#1d4ed8',
  chipBg:         '#f1f5f9',
  chipBgActive:   '#eff6ff',
  chipBorder:     '#e2e8f0',
  chipBorderActive: '#bfdbfe',
  chipText:       '#64748b',
  chipTextActive: '#1d4ed8',
}

export default function TopBar() {
  const { locale, lang, setLocale, t, getShareUrl } = useI18n()
  const [showC, setShowC] = useState(false)
  const [showL, setShowL] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('Tümü')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const cRef = useRef<HTMLDivElement>(null)
  const lRef = useRef<HTMLDivElement>(null)
  const sRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (cRef.current && !cRef.current.contains(e.target as Node)) setShowC(false)
      if (lRef.current && !lRef.current.contains(e.target as Node)) setShowL(false)
      if (sRef.current && !sRef.current.contains(e.target as Node)) setShowShare(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const currentC = COUNTRIES.find(c => c.locale === locale) || COUNTRIES[0]
  const currentL = LANGUAGES.find(l => l.locale === locale || LOCALE_MAP[l.locale]?.lang === lang) || LANGUAGES[0]

  const handleLocale = useCallback((newLocale: string) => {
    setShowC(false); setShowL(false); setQuery(''); setSaving(true)
    setLocale(newLocale)
    setTimeout(() => setSaving(false), 600)
  }, [setLocale])

  const shareUrl = getShareUrl()
  const copyShare = () => {
    navigator.clipboard?.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = COUNTRIES.filter(c => {
    const q = query.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.locale.toLowerCase().includes(q))
      && (region === 'Tümü' || c.region === region)
  })

  /* Pill button — reusable */
  const Pill = ({
    onClick, active, children
  }: {
    onClick: () => void
    active: boolean
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${active ? L.pillBorderActive : L.pillBorder}`,
        background: active ? L.pillBgActive : L.pillBg,
        color: active ? L.pillTextActive : L.pillText,
        fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        transition: 'all 0.15s', fontFamily: 'inherit',
        boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {children}
    </button>
  )

  /* Dropdown panel */
  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999,
    background: L.panelBg,
    border: `1px solid ${L.panelBorder}`,
    borderRadius: L.panelRadius,
    boxShadow: L.panelShadow,
    animation: 'tb-in .14s ease',
  }

  return (
    <>
      <style>{`
        @keyframes tb-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes tb-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

        {/* ── ÜLKE / PAZAR ── */}
        <div ref={cRef} style={{ position: 'relative' }}>
          <Pill onClick={() => { setShowC(!showC); setShowL(false); setShowShare(false) }} active={showC}>
            <FlagImg code={currentC.flag} size={16} />
            <span>{currentC.name}</span>
            {saving && (
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#f59e0b', animation: 'tb-dot 1s infinite',
              }} />
            )}
            <ChevronDown size={10} style={{ opacity: 0.5, transform: showC ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </Pill>

          {showC && (
            <div style={{ ...panelStyle, width: 380 }}>
              {/* Arama + Bölge filtresi */}
              <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${L.divider}` }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={12} color={L.text3} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('topbar.search_country', 'Ülke ara...')}
                    style={{
                      width: '100%', background: L.inputBg,
                      border: `1px solid ${L.inputBorder}`, borderRadius: 8,
                      padding: '7px 28px', color: L.inputText,
                      fontSize: 12, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: L.text3, padding: 2,
                      }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Bölge chips */}
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {REGIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRegion(r)}
                      style={{
                        padding: '3px 8px', borderRadius: 20,
                        border: `1px solid ${r === region ? L.chipBorderActive : L.chipBorder}`,
                        background: r === region ? L.chipBgActive : L.chipBg,
                        color: r === region ? L.chipTextActive : L.chipText,
                        fontSize: 10.5, cursor: 'pointer', fontWeight: r === region ? 700 : 400,
                        fontFamily: 'inherit', transition: 'all 0.12s',
                      }}
                    >
                      {r === 'Tümü' ? t('topbar.all_regions', 'Tümü') : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ülke listesi */}
              <div style={{ maxHeight: 280, overflowY: 'auto', padding: '5px 8px' }}>
                {filtered.length === 0 ? (
                  <p style={{ color: L.text3, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>
                    Sonuç bulunamadı
                  </p>
                ) : filtered.map(c => {
                  const active = c.locale === locale
                  return (
                    <button
                      key={c.locale}
                      onClick={() => handleLocale(c.locale)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', borderRadius: 9, border: 'none',
                        background: active ? L.rowActive : 'transparent',
                        cursor: 'pointer', transition: 'background .1s', textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = L.rowHover }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <FlagImg code={c.flag} size={22} />
                      <div style={{ flex: 1 }}>
                        <p style={{ color: active ? L.rowActiveText : L.text1, fontSize: 13, fontWeight: active ? 700 : 400, margin: 0 }}>
                          {c.name}
                        </p>
                        <p style={{ color: L.text3, fontSize: 10, margin: 0 }}>
                          {c.symbol} · {c.region} · {c.locale}
                        </p>
                      </div>
                      {active && <Check size={13} color={L.rowActiveText} />}
                    </button>
                  )
                })}
              </div>

              <div style={{ padding: '7px 14px', borderTop: `1px solid ${L.divider}` }}>
                <p style={{ color: L.text3, fontSize: 10, margin: 0 }}>{t('topbar.market_effect')}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── DİL ── */}
        <div ref={lRef} style={{ position: 'relative' }}>
          <Pill onClick={() => { setShowL(!showL); setShowC(false); setShowShare(false) }} active={showL}>
            <Globe2 size={13} style={{ opacity: 0.7 }} />
            <span style={{ textTransform: 'uppercase' }}>{lang}</span>
            <ChevronDown size={10} style={{ opacity: 0.5, transform: showL ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </Pill>

          {showL && (
            <div style={{ ...panelStyle, width: 230 }}>
              <div style={{ padding: '6px 8px' }}>
                <p style={{ color: L.text3, fontSize: 10, padding: '5px 10px 3px', margin: 0 }}>
                  {t('topbar.ui_lang', 'Arayüz dili')}
                </p>
                {LANGUAGES.map(l => {
                  const active = LOCALE_MAP[l.locale]?.lang === lang
                  return (
                    <button
                      key={l.locale}
                      onClick={() => handleLocale(l.locale)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px', borderRadius: 9, border: 'none',
                        background: active ? L.rowActive : 'transparent',
                        cursor: 'pointer', transition: 'background .1s', textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = L.rowHover }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <FlagImg code={l.flag} size={18} />
                      <p style={{ color: active ? L.rowActiveText : L.text1, fontSize: 13, fontWeight: active ? 700 : 400, margin: 0, flex: 1 }}>
                        {l.native}
                      </p>
                      {active && <Check size={13} color={L.rowActiveText} />}
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: '7px 14px', borderTop: `1px solid ${L.divider}` }}>
                <p style={{ color: L.text3, fontSize: 10, margin: 0 }}>{t('topbar.effect')}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── PAYLAŞILABILIR LİNK ── */}
        <div ref={sRef} style={{ position: 'relative' }}>
          <Pill onClick={() => { setShowShare(!showShare); setShowC(false); setShowL(false) }} active={showShare}>
            <Link size={12} style={{ opacity: 0.7 }} />
            <ChevronDown size={10} style={{ opacity: 0.5, transform: showShare ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </Pill>

          {showShare && (
            <div style={{ ...panelStyle, width: 340, padding: '16px' }}>
              <p style={{ color: L.text1, fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>
                {t('topbar.share_link', 'Paylaşılabilir Link')}
              </p>
              <p style={{ color: L.text2, fontSize: 11, margin: '0 0 12px', lineHeight: 1.5 }}>
                Bu linki paylaşın — açan kişi{' '}
                <strong style={{ color: L.rowActiveText }}>{currentC.name} ({lang.toUpperCase()})</strong>{' '}
                arayüzünü görür
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  readOnly
                  value={shareUrl}
                  style={{
                    flex: 1, background: L.inputBg,
                    border: `1px solid ${L.inputBorder}`, borderRadius: 8,
                    padding: '7px 10px', color: L.rowActiveText,
                    fontSize: 11, outline: 'none', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                />
                <button
                  onClick={copyShare}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 12px', borderRadius: 8, border: 'none',
                    background: copied ? '#ecfdf5' : '#eff6ff',
                    color: copied ? '#059669' : '#1d4ed8',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    flexShrink: 0, transition: 'all .15s', fontFamily: 'inherit',
                  }}
                >
                  {copied
                    ? <><CheckCircle size={12} /> {t('topbar.copied', 'Kopyalandı!')}</>
                    : <><Copy size={12} /> Kopyala</>
                  }
                </button>
              </div>

              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <p style={{ color: L.text3, fontSize: 10, margin: 0, fontWeight: 600 }}>
                  Diğer pazarlar için linkler:
                </p>
                {[
                  { locale: 'tr_TR', label: 'Türkiye', flag: 'tr' },
                  { locale: 'de_DE', label: 'Almanya', flag: 'de' },
                  { locale: 'en_US', label: 'ABD',     flag: 'us' },
                  { locale: 'ar_AE', label: 'BAE',     flag: 'ae' },
                ].filter(x => x.locale !== locale).slice(0, 3).map(x => {
                  const url = typeof window !== 'undefined'
                    ? `${window.location.origin}${window.location.pathname}?locale=${x.locale}` : ''
                  return (
                    <div key={x.locale} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FlagImg code={x.flag} size={16} />
                      <code style={{ color: L.text2, fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {url}
                      </code>
                      <button
                        onClick={() => navigator.clipboard?.writeText(url)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: L.text3, padding: 2 }}
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
