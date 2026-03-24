// apps/web/app/privacy/page.tsx
// Bu sayfa auth gerektirmez — Meta Developer için public olmalı

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Gizlilik Politikası</h1>
        <p className="text-slate-400 mb-10 text-sm">Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Toplanan Veriler</h2>
            <p>LeadFlow AI platformu aşağıdaki verileri toplar:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Kullanıcı adı, e-posta adresi ve şifre (şifreli)</li>
              <li>İşletme adı, telefon numarası ve adres bilgileri</li>
              <li>Kampanya ve mesajlaşma verileri</li>
              <li>Uygulama kullanım istatistikleri</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Verilerin Kullanımı</h2>
            <p>Toplanan veriler yalnızca şu amaçlarla kullanılır:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Platformun çalışması ve hizmet sunumu</li>
              <li>Kullanıcı hesabının yönetimi</li>
              <li>Müşteri desteği sağlanması</li>
              <li>Hizmet kalitesinin iyileştirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Facebook ve Instagram Verileri</h2>
            <p>LeadFlow AI, Meta platformları (Facebook ve Instagram) ile entegrasyon için yalnızca yetkili API'leri kullanır. Toplanan veriler:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Yalnızca kullanıcının izni ile erişilen sayfa ve hesap bilgileri</li>
              <li>Üçüncü taraflarla paylaşılmaz</li>
              <li>Kullanıcı talebi üzerine silinir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Veri Güvenliği</h2>
            <p>Tüm veriler şifrelenerek saklanır. SSL/TLS ile iletim güvenliği sağlanır. Supabase güvenli altyapısı kullanılmaktadır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Veri Silme</h2>
            <p>Hesabınızı ve tüm verilerinizi silmek için <a href="mailto:info@leadflowai.com" className="text-blue-400 hover:underline">info@leadflowai.com</a> adresine e-posta gönderin. Talebiniz 30 gün içinde işleme alınır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Çerezler</h2>
            <p>Platform, oturum yönetimi için zorunlu çerezler kullanır. Reklam amaçlı çerez kullanılmaz.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. KVKK ve GDPR</h2>
            <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ve GDPR kapsamında haklarınız:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Verilerinize erişim hakkı</li>
              <li>Verilerinizin düzeltilmesini isteme hakkı</li>
              <li>Verilerinizin silinmesini isteme hakkı</li>
              <li>Veri işlemeye itiraz etme hakkı</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. İletişim</h2>
            <p>Gizlilik politikası hakkında sorularınız için:</p>
            <p className="mt-2 text-slate-400">E-posta: <a href="mailto:info@leadflowai.com" className="text-blue-400 hover:underline">info@leadflowai.com</a></p>
          </section>

        </div>
      </div>
    </div>
  )
}