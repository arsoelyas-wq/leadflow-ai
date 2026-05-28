'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

function ARViewerContent() {
  const searchParams = useSearchParams()
  const modelUrl = searchParams.get('model') || ''
  const productName = searchParams.get('name') || 'Ürün'
  const modelId = searchParams.get('id') || ''
  const [loaded, setLoaded] = useState(false)
  const [arSupported, setArSupported] = useState(false)
  const [viewTime, setViewTime] = useState(0)
  const [shared, setShared] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showCTA, setShowCTA] = useState(false)
  const startTimeRef = useRef(Date.now())
  const intervalRef = useRef<any>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
    document.head.appendChild(script)
    script.onload = () => setLoaded(true)

    if ('xr' in navigator) {
      (navigator as any).xr?.isSessionSupported('immersive-ar')
        .then((s: boolean) => setArSupported(s))
        .catch(() => {})
    }

    if (modelId) {
      fetch(`${API_URL}/api/ar/track-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, userAgent: navigator.userAgent }),
      }).catch(() => {})
    }

    intervalRef.current = setInterval(() => {
      setViewTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Show CTA after 8 seconds of viewing
    const ctaTimer = setTimeout(() => setShowCTA(true), 8000)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(ctaTimer)
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      if (modelId && duration > 3) {
        fetch(`${API_URL}/api/ar/track-engagement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, duration }),
        }).catch(() => {})
      }
    }
  }, [modelId])

  const handleARActivate = () => {
    if (modelId) {
      fetch(`${API_URL}/api/ar/track-ar-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      }).catch(() => {})
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: productName, url: window.location.href }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {})
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleDemoRequest = () => {
    const msg = encodeURIComponent(`Merhaba! "${productName}" ürününüzü AR\'da inceledim ve demo/teklif almak istiyorum.`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (!modelUrl) return (
    <div style={{ minHeight: '100vh', background: '#030308', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>📦</div>
      <p style={{ color: '#475569', fontSize: 16 }}>Model bulunamadı</p>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#030308', position: 'relative', overflow: 'hidden' }}>

      {/* Top Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(3,3,8,0.9) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{productName}</h1>
          <p style={{ color: '#475569', fontSize: 12, margin: '4px 0 0' }}>
            {arSupported ? '✨ AR modu aktif' : '🔄 3D görünüm — döndürmek için sürükleyin'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowInfo(!showInfo)} style={iconBtnStyle}>ℹ️</button>
          <button onClick={handleShare} style={iconBtnStyle}>{shared ? '✅' : '📤'}</button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div style={{
          position: 'absolute', top: 70, right: 16, zIndex: 30,
          background: 'rgba(3,3,8,0.95)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 16, width: 220,
          backdropFilter: 'blur(20px)',
        }}>
          <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 12px', fontSize: 14 }}>Nasıl Kullanılır?</p>
          {[
            { icon: '👆', text: 'Döndürmek için sürükleyin' },
            { icon: '🤏', text: 'Yakınlaştırmak için sıkıştırın' },
            { icon: '📱', text: 'AR için butona basın' },
            { icon: '🏠', text: 'Ürünü odanıza yerleştirin' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ color: '#64748b', fontSize: 13 }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Model Viewer */}
      {loaded ? (
        // @ts-ignore
        <model-viewer
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
          {/* @ts-ignore */}
          <button
            slot="ar-button"
            onClick={handleARActivate}
            style={{
              position: 'absolute',
              bottom: showCTA ? '170px' : '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff', border: 'none',
              padding: '16px 32px', borderRadius: 50,
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
              display: 'flex', alignItems: 'center', gap: 10,
              whiteSpace: 'nowrap', letterSpacing: '0.3px',
              transition: 'bottom 0.4s ease',
            }}>
            <span style={{ fontSize: 22 }}>🏠</span>
            Odama Yerleştir (AR)
          {/* @ts-ignore */}
          </button>
          {/* @ts-ignore */}
          <div slot="progress-bar" style={{ display: 'none' }} />
        {/* @ts-ignore */}
        </model-viewer>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            animation: 'pulse 2s ease-in-out infinite',
          }}>📦</div>
          <p style={{ color: '#64748b', fontSize: 16 }}>3D Model yükleniyor...</p>
          <div style={{ width: 200, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
              borderRadius: 4, animation: 'loading 1.5s ease-in-out infinite', width: '60%',
            }} />
          </div>
        </div>
      )}

      {/* CTA Button — appears after 8s */}
      {showCTA && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 25, animation: 'slideUp 0.5s ease',
        }}>
          <button onClick={handleDemoRequest} style={{
            background: 'linear-gradient(135deg, #ec4899, #be185d)',
            color: '#fff', border: 'none',
            padding: '14px 28px', borderRadius: 50,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(236,72,153,0.5)',
            display: 'flex', alignItems: 'center', gap: 10,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 20 }}>💬</span>
            Demo Talep Et
          </button>
        </div>
      )}

      {/* Bottom Bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '16px 20px 24px',
        background: 'linear-gradient(to top, rgba(3,3,8,0.9) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>⚡</span>
          </div>
          <span style={{ color: '#334155', fontSize: 12 }}>LeadFlow AI</span>
        </div>
        <div style={{ display: 'flex', gap: 16, color: '#334155', fontSize: 12 }}>
          <span>⏱️ {viewTime}s</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes loading {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        model-viewer {
          --progress-bar-color: #ec4899;
          --progress-bar-height: 3px;
          background: linear-gradient(135deg, #030308 0%, #0d0d1a 100%);
        }
      `}</style>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff', width: 36, height: 36, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: 16,
}

export default function ARViewerPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#030308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569' }}>Yükleniyor...</p>
      </div>
    }>
      <ARViewerContent />
    </Suspense>
  )
}
