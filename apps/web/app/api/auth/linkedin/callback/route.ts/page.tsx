// apps/web/app/api/auth/linkedin/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/decision-maker?error=linkedin_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/decision-maker?error=no_code', request.url))
  }

  // State'den userId al
  let userId = ''
  try {
    const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString())
    userId = decoded.userId
  } catch {}

  // Token al
  try {
    const token = request.cookies.get('token')?.value || ''
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'}/api/linkedin/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, state }),
    })
    const data = await response.json()
    if (data.success) {
      return NextResponse.redirect(new URL('/decision-maker?success=linkedin_connected', request.url))
    }
  } catch {}

  return NextResponse.redirect(new URL('/decision-maker?error=callback_failed', request.url))
}