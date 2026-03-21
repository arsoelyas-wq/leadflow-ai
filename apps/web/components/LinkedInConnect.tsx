// Bu sayfayı /settings veya /decision-maker'a ekleyeceğiz
// LinkedIn bağlantı butonu - token localStorage'dan alır

'use client'
import { useState, useEffect } from 'react'
import { Linkedin, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react'

export default function LinkedInConnect() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const API = 'https://leadflow-ai-production.up.railway.app'

  const getToken = () => localStorage.getItem('token') || ''

  const checkStatus = async () => {
    try {
      const r = await fetch(`${API}/api/linkedin/status`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setStatus(await r.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { checkStatus() }, [])

  // Callback gelince kontrol et
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'linkedin_connected') {
      checkStatus()
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('linkedin_code')) {
      handleCode(params.get('linkedin_code')!)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleCode = async (code: string) => {
    setConnecting(true)
    try {
      const r = await fetch(`${API}/api/linkedin/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (data.success) await checkStatus()
    } catch {}
    finally { setConnecting(false) }
  }

  const connect = async () => {
    setConnecting(true)
    try {
      // Token'ı state'e göm
      const token = getToken()
      const stateData = btoa(JSON.stringify({ 
        userId: '317808ca-279c-471a-a147-43c395ce59e7', 
        token,
        ts: Date.now() 
      }))
      
      // Redirect URI'yi şu anki sayfaya yönlendir
      const redirectUri = `${window.location.origin}/api/auth/linkedin/callback`
      const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=775y6eze63qpk3&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email%20w_member_social&state=${stateData}`
      
      window.location.href = url
    } catch {}
    finally { setConnecting(false) }
  }

  const disconnect = async () => {
    await fetch(`${API}/api/linkedin/disconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    await checkStatus()
  }

  if (loading) return <div className="animate-pulse bg-slate-800 rounded-xl h-20" />

  return (
    <div className={`p-5 rounded-xl border ${status?.connected ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status?.connected ? 'bg-blue-600' : 'bg-slate-700'}`}>
            <Linkedin size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-medium">LinkedIn</p>
            {status?.connected ? (
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle size={11} /> {status.name || status.email} bağlı
              </p>
            ) : (
              <p className="text-slate-400 text-xs">Bağlı değil</p>
            )}
          </div>
        </div>

        {status?.connected ? (
          <button onClick={disconnect}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition">
            Bağlantıyı Kes
          </button>
        ) : (
          <button onClick={connect} disabled={connecting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition">
            {connecting ? <RefreshCw size={14} className="animate-spin" /> : <Linkedin size={14} />}
            {connecting ? 'Bağlanıyor...' : 'LinkedIn Bağla'}
          </button>
        )}
      </div>
    </div>
  )
}