'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  ArrowLeft, Phone, Mail, Instagram, Globe, MapPin,
  Star, Edit2, Save, X, MessageSquare, Send
} from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  company_name: string
  contact_name?: string
  phone?: string
  email?: string
  instagram?: string
  website?: string
  city?: string
  sector?: string
  source: string
  score: number
  status: string
  notes?: string
  created_at: string
}

const statusOptions = [
  { value: 'new', label: 'Yeni', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'contacted', label: 'İletişime Geçildi', color: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'replied', label: 'Cevap Verdi', color: 'bg-green-500/20 text-green-300' },
  { value: 'offered', label: 'Teklif Verildi', color: 'bg-purple-500/20 text-purple-300' },
  { value: 'won', label: 'Kazanıldı', color: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'lost', label: 'Kaybedildi', color: 'bg-red-500/20 text-red-300' },
]

const sourceLabel: Record<string, string> = {
  google_maps: 'Google Maps', instagram: 'Instagram',
  linkedin: 'LinkedIn', manual: 'Manuel'
}

export default function LeadDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/api/leads/${id}`)
      .then(data => {
        setLead(data.lead)
        setNotes(data.lead.notes || '')
      })
      .catch(() => router.push('/leads'))
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (newStatus: string) => {
    if (!lead) return
    setSaving(true)
    try {
      const data = await api.patch(`/api/leads/${id}`, { status: newStatus })
      setLead(data.lead)
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    try {
      const data = await api.patch(`/api/leads/${id}`, { notes })
      setLead(data.lead)
      setEditingNotes(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Yükleniyor...</div>
    </div>
  )

  if (!lead) return null

  const currentStatus = statusOptions.find(s => s.value === lead.status)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{lead.company_name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {sourceLabel[lead.source] || lead.source} · {new Date(lead.created_at).toLocaleDateString('tr-TR')}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${currentStatus?.color}`}>
          {currentStatus?.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sol kolon — İletişim bilgileri */}
        <div className="col-span-2 space-y-4">

          {/* İletişim Kartı */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">İletişim Bilgileri</h2>
            <div className="space-y-3">
              {lead.contact_name && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                    <span className="text-slate-300 text-xs">👤</span>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Yetkili</p>
                    <p className="text-white text-sm">{lead.contact_name}</p>
                  </div>
                </div>
              )}

              {lead.phone ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Phone size={14} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Telefon</p>
                    <a href={`tel:${lead.phone}`} className="text-white text-sm hover:text-green-400 transition">
                      {lead.phone}
                    </a>
                  </div>
                  <a href={`https://wa.me/${lead.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="ml-auto px-3 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs rounded-lg transition">
                    WhatsApp →
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Phone size={14} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Telefon yok</p>
                </div>
              )}

              {lead.email ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Mail size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-white text-sm hover:text-blue-400 transition">
                      {lead.email}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Mail size={14} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Email yok</p>
                </div>
              )}

              {lead.instagram && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center">
                    <Instagram size={14} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Instagram</p>
                    <a href={`https://instagram.com/${lead.instagram.replace('@','')}`}
                      target="_blank" rel="noreferrer"
                      className="text-white text-sm hover:text-pink-400 transition">
                      {lead.instagram}
                    </a>
                  </div>
                </div>
              )}

              {lead.website && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Globe size={14} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Website</p>
                    <a href={lead.website} target="_blank" rel="noreferrer"
                      className="text-white text-sm hover:text-purple-400 transition truncate block max-w-xs">
                      {lead.website}
                    </a>
                  </div>
                </div>
              )}

              {lead.city && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                    <MapPin size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Şehir</p>
                    <p className="text-white text-sm">{lead.city}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Notlar</h2>
              {!editingNotes ? (
                <button onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition">
                  <Edit2 size={14} /> Düzenle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveNotes} disabled={saving}
                    className="flex items-center gap-1 text-green-400 hover:text-green-300 text-sm transition">
                    <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => { setEditingNotes(false); setNotes(lead.notes || '') }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm transition">
                    <X size={14} /> İptal
                  </button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
            ) : (
              <p className="text-slate-300 text-sm leading-relaxed">
                {lead.notes || <span className="text-slate-500 italic">Not eklenmemiş. Düzenle butonuna tıkla.</span>}
              </p>
            )}
          </div>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-4">
          {/* Puan */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-slate-400 text-sm mb-3">AI Puanı</h3>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-white">{lead.score}</div>
              <div className="flex-1">
                <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                  <div className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${lead.score}%` }} />
                </div>
                <p className="text-slate-500 text-xs">/ 100</p>
              </div>
            </div>
          </div>

          {/* Durum Değiştir */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-slate-400 text-sm mb-3">Durumu Güncelle</h3>
            <div className="space-y-2">
              {statusOptions.map(opt => (
                <button key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  disabled={saving || lead.status === opt.value}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    lead.status === opt.value
                      ? `${opt.color} font-semibold`
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  } disabled:cursor-default`}>
                  {lead.status === opt.value ? '✓ ' : ''}{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hızlı Aksiyonlar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-slate-400 text-sm mb-3">Hızlı Aksiyon</h3>
            <div className="space-y-2">
              {lead.phone && (
                <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded-lg transition">
                  <MessageSquare size={14} /> WhatsApp Gönder
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm rounded-lg transition">
                  <Send size={14} /> Email Gönder
                </a>
              )}
              <Link href="/campaigns"
                className="flex items-center gap-2 w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg transition">
                <Star size={14} /> Kampanyaya Ekle
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}