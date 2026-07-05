'use client'
import { useState, useRef, useEffect } from 'react'
import { Plus, Minus, HelpCircle, MessageCircle, Mail } from 'lucide-react'
import Reveal from './Reveal'
import { whatsappUrl } from '@/lib/site-config'

const FAQS = [
  {
    q: 'Deneme süresi için kredi kartı gerekiyor mu?',
    a: 'Hayır. 14 günlük ücretsiz deneme süresinde kredi kartı bilgisi istenmez. Süre sonunda isterseniz ücretli plana geçersiniz, istemezseniz hesabınız otomatik olarak ücretsiz katmana alınır.',
  },
  {
    q: 'WhatsApp mesajları spam olarak işaretlenir mi?',
    a: 'Sovlo, resmi WhatsApp Business API (WABA) üzerinden çalışır. Meta onaylı kanallardan kişiselleştirilmiş mesajlar gönderildiğinde spam riski minimum düzeydedir. AI kişiselleştirmesi sayesinde mesajlar her alıcıya özgün görünür.',
  },
  {
    q: 'KVKK ve GDPR\'a uyumlu mu?',
    a: 'Evet. Sovlo Türk KVKK mevzuatı ve AB GDPR\'ına tam uyumlu olacak şekilde tasarlanmıştır. Kişisel veri işleme, silme ve ihraç talepleri platforma entegredir. Ayrıca verilerinizi temizlemek için KVKK modülümüz mevcuttur.',
  },
  {
    q: 'Günde kaç lead toplayabilirim?',
    a: 'Plana ve kullandığınız kredie göre değişir: Starter planında günde ~50-150, Growth planında ~300-500, Pro planında ise kapasiteye göre daha fazla. Hedef sektör, şehir ve filtre seçenekleri bu rakamları etkiler.',
  },
  {
    q: 'Hangi kanalları destekliyorsunuz?',
    a: 'WhatsApp Business, Email (SMTP/Gmail/Outlook), SMS, LinkedIn DM, Instagram DM — hepsini tek platformdan yönetebilirsiniz. AI Sesli Outreach ve Video Outreach özellikleri beta aşamasındadır.',
  },
  {
    q: 'Mevcut CRM sistemimle entegre olabilir mi?',
    a: 'Evet. HubSpot, Pipedrive ve Zapier entegrasyonları mevcuttur (Growth ve Pro planlarda). API ve Webhook desteği ile özel sistemlere de bağlantı kurabilirsiniz.',
  },
  {
    q: 'İptal etmek ne kadar kolay?',
    a: 'Hesap ayarlarından tek tıkla iptal edebilirsiniz. İptal sonrası mevcut döneminiz tamamlanır, verileriniz silinmez. Yeniden başlamak istediğinizde aynı hesabınıza devam edersiniz.',
  },
  {
    q: 'Destek ekibine nasıl ulaşırım?',
    a: 'WhatsApp destek hattımız, email destek (destek@sovlo.io) ve platform içi chat — hafta içi 09:00-18:00 aktiftir. Pro planlarda öncelikli destek ve özel müşteri başarı yöneticisi atanır.',
  },
  {
    q: 'Birden fazla kullanıcı hesabı açabilir miyim?',
    a: 'Growth ve Pro planlarda birden fazla ekip üyesi ekleyebilirsiniz. Ekip üyeleri farklı izinlerle lead, kampanya ve analitik erişimine sahip olabilir.',
  },
  {
    q: 'Verilerim nerede saklanıyor?',
    a: 'Verileriniz Avrupa\'da (Frankfurt) konumlu sunucularda şifreli olarak saklanır. Yedekler günlük alınır, veri ihracı için CSV/Excel dışa aktarma mevcuttur.',
  },
]

function AccordionItem({ faq, index, isOpen, onToggle }: {
  faq: typeof FAQS[0]
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0)
    }
  }, [isOpen])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-semibold text-slate-900 leading-snug pr-2">
          {faq.q}
        </span>
        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${
          isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {isOpen
            ? <Minus size={13} strokeWidth={2.5} />
            : <Plus size={13} strokeWidth={2.5} />
          }
        </div>
      </button>

      {/* Smooth height animation */}
      <div
        className="accordion-content"
        style={{ maxHeight: height, opacity: isOpen ? 1 : 0 }}
      >
        <div ref={contentRef} className="px-6 pb-5 border-t border-slate-100">
          <p className="text-[14px] text-slate-600 leading-relaxed pt-4">
            {faq.a}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LandingFAQ({ cfg }: { cfg?: any }) {
  const [open, setOpen] = useState<number | null>(0)
  const headline = cfg?.faq_headline || 'Sıkça Sorulan Sorular'
  const faqs = cfg?.faqs?.length ? cfg.faqs : FAQS

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold mb-6">
              <HelpCircle size={13} />
              {headline}
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

        <div className="flex flex-col gap-3">
          {faqs.map((faq: any, i: number) => (
            <AccordionItem
              key={i}
              faq={faq}
              index={i}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>

        {/* Contact prompt */}
        <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <p className="text-[15px] text-slate-600 mb-4">
            Başka sorunuz mu var?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={whatsappUrl('Merhaba, Sovlo AI hakkında bilgi almak istiyorum.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle size={14} />
              WhatsApp&apos;tan Yaz
            </a>
            <a
              href="mailto:destek@sovlo.io"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-colors"
            >
              <Mail size={14} />
              Email Gönder
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
