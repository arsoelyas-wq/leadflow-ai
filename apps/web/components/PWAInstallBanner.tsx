'use client'
import { useState, useEffect } from 'react'
import { Smartphone, X, Download } from 'lucide-react'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Zaten kurulu mu?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS kontrolü
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // Android/Chrome install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS'ta 3 saniye sonra göster
    if (ios && !localStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setShowBanner(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      setDeferredPrompt(null)
    }
    setShowBanner(false)
  }

  const dismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!showBanner || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-slate-800 border border-blue-500/30 rounded-2xl p-4 shadow-2xl shadow-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Uygulamayı Kur</p>
            {isIOS ? (
              <p className="text-slate-400 text-xs mt-0.5">
                Safari'de <strong className="text-white">Paylaş</strong> → <strong className="text-white">Ana Ekrana Ekle</strong>
              </p>
            ) : (
              <p className="text-slate-400 text-xs mt-0.5">
                Telefona kur — offline çalışır, push bildirim alır
              </p>
            )}
          </div>
          <button onClick={dismiss} className="text-slate-500 hover:text-white transition shrink-0">
            <X size={16} />
          </button>
        </div>
        {!isIOS && (
          <button onClick={install}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition">
            <Download size={15} /> Kur
          </button>
        )}
      </div>
    </div>
  )
}