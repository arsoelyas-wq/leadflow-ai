'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Zap, MessageSquare, Mail, BarChart3, Users, Target,
  CheckCircle, ArrowRight, Star, Shield, Globe, ChevronRight,
  TrendingUp, Clock, Bot, Search
} from 'lucide-react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const target = 2847
    const duration = 2000
    const step = target / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setCount(Math.floor(current))
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#080C14] text-white overflow-x-hidden">

      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-600/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#080C14]/90 backdrop-blur-xl border-b border-white/5' : ''
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">LeadFlow AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">Özellikler</a>
            <a href="#how" className="hover:text-white transition">Nasıl Çalışır</a>
            <a href="#pricing" className="hover:text-white transition">Fiyatlar</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition px-4 py-2">
              Giriş Yap
            </Link>
            <Link href="/register" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition font-medium">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-36 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Yapay Zeka Destekli B2B Lead Platformu
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="text-white">Doğru Müşteriye</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Doğru Anda Ulaş
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Google Maps'ten otomatik lead çek, WhatsApp ve email ile kişiselleştirilmiş
            kampanyalar yürüt. Rakiplerinden önce müşteri kazan.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register"
              className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-base transition shadow-lg shadow-blue-600/25">
              Hemen Başla — Ücretsiz
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-medium text-base transition">
              Demo İzle
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
            {[
              { value: `${count.toLocaleString()}+`, label: 'Lead Oluşturuldu' },
              { value: '%34', label: 'Ortalama Yanıt Oranı' },
              { value: '10x', label: 'Daha Hızlı Outreach' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="max-w-4xl mx-auto mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-transparent to-transparent z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 bg-slate-700/50 rounded-md h-5 text-xs text-slate-500 flex items-center px-3">
                leadflow.ai/dashboard
              </div>
            </div>
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Toplam Lead', value: '1,248', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Aktif Kampanya', value: '3', color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Cevap Oranı', value: '%34', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Kalan Kredi', value: '850', color: 'text-orange-400', bg: 'bg-orange-500/10' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 border border-white/5`}>
                  <div className="text-slate-400 text-xs mb-2">{label}</div>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300 text-sm font-medium">Son Leadler</span>
                  <span className="text-blue-400 text-xs">Tümünü gör →</span>
                </div>
                {['Dekor Panel A.Ş. · İstanbul', 'EuroPanel Ltd. · Ankara', 'Stone Panel Co. · İzmir'].map((lead, i) => (
                  <div key={lead} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-300 text-xs font-bold">
                        {lead[0]}
                      </div>
                      <span className="text-slate-300 text-xs">{lead}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">Yeni</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Her şey tek platformda
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Lead bulmaktan anlaşmayı kapatmaya kadar tüm süreç otomatik
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Search, color: 'blue',
                title: 'Akıllı Lead Scraping',
                desc: 'Google Maps\'ten sektör ve lokasyona göre binlerce potansiyel müşteriyi dakikalar içinde çek. AI ile kalite skorlama.',
              },
              {
                icon: MessageSquare, color: 'green',
                title: 'WhatsApp Kampanyaları',
                desc: 'Meta\'nın resmi Cloud API\'si ile kişiselleştirilmiş WhatsApp mesajları gönder. Yüksek açılma oranı, sıfır ban riski.',
              },
              {
                icon: Mail, color: 'purple',
                title: 'Email Otomasyonu',
                desc: 'SMTP ile kendi email adresinizden otomatik kampanyalar. Takip mesajları ve dizi gönderimler.',
              },
              {
                icon: Bot, color: 'cyan',
                title: 'AI Mesaj Yazıcı',
                desc: 'Yapay zeka her lead için özelleştirilmiş mesajlar oluşturur. Sektöre göre ton ve içerik otomatik ayarlanır.',
              },
              {
                icon: BarChart3, color: 'orange',
                title: 'Detaylı Analitik',
                desc: 'Gönderim, açılma, tıklama ve cevap oranlarını takip et. Hangi kampanya daha iyi çalışıyor görün.',
              },
              {
                icon: Users, color: 'pink',
                title: 'CRM Entegrasyonu',
                desc: 'Leadleri müşteri aşamasına göre yönet, notlar ekle, takip tarihleri belirle. Hiçbir fırsat kaçmasın.',
              },
            ].map(({ icon: Icon, color, title, desc }) => {
              const colors: any = {
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                green: 'bg-green-500/10 text-green-400 border-green-500/20',
                purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
              }
              return (
                <div key={title} className="group bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${colors[color]}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">3 adımda başla</h2>
            <p className="text-slate-400 text-lg">Kurulum yok, teknik bilgi gerekmez</p>
          </div>
          <div className="space-y-6">
            {[
              { step: '01', title: 'Leadleri Bul', desc: 'Sektör ve şehir seç, yapay zeka Google Maps\'ten potansiyel müşterileri otomatik çeker ve kalite skorlar.', icon: Target },
              { step: '02', title: 'Kampanya Oluştur', desc: 'WhatsApp veya email kanalını seç, mesaj şablonunu yaz veya AI\'a yazdır, gönderim zamanlamasını ayarla.', icon: Zap },
              { step: '03', title: 'Takip Et ve Kazan', desc: 'Cevap veren leadleri takip et, otomatik follow-up\'lar gönder, anlaşmaları kapat.', icon: TrendingUp },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="flex gap-6 items-start group">
                <div className="shrink-0 w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/20 transition">
                  <Icon size={22} className="text-blue-400" />
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-blue-500 text-xs font-mono font-bold">{step}</span>
                    <h3 className="text-white font-semibold text-lg">{title}</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{desc}</p>
                </div>
                {i < 2 && <div className="absolute left-7 mt-14 w-px h-6 bg-slate-700" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Şeffaf fiyatlandırma</h2>
            <p className="text-slate-400 text-lg">Kredi bazlı sistem — sadece kullandığın kadar öde</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter', price: '₺499', period: '/ay', popular: false,
                credits: '500 Kredi',
                features: ['500 lead scraping', 'WhatsApp kampanyaları', 'Email kampanyaları', 'AI mesaj yazıcı', 'Temel analitik'],
              },
              {
                name: 'Growth', price: '₺1.299', period: '/ay', popular: true,
                credits: '2.000 Kredi',
                features: ['2.000 lead scraping', 'WhatsApp kampanyaları', 'Email kampanyaları', 'AI mesaj yazıcı', 'Gelişmiş analitik', 'Öncelikli destek'],
              },
              {
                name: 'Scale', price: '₺2.999', period: '/ay', popular: false,
                credits: '10.000 Kredi',
                features: ['10.000 lead scraping', 'Sınırsız kampanya', 'Çoklu kanal', 'AI mesaj yazıcı', 'Tam analitik', 'Özel destek & onboarding'],
              },
            ].map(({ name, price, period, popular, credits, features }) => (
              <div key={name} className={`relative rounded-2xl p-6 border transition ${
                popular
                  ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/50 border-slate-700/50'
              }`}>
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    En Popüler
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-white font-bold text-lg mb-1">{name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{price}</span>
                    <span className="text-slate-400 text-sm">{period}</span>
                  </div>
                  <div className="text-blue-400 text-sm mt-1 font-medium">{credits}</div>
                </div>
                <ul className="space-y-3 mb-6">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <CheckCircle size={15} className="text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition ${
                    popular
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}>
                  Başla
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 rounded-3xl p-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Bugün başla, yarın müşteri kazan
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              50 ücretsiz kredi ile hemen dene. Kredi kartı gerekmez.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl font-bold text-lg transition shadow-xl shadow-blue-600/30">
              Ücretsiz Hesap Aç
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-white font-bold">LeadFlow AI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition">Gizlilik Politikası</Link>
            <Link href="/terms" className="hover:text-slate-300 transition">Kullanım Koşulları</Link>
            <a href="mailto:support@leadflow.ai" className="hover:text-slate-300 transition">İletişim</a>
          </div>
          <p className="text-slate-600 text-sm">© 2026 LeadFlow AI</p>
        </div>
      </footer>
    </div>
  )
}
import ChatWidget from '@/components/ChatWidget'
// ... mevcut kod ...
// En sona, </> veya son div'den önce:
<ChatWidget />