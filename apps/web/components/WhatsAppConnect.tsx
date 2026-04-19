'use client'
import { useState, useEffect, useRef } from 'react'
import { MessageSquare, RefreshCw, CheckCircle, X, Wifi, WifiOff, QrCode } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }
function authH() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }

interface Props {
  memberId: string
  memberName: string
  onConnected?: (phone: string) => void
}

export default function WhatsAppConnect({ memberId, memberName, onConnected }: Props) {
  const [step, setStep] = useState<'idle' | 'creating' | 'qr' | 'connected' | 'error'>('idle')
  const [instanceId, setInstanceId] = useState<string>('')
  const [qrImage, setQrImage] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [countdown, setCountdown] = useState(60)
  const pollRef = useRef<any>(null)
  const countRef = useRef<any>(null)

  useEffect(() => { return () => { clearInterval(pollRef.current); clearInterval(countRef.current) } }, [])

  async function startConnect() {
    setStep('creating')
    setError('')
    try {
      const r = await fetch(`${API}/api/green-api/instance/create`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ memberId })
      })
      const d = await r.json()
      if (!d.instanceId) throw new Error(d.error || 'Instance oluşturulamadı')
      setInstanceId(d.instanceId)
      setStep('qr')
      setCountdown(60)
      startPolling(d.instanceId)
    } catch (e: any) {
      setError(e.message)
      setStep('error')
    }
  }

  function startPolling(id: string) {
    // QR polling
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/green-api/instance/${id}/qr`, { headers: authH() })
        const d = await r.json()
        if (d.status === 'connected') {
          clearInterval(pollRef.current)
          clearInterval(countRef.current)
          // Status'u kontrol et
          const sr = await fetch(`${API}/api/green-api/instance/${id}/status`, { headers: authH() })
          const sd = await sr.json()
          const connectedPhone = sd.gateway?.phone || ''
          setPhone(connectedPhone)
          setStep('connected')
          onConnected?.(connectedPhone)
        } else if (d.qr) {
          setQrImage(d.qr)
        }
      } catch {}
    }, 3000)

    // Countdown
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(pollRef.current)
          clearInterval(countRef.current)
          if (step !== 'connected') {
            setStep('idle')
            setQrImage('')
          }
          return 60
        }
        return prev - 1
      })
    }, 1000)
  }

  async function disconnect() {
    if (!instanceId) return
    try {
      await fetch(`${API}/api/green-api/instance/${instanceId}`, {
        method: 'DELETE', headers: authH()
      })
    } catch {}
    clearInterval(pollRef.current)
    clearInterval(countRef.current)
    setStep('idle')
    setQrImage('')
    setInstanceId('')
    setPhone('')
  }

  if (step === 'connected') {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-emerald-400"/>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-emerald-400">WhatsApp Bağlandı</div>
          <div className="text-xs text-slate-400 font-mono">{phone}</div>
        </div>
        <button onClick={disconnect} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
          <WifiOff className="w-3.5 h-3.5"/> Bağlantıyı Kes
        </button>
      </div>
    )
  }

  if (step === 'qr' && qrImage) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white flex items-center gap-2">
            <QrCode className="w-4 h-4 text-teal-400"/>
            QR Kodu Tara
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{countdown}s</span>
            <button onClick={() => { clearInterval(pollRef.current); clearInterval(countRef.current); setStep('idle'); setQrImage('') }}
              className="text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl inline-block">
          <img src={qrImage} alt="WhatsApp QR" className="w-48 h-48"/>
        </div>
        <div className="text-xs text-slate-400 space-y-1">
          <p>1. WhatsApp'ı aç</p>
          <p>2. Bağlı Cihazlar → Cihaz Ekle</p>
          <p>3. Bu QR kodu tara</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-teal-400">
          <RefreshCw className="w-3 h-3 animate-spin"/>
          Bağlantı bekleniyor...
        </div>
      </div>
    )
  }

  if (step === 'creating' || (step === 'qr' && !qrImage)) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <RefreshCw className="w-5 h-5 text-teal-400 animate-spin"/>
        <div>
          <div className="text-sm text-white">QR hazırlanıyor...</div>
          <div className="text-xs text-slate-500">Birkaç saniye bekleyin</div>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <WifiOff className="w-4 h-4 shrink-0"/>
          {error}
        </div>
        <button onClick={startConnect} className="text-xs text-slate-400 hover:text-white">Tekrar dene</button>
      </div>
    )
  }

  return (
    <button onClick={startConnect}
      className="flex items-center gap-2 px-4 py-2.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-400 rounded-xl text-sm font-medium transition-all w-full justify-center">
      <MessageSquare className="w-4 h-4"/>
      WhatsApp Bağla (QR ile)
    </button>
  )
}