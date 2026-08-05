'use client'
import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...extra }
}
async function apiFetch(path: string, opts: RequestInit = {}) {
  const res  = await fetch(`${API}${path}`, { ...opts, headers: { ...authH(), ...(opts.headers || {}) } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'İstek başarısız')
  return data
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CatalogNumber {
  phoneNumber: string
  friendlyName: string
  region: string
  isoCountry: string
  capabilities: { voice: boolean; sms: boolean; mms: boolean }
}
interface MyNumber {
  id: string
  phone_number: string
  friendly_name: string
  country_code: string
  country_name: string
  capabilities_voice: boolean
  capabilities_sms: boolean
  capabilities_whatsapp: boolean
  wa_registered: boolean
  status: string
  purchased_at: string
}
interface Country { code: string; name: string; flag: string }
interface PlanLimit { limit: number; used: number; planType: string }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PhoneNumbersPage() {
  const { t } = useI18n()
  const [tab, setTab]                     = useState<'store' | 'my'>('store')
  const [countries, setCountries]         = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState('US')
  const [numberType, setNumberType]       = useState<'local' | 'toll_free' | 'mobile'>('local')
  const [catalogNumbers, setCatalogNumbers] = useState<CatalogNumber[]>([])
  const [myNumbers, setMyNumbers]         = useState<MyNumber[]>([])
  const [planLimit, setPlanLimit]         = useState<PlanLimit | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [buying, setBuying]               = useState<string | null>(null)
  const [waRegistering, setWaRegistering] = useState<string | null>(null)
  const [releasing, setReleasing]         = useState<string | null>(null)
  const [renamingId, setRenamingId]       = useState<string | null>(null)
  const [renameValue, setRenameValue]     = useState('')
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')

  useEffect(() => {
    apiFetch('/api/phone-numbers/countries').then(d => setCountries(d.countries)).catch(() => {})
    loadMyNumbers()
    loadPlanLimit()
  }, [])

  async function loadPlanLimit() {
    try { const d = await apiFetch('/api/phone-numbers/limit'); setPlanLimit(d) } catch (_e) {}
  }
  async function loadMyNumbers() {
    try { const d = await apiFetch('/api/phone-numbers/my'); setMyNumbers(d.numbers) } catch (_e) {}
  }

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true); setError('')
    try {
      const d = await apiFetch(`/api/phone-numbers/catalog?country=${selectedCountry}&type=${numberType}`)
      setCatalogNumbers(d.numbers)
    } catch (e: any) { setError(e.message) }
    finally { setCatalogLoading(false) }
  }, [selectedCountry, numberType])

  useEffect(() => { loadCatalog() }, [loadCatalog])

  async function purchaseNumber(num: CatalogNumber) {
    setBuying(num.phoneNumber); setError(''); setSuccess('')
    try {
      const d = await apiFetch('/api/phone-numbers/purchase', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: num.phoneNumber }),
      })
      setSuccess(d.message)
      await loadMyNumbers(); await loadPlanLimit()
      setTab('my')
    } catch (e: any) { setError(e.message) }
    finally { setBuying(null) }
  }

  async function releaseNumber(id: string) {
    if (!confirm('Bu numarayı bırakmak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return
    setReleasing(id); setError(''); setSuccess('')
    try {
      await apiFetch(`/api/phone-numbers/${id}`, { method: 'DELETE' })
      setSuccess('Numara başarıyla bırakıldı.')
      await loadMyNumbers(); await loadPlanLimit()
    } catch (e: any) { setError(e.message) }
    finally { setReleasing(null) }
  }

  async function registerWhatsapp(id: string) {
    setWaRegistering(id); setError(''); setSuccess('')
    try {
      const d = await apiFetch(`/api/phone-numbers/${id}/register-whatsapp`, { method: 'POST' })
      setSuccess(d.message); await loadMyNumbers()
    } catch (e: any) { setError(e.message) }
    finally { setWaRegistering(null) }
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) return
    try {
      await apiFetch(`/api/phone-numbers/${id}/set-friendly-name`, {
        method: 'POST',
        body: JSON.stringify({ friendlyName: renameValue.trim() }),
      })
      setRenamingId(null); await loadMyNumbers()
    } catch (e: any) { setError(e.message) }
  }

  const countryMeta = countries.find(c => c.code === selectedCountry)
  const canBuyMore  = planLimit ? (planLimit.limit === -1 || planLimit.used < planLimit.limit) : false
  const limitLabel  = planLimit
    ? (planLimit.limit === -1 ? '∞' : `${planLimit.used}/${planLimit.limit}`)
    : '…'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Telefon Numaraları</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Ses aramaları ve WhatsApp kampanyaları için dünyadan numara ekleyin. Planınıza dahildir.
          </p>
        </div>
        {planLimit && (
          <div className="shrink-0 text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Kullanım</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{limitLabel}</div>
            <div className="text-xs text-gray-400">{planLimit.planType} planı</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['store', 'my'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'store' ? '🌍 Numara Ekle' : `📱 Numaralarım (${myNumbers.length})`}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* Plan limit uyarısı */}
      {planLimit && planLimit.limit === 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Mevcut planınız (Trial) telefon numarası içermiyor. Numara eklemek için <strong>Starter</strong> veya üzeri bir plana geçin.
        </div>
      )}

      {/* ── STORE TAB ────────────────────────────────────────────────────────── */}
      {tab === 'store' && (
        <div>
          {/* Filtreler */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            >
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>

            <select
              value={numberType}
              onChange={e => setNumberType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            >
              <option value="local">Yerel Numara</option>
              <option value="toll_free">Ücretsiz Hat (Toll-Free)</option>
              <option value="mobile">Mobil</option>
            </select>
          </div>

          {/* Numara listesi */}
          {catalogLoading ? (
            <div className="text-center py-16 text-gray-400">Numaralar yükleniyor…</div>
          ) : catalogNumbers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📞</div>
              <p>Bu ülke / tür kombinasyonu için uygun numara bulunamadı.</p>
              <p className="text-sm mt-1">Farklı bir ülke veya numara türü deneyin.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {catalogNumbers.map(num => (
                <div
                  key={num.phoneNumber}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div>
                    <div className="font-mono text-base font-semibold text-gray-900 dark:text-white">
                      {num.phoneNumber}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {countryMeta?.flag} {num.region || countryMeta?.name}
                      <span className="ml-2 text-xs">
                        {num.capabilities.voice && '📞 Ses '}
                        {num.capabilities.sms   && '💬 SMS'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">
                      Planınıza dahil
                    </span>
                    <button
                      onClick={() => purchaseNumber(num)}
                      disabled={buying === num.phoneNumber || !canBuyMore}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {buying === num.phoneNumber ? 'Ekleniyor…' : 'Ekle'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!canBuyMore && planLimit && planLimit.limit > 0 && (
            <p className="mt-4 text-center text-sm text-gray-400">
              Plan limitinize ({planLimit.limit}) ulaştınız. Mevcut numaralardan birini bırakın veya planınızı yükseltin.
            </p>
          )}
        </div>
      )}

      {/* ── MY NUMBERS TAB ───────────────────────────────────────────────────── */}
      {tab === 'my' && (
        <div>
          {myNumbers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📱</div>
              <p>Henüz numara eklemediniz.</p>
              <button
                onClick={() => setTab('store')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Numara Ekle
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {myNumbers.map(num => (
                <div
                  key={num.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* İsim / numara */}
                      {renamingId === num.id ? (
                        <div className="flex gap-2 items-center mb-1">
                          <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRename(num.id) }}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-44"
                            autoFocus
                          />
                          <button onClick={() => saveRename(num.id)} className="text-xs text-blue-600 font-medium">Kaydet</button>
                          <button onClick={() => setRenamingId(null)} className="text-xs text-gray-400">İptal</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-gray-900 dark:text-white">{num.phone_number}</span>
                          {num.friendly_name && num.friendly_name !== num.phone_number && (
                            <span className="text-xs text-gray-400">— {num.friendly_name}</span>
                          )}
                          <button
                            onClick={() => { setRenamingId(num.id); setRenameValue(num.friendly_name || '') }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✏️
                          </button>
                        </div>
                      )}

                      {/* Ülke */}
                      <div className="text-xs text-gray-500">{num.country_name}</div>

                      {/* Kapasite badge'leri */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {num.capabilities_voice && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">📞 Ses</span>
                        )}
                        {num.capabilities_sms && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">💬 SMS</span>
                        )}
                        {num.wa_registered ? (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">✅ WhatsApp</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded-full">WhatsApp kayıtsız</span>
                        )}
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">Plana dahil</span>
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {!num.wa_registered && num.capabilities_sms && (
                        <button
                          onClick={() => registerWhatsapp(num.id)}
                          disabled={waRegistering === num.id}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg whitespace-nowrap"
                        >
                          {waRegistering === num.id ? '…' : '✅ WhatsApp Kaydet'}
                        </button>
                      )}
                      <button
                        onClick={() => releaseNumber(num.id)}
                        disabled={releasing === num.id}
                        className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-lg disabled:opacity-50"
                      >
                        {releasing === num.id ? '…' : 'Bırak'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <strong>💡 Bilgi:</strong> Bu numaraları Ses Outreach sayfasında arama kaynağı olarak,
            WhatsApp kayıt sonrası da WA kampanyalarında kullanabilirsiniz.
            Planınız aktif olduğu sürece numaralar aktif kalır.
          </div>
        </div>
      )}
    </div>
  )
}
