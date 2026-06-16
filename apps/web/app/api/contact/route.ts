import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: {
    name?: string
    company?: string
    email?: string
    phone?: string
    subject?: string
    message?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 })
  }

  const { name, company, email, phone, subject, message } = body

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "Lütfen ad, e-posta ve mesaj alanlarını doldurun." },
      { status: 400 }
    )
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json(
      { error: "Lütfen geçerli bir e-posta adresi girin." },
      { status: 400 }
    )
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_EMAIL_TO } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json(
      {
        error:
          "E-posta servisi şu anda yapılandırılmamış. Lütfen WhatsApp veya canlı sohbet üzerinden bize ulaşın.",
      },
      { status: 503 }
    )
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    const recipient = CONTACT_EMAIL_TO || "destek@sovlo.io"

    await transporter.sendMail({
      from: `"Sovlo AI İletişim Formu" <${SMTP_USER}>`,
      to: recipient,
      replyTo: email.trim(),
      subject: `[İletişim Formu] ${subject?.trim() || "Yeni Mesaj"} — ${name.trim()}`,
      text: [
        `Ad Soyad: ${name.trim()}`,
        `Şirket: ${company?.trim() || "-"}`,
        `E-posta: ${email.trim()}`,
        `Telefon: ${phone?.trim() || "-"}`,
        `Konu: ${subject?.trim() || "-"}`,
        "",
        "Mesaj:",
        message.trim(),
      ].join("\n"),
      html: `
        <h2>Yeni İletişim Formu Mesajı</h2>
        <p><strong>Ad Soyad:</strong> ${escapeHtml(name.trim())}</p>
        <p><strong>Şirket:</strong> ${escapeHtml(company?.trim() || "-")}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(email.trim())}</p>
        <p><strong>Telefon:</strong> ${escapeHtml(phone?.trim() || "-")}</p>
        <p><strong>Konu:</strong> ${escapeHtml(subject?.trim() || "-")}</p>
        <p><strong>Mesaj:</strong></p>
        <p>${escapeHtml(message.trim()).replace(/\n/g, "<br />")}</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form gönderim hatası:", error)
    return NextResponse.json(
      { error: "Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin." },
      { status: 500 }
    )
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
