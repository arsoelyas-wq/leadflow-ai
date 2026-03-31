import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/ads?error=google_denied", request.url))
  }

  return NextResponse.redirect(
    new URL(`/ads?google_code=${encodeURIComponent(code)}`, request.url)
  )
}