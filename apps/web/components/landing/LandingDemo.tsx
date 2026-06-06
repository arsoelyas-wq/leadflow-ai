'use client'
import { useState } from 'react'
import { Play, X, Clock, CheckCircle } from 'lucide-react'

export default function LandingDemo() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="demo" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold mb-6">
            <Clock size={13} />
            2 dakikada anlayın
          </div>
          <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
            Ürünü canlı{' '}
            <span className="gradient-text-blue">görün</span>
          </h2>
          <p className="text-[17px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            Kurulum, lead toplama ve ilk kampanya gönderme — 2 dakikada nasıl yapıldığını izleyin.
          </p>
        </div>

        {/* Video container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 group">
          {/* Poster / placeholder */}
          {!playing && (
            <div
              className="relative cursor-pointer"
              onClick={() => setPlaying(true)}
              style={{
                background: 'linear-gradient(145deg, #060a14 0%, #0d111f 50%, #060a14 100%)',
                aspectRatio: '16/9',
              }}
            >
              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />

              {/* Dashboard preview (simplified) */}
              <div className="absolute inset-8 rounded-xl overflow-hidden" style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 p-5">
                  {['2,847 Lead', '₺874K Pipeline', '%87 Dönüşüm', '4,203 Kredi'].map((s, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-white text-sm font-bold">{s.split(' ')[0]}</div>
                      <div className="text-white/30 text-xs">{s.split(' ').slice(1).join(' ')}</div>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="mx-5 rounded-xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-end gap-1 h-16">
                    {[3,5,4,7,5,8,7,10,8,11,9,13,11,15].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{ height: `${h * 5}%`, background: i >= 12 ? 'rgba(59,130,246,0.9)' : i >= 10 ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.2)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Blur overlay */}
              <div className="absolute inset-0" style={{ background: 'rgba(6,10,20,0.4)', backdropFilter: 'blur(2px)' }} />

              {/* Play button */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-18 h-18 lg:w-20 lg:h-20 rounded-full bg-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
                  style={{ width: 72, height: 72 }}>
                  <Play size={28} className="text-blue-600 fill-blue-600 ml-1.5" />
                </div>
                <div className="text-white text-[15px] font-semibold">Demo İzle — 2 dk</div>
              </div>

              {/* Duration badge */}
              <div className="absolute bottom-5 right-5 bg-black/60 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                2:14
              </div>
            </div>
          )}

          {/* Video player (YouTube/placeholder) */}
          {playing && (
            <div className="relative" style={{ aspectRatio: '16/9', background: '#000' }}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white/50 text-sm">Video yükleniyor...</div>
              </div>
              <button
                onClick={() => setPlaying(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Trust bullets below video */}
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {[
            'Kurulum gerektirmez',
            'İlk lead 10 dakikada',
            'Destek ekibi yanında',
          ].map(t => (
            <div key={t} className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-500" />
              <span className="text-[14px] text-slate-600 font-medium">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
