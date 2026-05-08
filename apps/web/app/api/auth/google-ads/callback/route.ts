import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/google-ads?error=denied", request.url))
  }

  // code ve state'i google-ads sayfasina gonder
  // Sayfa client-side token ile exchange yapacak
  const url = new URL("/google-ads", request.url)
  url.searchParams.set("gcode", code)
  url.searchParams.set("gstate", state || "")
  return NextResponse.redirect(url)
}