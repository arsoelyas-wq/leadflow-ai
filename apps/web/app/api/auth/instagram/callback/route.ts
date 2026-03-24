import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=instagram_denied", request.url))
  }

  try {
    const token = request.cookies.get("token")?.value || ""
    const response = await fetch("https://leadflow-ai-production.up.railway.app/api/instagram/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    })
    const data = await response.json()
    if (data.success) {
      return NextResponse.redirect(new URL("/settings?success=instagram_connected", request.url))
    }
  } catch {}

  return NextResponse.redirect(new URL("/settings?error=instagram_failed", request.url))
}