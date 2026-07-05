import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.REVALIDATE_SECRET || 'sovlo-revalidate-2026'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-revalidate-secret')
  if (auth !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath('/', 'layout')
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
}
