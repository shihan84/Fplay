import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const CONTROL_URL = process.env.REALTIME_CONTROL_URL

async function triggerReload(channelId: string) {
  if (CONTROL_URL) {
    fetch(`${CONTROL_URL}/reload/${channelId}`, { method: 'POST' }).catch(() => {})
  }
}

export async function GET(request: NextRequest) {
  const channelId = new URL(request.url).searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })
  const overlays = await db.textOverlay.findMany({ where: { channelId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(overlays)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { channelId, ...data } = body
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })
  const overlay = await db.textOverlay.create({ data: { channelId, ...data } })
  await triggerReload(channelId)
  return NextResponse.json(overlay, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, channelId, ...data } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const overlay = await db.textOverlay.update({ where: { id }, data })
  if (channelId) await triggerReload(channelId)
  return NextResponse.json(overlay)
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const overlay = await db.textOverlay.delete({ where: { id } })
  await triggerReload(overlay.channelId)
  return NextResponse.json({ ok: true })
}
