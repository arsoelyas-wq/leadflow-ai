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
    const refreshInterval = setInterval(load, 30000)
    return () => clearInterval(refreshInterval)
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
      {/* Hero — compact */}
      <div style={{ background: '#ffffff', border: '1px solid #d1fae5', borderRadius: 16, padding: '18px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: health > 80 ? '#ecfdf5' : health > 50 ? '#fffbeb' : '#fef2f2', border: `1px solid ${health > 80 ? '#a7f3d0' : health > 50 ? '#fde68a' : '#fecaca'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{health > 80 ? '💚' : health > 50 ? '🟡' : '🔴'}</div>
          <div>
            <h1 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: '0 0 3px' }}>Sistem Monitörü</h1>
            <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Sağlık: %{health} {lastUpdate ? `· Son: ${lastUpdate.toLocaleTimeString()}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {[{l:'Hata',v:status?.errors?.lastHour||0,c:status?.errors?.lastHour>0?'#ef4444':'#10b981'},{l:'Uptime',v:`%${status?.uptime?.percent24h||100}`,c:'#22c55e'},{l:'Yanıt',v:`${status?.uptime?.avgResponseMs||0}ms`,c:'#06b6d4'}].map(m => (
              <div key={m.l} style={{ textAlign:'center' }}><p style={{ color:m.c, fontSize:16, fontWeight:800, margin:0 }}>{m.v}</p><p style={{ color:'#94a3b8', fontSize:9, margin:0 }}>{m.l}</p></div>
            ))}
          </div>
          <button onClick={load} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, border:'1px solid #a7f3d0', background:'#ecfdf5', color:'#059669', fontSize:11, cursor:'pointer' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'sp-spin 1s linear infinite' : 'none' }} /> Yenile
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${autoRefresh?'#a5f3fc':'#e2e8f0'}`, background:autoRefresh?'#ecfeff':'transparent', color:autoRefresh?'#0d9488':'#64748b', fontSize:10, cursor:'pointer' }}>
            {autoRefresh ? '⚡ 30s' : '○ Oto'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Uptime (24s)', value: `%${status?.uptime?.percent24h || 100}`, sub: status?.uptime?.formatted || '—', color: '#10b981', icon: <Activity size={15} />, data: uptimeLogs.map((l: any) => l.status === 'up' ? 100 : 0) },
          { label: t('Yanıt Süresi','Yanıt Süresi'), value: `${status?.uptime?.avgResponseMs || 0}ms`, sub: 'Son 24 saat', color: '#06b6d4', icon: <Clock size={15} />, data: responseTimes },
          { label: t('Bellek Kullanımı','Bellek Kullanımı'), value: `${status?.memory?.heapUsed || 0}MB`, sub: `%${status?.memory?.percent || 0} doldu`, color: (status?.memory?.percent || 0) > 80 ? '#ef4444' : '#8b5cf6', icon: <HardDrive size={15} />, data: [] },
          { label: 'CPU / Sistem', value: status?.system?.cpuCount ? `${status.system.cpuCount} çekirdek` : '—', sub: status?.system?.nodeVersion || '—', color: '#f59e0b', icon: <Cpu size={15} />, data: [] },
        ].map(card => (
          <div key={card.label} style={{ background: '#ffffff', border: `1px solid ${card.color}20`, borderRadius: 16, padding: '18px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: card.color }}>{card.icon}<span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{card.label}</span></div>
            <p style={{ color: card.color, fontSize: 22, fontWeight: 800, margin: '0 0 3px' }}>{card.value}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{card.sub}</p>
              {card.data.length > 1 && <Sparkline data={card.data} color={card.color} />}
            </div>
            {card.label === 'Bellek Kullanımı' && (
              <div style={{ marginTop: 8, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${status?.memory?.percent || 0}%`, background: card.color, borderRadius: 2 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent uptime + system info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>📡 Son Kontroller</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {uptimeLogs.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 12 }}>{t('monitoring.henuz_kontrol_yapilmadi', 'Henüz kontrol yapılmadı')}</p>
            ) : uptimeLogs.slice(0, 12).map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#f8fafc', borderRadius: 8 }}>
                {log.status === 'up' ? <CheckCircle size={12} color="#059669" /> : <XCircle size={12} color="#dc2626" />}
                <span style={{ color: log.status === 'up' ? '#059669' : '#dc2626', fontSize: 11 }}>{log.status === 'up' ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                <span style={{ color: '#475569', fontSize: 11 }}>{log.response_time_ms}ms</span>
                <span style={{ color: '#475569', fontSize: 10, marginLeft: 'auto' }}>{new Date(log.checked_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>⚙️ Sistem Bilgisi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { k: 'Platform', v: status?.system?.platform },
              { k: 'Node.js', v: status?.system?.nodeVersion },
              { k: 'CPU Çekirdek', v: status?.system?.cpuCount },
              { k: 'Load Average', v: status?.system?.loadAvg },
              { k: 'RSS Bellek', v: status?.memory?.rss ? `${status.memory.rss} MB` : '—' },
              { k: 'Heap Toplam', v: status?.memory?.heapTotal ? `${status.memory.heapTotal} MB` : '—' },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569', fontSize: 12 }}>{k}</span>
                <span style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={15} color="#dc2626" />
          <h3 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: 0 }}>{t('monitoring.hata_loglari', 'Hata Logları')}</h3>
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
              <div key={err.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: `${levelColor[err.level] || '#ef4444'}18`, border: `1px solid ${levelColor[err.level] || '#ef4444'}30`, color: levelColor[err.level] || '#ef4444', fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                        {err.level?.toUpperCase()}
                      </span>
                      {err.endpoint && <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>{err.endpoint}</span>}
                      <span style={{ color: '#475569', fontSize: 10 }}>{new Date(err.created_at).toLocaleString()}</span>
                    </div>
                    <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{err.message}</p>
                    {err.stack_trace?.length > 0 && (
                      <button onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {expandedError === err.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Stack Trace ({err.stack_trace.length} frame)
                      </button>
                    )}
                    {expandedError === err.id && (
                      <div style={{ marginTop: 8, background: '#f8fafc', borderRadius: 8, padding: '10px 14px', maxHeight: 180, overflowY: 'auto' }}>
                        {err.stack_trace.map((frame: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'monospace', marginBottom: 3, opacity: frame.internal ? 0.3 : 1 }}>
                            <span style={{ color: '#475569', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ color: frame.internal ? '#94a3b8' : '#b45309' }}>{frame.function}</span>
                            {frame.file && <span style={{ color: '#2563eb' }}>{frame.file}:{frame.line}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => resolveError(err.id)} disabled={resolving === err.id}
                    style={{ padding: '6px 14px', borderRadius: 9, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#059669', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
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
