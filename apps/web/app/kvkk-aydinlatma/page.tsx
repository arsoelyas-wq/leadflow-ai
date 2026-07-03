import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni — Sovlo AI',
  description: 'Sovlo AI KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında kişisel veri işleme aydınlatma metni.',
}

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal header */}
      <header className="border-b border-slate-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Zap size={13} className="text-white fill-white" />
            </div>
            <span className="text-slate-900 text-[15px] font-bold">Sovlo AI</span>
          </Link>
          <Link href="/" className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors">
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-[32px] font-black text-slate-900 mb-2">KVKK Kişisel Veri Aydınlatma Metni</h1>
        <p className="text-slate-500 text-[14px] mb-10">Son güncelleme: Temmuz 2026</p>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">1. Veri Sorumlusu</h2>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verileriniz;
            <strong> Sovlo AI</strong> tarafından veri sorumlusu sıfatıyla işlenmektedir.
          </p>
          <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-[14px] text-slate-700">
            <strong>İletişim:</strong> destek@sovlo.io
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">2. İşlenen Kişisel Veriler</h2>
          <ul className="space-y-2 text-[15px] text-slate-600">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Kimlik bilgileri:</strong> Ad, soyad, şirket adı, unvan</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Finansal bilgiler:</strong> Ödeme ve fatura bilgileri (ödeme altyapısı sağlayıcımız tarafından işlenmektedir)</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Kullanım verileri:</strong> Platform kullanım istatistikleri, log kayıtları, oturum bilgileri</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>İçerik verileri:</strong> Platform üzerinde oluşturduğunuz lead listeleri ve kampanya içerikleri</span></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">3. Kişisel Veri İşleme Amaçları</h2>
          <ul className="space-y-2 text-[15px] text-slate-600">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>Hizmet sözleşmesinin kurulması ve ifası</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>Platform hesabınızın oluşturulması ve yönetimi</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>Ödeme işlemlerinin gerçekleştirilmesi ve faturalandırma</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>Müşteri destek hizmetlerinin sunulması</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>Platform güvenliğinin sağlanması ve dolandırıcılıkla mücadele</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>Yasal yükümlülüklerin yerine getirilmesi</span></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">4. Hukuki Dayanaklar</h2>
          <ul className="space-y-2 text-[15px] text-slate-600">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Sözleşmenin ifası:</strong> Hizmet sözleşmesi kapsamındaki işlemler (KVKK m.5/2-c)</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Açık rıza:</strong> Pazarlama ve tanıtım iletişimleri (KVKK m.5/1)</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Meşru menfaat:</strong> Platform güvenliği ve hizmet kalitesi (KVKK m.5/2-f)</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Yasal yükümlülük:</strong> Vergi ve muhasebe mevzuatı (KVKK m.5/2-ç)</span></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">5. Veri Aktarımı</h2>
          <ul className="space-y-2 text-[15px] text-slate-600">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Altyapı sağlayıcıları:</strong> Supabase (veritabanı — AB/Frankfurt), Vercel (hosting — AB sunucuları)</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Ödeme altyapısı:</strong> Ödeme sağlayıcımız (kart bilgileri doğrudan bizde tutulmaz)</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Yetkili kurum ve kuruluşlar:</strong> Yasal zorunluluk halinde resmi makamlar</span></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">6. Veri Saklama Süreleri</h2>
          <ul className="space-y-2 text-[15px] text-slate-600">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Hesap verileri:</strong> Hesabınız aktif olduğu sürece + hesap silinmesinden itibaren 30 gün</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Finansal veriler:</strong> İlgili mevzuat gereği 10 yıl</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Log kayıtları:</strong> 1 yıl</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span><strong>Pazarlama verileri:</strong> Rıza geri alınana kadar</span></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">7. Haklarınız (KVKK Madde 11)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Verilerinizin işlenip işlenmediğini öğrenme',
              'İşlenmişse bilgi talep etme',
              'Yurt içi ve yurt dışı aktarımları öğrenme',
              'Eksik veya yanlış işlemede düzeltme isteme',
              'Silme veya yok etme isteme',
              'Otomatik sistemlerle analiz kararına itiraz',
              'Zarara uğramanız halinde tazminat talep etme',
            ].map((right, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                <span className="text-blue-500 font-bold text-[13px] mt-0.5">{i + 1}.</span>
                <span className="text-[13px] text-slate-600">{right}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">8. Başvuru</h2>
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[15px] text-blue-900 font-semibold mb-2">İletişim</p>
            <ul className="space-y-1.5 text-[14px] text-blue-800">
              <li>E-posta: <strong>destek@sovlo.io</strong> (konu: KVKK Talebi)</li>
              <li>Platform içi: Hesap Ayarları → Gizlilik → Veri Talebi</li>
            </ul>
            <p className="text-[13px] text-blue-600 mt-3">Başvurularınız en geç 30 gün içinde yanıtlanır.</p>
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-slate-900 mb-3">9. Güvenlik</h2>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            Verileriniz AES-256 şifreleme ile saklanmakta, iletim sırasında TLS/SSL ile korunmaktadır.
            Avrupa&apos;da (Frankfurt) yerleşik sunucularda tutulmaktadır.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 px-6 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[13px] text-slate-400">
            © {new Date().getFullYear()} Sovlo AI ·{' '}
            <Link href="/" className="hover:text-slate-700">Ana Sayfa</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
