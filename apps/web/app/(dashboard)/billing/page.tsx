'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Zap, Check, Loader2, CreditCard, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSearchParams } from 'next/navigation'

const packages = [
  {
    id: 'small',
    name: 'Başlangıç',
    credits: 100,
    price: '₺200',
    features: ['100 lead kredisi', 'Google Maps scraping', 'WhatsApp gönderim', 'Email gönderim'],
    popular: false,
  },
  {
    id: 'medium',
    name: 'Profesyonel',
    credits: 300,
    price: '₺450',
    features: ['300 lead kredisi', 'Tüm kaynaklar', 'Öncelikli destek', 'A/B test özelliği'],
    popular: true,
  },
  {
    id: 'large',
    name: 'İşletme',
    credits: 700,
    price: '₺800',
    features: ['700 lead kredisi', 'Tüm özellikler', '7/24 destek', 'Özel entegrasyon'],
    popular: false,
  },
]

export default function BillingPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [credits, setCredits] = useState<{ total: number; used: number } | null>(null)

  useEffect(() => {
    const payment = searchParams.get('payment')
    const success = searchParams.get('success')
    if (payment === 'success' || success === 'true') {
      setMsg({ type: 'success', text: 'Ödeme başarılı! Krediniz hesabınıza eklendi.' })
    } else if (payment === 'cancelled') {
      setMsg({ type: 'error', text: 'Ödeme iptal edildi.' })
    }

    // Kredi bilgisini çek
    api.get('/api/dashboard').then((data: any) => {
      setCredits({ total: data.stats?.credits || 0, used: 0 })
    }).catch(() => {})
  }, [])

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId)
    try {
      const data = await api.post('/api/payments/topup', { packageId })
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Ödeme sayfası açılamadı' })
    } finally {
      setLoading(null)
    }
  }

  const remaining = credits?.total ?? ((user as any)?.creditsTotal ?? 0) - ((user as any)?.creditsUsed ?? 0)
  const total = credits?.total ?? (user as any)?.creditsTotal ?? 50
  const percent = total > 0 ? (remaining / total) * 100 : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Abonelik & Kredi</h1>
        <p className="text-slate-400 mt-1">Kredinizi yönetin ve paket satın alın</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {msg.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Mevcut Bakiye */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Mevcut Bakiye</p>
              <p className="text-white text-2xl font-bold">{remaining} Kredi</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">/ {total} toplam</p>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.max(0, percent)}%` }} />
        </div>
        {remaining < 20 && (
          <p className="text-yellow-400 text-sm mt-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Krediniz azalıyor, paket satın almayı unutmayın!
          </p>
        )}
      </div>

      {/* Paketler */}
      <div>
        <h2 className="text-white font-semibold mb-4">Kredi Paketleri</h2>
        <div className="grid grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className={`relative bg-slate-800/50 border rounded-xl p-6 ${
              pkg.popular ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-700'
            }`}>
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">EN POPÜLER</span>
                </div>
              )}
              <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className="text-3xl font-bold text-white">{pkg.price}</span>
              </div>
              <p className="text-blue-400 text-sm font-semibold mb-4">{pkg.credits} Kredi</p>
              <ul className="space-y-2 mb-6">
                {pkg.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check size={14} className="text-green-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading === pkg.id}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition ${
                  pkg.popular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
                } disabled:opacity-50`}
              >
                {loading === pkg.id
                  ? <><Loader2 size={16} className="animate-spin" /> İşleniyor...</>
                  : <><CreditCard size={15} /> Satın Al</>
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}