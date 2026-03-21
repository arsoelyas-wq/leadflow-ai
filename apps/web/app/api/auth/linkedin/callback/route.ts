import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state")

  if (error || !code) {
    return NextResponse.redirect(new URL("/decision-maker?error=linkedin_denied", request.url))
  }

  let token = ""
  try {
    const decoded = JSON.parse(Buffer.from(state || "", "base64").toString())
    token = decoded.token || ""
  } catch {}

  if (!token) token = request.cookies.get("token")?.value || ""

  try {
    const response = await fetch("https://leadflow-ai-production.up.railway.app/api/linkedin/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, state }),
    })
    const data = await response.json()
    if (data.success) {
      return NextResponse.redirect(new URL("/decision-maker?success=linkedin_connected", request.url))
    }
  } catch {}

  return NextResponse.redirect(new URL("/decision-maker?error=callback_failed", request.url))
}