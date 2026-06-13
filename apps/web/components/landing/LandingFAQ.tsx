'use client'
import { useState } from 'react'
import { Plus, Minus, HelpCircle } from 'lucide-react'
import Reveal from './Reveal'

const FAQS = [
  {
    q: 'Deneme süresi için kredi kartı gerekiyor mu?',
    a: 'Hayır. 14 günlük ücretsiz deneme süresinde kredi kartı bilgisi istenmez. Süre sonunda isterseniz ücretli plana geçersiniz, istemezseniz hesabınız otomatik olarak ücretsiz katmana alınır.',
  },
  {
    q: 'KVKK ve GDPR\'a uyumlu mu?',
    a: 'Evet. LeadFlow Türk KVKK mevzuatı ve AB GDPR\'ına tam uyumlu olacak şekilde tasarlanmıştır. Kişisel veri işleme, silme ve ihraç talepleri platforma entegredir. Ayrıca veritabanınızı temizlemek için KVKK modülümüz mevcuttur.',
  },
  {
    q: 'Verilerim nerede saklanıyor?',
    a: 'Verileriniz Avrupa\'da (Frankfurt) konumlu Supabase sunucularında şifreli olarak saklanır. Yedekler günlük alınır, veri ihracı için CSV/Excel dışa aktarma mevcuttur.',
  },
  {
    q: 'WhatsApp mesajları spam olarak işaretlenir mi?',
    a: 'LeadFlow, resmi WhatsApp Business API (WABA) üzerinden çalışır. Meta onaylı kanallardan kişiselleştirilmiş mesajlar gönderildiğinde spam riski minimum düzeydedir. Ayrıca AI kişiselleştirmesi sayesinde mesajlar organik görünür.',
  },
  {
    q: 'Mevcut CRM sistemimle entegre olabilir mi?',
    a: 'Evet. HubSpot, Pipedrive ve Zapier entegrasyonları mevcuttur. API ve Webhook desteği ile özel sistemlere bağlantı kurabilirsiniz (Growth ve Pro planlarda).',
  },
  {
    q: 'İptal etmek ne kadar kolay?',
    a: 'Hesap ayarlarından tek tıkla iptal edebilirsiniz. İptal sonrası mevcut döneminiz tamamlanır, veri silinmez. Yeniden başlamak istediğinizde aynı hesabınıza devam edersiniz.',
  },
]

export default function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold mb-6">
              <HelpCircle size={13} />
              Sıkça Sorulan Sorular
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-black text-slate-900 leading-[1.1] tracking-[-0.025em] mb-4">
              Aklınızdaki{' '}
              <span className="gradient-text-blue">sorular</span>
            </h2>
            <p className="text-[17px] text-slate-500">
              Cevabını bulamazsanız WhatsApp veya email ile ulaşın.
            </p>
          </div>
        </Reveal>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-[15px] font-semibold text-slate-900 leading-snug pr-2">
                  {faq.q}
                </span>
                <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${
                  open === i ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {open === i
                    ? <Minus size={13} strokeWidth={2.5} />
                    : <Plus size={13} strokeWidth={2.5} />
                  }
                </div>
              </button>

              {open === i && (
                <div className="px-6 pb-5 border-t border-slate-100">
                  <p className="text-[14px] text-slate-600 leading-relaxed pt-4">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact prompt */}
        <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <p className="text-[15px] text-slate-600 mb-4">
            Başka sorunuz mu var?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/905000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors"
            >
              💬 WhatsApp&apos;tan Yaz
            </a>
            <a
              href="mailto:destek@leadflow.ai"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-colors"
            >
              📧 Email Gönder
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
