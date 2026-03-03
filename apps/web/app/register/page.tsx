'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-white text-2xl font-bold">LeadFlow AI</span>
          </div>
          <p className="text-slate-400">Ucretsiz hesap olusturun — 50 lead hediye!</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Ad Soyad</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                required
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="Ahmet Yilmaz"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Firma Adi</label>
              <input
                type="text"
                value={form.company}
                onChange={e => setForm({...form, company: e.target.value})}
                required
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="Ornek Ticaret A.S."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">E-posta</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="ornek@firma.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Sifre</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required
                minLength={6}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="En az 6 karakter"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition mt-2"
            >
              {loading ? 'Hesap olusturuluyor...' : 'Ucretsiz Basla'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            Zaten hesabiniz var mi?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">Giris Yap</Link>
          </p>
        </div>
      </div>
    </div>
  )
}