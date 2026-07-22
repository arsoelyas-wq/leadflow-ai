'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  Search, Plus, Trash2, ExternalLink, Crosshair, RefreshCw, Target,
  Download, Flame, Globe, ChevronDown, ChevronUp, Copy, CheckCircle2, X,
  Instagram, Users, TrendingUp, Zap, SlidersHorizontal, Phone, Star, MapPin, ChevronsUpDown,
} from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  contact_name?: string
  phone?: string
  email?: string
  instagram?: string
  facebook?: string
  linkedin_url?: string
  youtube?: string
  twitter?: string
  website?: string
  city?: string
  sector?: string
  source: string
  score: number
  ai_grade?: string
  hot_score?: number
  rating?: number
  review_count?: number
  status: string
  created_at: string
  maps_url?: string
}

/* ─── Avatar ─────────────────────────────────────────────────── */
const AV = [
  ['#EEF2FF','#4338CA'], ['#F0FDF4','#15803D'], ['#FFF7ED','#C2410C'],
  ['#FDF4FF','#7E22CE'], ['#ECFDF5','#065F46'], ['#EFF6FF','#1D4ED8'],
  ['#FEF3C7','#92400E'], ['#FCE7F3','#9D174D'], ['#F0F9FF','#0369A1'],
  ['#F7FEE7','#3F6212'],
]
function av(name: string) { return AV[(name.charCodeAt(0)+(name.charCodeAt(1)||0)) % AV.length] }

/* ─── Status ─────────────────────────────────────────────────── */
const COLOR_PRESETS: Record<string,{bg:string;text:string;dot:string;ring:string}> = {
  blue:    {bg:'#EFF6FF',text:'#1D4ED8',dot:'#3B82F6',ring:'#BFDBFE'},
  yellow:  {bg:'#FFFBEB',text:'#92400E',dot:'#F59E0B',ring:'#FDE68A'},
  cyan:    {bg:'#ECFEFF',text:'#155E75',dot:'#06B6D4',ring:'#A5F3FC'},
  emerald: {bg:'#F0FDF4',text:'#15803D',dot:'#22C55E',ring:'#BBF7D0'},
  purple:  {bg:'#FDF4FF',text:'#7E22CE',dot:'#A855F7',ring:'#E9D5FF'},
  green:   {bg:'#DCFCE7',text:'#14532D',dot:'#16A34A',ring:'#86EFAC'},
  red:     {bg:'#FEF2F2',text:'#991B1B',dot:'#EF4444',ring:'#FECACA'},
  gray:    {bg:'#F8FAFC',text:'#64748B',dot:'#94A3B8',ring:'#E2E8F0'},
}
const ST: Record<string,{label:string;bg:string;text:string;dot:string;ring:string}> = {
  new:       {label:'Yeni',           ...COLOR_PRESETS.blue},
  contacted: {label:'İletişimde',     ...COLOR_PRESETS.yellow},
  qualified: {label:'Nitelikli',      ...COLOR_PRESETS.cyan},
  replied:   {label:'Cevap Verdi',    ...COLOR_PRESETS.emerald},
  offered:   {label:'Teklif Verildi', ...COLOR_PRESETS.purple},
  won:       {label:'Kazanıldı',      ...COLOR_PRESETS.green},
  lost:      {label:'Kaybedildi',     ...COLOR_PRESETS.red},
}
const SK = ['new','contacted','qualified','replied','offered','won','lost']

function StatusPill({ status, onChange, stMap }: { status: string; onChange:(s:string)=>void; stMap?: typeof ST }) {
  const [open,setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const map = stMap || ST
  const s = map[status] || {label:status,bg:'#F1F5F9',text:'#475569',dot:'#94A3B8',ring:'#E2E8F0'}
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)}
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  },[])
  return (
    <div ref={ref} className="relative">
      <button onClick={()=>setOpen(o=>!o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer whitespace-nowrap hover:brightness-95 transition-all"
        style={{background:s.bg,color:s.text,borderColor:s.ring}}>
        <span className="w-1.5 h-1.5 rounded-full" style={{background:s.dot}}/>
        {s.label}
        <ChevronDown size={9} style={{opacity:.6}}/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[170px]">
          {Object.keys(map).map(k=>{const c=map[k]; return (
            <button key={k} onClick={()=>{onChange(k);setOpen(false)}}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors text-left">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:c.dot}}/>
              <span style={{color:k===status?c.text:'#64748B'}} className={k===status?'font-semibold':''}>{c.label}</span>
            </button>
          )})}
        </div>
      )}
    </div>
  )
}

/* ─── Source ─────────────────────────────────────────────────── */
function SourceBadge({source}:{source:string}) {
  const s=(source||'').toLowerCase()
  const c = s.includes('apify')||s.includes('google') ? {l:'Google Maps',bg:'#EFF6FF',t:'#1D4ED8',b:'#BFDBFE'}
    : s.includes('osm')      ? {l:'OpenStreetMap',bg:'#F0FDF4',t:'#15803D',b:'#BBF7D0'}
    : s.includes('yelp')     ? {l:'Yelp',         bg:'#FEF2F2',t:'#991B1B',b:'#FECACA'}
    : s.includes('here')     ? {l:'HERE',          bg:'#ECFEFF',t:'#155E75',b:'#A5F3FC'}
    : s.includes('registry') ? {l:'Sicil',         bg:'#FDF4FF',t:'#7E22CE',b:'#E9D5FF'}
    : {l:source,bg:'#F8FAFC',t:'#64748B',b:'#E2E8F0'}
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap"
    style={{background:c.bg,color:c.t,borderColor:c.b}}>{c.l}</span>
}

/* ─── Score ──────────────────────────────────────────────────── */
const SCORE_COLOR_MAP: Record<string,{bg:string;t:string;b:string}> = {
  green:   {bg:'#DCFCE7',t:'#15803D',b:'#BBF7D0'},
  emerald: {bg:'#D1FAE5',t:'#065F46',b:'#A7F3D0'},
  purple:  {bg:'#EDE9FE',t:'#6D28D9',b:'#DDD6FE'},
  blue:    {bg:'#DBEAFE',t:'#1E40AF',b:'#BFDBFE'},
  yellow:  {bg:'#FEF3C7',t:'#92400E',b:'#FDE68A'},
  orange:  {bg:'#FFEDD5',t:'#9A3412',b:'#FED7AA'},
  red:     {bg:'#FEE2E2',t:'#991B1B',b:'#FECACA'},
  gray:    {bg:'#F1F5F9',t:'#475569',b:'#CBD5E1'},
  cyan:    {bg:'#CFFAFE',t:'#155E75',b:'#A5F3FC'},
}

function ScoreBadge({score, thresholds, colors}:{score:number; thresholds?:{high:number;medium:number;low:number}; colors?:{high:string;medium:string;low:string}}) {
  const h = thresholds?.high ?? 75, m = thresholds?.medium ?? 50, l = thresholds?.low ?? 30
  const hc = SCORE_COLOR_MAP[colors?.high||'green']||SCORE_COLOR_MAP.green
  const mc = SCORE_COLOR_MAP[colors?.medium||'purple']||SCORE_COLOR_MAP.purple
  const lc = SCORE_COLOR_MAP[colors?.low||'yellow']||SCORE_COLOR_MAP.yellow
  const fc = {bg:'#FEE2E2',t:'#991B1B',b:'#FECACA'}
  const c = score>=h ? hc : score>=m ? mc : score>=l ? lc : fc
  return <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg text-xs font-bold border"
    style={{background:c.bg,color:c.t,borderColor:c.b}}>{score}</span>
}

/* ─── Social icons ───────────────────────────────────────────── */
const Fb=()=><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07z"/></svg>
const Li=()=><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
const Yt=()=><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.6 12 3.6 12 3.6s-7.55 0-9.38.46A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 11.87 0 11.87s0 3.84.5 5.68a3.02 3.02 0 0 0 2.12 2.14C4.45 20.14 12 20.14 12 20.14s7.55 0 9.38-.45a3.02 3.02 0 0 0 2.12-2.14c.5-1.84.5-5.68.5-5.68s0-3.84-.5-5.68zM9.54 15.57V8.17l6.28 3.7-6.28 3.7z"/></svg>
const Tw=()=><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>

function Socials({lead}:{lead:Lead}) {
  const items=[
    lead.facebook    &&{href:lead.facebook,icon:<Fb/>,bg:'#1877F2',t:'Facebook'},
    lead.instagram   &&{href:lead.instagram.startsWith('http')?lead.instagram:`https://instagram.com/${lead.instagram.replace('@','')}`,icon:<Instagram size={10}/>,bg:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',t:'Instagram'},
    lead.youtube     &&{href:lead.youtube,icon:<Yt/>,bg:'#FF0000',t:'YouTube'},
    lead.linkedin_url&&{href:lead.linkedin_url,icon:<Li/>,bg:'#0A66C2',t:'LinkedIn'},
    lead.twitter     &&{href:lead.twitter,icon:<Tw/>,bg:'#000',t:'X'},
  ].filter(Boolean) as {href:string;icon:React.ReactNode;bg:string;t:string}[]
  if(!items.length) return <span className="text-slate-300">—</span>
  return (
    <div className="flex items-center gap-1">
      {items.map(({href,icon,bg,t})=>(
        <a key={t} href={href} target="_blank" rel="noreferrer" title={t}
          className="w-5 h-5 rounded flex items-center justify-center text-white hover:scale-110 transition-transform"
          style={{background:bg}}>{icon}</a>
      ))}
    </div>
  )
}

/* ─── Copy btn ───────────────────────────────────────────────── */
function Cp({v}:{v:string}) {
  const [ok,setOk]=useState(false)
  return <button onClick={()=>{navigator.clipboard.writeText(v).catch(()=>{});setOk(true);setTimeout(()=>setOk(false),1400)}}
    className="opacity-0 group-hover/row:opacity-100 transition-opacity ml-1.5 text-slate-400 hover:text-indigo-600">
    {ok?<CheckCircle2 size={11} className="text-emerald-500"/>:<Copy size={11}/>}
  </button>
}

/* ─── Excel / CSV Import Modal ───────────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

function ExcelImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (count: number) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setFile(null); setResult(null); setError('') }
  useEffect(() => { if (open) reset() }, [open])

  const handleFile = (f: File) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name)
    if (!ok) { setError('Sadece .xlsx, .xls veya .csv dosyası yükleyebilirsiniz'); return }
    if (f.size > 10 * 1024 * 1024) { setError('Dosya boyutu 10 MB\'ı geçemez'); return }
    setFile(f); setError('')
  }

  const upload = async () => {
    if (!file) return
    setUploading(true); setError(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
      const r = await fetch(`${API_BASE}/api/leads/import`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Yükleme başarısız')
      setResult(d)
    } catch (e: any) { setError(e.message) }
    setUploading(false)
  }

  const downloadTemplate = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
    const a = document.createElement('a')
    a.href = `${API_BASE}/api/leads/import/template`
    a.download = 'sovlo_lead_sablonu.xlsx'
    // Bearer token — fetch ile indir
    fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(b => { const url = URL.createObjectURL(b); a.href = url; a.click(); URL.revokeObjectURL(url) })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" style={{ animation: 'slideInUp 0.25s cubic-bezier(0.22,1,0.36,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Download size={16} className="text-emerald-600 rotate-180"/>
            </div>
            <div>
              <h2 className="text-slate-900 font-bold text-base">Excel / CSV ile İçe Aktar</h2>
              <p className="text-slate-400 text-xs">Toplu lead yükleme — maks 2.000 satır</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={16}/></button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Şablon indir */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <div>
              <p className="text-indigo-800 text-sm font-semibold">Şablon Excel indir</p>
              <p className="text-indigo-500 text-xs mt-0.5">Doğru kolon başlıklarını görmek için</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <Download size={12}/> İndir
            </button>
          </div>

          {/* Desteklenen kolonlar */}
          <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-slate-500 text-xs font-semibold mb-2">Tanınan kolon başlıkları:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Firma Adı','İlgili Kişi','Telefon','E-posta','Website','Şehir','Sektör','Kaynak','Notlar','Puan','Instagram','LinkedIn'].map(c => (
                <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600">{c}</span>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-indigo-400 bg-indigo-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}/>

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-emerald-600"/>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-800 font-semibold text-sm">{file.name}</p>
                    <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(0)} KB · Yüklenmeye hazır</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset() }} className="ml-auto text-slate-400 hover:text-slate-600"><X size={14}/></button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Download size={22} className="text-slate-400 rotate-180"/>
                  </div>
                  <p className="text-slate-700 font-semibold text-sm mb-1">Dosyayı buraya sürükleyin</p>
                  <p className="text-slate-400 text-xs">veya tıklayın · Excel (.xlsx, .xls) ve CSV desteklenir</p>
                </>
              )}
            </div>
          )}

          {/* Sonuç */}
          {result && (
            <div className="space-y-3" style={{ animation: 'slideInUp 0.2s ease-out' }}>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{result.inserted}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">Eklendi</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <div className="text-2xl font-bold text-amber-700">{result.skipped}</div>
                  <div className="text-xs text-amber-600 mt-0.5">Atlandı</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.total}</div>
                  <div className="text-xs text-blue-600 mt-0.5">Toplam Satır</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-800 text-xs font-semibold mb-1.5">Atlanan satırlar:</p>
                  {result.errors.slice(0, 5).map((e: any) => (
                    <p key={e.row} className="text-amber-700 text-xs">• Satır {e.row}: {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <X size={14} className="shrink-0"/>{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {result ? (
            <>
              <button onClick={reset} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">Yeni Dosya</button>
              <button onClick={() => { onDone(result.inserted); onClose() }}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                <CheckCircle2 size={14}/> Tamamla
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">İptal</button>
              <button onClick={upload} disabled={!file || uploading}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: file && !uploading ? 'linear-gradient(135deg,#059669,#0d9488)' : '#e2e8f0' }}>
                {uploading ? <><RefreshCw size={14} className="animate-spin"/>Yükleniyor...</> : <><Download size={14} className="rotate-180"/>İçe Aktar</>}
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}

/* ─── Manuel Müşteri Ekleme Drawer ──────────────────────────────── */
const SOURCES = ['Manuel','WhatsApp Gelen','Google Maps','Instagram','Facebook','LinkedIn','Website Formu','Referans','Soğuk Arama','Fuar / Etkinlik','Diğer']
const STATUS_OPTS = ['new','contacted','qualified','replied','offered','won','lost']

function AddLeadDrawer({
  open, onClose, onSaved, sectors, stMap: drawerStMap,
}:{open:boolean; onClose:()=>void; onSaved:(lead:any)=>void; sectors:string[]; stMap?: typeof ST}) {
  const stMap = drawerStMap || ST
  const [form,setForm]=useState({
    company_name:'', contact_name:'', phone:'', email:'', website:'',
    city:'', sector:'', source:'Manuel', status:'new', notes:'', score:50,
    instagram:'', linkedin_url:'',
  })
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [customSector,setCustomSector]=useState(false)
  const firstRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{ if(open){ setForm({company_name:'',contact_name:'',phone:'',email:'',website:'',city:'',sector:'',source:'Manuel',status:'new',notes:'',score:50,instagram:'',linkedin_url:''}); setError(''); setCustomSector(false); setTimeout(()=>firstRef.current?.focus(),80) } },[open])

  const set=(k:string,v:any)=>setForm(p=>({...p,[k]:v}))

  const [dupWarning,setDupWarning]=useState<any>(null)

  const save=async(force=false)=>{
    if(!form.company_name.trim()){setError('Firma adı zorunlu'); return}
    setSaving(true); setError(''); setDupWarning(null)
    try {
      const res=await api.post('/api/leads',{...form,company_name:form.company_name.trim(),force})
      onSaved(res.lead)
    } catch(e:any){
      if(e.response?.status===409||e.message?.includes('duplicate')){
        const data=e.response?.data||{}
        setDupWarning(data)
      } else { setError(e.message||'Kayıt başarısız') }
    }
    setSaving(false)
  }

  const inp='w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all'
  const label='block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide'

  if(!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}/>

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col"
        style={{animation:'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
              <Plus size={16} className="text-white"/>
            </div>
            <div>
              <h2 className="text-slate-900 font-bold text-base leading-tight">Manuel Müşteri Ekle</h2>
              <p className="text-slate-400 text-xs">Tüm alanları doldurmanıza gerek yok</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Temel bilgiler */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Firma Bilgileri</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Firma Adı <span className="text-red-400 normal-case tracking-normal font-normal">*</span></label>
                <input ref={firstRef} value={form.company_name} onChange={e=>set('company_name',e.target.value)}
                  placeholder="Ör: Acme Teknoloji A.Ş." className={inp}
                  onKeyDown={e=>e.key==='Enter'&&save()}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Şehir</label>
                  <input value={form.city} onChange={e=>set('city',e.target.value)} placeholder="İstanbul" className={inp}/>
                </div>
                <div>
                  <label className={label}>Sektör</label>
                  {customSector ? (
                    <div className="relative">
                      <input value={form.sector} onChange={e=>set('sector',e.target.value)} placeholder="Sektör yaz..." className={inp} autoFocus/>
                      <button onClick={()=>{setCustomSector(false);set('sector','')}} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12}/></button>
                    </div>
                  ) : (
                    <select value={form.sector} onChange={e=>{ if(e.target.value==='__custom__'){setCustomSector(true);set('sector','')} else set('sector',e.target.value) }}
                      className={inp+' cursor-pointer'}>
                      <option value="">Seç veya yaz</option>
                      {sectors.map(s=><option key={s} value={s}>{s}</option>)}
                      <option value="__custom__">+ Yeni sektör...</option>
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className={label}>Website</label>
                <input value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://example.com" className={inp} type="url"/>
              </div>
            </div>
          </div>

          {/* İletişim */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">İletişim</p>
            <div className="space-y-3">
              <div>
                <label className={label}>İlgili Kişi</label>
                <input value={form.contact_name} onChange={e=>set('contact_name',e.target.value)} placeholder="Ahmet Yılmaz" className={inp}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Telefon</label>
                  <input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+90 5XX XXX XX XX" className={inp} type="tel"/>
                </div>
                <div>
                  <label className={label}>E-posta</label>
                  <input value={form.email} onChange={e=>set('email',e.target.value)} placeholder="info@example.com" className={inp} type="email"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Instagram</label>
                  <input value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="@kullanici" className={inp}/>
                </div>
                <div>
                  <label className={label}>LinkedIn</label>
                  <input value={form.linkedin_url} onChange={e=>set('linkedin_url',e.target.value)} placeholder="linkedin.com/..." className={inp}/>
                </div>
              </div>
            </div>
          </div>

          {/* CRM Bilgileri */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">CRM</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Kaynak</label>
                  <select value={form.source} onChange={e=>set('source',e.target.value)} className={inp+' cursor-pointer'}>
                    {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Başlangıç Durumu</label>
                  <select value={form.status} onChange={e=>set('status',e.target.value)} className={inp+' cursor-pointer'}>
                    {Object.keys(stMap).map((s:string)=><option key={s} value={s}>{stMap[s]?.label||s}</option>)}
                  </select>
                </div>
              </div>

              {/* Puan slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={label.replace('mb-1.5','')}>Lead Puanı</label>
                  <span className="text-sm font-bold" style={{color: form.score>=70?'#16A34A':form.score>=40?'#D97706':'#DC2626'}}>{form.score}</span>
                </div>
                <input type="range" min={0} max={100} value={form.score} onChange={e=>set('score',Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 rounded-full cursor-pointer"/>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Soğuk</span><span>Orta</span><span>Sıcak</span>
                </div>
              </div>

              <div>
                <label className={label}>Notlar</label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3}
                  placeholder="Bu lead hakkında önemli notlar..."
                  className={inp+' resize-none'}/>
              </div>
            </div>
          </div>

          {/* Duplicate uyarısı */}
          {dupWarning && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-800 text-sm font-semibold mb-1">⚠️ Benzer Lead Var</p>
              <p className="text-amber-700 text-xs mb-3">"{dupWarning.existing?.company_name}" adlı lead zaten kayıtlı.</p>
              <div className="flex gap-2">
                <button onClick={()=>setDupWarning(null)} className="flex-1 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600">İptal</button>
                <button onClick={()=>{setDupWarning(null);save(true)}} className="flex-1 py-1.5 text-xs bg-amber-600 text-white rounded-lg font-semibold">Yine de Ekle</button>
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <X size={14} className="shrink-0"/>{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
              İptal
            </button>
            <button onClick={()=>save(false)} disabled={saving||!form.company_name.trim()}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{background:form.company_name.trim()?'linear-gradient(135deg,#4F46E5,#7C3AED)':'#e2e8f0'}}>
              {saving?<><RefreshCw size={14} className="animate-spin"/>Kaydediliyor...</>:<><Plus size={14}/>Müşteri Ekle</>}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-2">Enter tuşu ile de kaydedebilirsiniz</p>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

/* ─── Delete modal ───────────────────────────────────────────── */
function DeleteModal({count,onConfirm,onCancel}:{count:number;onConfirm:()=>void;onCancel:()=>void}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
            <Trash2 size={16} className="text-red-500"/>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={16}/></button>
        </div>
        <p className="text-slate-900 font-semibold mb-1">Lead'leri Sil</p>
        <p className="text-slate-500 text-sm mb-6">Seçili <span className="text-slate-900 font-medium">{count} lead</span> çöp kutusuna taşınacak. Daha sonra geri alabilirsiniz.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">İptal</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">Sil</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({icon:Icon,value,label,iconBg,iconColor}:{icon:any;value:number;label:string;iconBg:string;iconColor:string}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:iconBg}}>
        <Icon size={18} style={{color:iconColor}}/>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-none">{value.toLocaleString('tr-TR')}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

/* ─── Column headers ─────────────────────────────────────────── */
function TH({children,className=''}:{children:React.ReactNode;className?:string}) {
  return <th className={`px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap ${className}`}>{children}</th>
}
function SortTH({col,children,sortBy,sortDir,onSort}:{col:string;children:React.ReactNode;sortBy:string;sortDir:string;onSort:(c:string)=>void}) {
  const active=sortBy===col
  return (
    <th onClick={()=>onSort(col)} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-slate-600 select-none">
      <span className="inline-flex items-center gap-1">
        {children}
        {active?(sortDir==='asc'?<ChevronUp size={10} className="text-indigo-500"/>:<ChevronDown size={10} className="text-indigo-500"/>):<ChevronsUpDown size={10} className="opacity-40"/>}
      </span>
    </th>
  )
}

const PAGE_SIZES=[20,50,100]

/* ─── Main ───────────────────────────────────────────────────── */
export default function LeadsPage() {
  const {t} = useI18n()
  const isMobile = useIsMobile()

  // ── Admin config ──────────────────────────────────────────────
  const [ldCfg, setLdCfg] = useState<any>(null)
  useEffect(() => {
    fetch(`${API_BASE}/api/leads-config`)
      .then(r => r.json())
      .then(d => {
        if (d.config) {
          setLdCfg(d.config)
          if (d.config.default_page_size) setPageSize(d.config.default_page_size)
        }
      })
      .catch(() => {})
  }, [])
  const stMap = useMemo(() => {
    if (!ldCfg?.statuses?.length) return ST
    return Object.fromEntries(
      ldCfg.statuses.map((s: any) => [s.key, { label: s.label, ...(COLOR_PRESETS[s.color] || COLOR_PRESETS.gray) }])
    ) as typeof ST
  }, [ldCfg])
  const scoreThresholds = useMemo(() => ({
    high: ldCfg?.score_high ?? 75, medium: ldCfg?.score_medium ?? 50, low: ldCfg?.score_low ?? 30,
  }), [ldCfg])
  const hotThreshold      = ldCfg?.hot_threshold ?? 75
  const featureKvBul      = ldCfg?.feature_kv_bul !== false
  const featureImport     = ldCfg?.feature_import !== false
  const featureExport     = ldCfg?.feature_export !== false
  const featureBulkDelete = ldCfg?.feature_bulk_delete !== false
  const featureScoreBadge = ldCfg?.feature_score_badge !== false
  const featureHotBadge   = ldCfg?.feature_hot_badge !== false
  const pageTitle         = ldCfg?.page_title || 'Müşteri Veritabanı'
  const statTodayLabel    = ldCfg?.stat_today_label || 'Bugün Eklenen'
  const statWonLabel      = ldCfg?.stat_won_label || 'Kazanılan'
  const statHotLabel      = ldCfg?.stat_hot_label || 'Sıcak Müşteri'
  const statTotalLabel    = ldCfg?.stat_total_label || 'Toplam Müşteri'
  const visibleCols       = ldCfg?.visible_columns || null
  const scoreHighColor    = ldCfg?.score_high_color || 'green'
  const scoreMedColor     = ldCfg?.score_medium_color || 'purple'
  const scoreLowColor     = ldCfg?.score_low_color || 'yellow'
  // ─────────────────────────────────────────────────────────────

  const [leads,setLeads]=useState<Lead[]>([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [status,setStatus]=useState('')
  const [sector,setSector]=useState('')
  const [grade,setGrade]=useState('')
  const [sectors,setSectors]=useState<string[]>([])
  const [page,setPage]=useState(1)
  const [pageSize,setPageSize]=useState(20)
  const [selected,setSelected]=useState<string[]>([])
  const [findingDM,setFindingDM]=useState<string|null>(null)
  const [bulkRunning,setBulkRunning]=useState(false)
  const [bulkProg,setBulkProg]=useState<{c:number;t:number}|null>(null)
  const [msg,setMsg]=useState<{type:'success'|'error';text:string}|null>(null)
  const [exporting,setExporting]=useState(false)
  const [list,setList]=useState('')
  const [lists,setLists]=useState<string[]>([])
  const [showDel,setShowDel]=useState(false)
  const [showFilters,setShowFilters]=useState(false)
  const [showAddLead,setShowAddLead]=useState(false)
  const [showImport,setShowImport]=useState(false)
  const [showTrash,setShowTrash]=useState(false)
  const [trashLeads,setTrashLeads]=useState<Lead[]>([])
  const [trashTotal,setTrashTotal]=useState(0)
  const [pipelineStats,setPipelineStats]=useState<any>(null)
  const [showPipeline,setShowPipeline]=useState(false)
  const [segments,setSegments]=useState<any[]>([])
  const [segmentName,setSegmentName]=useState('')
  const [showSaveSegment,setShowSaveSegment]=useState(false)
  const [loadingAI,setLoadingAI]=useState<string|null>(null)
  const [nextActions,setNextActions]=useState<Record<string,{action:string;timing:string;reason:string}>>({})
  const [duplicateWarning,setDuplicateWarning]=useState<any>(null)
  const [sortBy,setSortBy]=useState('created_at')
  const [sortDir,setSortDir]=useState('desc')
  const [selectAllTotal,setSelectAllTotal]=useState(false)

  const toast=(type:'success'|'error',text:string)=>{setMsg({type,text});setTimeout(()=>setMsg(null),4000)}

  const load=async()=>{
    setLoading(true)
    try {
      const p=new URLSearchParams({page:String(page),limit:String(pageSize),sortBy,sortDir})
      if(search)p.set('search',search);if(status)p.set('status',status)
      if(sector)p.set('sector',sector);if(grade)p.set('grade',grade)
      if(list)p.set('list',list)
      const d=await api.get(`/api/leads?${p}`)
      setLeads(d.leads);setTotal(d.total)
    } catch {setLeads([])} finally {setLoading(false)}
  }

  useEffect(()=>{api.get('/api/leads/sectors').then(d=>setSectors(d.sectors||[])).catch(()=>{})},[])
  useEffect(()=>{api.get('/api/leads/lists').then(d=>setLists(d.lists||[])).catch(()=>{})},[])
  useEffect(()=>{load()},[page,pageSize,status,sector,grade,list,sortBy,sortDir])
  useEffect(()=>{const t=setTimeout(load,380);return ()=>clearTimeout(t)},[search])

  // Çöp kutusu yükle
  const loadTrash=async()=>{
    try{const d=await api.get('/api/leads?trash=true&limit=100');setTrashLeads(d.leads||[]);setTrashTotal(d.total||0)}catch{}
  }
  useEffect(()=>{if(showTrash)loadTrash()},[showTrash])

  // Pipeline stats
  const loadPipelineStats=async()=>{
    try{const d=await api.get('/api/leads/pipeline/stats');setPipelineStats(d)}catch{}
  }
  useEffect(()=>{loadPipelineStats()},[]) // Stat kartlar için sayfa açılışında yükle
  useEffect(()=>{if(showPipeline)loadPipelineStats()},[showPipeline])

  // Segments
  useEffect(()=>{api.get('/api/leads/segments').then(d=>setSegments(d.segments||[])).catch(()=>{})},[])

  // AI Sonraki Adım
  const loadNextAction=async(leadId:string)=>{
    if(nextActions[leadId]||loadingAI===leadId)return
    setLoadingAI(leadId)
    try{const d=await api.get(`/api/leads/${leadId}/next-action`);setNextActions(p=>({...p,[leadId]:d}))}catch{}
    setLoadingAI(null)
  }

  // Restore from trash
  const restoreLead=async(id:string)=>{
    try{await api.post(`/api/leads/restore/${id}`,{});loadTrash();toast('success','Lead geri alındı')}catch(e:any){toast('error',e.message)}
  }

  // Permanent delete
  const permanentDelete=async(ids:string[])=>{
    try{await api.post('/api/leads/trash/empty',{ids});loadTrash();toast('success',`${ids.length} lead kalıcı silindi`)}catch(e:any){toast('error',e.message)}
  }

  // Save smart segment
  const saveSegment=async()=>{
    if(!segmentName.trim())return
    const filters:any={}
    if(status)filters.status=status;if(sector)filters.sector=sector;if(grade)filters.grade=grade;if(search)filters.search=search
    try{await api.post('/api/leads/segments',{name:segmentName.trim(),filters,icon:'🎯'});setSegmentName('');setShowSaveSegment(false);api.get('/api/leads/segments').then(d=>setSegments(d.segments||[]));toast('success','Segment kaydedildi')}catch(e:any){toast('error',e.message)}
  }

  // Load a saved segment
  const applySegment=(seg:any)=>{
    const f=seg.filters||{}
    if(f.status!==undefined)setStatus(f.status)
    if(f.sector!==undefined)setSector(f.sector)
    if(f.grade!==undefined)setGrade(f.grade)
    if(f.search!==undefined)setSearch(f.search)
    setPage(1)
  }

  const handleSort=(col:string)=>{
    if(sortBy===col){setSortDir(d=>d==='asc'?'desc':'asc')}
    else{setSortBy(col);setSortDir('desc')}
    setPage(1);setSelectAllTotal(false)
  }

  const toggleSel=(id:string)=>{setSelectAllTotal(false);setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
  const allSel=leads.length>0&&selected.length===leads.length

  const bulkDelete=async()=>{
    // Soft delete — geri alınabilir çöp kutusuna gönder
    await Promise.all(selected.map(id=>api.delete(`/api/leads/${id}`)))
    setSelected([]);setShowDel(false);load();setTrashTotal(t=>t+selected.length)
    toast('success',`${selected.length} lead çöp kutusuna taşındı (geri alınabilir)`)
  }
  const bulkStatus=async(ns:string)=>{
    await api.post('/api/leads/bulk-status',{ids:selected,status:ns})
    setSelected([]);load()
  }
  const changeStatus=async(lead:Lead,ns:string)=>{
    try{
      await api.patch(`/api/leads/${lead.id}`,{status:ns})
      setLeads(ls=>ls.map(l=>l.id===lead.id?{...l,status:ns}:l))
    }catch(e:any){toast('error',e.message)}
  }
  const findPhone=async(lead:Lead)=>{
    setFindingDM(lead.id+'_ph')
    try{
      const d=await api.post('/api/persons/find-phone',{companyName:lead.company_name,website:lead.website||'',city:lead.city||'',leadId:lead.id})
      if(d.bestPhone){toast('success',`${lead.company_name}: ${d.bestPhone}`);load()}
      else toast('error',`${lead.company_name}: Telefon bulunamadı`)
    }catch(e:any){toast('error',e.message)}
    finally{setFindingDM(null)}
  }
  const findDM=async(lead:Lead)=>{
    setFindingDM(lead.id)
    try{
      const d=await api.post('/api/decision-maker-finder/find',{leadId:lead.id})
      if(d.found>0){toast('success',`${lead.company_name}: Karar verici bulundu`);load()}
      else toast('error',`${lead.company_name}: Karar verici bulunamadı`)
    }catch(e:any){toast('error',e.message)}
    finally{setFindingDM(null)}
  }
  const bulkFindDMs=async()=>{
    if(!selected.length)return
    setBulkRunning(true);setBulkProg({c:0,t:selected.length})
    try{
      const d=await api.post('/api/decision-maker-finder/bulk',{leadIds:selected})
      if(!d.jobId)throw new Error('Job başlatılamadı')
      const iv=setInterval(async()=>{
        try{
          const j=await api.get(`/api/decision-maker-finder/job/${d.jobId}`)
          setBulkProg({c:j.completed,t:j.total})
          if(j.status==='done'||j.status==='error'){
            clearInterval(iv);setBulkRunning(false);setBulkProg(null);setSelected([]);load()
            const found=(j.results||[]).filter((r:any)=>r.found).length
            toast('success',`${found}/${j.total} firmada karar verici bulundu`)
          }
        }catch{clearInterval(iv);setBulkRunning(false)}
      },3000)
    }catch(e:any){toast('error',e.message);setBulkRunning(false);setBulkProg(null)}
  }
  const exportExcel=async()=>{
    setExporting(true)
    try{
      const p=new URLSearchParams()
      if(selected.length>0){p.set('ids',selected.join(','))}
      else{if(search)p.set('search',search);if(status)p.set('status',status);if(sector)p.set('sector',sector);if(grade)p.set('grade',grade);if(list)p.set('list',list)}
      const token=localStorage.getItem('token')||''
      const API=process.env.NEXT_PUBLIC_API_URL||'https://leadflow-ai-production.up.railway.app'
      const resp=await fetch(`${API}/api/leads/export?${p}`,{headers:{Authorization:`Bearer ${token}`}})
      if(!resp.ok){const t=await resp.text().catch(()=>'');throw new Error(t||'Export başarısız')}
      const blob=await resp.blob()
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=url
      a.download=`sovlo-leads-${new Date().toISOString().slice(0,10)}.xlsx`
      a.style.display='none'
      document.body.appendChild(a)
      a.click()
      setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},200)
    }catch(e:any){toast('error',e.message)}
    finally{setExporting(false)}
  }

  const newToday=leads.filter(l=>{
    const d=new Date(l.created_at),n=new Date()
    return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate()
  }).length
  const totalPages=Math.ceil(total/pageSize)
  const hasFilters=!!(search||status||sector||grade||list)

  return (
    <div className="space-y-6 pb-10">
      {showDel&&<DeleteModal count={selected.length} onConfirm={bulkDelete} onCancel={()=>setShowDel(false)}/>}
      <AddLeadDrawer
        open={showAddLead}
        onClose={()=>setShowAddLead(false)}
        sectors={sectors}
        stMap={stMap}
        onSaved={lead=>{
          setShowAddLead(false)
          toast('success',`✅ "${lead.company_name}" başarıyla eklendi`)
          load()
        }}
      />
      <ExcelImportModal
        open={showImport}
        onClose={()=>setShowImport(false)}
        onDone={count=>{
          toast('success',`✅ ${count.toLocaleString('tr-TR')} lead başarıyla içe aktarıldı`)
          load()
        }}
      />

      {/* ── Header ── */}
      {isMobile ? (
        <div>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <h1 style={{ color:'#0f172a', fontSize:20, fontWeight:800, margin:0 }}>{pageTitle}</h1>
              <p style={{ color:'#94a3b8', fontSize:12, margin:'2px 0 0' }}>{total.toLocaleString('tr-TR')} kayıt{hasFilters?' · filtrelendi':''}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {featureExport && (
                <button onClick={exportExcel} disabled={exporting}
                  style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, color:'#64748b', cursor:'pointer' }}>
                  {exporting?<RefreshCw size={14} className="animate-spin"/>:<Download size={14}/>}
                </button>
              )}
              {featureKvBul && (
                <Link href="/decision-maker" style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, color:'#64748b', textDecoration:'none' }}>
                  <Crosshair size={14}/>
                </Link>
              )}
              {featureImport && (
                <button onClick={()=>setShowImport(true)}
                  style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, cursor:'pointer' }}>
                  <Download size={14} style={{ transform:'rotate(180deg)', color:'#10b981' }}/>
                </button>
              )}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>setShowAddLead(true)}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 0', borderRadius:12, border:'none', background:'linear-gradient(135deg,#059669,#0d9488)', color:'#ffffff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              <Plus size={14}/> Müşteri Ekle
            </button>
            <Link href="/leads/scrape"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 0', borderRadius:12, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#ffffff', fontSize:13, fontWeight:700, textDecoration:'none' }}>
              <Plus size={14}/> Müşteri Topla
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString('tr-TR')} kayıt{hasFilters?' · filtrelendi':''}</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {featureExport && (
              <button onClick={exportExcel} disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
                {exporting?<RefreshCw size={14} className="animate-spin"/>:<Download size={14}/>}
                <span className="hidden sm:inline">{selected.length>0?`${selected.length} Lead Export`:'Excel Export'}</span>
              </button>
            )}
            {featureKvBul && (
              <Link href="/decision-maker"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <Crosshair size={14}/><span className="hidden sm:inline"> KV Bul</span>
              </Link>
            )}
            {featureImport && (
              <button onClick={()=>setShowImport(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <Download size={14} className="rotate-180 text-emerald-600"/><span className="hidden sm:inline"> Excel Aktar</span>
              </button>
            )}
            <button onClick={()=>setShowAddLead(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{background:'linear-gradient(135deg,#059669,#0d9488)'}}>
              <Plus size={14}/> Müşteri Ekle
            </button>
            <Link href="/leads/scrape"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
              <Plus size={14}/> Müşteri Topla
            </Link>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      value={total}    label={statTotalLabel}  iconBg="#EEF2FF" iconColor="#4F46E5"/>
        <StatCard icon={Zap}        value={newToday} label={statTodayLabel}  iconBg="#F0FDF4" iconColor="#16A34A"/>
        <StatCard icon={TrendingUp} value={pipelineStats?.wonCount??leads.filter(l=>l.status==='won').length}                              label={statWonLabel}  iconBg="#FFFBEB" iconColor="#D97706"/>
        <StatCard icon={Flame}      value={pipelineStats?.hotLeads??leads.filter(l=>(l.score||0)>=hotThreshold).length} label={statHotLabel}  iconBg="#FEF2F2" iconColor="#DC2626"/>

      {/* Pipeline Stats + Çöp Kutusu aksiyonları */}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={()=>setShowPipeline(v=>!v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showPipeline?'bg-indigo-50 border-indigo-200 text-indigo-700':'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <TrendingUp size={12}/> Pipeline Analitik
        </button>
        <button onClick={()=>setShowSaveSegment(v=>!v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
          <Star size={12}/> Segment Kaydet
        </button>
        {segments.slice(0,5).map(seg=>(
          <button key={seg.id} onClick={()=>applySegment(seg)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
            {seg.icon||'🎯'} {seg.name}
          </button>
        ))}
        <button onClick={()=>setShowTrash(v=>!v)}
          className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showTrash?'bg-red-50 border-red-200 text-red-600':'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
          <Trash2 size={12}/> Çöp Kutusu {trashTotal>0&&<span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{trashTotal}</span>}
        </button>
      </div>

      {/* Segment kaydet formu */}
      {showSaveSegment&&(
        <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <Star size={14} className="text-indigo-500 shrink-0"/>
          <input value={segmentName} onChange={e=>setSegmentName(e.target.value)} placeholder="Segment adı (ör: Sıcak İstanbul Teknoloji)" onKeyDown={e=>e.key==='Enter'&&saveSegment()}
            className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
          <button onClick={saveSegment} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700">Kaydet</button>
          <button onClick={()=>setShowSaveSegment(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
        </div>
      )}

      {/* Pipeline Stats Panel */}
      {showPipeline&&pipelineStats&&(
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><TrendingUp size={15} className="text-indigo-500"/> Pipeline Analitik</h3>
            <button onClick={()=>setShowPipeline(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              {label:'Toplam Müşteri',val:pipelineStats.total,color:'#4F46E5'},
              {label:'Kazanılan',val:pipelineStats.wonCount,color:'#16A34A'},
              {label:'Dönüşüm',val:`%${pipelineStats.conversionRate}`,color:'#D97706'},
              {label:'Kazanılan Değer',val:`₺${(pipelineStats.wonValue||0).toLocaleString('tr-TR')}`,color:'#059669'},
            ].map(s=>(
              <div key={s.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-xl font-bold" style={{color:s.color}}>{s.val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kaynak Bazlı Dönüşüm</p>
            <div className="space-y-1.5">
              {(pipelineStats.bySource||[]).slice(0,5).map((s:any)=>(
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-32 truncate">{s.source}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{width:`${Math.min(s.rate,100)}%`}}/>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-10 text-right">%{s.rate}</span>
                  <span className="text-xs text-slate-400 w-16 text-right">{s.total} lead</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Çöp Kutusu Panel */}
      {showTrash&&(
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-red-800 text-sm flex items-center gap-2"><Trash2 size={14}/> Çöp Kutusu ({trashTotal} lead)</h3>
            <div className="flex gap-2">
              {trashLeads.length>0&&<button onClick={()=>permanentDelete(trashLeads.map(l=>l.id))} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Tümünü Kalıcı Sil</button>}
              <button onClick={()=>setShowTrash(false)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
            </div>
          </div>
          {trashLeads.length===0?(
            <p className="text-red-400 text-sm text-center py-4">Çöp kutusu boş</p>
          ):(
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trashLeads.map(l=>(
                <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{l.company_name}</p>
                    <p className="text-xs text-slate-400">{l.city||'—'} · {l.sector||'—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>restoreLead(l.id)} className="text-xs px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-100">Geri Al</button>
                    <button onClick={()=>permanentDelete([l.id])} className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Toast ── */}
      {msg&&(
        <div className={`px-4 py-3 rounded-xl text-sm border ${msg.type==='success'?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Firma adı, sektör ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
          </div>
          {/* Filter toggle */}
          <button onClick={()=>setShowFilters(f=>!f)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${showFilters||hasFilters?'bg-indigo-50 border-indigo-200 text-indigo-700':'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            <SlidersHorizontal size={14}/>
            Filtrele
            {hasFilters&&<span className="w-2 h-2 rounded-full bg-indigo-500"/>}
          </button>
          {/* Page size */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 text-xs font-medium">Göster</span>
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}
              className="bg-transparent text-slate-700 text-sm font-medium outline-none cursor-pointer">
              {PAGE_SIZES.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters&&(
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60 border-b border-slate-100 flex-wrap">
            <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer">
              <option value="">Tüm Durumlar</option>
              {SK.map(s=><option key={s} value={s}>{ST[s].label}</option>)}
            </select>
            {sectors.length>0&&(
              <select value={sector} onChange={e=>{setSector(e.target.value);setPage(1)}}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer">
                <option value="">Tüm Sektörler</option>
                {sectors.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={grade} onChange={e=>{setGrade(e.target.value);setPage(1)}}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer">
              <option value="">Tüm Kaliteler</option>
              {['A','B','C','D'].map(g=><option key={g} value={g}>{g} Kalite</option>)}
            </select>
            {hasFilters&&(
              <button onClick={()=>{setSearch('');setStatus('');setSector('');setGrade('');setList('');setPage(1)}}
                className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer">
                × Filtreleri Temizle
              </button>
            )}
          </div>
        )}

        {/* List pills */}
        {lists.length>0&&(
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/40 border-b border-slate-100 flex-wrap">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Liste:</span>
            {[{l:'Tümü',v:''}, ...lists.map(l=>({l,v:l}))].map(item=>(
              <button key={item.v} onClick={()=>{setList(item.v);setPage(1)}}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${list===item.v?'bg-indigo-50 border-indigo-200 text-indigo-700':'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {item.v?`📁 ${item.l}`:item.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk actions ── */}
      {selected.length>0&&(
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">{selectAllTotal?total:selected.length}</span>
            <span className="text-indigo-800 text-sm font-semibold">{selectAllTotal?`tüm ${total.toLocaleString('tr-TR')} lead seçili`:'lead seçili'}</span>
            {allSel&&!selectAllTotal&&total>pageSize&&(
              <button onClick={()=>setSelectAllTotal(true)}
                className="text-indigo-600 hover:text-indigo-900 text-xs underline font-medium ml-1 cursor-pointer">
                Tüm {total.toLocaleString('tr-TR')} leadi seç
              </button>
            )}
            {selectAllTotal&&(
              <button onClick={()=>{setSelectAllTotal(false);setSelected([])}}
                className="text-indigo-600 hover:text-indigo-900 text-xs underline font-medium ml-1 cursor-pointer">
                Seçimi temizle
              </button>
            )}
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={bulkFindDMs} disabled={bulkRunning}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-purple-200 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
              {bulkRunning?<RefreshCw size={11} className="animate-spin"/>:<Crosshair size={11}/>}
              {bulkRunning&&bulkProg?`${bulkProg.c}/${bulkProg.t}`:'Toplu KV Bul'}
            </button>
            {(['contacted','won','lost'] as const).map(s=>(
              <button key={s} onClick={()=>bulkStatus(s)}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                → {ST[s]?.label}
              </button>
            ))}
            <button onClick={()=>{setSelectAllTotal(false);setShowDel(true)}}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors shadow-sm cursor-pointer">
              <Trash2 size={11}/> Sil
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Cards ── */}
      {isMobile && (
        <div className="space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
              <span className="text-slate-500 text-sm">Yükleniyor...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Users size={24} className="text-slate-400"/>
              </div>
              <div className="text-center">
                <p className="text-slate-600 font-medium mb-1">Lead bulunamadı</p>
                <p className="text-slate-400 text-sm">Filtrelerini değiştir veya yeni lead topla</p>
              </div>
              <Link href="/scrape"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
                + Müşteri Topla
              </Link>
            </div>
          ) : leads.map(lead => {
            const [bg,tc]=av(lead.company_name)
            const initials=lead.company_name.slice(0,2).toUpperCase()
            return (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{background:bg,color:tc}}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-slate-900 text-[15px] font-semibold truncate">{lead.company_name}</span>
                      {(lead.score||0)>=hotThreshold&&<Flame size={12} className="text-red-400 shrink-0"/>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {lead.city&&<span className="text-slate-400 text-xs">{lead.city}</span>}
                      <SourceBadge source={lead.source}/>
                    </div>
                  </div>
                  <Link href={`/leads/${lead.id}`} className="text-slate-300 hover:text-indigo-500 shrink-0 p-1 transition-colors">
                    <ExternalLink size={15}/>
                  </Link>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {lead.phone ? (
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors min-w-0 truncate">
                      <Phone size={12} className="shrink-0 text-emerald-600"/>
                      {lead.phone}
                    </a>
                  ) : (
                    <button onClick={()=>findPhone(lead)} disabled={!!findingDM}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 text-xs font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                      {findingDM===lead.id+'_ph'?<RefreshCw size={12} className="animate-spin"/>:<Phone size={12}/>}
                      Telefon Bul
                    </button>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <ScoreBadge score={lead.score} thresholds={scoreThresholds} colors={{high:scoreHighColor,medium:scoreMedColor,low:scoreLowColor}}/>
                    <StatusPill status={lead.status} onChange={s=>changeStatus(lead,s)} stMap={stMap}/>
                  </div>
                </div>
              </div>
            )
          })}
          {total>pageSize&&(
            <div className="flex items-center justify-between pt-1 pb-2">
              <span className="text-slate-500 text-sm">
                <span className="font-medium text-slate-700">{((page-1)*pageSize+1).toLocaleString('tr-TR')}–{Math.min(page*pageSize,total).toLocaleString('tr-TR')}</span>
                {' '}/{' '}{total.toLocaleString('tr-TR')}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer">
                  ‹
                </button>
                <span className="px-2 text-slate-400 text-sm">{page}/{totalPages}</span>
                <button onClick={()=>setPage(p=>p+1)} disabled={page>=totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer">
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Desktop Table ── */}
      {!isMobile && (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{tableLayout:'fixed',minWidth:'960px'}}>
            <colgroup>
              <col style={{width:'40px'}}/>
              <col style={{width:'22%'}}/>
              <col style={{width:'16%'}}/>
              <col style={{width:'15%'}}/>
              <col style={{width:'80px'}}/>
              <col style={{width:'13%'}}/>
              <col style={{width:'72px'}}/>
              <col style={{width:'120px'}}/>
              <col style={{width:'60px'}}/>
              <col style={{width:'28px'}}/>
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="pl-3 pr-1 py-3">
                  <input type="checkbox" checked={allSel}
                    onChange={()=>{setSelectAllTotal(false);setSelected(allSel?[]:leads.map(l=>l.id))}}
                    className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer rounded"/>
                </th>
                <SortTH col="company_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Firma</SortTH>
                <TH>Telefon</TH>
                <TH>E-posta</TH>
                <TH>Sosyal</TH>
                <TH>Karar Verici</TH>
                <SortTH col="score" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Puan</SortTH>
                <SortTH col="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Durum</SortTH>
                <SortTH col="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Tarih</SortTH>
                <th/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading?(
                <tr><td colSpan={10}>
                  <div className="flex items-center justify-center gap-2 py-16">
                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
                    <span className="text-slate-500 text-sm">Yükleniyor...</span>
                  </div>
                </td></tr>
              ):leads.length===0?(
                <tr><td colSpan={10}>
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Users size={24} className="text-slate-400"/>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-700 font-semibold">Henüz lead yok</p>
                      <p className="text-slate-400 text-sm mt-1">Lead toplamaya başlayın</p>
                    </div>
                    <Link href="/leads/scrape"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
                      + Müşteri Topla
                    </Link>
                  </div>
                </td></tr>
              ):leads.map(lead=>{
                const [bg,tc]=av(lead.company_name)
                const initials=lead.company_name.slice(0,2).toUpperCase()
                const domain=lead.website?.replace(/^https?:\/\/(www\.)?/,'').split('/')[0]
                return (
                  <tr key={lead.id} className="group/row hover:bg-slate-50/70 transition-colors">
                    {/* Checkbox */}
                    <td className="pl-3 pr-1 py-3 align-middle">
                      <input type="checkbox" checked={selected.includes(lead.id)} onChange={()=>toggleSel(lead.id)}
                        className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer rounded opacity-40 group-hover/row:opacity-100 checked:opacity-100 transition-opacity"/>
                    </td>
                    {/* Company + source */}
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{background:bg,color:tc}}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-slate-900 text-sm font-semibold truncate block">{lead.company_name}</span>
                            {(lead.score||0)>=hotThreshold&&<Flame size={10} className="text-red-400 shrink-0"/>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            {lead.city&&<span className="text-slate-400 text-[10px] truncate">{lead.city}</span>}
                            {lead.maps_url&&(
                              <a href={lead.maps_url} target="_blank" rel="noreferrer" title="Google Maps'te Aç"
                                className="text-slate-400 hover:text-red-500 transition-colors shrink-0" onClick={e=>e.stopPropagation()}>
                                <MapPin size={9}/>
                              </a>
                            )}
                            <SourceBadge source={lead.source}/>
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-3 py-3 align-middle">
                      {lead.phone?(
                        <div>
                          <div className="flex items-center">
                            <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                              className="text-slate-800 hover:text-indigo-600 text-xs font-mono transition-colors truncate block">
                              {lead.phone}
                            </a>
                            <Cp v={lead.phone}/>
                          </div>
                          {domain&&<a href={lead.website!.startsWith('http')?lead.website!:`https://${lead.website}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-indigo-500 mt-0.5 transition-colors truncate">
                            <Globe size={8} className="shrink-0"/><span className="truncate">{domain.slice(0,18)}</span>
                          </a>}
                        </div>
                      ):(
                        <button onClick={()=>findPhone(lead)} disabled={!!findingDM}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap">
                          {findingDM===lead.id+'_ph'?<RefreshCw size={9} className="animate-spin"/>:<Phone size={9}/>}
                          Bul
                        </button>
                      )}
                    </td>
                    {/* Email */}
                    <td className="px-3 py-3 align-middle">
                      {lead.email?(
                        <div>
                          <div className="flex items-center">
                            <a href={`mailto:${lead.email}`}
                              className="text-slate-600 hover:text-indigo-600 text-[11px] transition-colors truncate block">
                              {lead.email}
                            </a>
                            <Cp v={lead.email}/>
                          </div>
                          {lead.rating&&(
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <Star size={9} className="text-amber-400 fill-amber-400 shrink-0"/>
                              <span className="text-[10px] text-slate-400">{lead.rating.toFixed(1)}{lead.review_count?` (${lead.review_count})`:''}</span>
                            </div>
                          )}
                        </div>
                      ):<span className="text-slate-300 text-xs">—</span>}
                    </td>
                    {/* Social */}
                    <td className="px-3 py-3 align-middle">
                      <Socials lead={lead}/>
                    </td>
                    {/* Decision Maker */}
                    <td className="px-3 py-3 align-middle">
                      {lead.contact_name?(
                        <p className="text-indigo-700 text-xs font-semibold truncate">{lead.contact_name}</p>
                      ):(
                        <button onClick={()=>findDM(lead)} disabled={!!findingDM}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap">
                          {findingDM===lead.id?<RefreshCw size={9} className="animate-spin"/>:<Crosshair size={9}/>}
                          KV Bul
                        </button>
                      )}
                    </td>
                    {/* Score */}
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1">
                        <ScoreBadge score={lead.score} thresholds={scoreThresholds} colors={{high:scoreHighColor,medium:scoreMedColor,low:scoreLowColor}}/>
                        {lead.ai_grade&&(['A','B','C','D'] as const).includes(lead.ai_grade as any)&&(
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded border"
                            style={lead.ai_grade==='A'?{background:'#DCFCE7',color:'#15803D',borderColor:'#BBF7D0'}
                              :lead.ai_grade==='B'?{background:'#EDE9FE',color:'#6D28D9',borderColor:'#DDD6FE'}
                              :lead.ai_grade==='C'?{background:'#FEF3C7',color:'#92400E',borderColor:'#FDE68A'}
                              :{background:'#FEE2E2',color:'#991B1B',borderColor:'#FECACA'}}>
                            {lead.ai_grade}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1">
                        <StatusPill status={lead.status} onChange={s=>changeStatus(lead,s)} stMap={stMap}/>
                        <button title="Meta'ya kaliteli lead sinyali gönder" onClick={async(e)=>{e.stopPropagation();try{const d=await api.post('/api/ads-intelligence/quality-signal',{leadId:lead.id,quality:'qualified'});toast('success',d.message||'Meta sinyali gönderildi!')}catch{toast('error','Sinyal gönderilemedi')}}}
                          className="opacity-0 group-hover/row:opacity-100 w-5 h-5 flex items-center justify-center rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-all shrink-0">
                          <Target size={10}/>
                        </button>
                      </div>
                    </td>
                    {/* Date */}
                    <td className="px-3 py-3 align-middle text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'2-digit'})}
                    </td>
                    {/* Link */}
                    <td className="pr-2 py-3 align-middle">
                      <Link href={`/leads/${lead.id}`}
                        className="opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 block">
                        <ExternalLink size={12}/>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total>pageSize&&(
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-slate-500 text-sm">
              <span className="font-medium text-slate-700">{((page-1)*pageSize+1).toLocaleString('tr-TR')}–{Math.min(page*pageSize,total).toLocaleString('tr-TR')}</span>
              {' '}/{' '}{total.toLocaleString('tr-TR')} kayıt
            </span>
            <div className="flex items-center gap-1.5">
              {[
                {l:'«',a:()=>setPage(1),d:page===1},
                {l:'‹',a:()=>setPage(p=>Math.max(1,p-1)),d:page===1},
                {l:'›',a:()=>setPage(p=>p+1),d:page>=totalPages},
                {l:'»',a:()=>setPage(totalPages),d:page>=totalPages},
              ].map(({l,a,d})=>(
                <button key={l} onClick={a} disabled={d}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer">
                  {l}
                </button>
              ))}
              <span className="px-2 text-slate-400 text-sm">{page}/{totalPages}</span>
            </div>
          </div>
        )}
      </div>
      )}

    </div>
  )
}
