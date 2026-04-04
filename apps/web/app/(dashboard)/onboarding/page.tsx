'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { CheckCircle, ArrowRight, Zap, Users, MessageSquare, Target, BarChart3 } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Hoş Geldiniz!', icon: '👋', desc: 'LeadFlow AI ile satışlarınızı otomatikleştirin' },
  { id: 2, title: 'Şirket Bilgileri', icon: '🏢', desc: 'Sizi daha iyi tanıyalım' },
  { id: 3, title: 'WhatsApp Bağlayın', icon: '💬', desc: 'Müşterilerinize mesaj gönderin' },
  { id: 4, title: 'İlk Lead\'inizi Ekleyin', icon: '👥', desc: 'Sistemi test edin' },
  { id: 5, title: 'Hazırsınız!', icon: '🚀', desc: 'Dashboard\'a geçin' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ company:'', sector:'', city:'', phone:'', website:'' })
  const [leadForm, setLeadForm] = useState({ company_name:'', phone:'', email:'' })

  const saveCompany = async () => {
    setLoading(true)
    try {
      await api.put('/api/settings', { company_name: form.company, sector: form.sector, city: form.city })
      setStep(3)
    } catch { setStep(3) }
    finally { setLoading(false) }
  }

  const addLead = async () => {
    setLoading(true)
    try {
      await api.post('/api/leads', leadForm)
      setStep(5)
    } catch { setStep(5) }
    finally { setLoading(false) }
  }

  const finish = async () => {
    try { await api.put('/api/auth/onboarding', { done: true }) } catch {}
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {step > s.id ? <CheckCircle size={14}/> : s.id}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-800'}`}/>}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {/* Step 1 */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <p className="text-6xl">👋</p>
              <div>
                <h1 className="text-2xl font-bold text-white">LeadFlow AI'ya Hoş Geldiniz!</h1>
                <p className="text-slate-400 mt-2">3 dakikada kurulumu tamamlayın ve satışlarınızı otomatikleştirmeye başlayın</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  {icon:MessageSquare, label:'WhatsApp ile toplu mesaj'},
                  {icon:Target, label:'AI lead toplama'},
                  {icon:BarChart3, label:'Otomatik analiz'},
                  {icon:Users, label:'CRM yönetimi'},
                ].map(({icon:Icon, label})=>(
                  <div key={label} className="flex items-center gap-2 bg-slate-800 rounded-xl p-3">
                    <Icon size={16} className="text-blue-400 flex-shrink-0"/>
                    <p className="text-slate-300 text-sm">{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={()=>setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition">
                Kurulumu Başlat <ArrowRight size={16}/>
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">🏢 Şirket Bilgileri</h2>
                <p className="text-slate-400 text-sm mt-1">AI önerilerini kişiselleştirmek için kullanılır</p>
              </div>
              {[
                {k:'company',l:'Şirket Adı *',p:'Örnek A.Ş.'},
                {k:'sector',l:'Sektör',p:'İnşaat, Mobilya, Yazılım...'},
                {k:'city',l:'Şehir',p:'İstanbul'},
                {k:'website',l:'Web Sitesi',p:'https://sirket.com'},
              ].map(({k,l,p})=>(
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                  <input value={(form as any)[k]} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))}
                    placeholder={p} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"/>
                </div>
              ))}
              <button onClick={saveCompany} disabled={loading||!form.company}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl transition">
                Devam Et <ArrowRight size={16}/>
              </button>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <p className="text-5xl">💬</p>
              <div>
                <h2 className="text-xl font-bold text-white">WhatsApp Bağlayın</h2>
                <p className="text-slate-400 text-sm mt-1">Müşterilerinize WhatsApp üzerinden mesaj gönderin</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-xl text-left space-y-2">
                <p className="text-white text-sm font-medium">Bağlamak için:</p>
                <p className="text-slate-400 text-xs">1. Sol menüden <strong className="text-white">Ayarlar</strong>'a gidin</p>
                <p className="text-slate-400 text-xs">2. WhatsApp bölümünde QR kodu okutun</p>
                <p className="text-slate-400 text-xs">3. Telefonunuzda WhatsApp Web'i açın</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setStep(4)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition text-sm">Sonra Bağlarım</button>
                <button onClick={()=>router.push('/settings')} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm">Şimdi Bağla</button>
              </div>
              <button onClick={()=>setStep(4)} className="text-slate-500 text-xs hover:text-slate-300">Atla →</button>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">👥 İlk Lead'inizi Ekleyin</h2>
                <p className="text-slate-400 text-sm mt-1">Sistemi test etmek için bir müşteri ekleyin</p>
              </div>
              {[
                {k:'company_name',l:'Şirket Adı *',p:'ABC Şirketi'},
                {k:'phone',l:'Telefon',p:'05001234567'},
                {k:'email',l:'Email',p:'info@abc.com'},
              ].map(({k,l,p})=>(
                <div key={k}>
                  <label className="text-slate-400 text-xs mb-1 block">{l}</label>
                  <input value={(leadForm as any)[k]} onChange={e=>setLeadForm(prev=>({...prev,[k]:e.target.value}))}
                    placeholder={p} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"/>
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={()=>setStep(5)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl text-sm">Atla</button>
                <button onClick={addLead} disabled={loading||!leadForm.company_name}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl transition">
                  Lead Ekle
                </button>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <p className="text-6xl">🚀</p>
              <div>
                <h2 className="text-2xl font-bold text-white">Hazırsınız!</h2>
                <p className="text-slate-400 mt-2">LeadFlow AI kurulumu tamamlandı. Satışlarınızı büyütmeye başlayın!</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:'Lead Ekle', href:'/leads', icon:'👥'},
                  {label:'Kampanya', href:'/campaigns', icon:'📢'},
                  {label:'Analitik', href:'/analytics', icon:'📊'},
                ].map(({label,href,icon})=>(
                  <button key={href} onClick={()=>router.push(href)}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-center transition">
                    <p className="text-2xl mb-1">{icon}</p>
                    <p className="text-white text-xs">{label}</p>
                  </button>
                ))}
              </div>
              <button onClick={finish}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition">
                <Zap size={16}/> Dashboard'a Git
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}