// apps/web/app/ar-viewer/page.tsx
// Bu sayfa PUBLIC - auth gerektirmez
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ARViewerContent() {
  const searchParams = useSearchParams()
  const modelUrl = searchParams.get('model') || ''
  const productName = searchParams.get('name') || 'Ürün'
  const [loaded, setLoaded] = useState(false)
  const [isAR, setIsAR] = useState(false)

  useEffect(() => {
    // model-viewer web component yükle
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
    document.head.appendChild(script)
    script.onload = () => setLoaded(true)

    // AR desteği kontrol
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then(supported => setIsAR(supported))
    }

    return () => { document.head.removeChild(script) }
  }, [])

  if (!modelUrl) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-white">Model bulunamadı</p>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '16px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)'
      }}>
        <h1 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{productName}</h1>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
          {isAR ? '📱 AR modu aktif — "AR Görüntüle" butonuna basın' : '3D Modeli döndürmek için sürükleyin'}
        </p>
      </div>

      {/* Model Viewer */}
      {loaded && (
        // @ts-ignore
        <model-viewer
          src={modelUrl}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          environment-image="neutral"
          style={{ width: '100%', height: '100%' }}
          poster="/icons/icon-192x192.png"
        >
          {/* @ts-ignore */}
          <button slot="ar-button" style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '50px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(59,130,246,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            📱 AR ile Gör
          {/* @ts-ignore */}
          </button>
        {/* @ts-ignore */}
        </model-viewer>
      )}

      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94a3b8' }}>3D Model yükleniyor...</p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
          Powered by LeadFlow AI ⚡
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        model-viewer { --progress-bar-color: #3b82f6; }
      `}</style>
    </div>
  )
}

export default function ARViewerPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white' }}>Yükleniyor...</p>
      </div>
    }>
      <ARViewerContent />
    </Suspense>
  )
}