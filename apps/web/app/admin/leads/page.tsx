'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''

function redirectLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
  }
}

const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#e2e8f0',fontSize:13,padding:'9px 12px',outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit' }
const lbl: React.CSSProperties = { display:'block',color:'#64748b',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }
const card: React.CSSProperties = { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:20,marginBottom:14 }
const sec: React.CSSProperties = { color:'#94a3b8',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14,display:'block' }

function F({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>{label}</label>
      {children}
      {error && <p style={{ color:'#f87171',fontSize:11,margin:'4px 0 0' }}>{error}</p>}
    </div>
  )
}
function G2({ children }: { children: React.ReactNode }) {
  return <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>{children}</div>
}

const COLOR_PRESETS: Record<string, { bg:string;text:string;dot:string;ring:string;name:string }> = {
  blue:    { name:'Mavi',       bg:'#EFF6FF',text:'#1D4ED8',dot:'#3B82F6',ring:'#BFDBFE' },
  yellow:  { name:'Sarı',       bg:'#FFFBEB',text:'#92400E',dot:'#F59E0B',ring:'#FDE68A' },
  cyan:    { name:'Camgöbeği',  bg:'#ECFEFF',text:'#155E75',dot:'#06B6D4',ring:'#A5F3FC' },
  emerald: { name:'Açık Yeşil', bg:'#F0FDF4',text:'#15803D',dot:'#22C55E',ring:'#BBF7D0' },
  purple:  { name:'Mor',        bg:'#FDF4FF',text:'#7E22CE',dot:'#A855F7',ring:'#E9D5FF' },
  green:   { name:'Koyu Yeşil', bg:'#DCFCE7',text:'#14532D',dot:'#16A34A',ring:'#86EFAC' },
  red:     { name:'Kırmızı',    bg:'#FEF2F2',text:'#991B1B',dot:'#EF4444',ring:'#FECACA' },
  gray:    { name:'Gri',        bg:'#F8FAFC',text:'#64748B',dot:'#94A3B8',ring:'#E2E8F0' },
  orange:  { name:'Turuncu',    bg:'#FFF7ED',text:'#9A3412',dot:'#F97316',ring:'#FED7AA' },
  pink:    { name:'Pembe',      bg:'#FDF2F8',text:'#9D174D',dot:'#EC4899',ring:'#FBCFE8' },
  custom:  { name:'Özel',       bg:'#F8FAFC',text:'#1e293b',dot:'#64748b',ring:'#e2e8f0' },
}

const DEFAULT_STATUSES = [
  { key:'new',       label:'Yeni',          color:'blue',   customBg:'',customText:'',customDot:'',customRing:'' },
  { key:'contacted', label:'İletişimde',     color:'yellow', customBg:'',customText:'',customDot:'',customRing:'' },
  { key:'qualified', label:'Nitelikli',      color:'cyan',   customBg:'',customText:'',customDot:'',customRing:'' },
  { key:'replied',   label:'Cevap Verdi',    color:'emerald',customBg:'',customText:'',customDot:'',customRing:'' },
  { key:'offered',   label:'Teklif Verildi', color:'purple', customBg:'',customText:'',customDot:'',customRing:'' },
  { key:'won',       label:'Kazanıldı',      color:'green',  customBg:'',customText:'',customDot:'',customRing:'' },
  { key:'lost',      label:'Kaybedildi',     color:'red',    customBg:'',customText:'',customDot:'',customRing:'' },
]

const ALL_COLUMNS = [
  { key:'company',  label:'Firma Adı' },
  { key:'sector',   label:'Sektör' },
  { key:'city',     label:'Şehir' },
  { key:'status',   label:'Durum' },
  { key:'score',    label:'Puan' },
  { key:'phone',    label:'Telefon' },
  { key:'email',    label:'Email' },
  { key:'source',   label:'Kaynak' },
  { key:'added',    label:'Eklenme Tarihi' },
]

const DEFAULT: Record<string,any> = {
  page_title:       'Lead Veritabanı',
  stat_today_label: 'Bugün Eklenen',
  stat_won_label:   'Kazanılan',
  stat_hot_label:   'Sıcak Lead',
  stat_total_label: 'Toplam Lead',
  statuses:         DEFAULT_STATUSES,
  score_high:       75,
  score_medium:     50,
  score_low:        30,
  score_high_color: 'green',
  score_medium_color: 'purple',
  score_low_color:  'yellow',
  hot_threshold:    75,
  default_page_size: 20,
  visible_columns:  ALL_COLUMNS.map(c=>c.key),
  default_sort:     'created_at',
  default_sort_dir: 'desc',
  feature_kv_bul:   true,
  feature_import:   true,
  feature_export:   true,
  feature_bulk_delete: true,
  feature_score_badge: true,
  feature_hot_badge:   true,
}

function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={()=>onChange(!value)} style={{ width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',padding:2,background:value?'#22c55e':'rgba(255,255,255,0.1)',transition:'background 0.2s',display:'flex',alignItems:'center',justifyContent:value?'flex-end':'flex-start' }}>
      <div style={{ width:20,height:20,borderRadius:10,background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
    </button>
  )
}

function ColorPicker({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{ display:'flex',gap:5,flexWrap:'wrap',alignItems:'center' }}>
      {Object.entries(COLOR_PRESETS).filter(([k])=>k!=='custom').map(([key,p])=>(
        <button key={key} title={p.name} onClick={()=>onChange(key)}
          style={{ width:20,height:20,borderRadius:'50%',background:p.dot,border:value===key?'2.5px solid #fff':'2px solid transparent',cursor:'pointer',outline:'none',flexShrink:0,boxShadow:value===key?'0 0 0 1px #6366f1':'none' }}/>
      ))}
    </div>
  )
}

function StatusRow({ s, idx, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }:
  { s:any; idx:number; onChange:(i:number,patch:any)=>void; onDelete:(i:number)=>void; onMoveUp:(i:number)=>void; onMoveDown:(i:number)=>void; isFirst:boolean; isLast:boolean }) {
  const [showHex, setShowHex] = useState(false)
  const preset = s.color==='custom' ? { bg:s.customBg||'#f8fafc',text:s.customText||'#1e293b',dot:s.customDot||'#64748b',ring:s.customRing||'#e2e8f0' } : (COLOR_PRESETS[s.color]||COLOR_PRESETS.gray)
  return (
    <div style={{ background:'rgba(255,255,255,0.02)',borderRadius:8,marginBottom:6,border:'1px solid rgba(255,255,255,0.05)',padding:'10px 12px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'80px 1fr auto auto',gap:10,alignItems:'center' }}>
        {/* Key */}
        <span style={{ color:'#475569',fontSize:11,fontFamily:'monospace',background:'rgba(255,255,255,0.05)',borderRadius:4,padding:'3px 7px' }}>{s.key}</span>
        {/* Label */}
        <input value={s.label} onChange={e=>onChange(idx,{label:e.target.value})} style={{...inp,padding:'6px 10px',marginBottom:0}} placeholder="Durum adı"/>
        {/* Preview */}
        <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:preset.bg,color:preset.text,fontSize:11,fontWeight:700,border:`1px solid ${preset.ring}`,whiteSpace:'nowrap',flexShrink:0 }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:preset.dot,flexShrink:0 }}/>
          {s.label||'Önizleme'}
        </span>
        {/* Actions */}
        <div style={{ display:'flex',gap:4,flexShrink:0 }}>
          <button disabled={isFirst} onClick={()=>onMoveUp(idx)} style={{ padding:'3px 7px',borderRadius:5,border:'none',background:isFirst?'transparent':'rgba(255,255,255,0.06)',color:isFirst?'#334155':'#94a3b8',cursor:isFirst?'default':'pointer',fontSize:12 }}>↑</button>
          <button disabled={isLast} onClick={()=>onMoveDown(idx)} style={{ padding:'3px 7px',borderRadius:5,border:'none',background:isLast?'transparent':'rgba(255,255,255,0.06)',color:isLast?'#334155':'#94a3b8',cursor:isLast?'default':'pointer',fontSize:12 }}>↓</button>
          <button onClick={()=>onDelete(idx)} style={{ padding:'3px 7px',borderRadius:5,border:'1px solid rgba(248,113,113,0.3)',background:'rgba(248,113,113,0.07)',color:'#f87171',cursor:'pointer',fontSize:11 }}>✕</button>
        </div>
      </div>
      {/* Color row */}
      <div style={{ marginTop:8,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
        <ColorPicker value={s.color} onChange={c=>onChange(idx,{color:c})}/>
        <button onClick={()=>{ onChange(idx,{color:'custom'}); setShowHex(!showHex) }}
          style={{ fontSize:11,color:s.color==='custom'?'#818cf8':'#64748b',background:s.color==='custom'?'rgba(99,102,241,0.1)':'transparent',border:s.color==='custom'?'1px solid rgba(99,102,241,0.3)':'1px solid rgba(255,255,255,0.06)',borderRadius:5,padding:'3px 9px',cursor:'pointer',fontFamily:'inherit' }}>
          {showHex?'Hex Kapat':'# Hex'}
        </button>
      </div>
      {(showHex || s.color==='custom') && (
        <div style={{ marginTop:8,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8 }}>
          {[['Arka Plan','customBg'],['Metin','customText'],['Nokta','customDot'],['Kenarlık','customRing']].map(([lbl,field])=>(
            <div key={field}>
              <label style={{ ...lbl as any,fontSize:9 }}>{lbl}</label>
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <input type="color" value={(s[field]||'#64748b')} onChange={e=>onChange(idx,{[field]:e.target.value,color:'custom'})}
                  style={{ width:28,height:28,borderRadius:5,border:'none',cursor:'pointer',padding:0,background:'none' }}/>
                <input value={(s[field]||'')} onChange={e=>onChange(idx,{[field]:e.target.value,color:'custom'})}
                  style={{...inp,padding:'5px 8px',fontSize:11,marginBottom:0}} placeholder="#hex"/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminLeadsPage() {
  const [cfg, setCfg]         = useState<any>(null)
  const [savedCfg, setSavedCfg] = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{type:'ok'|'err';text:string}|null>(null)
  const [dirty, setDirty]       = useState(false)
  const [errors, setErrors]     = useState<Record<string,string>>({})
  const [tab, setTab]           = useState(0)

  useEffect(() => {
    fetch(`${API}/api/admin/leads-config`, {
      headers: { Authorization:`Bearer ${getToken()}` }
    })
      .then(async r => {
        if (r.status===401||r.status===403) { redirectLogin(); return }
        const d = await r.json()
        const loaded = d.config && Object.keys(d.config).length>0
          ? { ...DEFAULT, ...d.config,
              statuses: (d.config.statuses||DEFAULT.statuses).map((s:any)=>({...{customBg:'',customText:'',customDot:'',customRing:''},...s})),
              visible_columns: d.config.visible_columns || DEFAULT.visible_columns }
          : { ...DEFAULT }
        setCfg(loaded)
        setSavedCfg(JSON.parse(JSON.stringify(loaded)))
      })
      .catch(()=>{ const d={...DEFAULT}; setCfg(d); setSavedCfg(JSON.parse(JSON.stringify(d))) })
      .finally(()=>setLoading(false))
  }, [])

  // Unsaved changes warning
  useEffect(()=>{
    const handler=(e:BeforeUnloadEvent)=>{ if(dirty){ e.preventDefault(); e.returnValue='' } }
    window.addEventListener('beforeunload',handler)
    return ()=>window.removeEventListener('beforeunload',handler)
  },[dirty])

  const set = useCallback((key:string,val:any)=>{ setCfg((c:any)=>({...c,[key]:val})); setDirty(true) },[])

  const setStatus = (idx:number,patch:any)=>{
    setCfg((c:any)=>({...c,statuses:c.statuses.map((s:any,i:number)=>i===idx?{...s,...patch}:s)}))
    setDirty(true)
  }
  const addStatus = ()=>{
    const key = `status_${Date.now()}`
    setCfg((c:any)=>({...c,statuses:[...(c.statuses||[]),{key,label:'Yeni Durum',color:'gray',customBg:'',customText:'',customDot:'',customRing:''}]}))
    setDirty(true)
  }
  const delStatus = (idx:number)=>{
    setCfg((c:any)=>({...c,statuses:(c.statuses||[]).filter((_:any,i:number)=>i!==idx)}))
    setDirty(true)
  }
  const moveStatus = (idx:number,dir:1|-1)=>{
    setCfg((c:any)=>{
      const arr=[...(c.statuses||[])];
      [arr[idx],arr[idx+dir]]=[arr[idx+dir],arr[idx]];
      return {...c,statuses:arr}
    })
    setDirty(true)
  }
  const toggleColumn = (col:string)=>{
    setCfg((c:any)=>{
      const cols:string[]=c.visible_columns||[]
      return {...c,visible_columns:cols.includes(col)?cols.filter((x:string)=>x!==col):[...cols,col]}
    })
    setDirty(true)
  }

  const validate = ()=>{
    const errs:Record<string,string>={}
    if (!cfg?.page_title?.trim()) errs.page_title='Başlık boş bırakılamaz'
    if (cfg?.score_high<=cfg?.score_medium) errs.score_high='Yüksek eşik, orta eşikten büyük olmalı'
    if (cfg?.score_medium<=cfg?.score_low) errs.score_medium='Orta eşik, düşük eşikten büyük olmalı'
    const keys=(cfg?.statuses||[]).map((s:any)=>s.key)
    if(new Set(keys).size!==keys.length) errs.statuses='Statü kodları benzersiz olmalı'
    setErrors(errs)
    return Object.keys(errs).length===0
  }

  const resetDefaults = ()=>{
    if(!confirm('Tüm ayarları varsayılana döndürmek istediğinizden emin misiniz?')) return
    setCfg({...DEFAULT})
    setDirty(true)
  }

  const save = async ()=>{
    if(!validate()) return
    setSaving(true)
    setDirty(false)
    try {
      const r=await fetch(`${API}/api/admin/leads-config`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
        body:JSON.stringify(cfg),
      })
      if(r.status===401||r.status===403){ redirectLogin(); return }
      const d=await r.json()
      if(!r.ok) throw new Error(d.error||'Kayıt başarısız')
      setSavedCfg(JSON.parse(JSON.stringify(cfg)))
      // Cache bust
      try { await fetch('/api/revalidate',{method:'POST',headers:{'x-revalidate-secret':'sovlo-revalidate-2026'}}) } catch {}
      setMsg({type:'ok',text:'✅ Kaydedildi! Lead sayfası anında güncellendi.'})
    } catch(e:any){ setDirty(true); setMsg({type:'err',text:'❌ '+e.message}) }
    finally{ setSaving(false); setTimeout(()=>setMsg(null),5000) }
  }

  if(loading||!cfg) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:'#475569',fontSize:14}}>Yükleniyor...</div>

  const TABS=['Başlıklar','Statüler','Puan Sistemi','Sütunlar','Özellikler']

  return (
    <div style={{ maxWidth:900,fontFamily:'-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:10 }}>
        <div>
          <h1 style={{ color:'#f1f5f9',fontSize:22,fontWeight:800,margin:0 }}>Lead Sayfası Editörü</h1>
          <p style={{ color:'#475569',fontSize:13,margin:'4px 0 0' }}>Durum etiketleri, puan eşikleri ve özellik kontrolleri</p>
        </div>
        <div style={{ display:'flex',gap:10,alignItems:'center' }}>
          {dirty && <span style={{ fontSize:11,color:'#fb923c',background:'rgba(251,146,60,0.1)',border:'1px solid rgba(251,146,60,0.2)',borderRadius:6,padding:'4px 10px' }}>Kaydedilmemiş değişiklik</span>}
          <button onClick={resetDefaults} style={{ padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:12,fontFamily:'inherit' }}>Sıfırla</button>
          <button onClick={save} disabled={saving} style={{ padding:'10px 22px',borderRadius:10,border:'none',background:saving?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#ef4444,#f97316)',color:'#fff',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,fontFamily:'inherit' }}>
            {saving?'Kaydediliyor...':'Kaydet & Yayınla'}
          </button>
        </div>
      </div>

      {msg && <div style={{ padding:'12px 16px',borderRadius:10,marginBottom:16,background:msg.type==='ok'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.type==='ok'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`,color:msg.type==='ok'?'#4ade80':'#f87171',fontSize:13 }}>{msg.text}</div>}
      {Object.keys(errors).length>0 && <div style={{ padding:'12px 16px',borderRadius:10,marginBottom:16,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',fontSize:13 }}>Lütfen hataları düzeltin: {Object.values(errors).join(' · ')}</div>}

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid rgba(255,255,255,0.05)',paddingBottom:0 }}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{ padding:'9px 16px',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',background:tab===i?'rgba(255,255,255,0.04)':'transparent',color:tab===i?'#e2e8f0':'#475569',borderBottom:tab===i?'2px solid #ef4444':'2px solid transparent',transition:'all 0.15s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── TAB 0: Başlıklar ─── */}
      {tab===0 && (
        <div style={card}>
          <span style={sec}>Sayfa Başlığı & İstatistik Etiketleri</span>
          <F label="Sayfa Başlığı" error={errors.page_title}>
            <input value={cfg.page_title||''} onChange={e=>set('page_title',e.target.value)} style={inp} placeholder="Lead Veritabanı"/>
          </F>
          <G2>
            <F label="Bugün Eklenen Etiketi"><input value={cfg.stat_today_label||''} onChange={e=>set('stat_today_label',e.target.value)} style={inp} placeholder="Bugün Eklenen"/></F>
            <F label="Kazanılan Etiketi"><input value={cfg.stat_won_label||''} onChange={e=>set('stat_won_label',e.target.value)} style={inp} placeholder="Kazanılan"/></F>
            <F label="Sıcak Lead Etiketi"><input value={cfg.stat_hot_label||''} onChange={e=>set('stat_hot_label',e.target.value)} style={inp} placeholder="Sıcak Lead"/></F>
            <F label="Toplam Lead Etiketi"><input value={cfg.stat_total_label||''} onChange={e=>set('stat_total_label',e.target.value)} style={inp} placeholder="Toplam Lead"/></F>
          </G2>
        </div>
      )}

      {/* ─── TAB 1: Statüler ─── */}
      {tab===1 && (
        <div>
          <div style={card}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
              <span style={{...sec,margin:0}}>Durum Etiketleri & Renkleri</span>
              <button onClick={addStatus} style={{ padding:'7px 14px',borderRadius:7,border:'1px dashed rgba(139,92,246,0.4)',background:'rgba(139,92,246,0.07)',color:'#a78bfa',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>+ Statü Ekle</button>
            </div>
            {errors.statuses && <p style={{ color:'#f87171',fontSize:12,marginBottom:10 }}>{errors.statuses}</p>}
            <div style={{ display:'grid',gridTemplateColumns:'80px 1fr auto auto',gap:10,padding:'0 12px 8px',borderBottom:'1px solid rgba(255,255,255,0.04)',marginBottom:8 }}>
              {['Kod','Görünen İsim','Önizleme',''].map((h,i)=>(<span key={i} style={{ color:'#334155',fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em' }}>{h}</span>))}
            </div>
            {(cfg.statuses||[]).map((s:any,i:number)=>(
              <StatusRow key={s.key+i} s={s} idx={i} onChange={setStatus} onDelete={delStatus}
                onMoveUp={(idx)=>moveStatus(idx,-1)} onMoveDown={(idx)=>moveStatus(idx,1)}
                isFirst={i===0} isLast={i===(cfg.statuses||[]).length-1}/>
            ))}
            {(cfg.statuses||[]).length===0 && (
              <div style={{ textAlign:'center',color:'#475569',fontSize:13,padding:'20px 0' }}>Henüz statü yok. Yukarıdan ekleyin.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: Puan Sistemi ─── */}
      {tab===2 && (
        <div>
          <div style={card}>
            <span style={sec}>Puan Eşikleri</span>
            <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:16,padding:'10px 12px',background:'rgba(255,255,255,0.02)',borderRadius:8 }}>
              {[['Yeşil','Yüksek eşiğin üzeri'],['Mor','Orta - yüksek arası'],['Sarı','Düşük - orta arası'],['Kırmızı','Düşük eşiğin altı']].map(([color,desc])=>(
                <span key={color} style={{ fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:6,background:color==='Yeşil'?'#DCFCE7':color==='Mor'?'#EDE9FE':color==='Sarı'?'#FEF3C7':'#FEE2E2',color:color==='Yeşil'?'#14532D':color==='Mor'?'#6D28D9':color==='Sarı'?'#92400E':'#991B1B' }}>{color} ({desc})</span>
              ))}
            </div>
            <G2>
              <F label={`Yüksek Eşiği (${cfg.score_high??75})`} error={errors.score_high}>
                <input type="number" min={0} max={100} value={cfg.score_high??75} onChange={e=>set('score_high',Number(e.target.value))} style={inp}/>
              </F>
              <F label={`Orta Eşiği (${cfg.score_medium??50})`} error={errors.score_medium}>
                <input type="number" min={0} max={100} value={cfg.score_medium??50} onChange={e=>set('score_medium',Number(e.target.value))} style={inp}/>
              </F>
            </G2>
            <F label={`Düşük Eşiği (${cfg.score_low??30})`}>
              <input type="number" min={0} max={100} value={cfg.score_low??30} onChange={e=>set('score_low',Number(e.target.value))} style={inp}/>
            </F>
          </div>
          <div style={card}>
            <span style={sec}>Skor Badge Renkleri</span>
            {[['score_high_color','Yüksek Skor Rengi'],['score_medium_color','Orta Skor Rengi'],['score_low_color','Düşük Skor Rengi']].map(([field,label])=>(
              <div key={field} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                <span style={{ color:'#94a3b8',fontSize:13,fontWeight:600 }}>{label}</span>
                <ColorPicker value={cfg[field]||'gray'} onChange={v=>set(field,v)}/>
              </div>
            ))}
          </div>
          <div style={card}>
            <span style={sec}>Sıcak Lead & Sayfa Boyutu</span>
            <G2>
              <F label={`Sıcak Lead Eşiği (${cfg.hot_threshold??75})`}>
                <input type="number" min={0} max={100} value={cfg.hot_threshold??75} onChange={e=>set('hot_threshold',Number(e.target.value))} style={inp}/>
                <p style={{ color:'#475569',fontSize:11,marginTop:4 }}>Bu puan ve üzeri "Sıcak Lead" sayılır</p>
              </F>
              <F label="Varsayılan Sayfa Boyutu">
                <select value={cfg.default_page_size??20} onChange={e=>set('default_page_size',Number(e.target.value))} style={{...inp,cursor:'pointer'}}>
                  {[10,20,50,100].map(n=><option key={n} value={n}>{n} lead / sayfa</option>)}
                </select>
              </F>
              <F label="Varsayılan Sıralama">
                <select value={cfg.default_sort||'created_at'} onChange={e=>set('default_sort',e.target.value)} style={{...inp,cursor:'pointer'}}>
                  {[['created_at','Eklenme Tarihi'],['score','Lead Puanı'],['company_name','Firma Adı'],['status','Durum']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </F>
              <F label="Sıralama Yönü">
                <select value={cfg.default_sort_dir||'desc'} onChange={e=>set('default_sort_dir',e.target.value)} style={{...inp,cursor:'pointer'}}>
                  <option value="desc">Azalan (yeniden eskiye)</option>
                  <option value="asc">Artan (eskiden yeniye)</option>
                </select>
              </F>
            </G2>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Sütunlar ─── */}
      {tab===3 && (
        <div style={card}>
          <span style={sec}>Tablo Sütun Görünürlüğü</span>
          <p style={{ color:'#475569',fontSize:12,marginBottom:14 }}>Hangi sütunların tabloda görüneceğini seçin.</p>
          {ALL_COLUMNS.map(col=>(
            <div key={col.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p style={{ color:'#e2e8f0',fontSize:13,fontWeight:600,margin:0 }}>{col.label}</p>
                <p style={{ color:'#475569',fontSize:11,margin:'2px 0 0' }}>Sütun kodu: <span style={{ fontFamily:'monospace',color:'#64748b' }}>{col.key}</span></p>
              </div>
              <Toggle value={(cfg.visible_columns||[]).includes(col.key)} onChange={()=>toggleColumn(col.key)}/>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 4: Özellikler ─── */}
      {tab===4 && (
        <div style={card}>
          <span style={sec}>Özellik Kontrolleri (Feature Flags)</span>
          {[
            {key:'feature_kv_bul',label:'Karar Verici Bul (KV Bul)',desc:'AI ile karar verici bulma butonu'},
            {key:'feature_import',label:'Excel / CSV İçe Aktar',desc:'Toplu lead yükleme'},
            {key:'feature_export',label:'Excel / CSV Dışa Aktar',desc:'Leadleri Excel olarak indirme'},
            {key:'feature_bulk_delete',label:'Toplu Silme',desc:'Birden fazla lead silebilme'},
            {key:'feature_score_badge',label:'Puan Göstergesi',desc:'Lead kartlarında renk kodlu puan rozeti'},
            {key:'feature_hot_badge',label:'Sıcak Lead Rozeti',desc:'Yüksek puanlı leadler için alev ikonu'},
          ].map(({key,label,desc})=>(
            <div key={key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p style={{ color:'#e2e8f0',fontSize:13,fontWeight:600,margin:0 }}>{label}</p>
                <p style={{ color:'#475569',fontSize:11,margin:'2px 0 0' }}>{desc}</p>
              </div>
              <Toggle value={cfg[key]!==false} onChange={v=>set(key,v)}/>
            </div>
          ))}
        </div>
      )}

      {/* Alt kaydet */}
      <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:8 }}>
        {dirty && <span style={{ fontSize:11,color:'#fb923c',alignSelf:'center',background:'rgba(251,146,60,0.1)',border:'1px solid rgba(251,146,60,0.2)',borderRadius:6,padding:'4px 10px' }}>Kaydedilmemiş değişiklik var</span>}
        <button onClick={save} disabled={saving} style={{ padding:'12px 28px',borderRadius:10,border:'none',background:saving?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#ef4444,#f97316)',color:'#fff',fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,fontFamily:'inherit' }}>
          {saving?'Kaydediliyor...':'Kaydet & Yayınla'}
        </button>
      </div>
    </div>
  )
}
