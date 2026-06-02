'use client'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Activity, AlertCircle, CheckCircle, Clock, Cpu, HardDrive, RefreshCw, XCircle, ChevronDown, ChevronRight, Zap } from 'lucide-react'

// ── SYSTEM PULSE — ECG heartbeat orb ──────────────────────────────────────────
function SystemPulse({ size = 100, health = 100, scanning = false }: { size?: number; health?: number; scanning?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTick(p => p + 1), scanning ? 25 : 50)
    return () => clearInterval(t)
  }, [mounted, scanning])
  if (!mounted) return <div style={{ width: size * 2.2, height: size * 2.2, flexShrink: 0 }} />

  const cx = size * 1.1, s = size
  const color = health >= 95 ? '#10b981' : health >= 80 ? '#f59e0b' : '#ef4444'

  // ECG path around the sphere
  const ecgPts: string[] = []
  for (let i = 0; i <= 100; i++) {
    const t2 = (i / 100) * Math.PI * 2 + tick * 0.03
    const px = cx + Math.cos(t2) * s * 0.56
    const py = cx + Math.sin(t2) * s * 0.56
    const phase = (i + tick * 2) % 25
    const spike = phase === 12 ? -s * 0.14 : phase === 13 ? s * 0.07 : phase === 11 ? -s * 0.04 : 0
    const nx = px + Math.cos(t2 + Math.PI / 2) * spike
    const ny = py + Math.sin(t2 + Math.PI / 2) * spike
    ecgPts.push(`${i === 0 ? 'M' : 'L'}${nx.toFixed(1)} ${ny.toFixed(1)}`)
  }

  const pulseR = s * 0.38 + (scanning ? Math.sin(tick * 0.18) * s * 0.04 : Math.sin(tick * 0.06) * s * 0.015)

  return (
    <div style={{ width: s * 2.2, height: s * 2.2, flexShrink: 0 }}>
      <svg width={s * 2.2} height={s * 2.2}>
        <defs>
          <radialGradient id={`spGlow${s}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${color}00`} />
            <stop offset="100%" stopColor={`${color}15`} />
          </radialGradient>
          <radialGradient id={`spCore${s}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor={health >= 95 ? '#6ee7b7' : health >= 80 ? '#fde68a' : '#fca5a5'} />
            <stop offset="40%" stopColor={color} />
            <stop offset="100%" stopColor={health >= 95 ? '#064e3b' : health >= 80 ? '#78350f' : '#7f1d1d'} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cx} r={s * 1.05} fill={`url(#spGlow${s})`} />
        {[0.72, 0.88].map((r, i) => (
          <circle key={r} cx={cx} cy={cx} r={s * r} fill="none" stroke={`${color}15`} strokeWidth={0.8}
            strokeDasharray="5 6" style={{ animation: `sp-ring ${8+i*4}s linear ${i%2?'reverse':''} infinite`, transformOrigin: `${cx}px ${cx}px` }} />
        ))}
        <path d={ecgPts.join(' ')} fill="none" stroke={color} strokeWidth={1.8} opacity={0.75}
          style={{ filter: `drop-shadow(0 0 4px ${color}90)` }} />
        <circle cx={cx} cy={cx} r={pulseR} fill={`url(#spCore${s})`}
          style={{ filter: `drop-shadow(0 0 ${s*0.18}px ${color}bb)` }} />
        <text x={cx} y={cx - 4} fill="white" fontSize={s * 0.2} textAnchor="middle" dominantBaseline="middle" fontWeight="900">{health}</text>
        <text x={cx} y={cx + s * 0.14} fill={color} fontSize={s * 0.07} textAnchor="middle" fontWeight="700">SAĞLIK</text>
      </svg>
      <style>{`@keyframes sp-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Mini sparkline
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1), min = Math.min(...data)
  const w = 80, h = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ')
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length-1] - min) / (max - min || 1)) * h}
        r={2.5} fill={color} />
    </svg>
  )
}

export default function MonitoringPage() {
  const { t } = useI18n()
  const [status, setStatus] = useState<any>(null)
  const [errors, setErrors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const load = async () => {
    try {
      const [statusData, errorsData] = await Promise.all([
        api.get('/api/monitoring/status'),
        api.get('/api/monitoring/errors?limit=20&resolved=false'),
      ])
      setStatus(statusData)
      setErrors(errorsData.errors || [])
      setLastUpdate(new Date())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [autoRefresh])

  const resolveError = async (id: string) => {
    setResolving(id)
    try {
      await api.patch(`/api/monitoring/errors/${id}/resolve`, {})
      setErrors(prev => prev.filter(e => e.id !== id))
    } catch {}
    setResolving(null)
  }

  const health = status ? Math.max(0, 100 - (status.errors?.lastHour || 0) * 5 - (status.memory?.percent > 80 ? 15 : 0)) : 0
  const uptimeLogs = status?.recentUptime || []
  const responseTimes = uptimeLogs.map((l: any) => l.response_time_ms || 0)

  const levelColor: Record<string, string> = {
    error: '#ef4444', warning: '#f59e0b', info: '#06b6d4'
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(0,5,18,0.98),rgba(3,8,22,0.99))', borderRadius: 20, padding: '32px 28px', marginBottom: 24, border: '1px solid rgba(16,185,129,0.18)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.02) 1px,transparent 1px)', backgroundSize: '38px 38px', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 24 }}>
          <SystemPulse size={90} health={health} scanning={loading} />
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>{t('monitoring.sistem_monitoru', 'Sistem Monitörü')}</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px' }}>{t('monitoring.gercek_zamanli_sistem_sag', 'Gerçek zamanlı sistem sağlığı, hata takibi ve performans metrikleri')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#34d399', fontSize: 11, cursor: 'pointer' }}>
                <RefreshCw size={12} style={{ animation: loading ? 'sp-spin 1s linear infinite' : 'none' }} /> Yenile
              </button>
              <button onClick={() => setAutoRefresh(!autoRefresh)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: `1px solid ${autoRefresh ? 'rgba(6,182,212,0.3)' : 'rgba(100,116,139,0.2)'}`, background: autoRefresh ? 'rgba(6,182,212,0.08)' : 'transparent', color: autoRefresh ? '#22d3ee' : '#64748b', fontSize: 11, cursor: 'pointer' }}>
                <Zap size={12} /> {autoRefresh ? '30s Oto-Yenileme Aktif' : 'Oto-Yenileme Kapalı'}
              </button>
              {lastUpdate && <span style={{ color: '#334155', fontSize: 10 }}>Son: {lastUpdate.toLocaleTimeString('tr-TR')}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {[{l:'Hata (1s)',v:status?.errors?.lastHour||0,c:status?.errors?.lastHour>0?'#ef4444':'#10b981'},{l:'Uptime %',v:`%${status?.uptime?.percent24h||100}`,c:'#22c55e'},{l:'Ort. Yanıt',v:`${status?.uptime?.avgResponseMs||0}ms`,c:'#06b6d4'}].map(m => (
              <div key={m.l} style={{ textAlign: 'center' }}>
                <p style={{ color: m.c, fontSize: 16, fontWeight: 800, margin: 0 }}>{m.v}</p>
                <p style={{ color: '#334155', fontSize: 10, margin: 0 }}>{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Uptime (24s)', value: `%${status?.uptime?.percent24h || 100}`, sub: status?.uptime?.formatted || '—', color: '#10b981', icon: <Activity size={15} />, data: uptimeLogs.map((l: any) => l.status === 'up' ? 100 : 0) },
          { label: 'Yanıt Süresi', value: `${status?.uptime?.avgResponseMs || 0}ms`, sub: 'Son 24 saat', color: '#06b6d4', icon: <Clock size={15} />, data: responseTimes },
          { label: 'Bellek Kullanımı', value: `${status?.memory?.heapUsed || 0}MB`, sub: `%${status?.memory?.percent || 0} doldu`, color: (status?.memory?.percent || 0) > 80 ? '#ef4444' : '#8b5cf6', icon: <HardDrive size={15} />, data: [] },
          { label: 'CPU / Sistem', value: status?.system?.cpuCount ? `${status.system.cpuCount} çekirdek` : '—', sub: status?.system?.nodeVersion || '—', color: '#f59e0b', icon: <Cpu size={15} />, data: [] },
        ].map(card => (
          <div key={card.label} style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: `1px solid ${card.color}18`, borderRadius: 16, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: card.color }}>{card.icon}<span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{card.label}</span></div>
            <p style={{ color: card.color, fontSize: 22, fontWeight: 800, margin: '0 0 3px' }}>{card.value}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{card.sub}</p>
              {card.data.length > 1 && <Sparkline data={card.data} color={card.color} />}
            </div>
            {card.label === 'Bellek Kullanımı' && (
              <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${status?.memory?.percent || 0}%`, background: card.color, borderRadius: 2 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent uptime + system info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>📡 Son Kontroller</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {uptimeLogs.length === 0 ? (
              <p style={{ color: '#334155', fontSize: 12 }}>{t('monitoring.henuz_kontrol_yapilmadi', 'Henüz kontrol yapılmadı')}</p>
            ) : uptimeLogs.slice(0, 12).map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                {log.status === 'up' ? <CheckCircle size={12} color="#10b981" /> : <XCircle size={12} color="#ef4444" />}
                <span style={{ color: log.status === 'up' ? '#4ade80' : '#f87171', fontSize: 11 }}>{log.status === 'up' ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                <span style={{ color: '#334155', fontSize: 11 }}>{log.response_time_ms}ms</span>
                <span style={{ color: '#1e293b', fontSize: 10, marginLeft: 'auto' }}>{new Date(log.checked_at).toLocaleTimeString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>⚙️ Sistem Bilgisi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { k: 'Platform', v: status?.system?.platform },
              { k: 'Node.js', v: status?.system?.nodeVersion },
              { k: 'CPU Çekirdek', v: status?.system?.cpuCount },
              { k: 'Load Average', v: status?.system?.loadAvg },
              { k: 'RSS Bellek', v: status?.memory?.rss ? `${status.memory.rss} MB` : '—' },
              { k: 'Heap Toplam', v: status?.memory?.heapTotal ? `${status.memory.heapTotal} MB` : '—' },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#475569', fontSize: 12 }}>{k}</span>
                <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div style={{ background: 'linear-gradient(135deg,rgba(3,8,22,0.97),rgba(5,6,18,0.98))', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={15} color="#ef4444" />
          <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{t('monitoring.hata_loglari', 'Hata Logları')}</h3>
          {errors.length > 0 && <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{errors.length}</span>}
        </div>
        {errors.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Aktif hata yok 🎉</p>
          </div>
        ) : (
          <div>
            {errors.map(err => (
              <div key={err.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: `${levelColor[err.level] || '#ef4444'}18`, border: `1px solid ${levelColor[err.level] || '#ef4444'}30`, color: levelColor[err.level] || '#ef4444', fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                        {err.level?.toUpperCase()}
                      </span>
                      {err.endpoint && <span style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 10, padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>{err.endpoint}</span>}
                      <span style={{ color: '#1e293b', fontSize: 10 }}>{new Date(err.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{err.message}</p>
                    {err.stack_trace?.length > 0 && (
                      <button onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {expandedError === err.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Stack Trace ({err.stack_trace.length} frame)
                      </button>
                    )}
                    {expandedError === err.id && (
                      <div style={{ marginTop: 8, background: '#060a1c', borderRadius: 8, padding: '10px 14px', maxHeight: 180, overflowY: 'auto' }}>
                        {err.stack_trace.map((frame: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'monospace', marginBottom: 3, opacity: frame.internal ? 0.3 : 1 }}>
                            <span style={{ color: '#334155', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ color: frame.internal ? '#475569' : '#fbbf24' }}>{frame.function}</span>
                            {frame.file && <span style={{ color: '#3b82f6' }}>{frame.file}:{frame.line}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => resolveError(err.id)} disabled={resolving === err.id}
                    style={{ padding: '6px 14px', borderRadius: 9, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#34d399', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                    {resolving === err.id ? '...' : '✅ Çözüldü'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes sp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
