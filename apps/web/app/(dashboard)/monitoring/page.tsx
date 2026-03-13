'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Activity, AlertCircle, CheckCircle, Clock, Cpu, HardDrive, RefreshCw, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface SystemStatus {
  status: string
  uptime: { seconds: number; formatted: string; percent24h: number; avgResponseMs: number }
  memory: { heapUsed: number; heapTotal: number; rss: number; percent: number }
  system: { platform: string; nodeVersion: string; cpuCount: number; loadAvg: string }
  errors: { lastHour: number }
  recentUptime: { status: string; response_time_ms: number; checked_at: string }[]
}

interface ErrorLog {
  id: string
  level: string
  message: string
  stack_trace: any[]
  context: any
  endpoint: string
  resolved: boolean
  created_at: string
}

export default function MonitoringPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [statusData, errorsData] = await Promise.all([
        api.get('/api/monitoring/status'),
        api.get('/api/monitoring/errors?limit=20&resolved=false'),
      ])
      setStatus(statusData)
      setErrors(errorsData.errors || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resolveError = async (id: string) => {
    setResolving(id)
    try {
      await api.patch(`/api/monitoring/errors/${id}/resolve`, {})
      setErrors(prev => prev.filter(e => e.id !== id))
    } catch {}
    setResolving(null)
  }

  const levelColor: Record<string, string> = {
    error: 'bg-red-500/10 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }

  const formatTime = (d: string) => new Date(d).toLocaleString('tr-TR')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sistem Monitörü</h1>
          <p className="text-slate-400 mt-1 text-sm">Canlı sistem durumu ve hata takibi</p>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sistem Durumu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-emerald-400" />
            <span className="text-slate-400 text-sm">Uptime (24s)</span>
          </div>
          <p className="text-2xl font-bold text-white">%{status?.uptime.percent24h || 100}</p>
          <p className="text-slate-500 text-xs mt-1">{status?.uptime.formatted}</p>
          <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${status?.uptime.percent24h || 100}%` }} />
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-blue-400" />
            <span className="text-slate-400 text-sm">Ort. Yanıt</span>
          </div>
          <p className="text-2xl font-bold text-white">{status?.uptime.avgResponseMs || 0}ms</p>
          <p className="text-slate-500 text-xs mt-1">Son 24 saat</p>
        </div>

        {/* Memory */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-purple-400" />
            <span className="text-slate-400 text-sm">Bellek</span>
          </div>
          <p className="text-2xl font-bold text-white">{status?.memory.heapUsed || 0}MB</p>
          <p className="text-slate-500 text-xs mt-1">%{status?.memory.percent || 0} kullanımda</p>
          <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${(status?.memory.percent || 0) > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
              style={{ width: `${status?.memory.percent || 0}%` }}
            />
          </div>
        </div>

        {/* Hatalar */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-slate-400 text-sm">Hatalar (1s)</span>
          </div>
          <p className={`text-2xl font-bold ${(status?.errors.lastHour || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
            {status?.errors.lastHour || 0}
          </p>
          <p className="text-slate-500 text-xs mt-1">Son 1 saatte</p>
        </div>
      </div>

      {/* Sistem Bilgisi */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu size={15} className="text-blue-400" /> Sistem
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Platform', value: status?.system.platform },
              { label: 'Node.js', value: status?.system.nodeVersion },
              { label: 'CPU Çekirdek', value: status?.system.cpuCount },
              { label: 'Load Average', value: status?.system.loadAvg },
              { label: 'RSS Bellek', value: `${status?.memory.rss || 0} MB` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Son Uptime Logları */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Son Kontroller</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(status?.recentUptime || []).map((log, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {log.status === 'up'
                    ? <CheckCircle size={12} className="text-emerald-400" />
                    : <XCircle size={12} className="text-red-400" />}
                  <span className={log.status === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                    {log.status === 'up' ? 'Çevrimiçi' : 'Çevrimdışı'}
                  </span>
                </div>
                <span className="text-slate-500">{log.response_time_ms}ms</span>
                <span className="text-slate-600">{formatTime(log.checked_at)}</span>
              </div>
            ))}
            {!status?.recentUptime?.length && (
              <p className="text-slate-500 text-xs">Henüz kontrol yapılmadı</p>
            )}
          </div>
        </div>
      </div>

      {/* Hata Logları */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400" />
            Hata Logları
            {errors.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                {errors.length}
              </span>
            )}
          </h2>
        </div>

        {errors.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-400">Aktif hata yok 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {errors.map(err => (
              <div key={err.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${levelColor[err.level] || levelColor.error}`}>
                        {err.level.toUpperCase()}
                      </span>
                      {err.endpoint && (
                        <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded">
                          {err.endpoint}
                        </span>
                      )}
                      <span className="text-slate-600 text-xs">{formatTime(err.created_at)}</span>
                    </div>
                    <p className="text-white text-sm font-medium">{err.message}</p>

                    {/* Stack Trace */}
                    {err.stack_trace && err.stack_trace.length > 0 && (
                      <button
                        onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}
                        className="flex items-center gap-1 text-blue-400 text-xs mt-2 hover:text-blue-300 transition"
                      >
                        {expandedError === err.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Stack Trace ({err.stack_trace.length} frame)
                      </button>
                    )}

                    {expandedError === err.id && (
                      <div className="mt-2 bg-slate-900 rounded-lg p-3 overflow-x-auto">
                        <div className="space-y-1">
                          {err.stack_trace.map((frame: any, i: number) => (
                            <div key={i} className={`text-xs font-mono flex items-start gap-2 ${frame.internal ? 'opacity-30' : ''}`}>
                              <span className="text-slate-600 shrink-0 w-4 text-right">{i + 1}</span>
                              <div>
                                <span className={frame.internal ? 'text-slate-500' : 'text-yellow-400'}>
                                  {frame.function}
                                </span>
                                {frame.file && (
                                  <span className="text-slate-500">
                                    {' '}
                                    <span className={frame.internal ? 'text-slate-600' : 'text-blue-400'}>
                                      {frame.file}
                                    </span>
                                    <span className="text-slate-600">:{frame.line}:{frame.col}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Context */}
                    {err.context && Object.keys(err.context).length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {Object.entries(err.context).map(([k, v]) => (
                          <span key={k} className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => resolveError(err.id)}
                    disabled={resolving === err.id}
                    className="shrink-0 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg transition disabled:opacity-50"
                  >
                    {resolving === err.id ? '...' : 'Çözüldü'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}