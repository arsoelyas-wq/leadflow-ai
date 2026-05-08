import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state") // userId
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/google-ads?error=google_denied", request.url))
  }

  try {
    // Token cookie veya localStorage'dan al
    const token = request.cookies.get("token")?.value ||
                  request.cookies.get("auth_token")?.value ||
                  request.cookies.get("leadflow_token")?.value || ""

    const response = await fetch(
      "https://leadflow-ai-production.up.railway.app/api/google-ads/exchange-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          "x-user-state": state || "",
        },
        body: JSON.stringify({ code, state }),
      }
    )

    const data = await response.json()

    if (data.success) {
      // Basarili - google-ads sayfasina don
      const redirectUrl = new URL("/google-ads", request.url)
      redirectUrl.searchParams.set("google_success", "1")
      redirectUrl.searchParams.set("name", data.userName || "")
      return NextResponse.redirect(redirectUrl)
    } else {
      // Token yoksa code ile birlikte google-ads sayfasina don
      // Sayfa client-side token ile exchange yapacak
      const redirectUrl = new URL("/google-ads", request.url)
      redirectUrl.searchParams.set("google_code", code)
      redirectUrl.searchParams.set("state", state || "")
      return NextResponse.redirect(redirectUrl)
    }
  } catch (e) {
    // Hata - code ile sayfaya don, client-side handle edecek
    const redirectUrl = new URL("/google-ads", request.url)
    redirectUrl.searchParams.set("google_code", code || "")
    redirectUrl.searchParams.set("state", state || "")
    return NextResponse.redirect(redirectUrl)
  }
}