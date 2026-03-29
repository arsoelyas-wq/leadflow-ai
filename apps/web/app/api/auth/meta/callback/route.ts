import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state") // userId
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/ads?error=meta_denied", request.url))
  }

  try {
    const token = request.cookies.get("token")?.value || ""
    const response = await fetch("https://leadflow-ai-production.up.railway.app/api/ads/exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    })
    const data = await response.json()
    if (data.success) {
      return NextResponse.redirect(new URL("/ads?success=meta_connected", request.url))
    }
  } catch {}

  return NextResponse.redirect(new URL("/ads?error=meta_failed", request.url))
}