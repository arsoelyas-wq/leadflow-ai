import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state")

  if (error || !code) {
    return NextResponse.redirect(new URL("/decision-maker?error=linkedin_denied", request.url))
  }

  // State'den token çıkar
  let token = ""
  try {
    const decoded = JSON.parse(atob(state || ""))
    token = decoded.token || ""
  } catch {}

  if (!token) {
    // Token yoksa code'u sayfaya gönder, JS handle etsin
    return NextResponse.redirect(
      new URL(`/decision-maker?linkedin_code=${code}`, request.url)
    )
  }

  try {
    const response = await fetch(
      "https://leadflow-ai-production.up.railway.app/api/linkedin/callback",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, state }),
      }
    )
    const data = await response.json()
    if (data.success) {
      return NextResponse.redirect(
        new URL("/decision-maker?success=linkedin_connected", request.url)
      )
    }
    console.error("LinkedIn callback API error:", data)
  } catch (e: any) {
    console.error("LinkedIn callback fetch error:", e.message)
  }

  return NextResponse.redirect(
    new URL(`/decision-maker?linkedin_code=${code}`, request.url)
  )
}