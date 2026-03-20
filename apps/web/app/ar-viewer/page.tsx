// apps/web/app/ar-viewer/page.tsx - Profesyonel AR Viewer
'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ARViewerContent() {
  const searchParams = useSearchParams()
  const modelUrl = searchParams.get('model') || ''
  const productName = searchParams.get('name') || 'Ürün'
  const modelId = searchParams.get('id') || ''
  const [loaded, setLoaded] = useState(false)
  const [arSupported, setArSupported] = useState(false)
  const [viewCount, setViewCount] = useState(0)
  const [viewTime, setViewTime] = useState(0)
  const [shared, setShared] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const startTimeRef = useRef(Date.now())
  const intervalRef = useRef<any>(null)
  const modelViewerRef = useRef<any>(null)

  useEffect(() => {
    // Model Viewer yükle
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
    document.head.appendChild(script)
    script.onload = () => setLoaded(true)

    // AR desteği kontrol
    if ('xr' in navigator) {
      (navigator as any).xr?.isSessionSupported('immersive-ar')
        .then((supported: boolean) => setArSupported(supported))
        .catch(() => {})
    }

    // View count & time tracking
    const trackView = async () => {
      if (!modelId) return
      try {
        await fetch(`/api/ar/track-view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, userAgent: navigator.userAgent }),
        })
      } catch {}
    }
    trackView()

    // View time sayacı
    intervalRef.current = setInterval(() => {
      setViewTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      if (modelId && duration > 3) {
        fetch('/api/ar/track-engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, duration }),
        }).catch(() => {})
      }
    }
  }, [modelId])

  const handleShare = async () => {
    const shareUrl = window.location.href
    if (navigator.share) {
      await navigator.share({ title: productName, url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleARActivate = () => {
    if (modelId) {
      fetch('/api/ar/track-ar-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      }).catch(() => {})
    }
  }

  if (!modelUrl) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>📦</div>
      <p style={{ color: '#94a3b8', fontSize: '16px' }}>Model bulunamadı</p>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>

      {/* Top Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ color: 'white', fontSize: '17px', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>{productName}</h1>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: '3px 0 0' }}>
            {arSupported ? '✨ AR modu destekleniyor' : '🔄 3D görünüm — döndürmek için sürükleyin'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowInfo(!showInfo)} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px',
          }}>ℹ️</button>
          <button onClick={handleShare} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px',
          }}>{shared ? '✅' : '📤'}</button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div style={{
          position: 'absolute', top: '70px', right: '16px', zIndex: 30,
          background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '16px', width: '220px',
          backdropFilter: 'blur(20px)',
        }}>
          <p style={{ color: 'white', fontWeight: '600', margin: '0 0 12px', fontSize: '14px' }}>Nasıl Kullanılır?</p>
          {[
            { icon: '👆', text: 'Döndürmek için sürükleyin' },
            { icon: '🤏', text: 'Yakınlaştırmak için sıkıştırın' },
            { icon: '📱', text: 'AR için butona basın' },
            { icon: '🏠', text: 'Ürünü odanıza yerleştirin' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Model Viewer */}
      {loaded ? (
        // @ts-ignore
        <model-viewer
          ref={modelViewerRef}
          src={modelUrl}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          auto-rotate-delay="1000"
          rotation-per-second="20deg"
          shadow-intensity="1.5"
          shadow-softness="1"
          environment-image="neutral"
          exposure="1.1"
          tone-mapping="commerce"
          style={{ width: '100%', height: '100%' }}
          onArStatus={(e: any) => { if (e.detail.status === 'session-started') handleARActivate() }}
        >
          {/* AR Button */}
          {/* @ts-ignore */}
          <button
            slot="ar-button"
            onClick={handleARActivate}
            style={{
              position: 'absolute',
              bottom: '90px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              whiteSpace: 'nowrap',
              letterSpacing: '0.3px',
            }}>
            <span style={{ fontSize: '22px' }}>🏠</span>
            Odama Yerleştir (AR)
          {/* @ts-ignore */}
          </button>

          {/* Progress Bar */}
          {/* @ts-ignore */}
          <div slot="progress-bar" style={{ display: 'none' }} />
        {/* @ts-ignore */}
        </model-viewer>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
            animation: 'pulse 2s ease-in-out infinite',
          }}>📦</div>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>3D Model yükleniyor...</p>
          <div style={{
            width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: '4px', animation: 'loading 1.5s ease-in-out infinite',
              width: '60%',
            }} />
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '16px 20px 24px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '700' }}>⚡</span>
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>LeadFlow AI</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', color: '#475569', fontSize: '12px' }}>
          <span>👁️ {viewCount + 1}</span>
          <span>⏱️ {viewTime}s</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        model-viewer {
          --progress-bar-color: #3b82f6;
          --progress-bar-height: 3px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
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