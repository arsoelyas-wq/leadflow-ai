export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: March 2026</p>

        {[
          { title: "1. Information We Collect", body: "We collect information you provide directly to us, such as your name, email address, company name, and phone number when you register for an account. We also collect usage data including campaigns, leads, and messages processed through our platform." },
          { title: "2. How We Use Your Information", body: "We use the information we collect to provide, maintain, and improve our services, process transactions, send transactional and promotional communications, and comply with legal obligations." },
          { title: "3. Data Storage", body: "Your data is stored securely using Supabase (PostgreSQL) infrastructure. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction." },
          { title: "4. WhatsApp & Meta Integration", body: "When you connect your WhatsApp Business account, we use Meta's official Cloud API. We do not store your WhatsApp credentials. Messages sent through our platform comply with WhatsApp Business Policy and Meta's Terms of Service." },
          { title: "5. Data Sharing", body: "We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who assist us in operating our platform, subject to confidentiality agreements." },
          { title: "6. Cookies", body: "We use cookies and similar tracking technologies to track activity on our platform and hold certain information to improve your experience." },
          { title: "7. Your Rights", body: "You have the right to access, correct, or delete your personal data at any time. You may also request data portability or object to processing. To exercise these rights, contact us at the email below." },
          { title: "8. Contact Us", body: "If you have questions about this Privacy Policy, please contact us at: support@leadflow.ai" },
        ].map(({ title, body }) => (
          <div key={title} className="mb-8">
            <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
            <p className="text-slate-400 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}