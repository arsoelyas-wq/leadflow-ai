import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state") || ""
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    const returnPage = state.startsWith("settings") ? "/settings#meta-capi" : "/ads"
    return NextResponse.redirect(new URL(`${returnPage}?error=meta_denied`, request.url))
  }

  try {
    const returnPage = state.startsWith("settings") ? "/settings" : "/ads"
    const hash = state.startsWith("settings") ? "#meta-capi" : ""
    return NextResponse.redirect(
      new URL(`${returnPage}?meta_code=${encodeURIComponent(code)}${hash}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL("/ads?error=meta_failed", request.url))
  }
}
