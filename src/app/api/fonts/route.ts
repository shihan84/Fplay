import { NextResponse } from 'next/server'

const REALTIME_CONTROL = process.env.REALTIME_CONTROL_URL || 'http://localhost:3006'

export async function GET() {
  try {
    const res = await fetch(`${REALTIME_CONTROL}/fonts`, { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const fonts = await res.json()
    return NextResponse.json(fonts)
  } catch {
    return NextResponse.json([])
  }
}
