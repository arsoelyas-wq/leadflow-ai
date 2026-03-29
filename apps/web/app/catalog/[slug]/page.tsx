import { notFound } from "next/navigation"

async function getMicrosite(slug: string) {
  try {
    const resp = await fetch(`https://leadflow-ai-production.up.railway.app/api/microsite/view/${slug}`, { cache: "no-store" })
    if (!resp.ok) return null
    return await resp.json()
  } catch { return null }
}

export default async function CatalogPage({ params }: { params: { slug: string } }) {
  const data = await getMicrosite(params.slug)
  if (!data?.microsite) return notFound()
  const ms = data.microsite
  const lead = ms.leads

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-white font-bold">LeadFlow AI</span>
          </div>
          <span className="text-slate-400 text-sm">Kisisel Koleksiyon</span>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
            {lead?.company_name} icin ozel hazırlandi
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            {ms.headline || (lead?.company_name + " icin Ozel Koleksiyon")}
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {ms.subheadline || "Size ozel secilmis urun ve hizmetlerimizi inceleyin"}
          </p>
        </div>
        {(ms.intro || ms.custom_message) && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
            <p className="text-slate-300 text-lg leading-relaxed">{ms.custom_message || ms.intro}</p>
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: "🎯", title: "Kisisellestirilmis", desc: "Sadece sizin ihtiyaclariniza gore secildi" },
            { icon: "⚡", title: "Hizli Teslimat", desc: "Turkiye genelinde hizli kargo imkani" },
            { icon: "💎", title: "Premium Kalite", desc: "En yuksek kalite standartlarinda urunler" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
          <h2 className="text-white text-2xl font-bold mb-3">{ms.cta_text || "Hemen Iletisime Gecin"}</h2>
          <p className="text-blue-200 mb-6">Size ozel fiyat teklifi icin bize ulasin</p>
          <a href="https://wa.me/90" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition">
            WhatsApp ile Yaz
          </a>
        </div>
        <p className="text-center mt-8 text-slate-600 text-sm">Powered by LeadFlow AI</p>
      </div>
    </div>
  )
}
