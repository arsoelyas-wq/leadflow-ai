import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/ads?error=meta_denied", request.url))
  }

  try {
    // Token cookie veya localStorage'dan gelemiyor — code'u ads sayfasına ilet
    // Ads sayfası client-side'da exchange yapacak
    return NextResponse.redirect(
      new URL(`/ads?meta_code=${encodeURIComponent(code)}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL("/ads?error=meta_failed", request.url))
  }
}