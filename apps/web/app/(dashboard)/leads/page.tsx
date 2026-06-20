'use client'
import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import {
  Search, Plus, Trash2, ExternalLink, Crosshair, RefreshCw,
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
const ST: Record<string,{label:string;bg:string;text:string;dot:string;ring:string}> = {
  new:       {label:'Yeni',           bg:'#EFF6FF',text:'#1D4ED8',dot:'#3B82F6',ring:'#BFDBFE'},
  contacted: {label:'İletişimde',     bg:'#FFFBEB',text:'#92400E',dot:'#F59E0B',ring:'#FDE68A'},
  qualified: {label:'Nitelikli',      bg:'#ECFEFF',text:'#155E75',dot:'#06B6D4',ring:'#A5F3FC'},
  replied:   {label:'Cevap Verdi',    bg:'#F0FDF4',text:'#15803D',dot:'#22C55E',ring:'#BBF7D0'},
  offered:   {label:'Teklif Verildi', bg:'#FDF4FF',text:'#7E22CE',dot:'#A855F7',ring:'#E9D5FF'},
  won:       {label:'Kazanıldı',      bg:'#DCFCE7',text:'#14532D',dot:'#16A34A',ring:'#86EFAC'},
  lost:      {label:'Kaybedildi',     bg:'#FEF2F2',text:'#991B1B',dot:'#EF4444',ring:'#FECACA'},
}
const SK = ['new','contacted','qualified','replied','offered','won','lost']

function StatusPill({ status, onChange }: { status: string; onChange:(s:string)=>void }) {
  const [open,setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = ST[status] || {label:status,bg:'#F1F5F9',text:'#475569',dot:'#94A3B8',ring:'#E2E8F0'}
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
          {SK.map(k=>{const c=ST[k]; return (
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
function ScoreBadge({score}:{score:number}) {
  const c = score>=75 ? {bg:'#DCFCE7',t:'#15803D',b:'#BBF7D0'}
    : score>=50 ? {bg:'#EDE9FE',t:'#6D28D9',b:'#DDD6FE'}
    : score>=30 ? {bg:'#FEF3C7',t:'#92400E',b:'#FDE68A'}
    : {bg:'#FEE2E2',t:'#991B1B',b:'#FECACA'}
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
        <p className="text-slate-500 text-sm mb-6">Seçili <span className="text-slate-900 font-medium">{count} lead</span> kalıcı silinecek. Bu işlem geri alınamaz.</p>
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

  const handleSort=(col:string)=>{
    if(sortBy===col){setSortDir(d=>d==='asc'?'desc':'asc')}
    else{setSortBy(col);setSortDir('desc')}
    setPage(1);setSelectAllTotal(false)
  }

  const toggleSel=(id:string)=>{setSelectAllTotal(false);setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
  const allSel=leads.length>0&&selected.length===leads.length

  const bulkDelete=async()=>{
    await Promise.all(selected.map(id=>api.delete(`/api/leads/${id}`)))
    setSelected([]);setShowDel(false);load()
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
      else{if(search)p.set('search',search);if(status)p.set('status',status);if(sector)p.set('sector',sector);if(list)p.set('list',list)}
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Veritabanı</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString('tr-TR')} kayıt{hasFilters?' · filtrelendi':''}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={exportExcel} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
            {exporting?<RefreshCw size={14} className="animate-spin"/>:<Download size={14}/>}
            {selected.length>0?`${selected.length} Lead Export`:'Excel Export'}
          </button>
          <Link href="/decision-maker"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Crosshair size={14}/> KV Bul
          </Link>
          <Link href="/leads/scrape"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
            <Plus size={14}/> Lead Topla
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      value={total}    label="Toplam Lead"   iconBg="#EEF2FF" iconColor="#4F46E5"/>
        <StatCard icon={Zap}        value={newToday} label="Bugün Eklenen"  iconBg="#F0FDF4" iconColor="#16A34A"/>
        <StatCard icon={TrendingUp} value={leads.filter(l=>l.status==='won').length}           label="Kazanılan"    iconBg="#FFFBEB" iconColor="#D97706"/>
        <StatCard icon={Flame}      value={leads.filter(l=>(l.hot_score||0)>=30).length}       label="Sıcak Lead"   iconBg="#FEF2F2" iconColor="#DC2626"/>
      </div>

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

      {/* ── Table ── */}
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
                      + Lead Topla
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
                            {(lead.hot_score||0)>=30&&<Flame size={10} className="text-red-400 shrink-0"/>}
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
                        <ScoreBadge score={lead.score}/>
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
                      <StatusPill status={lead.status} onChange={s=>changeStatus(lead,s)}/>
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
    </div>
  )
}
