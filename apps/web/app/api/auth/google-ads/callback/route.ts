import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state") // userId
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/ads?error=google_denied", request.url))
  }

  try {
    // Token'ı almak için cookie'den JWT token oku
    const token = request.cookies.get("token")?.value || 
                  request.cookies.get("auth_token")?.value || ""

    const response = await fetch(
      "https://leadflow-ai-production.up.railway.app/api/google-ads/exchange-token",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-user-state": state || "",
        },
        body: JSON.stringify({ code }),
      }
    )

    const data = await response.json()
    
    if (data.success) {
      return NextResponse.redirect(
        new URL(`/ads?google_success=1&name=${encodeURIComponent(data.userName || '')}`, request.url)
      )
    } else {
      return NextResponse.redirect(
        new URL(`/ads?error=${encodeURIComponent(data.error || 'exchange_failed')}`, request.url)
      )
    }
  } catch (e) {
    // Callback'te token yoksa state'i kullan
    return NextResponse.redirect(
      new URL(`/ads?google_code=${encodeURIComponent(code)}&state=${state || ''}`, request.url)
    )
  }
}