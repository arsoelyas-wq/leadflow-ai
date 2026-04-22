'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Building2, Package, Users, Mic2, MessageSquare, CheckCircle,
  ArrowRight, ArrowLeft, Zap, Target, Phone, Globe, MapPin,
  DollarSign, Star, AlertCircle, Plus, X, ChevronRight, Sparkles
} from 'lucide-react'

const STEPS = [
  { id: 1, icon: Building2, title: 'Şirket Profili', desc: 'Temel bilgilerinizi girin', color: 'from-blue-600 to-blue-700' },
  { id: 2, icon: Package, title: 'Ürün & Hizmet', desc: 'Ne sattığınızı anlayalım', color: 'from-purple-600 to-purple-700' },
  { id: 3, icon: Users, title: 'Hedef Müşteri', desc: 'Kimi arıyorsunuz?', color: 'from-teal-600 to-teal-700' },
  { id: 4, icon: Mic2, title: 'Satış Tarzı', desc: 'Nasıl konuşuyorsunuz?', color: 'from-amber-600 to-amber-700' },
  { id: 5, icon: MessageSquare, title: 'SSS & İtirazlar', desc: 'Sık sorulan sorular', color: 'from-rose-600 to-rose-700' },
  { id: 6, icon: CheckCircle, title: 'Hazır!', desc: 'Sistemin hazır', color: 'from-emerald-600 to-emerald-700' },
]

const SECTORS = [
  'Teknoloji / Yazılım', 'İmalat / Üretim', 'İnşaat / Gayrimenkul',
  'Tekstil / Moda', 'Gıda / İçecek', 'Sağlık / İlaç', 'Eğitim',
  'Finans / Sigorta', 'Lojistik / Nakliye', 'Turizm / Otelcilik',
  'Perakende / E-ticaret', 'Danışmanlık / Hizmet', 'Diğer'
]

const TONES = [
  { key: 'professional', label: 'Profesyonel', desc: 'Resmi, kurumsal dil', icon: '👔' },
  { key: 'friendly', label: 'Samimi', desc: 'Sıcak, dostane yaklaşım', icon: '😊' },
  { key: 'consultative', label: 'Danışmancı', desc: 'Sorular sorar, dinler', icon: '🎯' },
  { key: 'direct', label: 'Direkt', desc: 'Net, kısa, öz', icon: '⚡' },
]

const OBJECTION_TEMPLATES = [
  { q: 'Fiyat çok yüksek', a: '' },
  { q: 'Şu an bütçemiz yok', a: '' },
  { q: 'Zaten başka bir çözümüm var', a: '' },
  { q: 'Düşüneyim, sonra döneceğim', a: '' },
  { q: 'Meşgulüm, şimdi konuşamam', a: '' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)

  // Step 1 - Şirket
  const [company, setCompany] = useState({
    name: '', sector: '', city: '', website: '', phone: '', employee_count: '', founded_year: ''
  })

  // Step 2 - Ürün
  const [product, setProduct] = useState({
    name: '', description: '', price_range: '', advantages: ['', '', ''],
    target_result: '', delivery_time: '', guarantee: ''
  })

  // Step 3 - Hedef Müşteri
  const [target, setTarget] = useState({
    sectors: [] as string[], company_size: '', decision_maker: '',
    pain_points: ['', '', ''], geography: '', min_revenue: ''
  })

  // Step 4 - Satış Tarzı
  const [salesStyle, setSalesStyle] = useState({
    tone: 'friendly', agent_name: '', language_style: '',
    opening_line: '', closing_line: '', avoid_words: ''
  })

  // Step 5 - SSS & İtirazlar
  const [faq, setFaq] = useState([{ q: '', a: '' }, { q: '', a: '' }])
  const [objections, setObjections] = useState(OBJECTION_TEMPLATES)

  useEffect(() => {
    setProgress(((step - 1) / (STEPS.length - 1)) * 100)
  }, [step])

  async function saveAndFinish() {
    setSaving(true)
    try {
      const profile = {
        company, product, target, salesStyle, faq: faq.filter(f => f.q && f.a),
        objections: objections.filter(o => o.a),
      }
      await api.post('/api/settings/business-profile', profile)
      await api.patch('/api/settings', {
        company_name: company.name, sector: company.sector,
        city: company.city, website: company.website,
        onboarding_done: true,
      })
      router.push('/dashboard')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function saveStep() {
    if (step < STEPS.length) setStep(s => s + 1)
    else saveAndFinish()
  }

  const CurrentIcon = STEPS[step - 1].icon

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"/>
      </div>

      <div className="w-full max-w-2xl relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Zap className="w-5 h-5 text-white"/>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">LeadFlow AI</span>
          </div>
          <p className="text-slate-500 text-sm">Kurulum sihirbazı • {step}/{STEPS.length}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.id ? 'bg-emerald-500 text-white' :
                  step === s.id ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' :
                  'bg-slate-800 text-slate-500'
                }`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4"/> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 transition-all ${step > s.id ? 'bg-emerald-500' : 'bg-slate-800'}`} style={{ width: 40 }}/>
                )}
              </div>
            ))}
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}/>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className={`bg-gradient-to-r ${STEPS[step-1].color} p-6`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <CurrentIcon className="w-6 h-6 text-white"/>
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">{STEPS[step-1].title}</h2>
                <p className="text-white/70 text-sm">{STEPS[step-1].desc}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">

            {/* STEP 1 - Şirket Profili */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Şirket Adı *</label>
                    <input value={company.name} onChange={e => setCompany(p => ({...p, name: e.target.value}))}
                      placeholder="örn: Acme Teknoloji A.Ş."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Sektör *</label>
                    <select value={company.sector} onChange={e => setCompany(p => ({...p, sector: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                      <option value="">Seçin</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Şehir</label>
                    <input value={company.city} onChange={e => setCompany(p => ({...p, city: e.target.value}))}
                      placeholder="İstanbul"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Telefon</label>
                    <input value={company.phone} onChange={e => setCompany(p => ({...p, phone: e.target.value}))}
                      placeholder="0212 XXX XX XX"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Website</label>
                    <input value={company.website} onChange={e => setCompany(p => ({...p, website: e.target.value}))}
                      placeholder="www.sirketiniz.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Çalışan Sayısı</label>
                    <select value={company.employee_count} onChange={e => setCompany(p => ({...p, employee_count: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                      <option value="">Seçin</option>
                      {['1-10','11-50','51-200','201-500','500+'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 - Ürün & Hizmet */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ürün/Hizmet Adı *</label>
                  <input value={product.name} onChange={e => setProduct(p => ({...p, name: e.target.value}))}
                    placeholder="örn: CRM Yazılımı, Dekoratif Panel, Sigorta Paketi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ne iş yapıyorsunuz? (AI bunu kullanarak konuşacak) *</label>
                  <textarea value={product.description} onChange={e => setProduct(p => ({...p, description: e.target.value}))}
                    placeholder="örn: Firmaların satış süreçlerini otomatikleştiren bir yazılım geliştiriyoruz. Müşterilerimiz ortalama %40 daha fazla satış yapıyor..."
                    rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Fiyat Aralığı</label>
                    <input value={product.price_range} onChange={e => setProduct(p => ({...p, price_range: e.target.value}))}
                      placeholder="örn: 500-5000 TL/ay"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Teslimat/Kurulum Süresi</label>
                    <input value={product.delivery_time} onChange={e => setProduct(p => ({...p, delivery_time: e.target.value}))}
                      placeholder="örn: 1 gün, 1 hafta"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">3 Temel Avantajınız</label>
                  {product.advantages.map((adv, i) => (
                    <input key={i} value={adv}
                      onChange={e => setProduct(p => ({...p, advantages: p.advantages.map((a, j) => j === i ? e.target.value : a)}))}
                      placeholder={`Avantaj ${i+1} (örn: %40 daha az maliyet)`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 mb-2"/>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Müşteri Ne Kazanır? (Sonuç odaklı)</label>
                  <input value={product.target_result} onChange={e => setProduct(p => ({...p, target_result: e.target.value}))}
                    placeholder="örn: 3 ayda satışlarını %30 artıran müşterilerimiz var"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"/>
                </div>
              </div>
            )}

            {/* STEP 3 - Hedef Müşteri */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Hedef Sektörler</label>
                  <div className="flex flex-wrap gap-2">
                    {SECTORS.slice(0, 10).map(s => (
                      <button key={s} onClick={() => setTarget(p => ({
                        ...p, sectors: p.sectors.includes(s) ? p.sectors.filter(x => x !== s) : [...p.sectors, s]
                      }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          target.sectors.includes(s)
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Hedef Şirket Büyüklüğü</label>
                    <select value={target.company_size} onChange={e => setTarget(p => ({...p, company_size: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500">
                      <option value="">Tümü</option>
                      {['1-10 kişi','11-50 kişi','51-200 kişi','200+ kişi'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Karar Verici Kim?</label>
                    <input value={target.decision_maker} onChange={e => setTarget(p => ({...p, decision_maker: e.target.value}))}
                      placeholder="örn: CEO, Satın Alma Müdürü"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium">Hedef Müşterinizin 3 Büyük Sorunu</label>
                  {target.pain_points.map((pain, i) => (
                    <input key={i} value={pain}
                      onChange={e => setTarget(p => ({...p, pain_points: p.pain_points.map((x, j) => j === i ? e.target.value : x)}))}
                      placeholder={`Sorun ${i+1} (örn: Satış ekibi verimsiz)`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 mb-2"/>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Coğrafi Hedef</label>
                  <input value={target.geography} onChange={e => setTarget(p => ({...p, geography: e.target.value}))}
                    placeholder="örn: İstanbul, Ankara, Tüm Türkiye, DACH Bölgesi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500"/>
                </div>
              </div>
            )}

            {/* STEP 4 - Satış Tarzı */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium">AI Temsilcinin Konuşma Tonu</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TONES.map(tone => (
                      <button key={tone.key} onClick={() => setSalesStyle(p => ({...p, tone: tone.key}))}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          salesStyle.tone === tone.key
                            ? 'bg-amber-600/20 border-amber-500/50 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}>
                        <div className="text-2xl mb-1">{tone.icon}</div>
                        <div className="font-medium text-sm">{tone.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{tone.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">AI Temsilci Adı</label>
                    <input value={salesStyle.agent_name} onChange={e => setSalesStyle(p => ({...p, agent_name: e.target.value}))}
                      placeholder="örn: Ahmet, Ayşe, Mehmet"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Dil Tarzı</label>
                    <select value={salesStyle.language_style} onChange={e => setSalesStyle(p => ({...p, language_style: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500">
                      <option value="">Seçin</option>
                      <option value="formal">Resmi (Siz)</option>
                      <option value="informal">Samimi (Sen)</option>
                      <option value="mixed">Karma</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Açılış Cümlesi (İlk 10 saniye)</label>
                  <textarea value={salesStyle.opening_line} onChange={e => setSalesStyle(p => ({...p, opening_line: e.target.value}))}
                    placeholder="örn: Merhaba, ben Ahmet, ABC Teknoloji'den arıyorum. Şirketinizin satış süreçleriyle ilgili kısa bir bilgi vermek istiyorum, uygun bir anınız var mı?"
                    rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 resize-none"/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Kullanılmayacak Kelimeler</label>
                  <input value={salesStyle.avoid_words} onChange={e => setSalesStyle(p => ({...p, avoid_words: e.target.value}))}
                    placeholder="örn: yapay zeka, robot, otomatik (virgülle ayırın)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"/>
                </div>
              </div>
            )}

            {/* STEP 5 - SSS & İtirazlar */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400 font-medium">Sık Sorulan Sorular</label>
                    <button onClick={() => setFaq(p => [...p, { q: '', a: '' }])}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Plus className="w-3 h-3"/> Ekle
                    </button>
                  </div>
                  <div className="space-y-3">
                    {faq.map((item, i) => (
                      <div key={i} className="bg-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={item.q} onChange={e => setFaq(p => p.map((x, j) => j === i ? {...x, q: e.target.value} : x))}
                            placeholder="Soru"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"/>
                          <button onClick={() => setFaq(p => p.filter((_, j) => j !== i))}
                            className="text-slate-600 hover:text-red-400"><X className="w-4 h-4"/></button>
                        </div>
                        <textarea value={item.a} onChange={e => setFaq(p => p.map((x, j) => j === i ? {...x, a: e.target.value} : x))}
                          placeholder="Cevap"
                          rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"/>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium">İtiraz Karşılama Cevapları</label>
                  <div className="space-y-3">
                    {objections.map((obj, i) => (
                      <div key={i} className="bg-slate-800 rounded-xl p-3 space-y-2">
                        <div className="text-xs text-rose-400 font-medium">"{obj.q}" derse:</div>
                        <textarea value={obj.a} onChange={e => setObjections(p => p.map((x, j) => j === i ? {...x, a: e.target.value} : x))}
                          placeholder="AI bu durumda ne desin?"
                          rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6 - Hazır */}
            {step === 6 && (
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-emerald-400"/>
                </div>
                <div>
                  <h3 className="text-white text-2xl font-bold mb-2">Harika! Sisteminiz Hazır 🎉</h3>
                  <p className="text-slate-400">AI asistanınız artık şirketinizi, ürününüzü ve satış tarzınızı biliyor.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  {[
                    { icon: '📞', title: 'AI Sesli Arama', desc: 'Gerçek insan sesiyle müşteri arar' },
                    { icon: '💬', title: 'WA Kampanya', desc: 'Kişiselleştirilmiş mesaj gönderir' },
                    { icon: '🎯', title: 'Lead Analizi', desc: 'Şirketinize uygun leadleri bulur' },
                    { icon: '📊', title: 'Performans', desc: 'Her konuşmayı analiz eder' },
                  ].map(item => (
                    <div key={item.title} className="bg-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="text-white text-xs font-semibold">{item.title}</div>
                        <div className="text-slate-500 text-xs">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
                <ArrowLeft className="w-4 h-4"/> Geri
              </button>
            ) : <div/>}

            <button onClick={saveStep} disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                step === STEPS.length
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : `bg-gradient-to-r ${STEPS[step-1].color} text-white hover:opacity-90`
              } disabled:opacity-50`}>
              {saving ? 'Kaydediliyor...' : step === STEPS.length ? (
                <><Sparkles className="w-4 h-4"/> Dashboard'a Geç</>
              ) : (
                <>Devam Et <ArrowRight className="w-4 h-4"/></>
              )}
            </button>
          </div>
        </div>

        {/* Skip */}
        {step < STEPS.length && (
          <div className="text-center mt-4">
            <button onClick={() => router.push('/dashboard')}
              className="text-slate-600 hover:text-slate-400 text-xs transition">
              Şimdi atla, sonra tamamla →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}