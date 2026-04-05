'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Shield, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react'

export default function KvkkPage() {
  const [status, setStatus] = useState<any>(null)
  const [form, setForm] = useState({ privacyPolicyUrl:'', dataRetentionDays:'730', dpoEmail:'', consentText:'', encryptionEnabled:true, processingRegistry:false, securityTested:false })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null)

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000) }

  const load = async () => {
    try {
      const d = await api.get('/api/kvkk/status')
      setStatus(d)
      if (d.settings) {
        setForm({
          privacyPolicyUrl: d.settings.privacy_policy_url || '',
          dataRetentionDays: d.settings.data_retention_days?.toString() || '730',
          dpoEmail: d.settings.dpo_email || '',
          consentText: d.settings.consent_text || '',
          encryptionEnabled: d.settings.encryption_enabled ?? true,
          processingRegistry: d.settings.processing_registry ?? false,
          securityTested: d.settings.security_tested ?? false,
        })
      }
    } catch {}
  }

  useEffect(()=>{ load() },[])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/kvkk/settings', form)
      showMsg('success', 'KVKK ayarları kaydedildi!')
      load()
    } catch (e:any) { showMsg('error', e.message) }
    finally { setSaving(false) }
  }

  const scoreColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={24} className="text-blue-400"/> KVKK & GDPR Uyumluluk
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Kişisel verilerin korunması mevzuatına uygunluk paneli</p>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl border text-sm ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-300':'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>}

      {status && (
        <>
          {/* Skor */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <p className={`text-4xl font-bold ${scoreColor(status.complianceScore)}`}>{status.complianceScore}</p>
              <p className="text-slate-400 text-xs mt-1">Uyumluluk Skoru</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-blue-400">%{status.consentRate}</p>
              <p className="text-slate-400 text-xs mt-1">Rıza Oranı ({status.consentedLeads}/{status.totalLeads})</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-yellow-400">{status.pendingRequests}</p>
              <p className="text-slate-400 text-xs mt-1">Bekleyen Talep</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">✅ KVKK Kontrol Listesi</h2>
            <div className="space-y-2">
              {status.checklist?.map((item: any)=>(
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                  {item.done ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0"/> : <XCircle size={16} className="text-red-400 flex-shrink-0"/>}
                  <span className="text-slate-300 text-sm flex-1">{item.title}</span>
                  {item.required && !item.done && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Zorunlu</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Ayarlar */}
      <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">⚙️ KVKK Ayarları</h2>
        <div className="grid lg:grid-cols-2 gap-3">
          {[
            {k:'privacyPolicyUrl',l:'Gizlilik Politikası URL',p:'https://sirket.com/gizlilik'},
            {k:'dataRetentionDays',l:'Veri Saklama Süresi (gün)',p:'730'},
            {k:'dpoEmail',l:'VERBİS/DPO Email',p:'kvkk@sirket.com'},
          ].map(({k,l,p})=>(
            <div key={k}>
              <label className="text-slate-400 text-xs mb-1 block">{l}</label>
              <input value={(form as any)[k]} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))}
                placeholder={p} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"/>
            </div>
          ))}
          <div className="lg:col-span-2">
            <label className="text-slate-400 text-xs mb-1 block">Açık Rıza Metni</label>
            <textarea value={form.consentText} onChange={e=>setForm(p=>({...p,consentText:e.target.value}))}
              placeholder="Kişisel verileriniz, KVKK kapsamında..."
              rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"/>
          </div>
        </div>
        <div className="space-y-2">
          {[
            {k:'encryptionEnabled',l:'Veri şifreleme aktif'},
            {k:'processingRegistry',l:'Veri işleme kaydı tutuldu'},
            {k:'securityTested',l:'Güvenlik testi yapıldı'},
          ].map(({k,l})=>(
            <label key={k} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.checked}))} className="accent-blue-500"/>
              <span className="text-slate-300 text-sm">{l}</span>
            </label>
          ))}
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition">
          {saving?<RefreshCw size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
          {saving?'Kaydediliyor...':'Kaydet'}
        </button>
      </div>
    </div>
  )
}