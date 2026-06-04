'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getAdminToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' }
async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}/api/admin${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}`, ...opts.headers } })
  return r.json()
}

const PREDEFINED_FLAGS = [
  { key: 'ai_video_outreach', label: '🎬 AI Video Outreach', desc: 'Kişiselleştirilmiş video kampanyaları', plan: 'pro' },
  { key: 'voice_cloning', label: '🎙️ Ses Klonlama', desc: 'ElevenLabs ile ses klonlama', plan: 'pro' },
  { key: 'ar_experience', label: '🥽 AR Deneyimi', desc: '3D model ve artırılmış gerçeklik', plan: 'enterprise' },
  { key: 'ai_agent', label: '🤖 AI Satış Ajanı', desc: '7/24 otonom lead araştırma', plan: 'growth' },
  { key: 'white_label', label: '🏢 White-label', desc: 'Özel marka ve domain', plan: 'enterprise' },
  { key: 'team_intelligence', label: '👥 Takım Zekası', desc: 'Gelişmiş takım analitikleri', plan: 'pro' },
  { key: 'export_intelligence', label: '🌍 İhracat Zekası', desc: 'Global alıcı bulma', plan: 'enterprise' },
  { key: 'beta_new_feature', label: '🚀 Beta: Yeni Özellik', desc: 'Geliştirme aşamasındaki özellik', plan: 'all' },
]

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Record<string,boolean>>({})
  const [saving, setSaving] = useState<string|null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    req('/flags').then(d => {
      const map: Record<string,boolean> = {}
      ;(d.flags||[]).forEach((f:any) => { map[f.flag_key] = f.is_enabled })
      setFlags(map)
    }).catch(()=>{})
  }, [])

  const toggle = async (key: string) => {
    const newVal = !flags[key]
    setSaving(key)
    try {
      await req('/flags', { method: 'POST', body: JSON.stringify({ flag_key: key, is_enabled: newVal }) })
      setFlags(prev => ({ ...prev, [key]: newVal }))
      setMsg(newVal ? `✅ "${key}" aktive edildi` : `⚪ "${key}" deaktive edildi`)
      setTimeout(() => setMsg(''), 3000)
    } catch(e:any) { setMsg('❌ Hata: '+e.message) }
    finally { setSaving(null) }
  }

  const card: React.CSSProperties = { background:'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:18,marginBottom:10 }
  const PLAN_COLOR: Record<string,string> = { pro:'#8b5cf6', enterprise:'#f59e0b', growth:'#3b82f6', all:'#64748b' }

  return (
    <div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.02em'}}>🚩 Feature Flags</h1>
      <p style={{color:'#334155',fontSize:13,margin:'0 0 28px'}}>Özellikleri kullanıcılara veya planlara göre açıp kapatın</p>

      {msg && <div style={{padding:'11px 16px',borderRadius:10,marginBottom:16,background:msg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,color:msg.startsWith('✅')?'#34d399':'#f87171',fontSize:13}}>{msg}</div>}

      <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:12,color:'#93c5fd'}}>
        💡 Feature flag'ler özelliği belirli planlardaki veya test kullanıcılarındaki kullanıcılara açar/kapatır. Değişiklikler anında yayına girer.
      </div>

      {PREDEFINED_FLAGS.map(f => {
        const enabled = flags[f.key] || false
        const isSaving = saving === f.key
        return (
          <div key={f.key} style={{...card, opacity: isSaving ? 0.7 : 1}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{color:'#fff',fontSize:13,fontWeight:700}}>{f.label}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:10,fontWeight:700,background:`${PLAN_COLOR[f.plan]||'#64748b'}20`,color:PLAN_COLOR[f.plan]||'#64748b'}}>{f.plan}</span>
                </div>
                <div style={{color:'#64748b',fontSize:12}}>{f.desc}</div>
                <code style={{color:'#334155',fontSize:10,marginTop:4,display:'block'}}>{f.key}</code>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:12,color:enabled?'#34d399':'#64748b',fontWeight:600}}>{enabled?'Aktif':'Pasif'}</span>
                <button onClick={() => toggle(f.key)} disabled={isSaving}
                  style={{
                    width:44,height:24,borderRadius:12,border:'none',cursor:isSaving?'not-allowed':'pointer',
                    background:enabled?'#10b981':'rgba(255,255,255,0.08)',
                    position:'relative',transition:'background 0.2s',
                    flexShrink:0,
                  }}>
                  <div style={{
                    width:18,height:18,borderRadius:'50%',background:'#fff',
                    position:'absolute',top:3,
                    left:enabled?22:4,
                    transition:'left 0.2s',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
                  }}/>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
