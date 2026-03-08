export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: March 2026</p>

        {[
          { title: "1. Acceptance of Terms", body: "By accessing and using LeadFlow AI, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service." },
          { title: "2. Description of Service", body: "LeadFlow AI is a B2B lead generation and outreach automation platform. We provide tools to help businesses find, manage, and communicate with potential customers through WhatsApp, email, and other channels." },
          { title: "3. User Responsibilities", body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to use the service only for lawful purposes and in accordance with WhatsApp Business Policy, applicable anti-spam laws, and GDPR where applicable." },
          { title: "4. Prohibited Uses", body: "You may not use LeadFlow AI to send unsolicited bulk messages (spam), harass individuals, distribute malware, violate any applicable law, or engage in any activity that violates Meta's WhatsApp Business Policy." },
          { title: "5. Credits & Billing", body: "LeadFlow AI operates on a credit-based system. Credits are consumed when leads are scraped or messages are sent. Credits are non-refundable once used. Subscription plans are billed monthly and may be cancelled at any time." },
          { title: "6. Intellectual Property", body: "LeadFlow AI and its original content, features, and functionality are owned by LeadFlow AI and are protected by international copyright, trademark, and other intellectual property laws." },
          { title: "7. Limitation of Liability", body: "LeadFlow AI shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the service. Our total liability shall not exceed the amount paid by you in the past 12 months." },
          { title: "8. Termination", body: "We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties." },
          { title: "9. Contact", body: "For any questions regarding these Terms, please contact us at: support@leadflow.ai" },
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