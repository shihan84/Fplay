import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = '/app/public/logos'

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_')
}

function getString(formData: FormData, key: string): string | null {
  return formData.get(key) as string | null
}

function getNumber(formData: FormData, key: string, defaultValue: number): number {
  const value = formData.get(key)
  if (value === null) return defaultValue
  const num = Number(value)
  return Number.isNaN(num) ? defaultValue : num
}

function getBoolean(formData: FormData, key: string, defaultValue: boolean): boolean {
  const value = formData.get(key)
  if (value === null) return defaultValue
  return value.toString().toLowerCase() === 'true'
}

function triggerChannelReload(channelId: string) {
  const controlUrl = process.env.REALTIME_CONTROL_URL
  if (!controlUrl) return
  fetch(`${controlUrl}/reload/${channelId}`, { method: 'POST' }).catch((err) =>
    console.warn('Failed to trigger channel reload:', err)
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId query parameter is required' },
        { status: 400 }
      )
    }

    const logos = await db.logoOverlay.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(logos)
  } catch (error) {
    console.error('Error fetching logos:', error)
    return NextResponse.json({ error: 'Failed to fetch logos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const channelId = getString(formData, 'channelId')
      const name = (getString(formData, 'name') || file?.name || '').replace(/\.[^.]+$/, '')

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      if (!channelId) {
        return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
      }
      if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
      }

      await fs.mkdir(UPLOAD_DIR, { recursive: true })

      const safeName = sanitizeFileName(file.name)
      const uniqueName = `${Date.now()}_${safeName}`
      const destPath = path.join(UPLOAD_DIR, uniqueName)
      const bytes = await file.arrayBuffer()
      await fs.writeFile(destPath, Buffer.from(bytes))

      const logo = await db.logoOverlay.create({
        data: {
          channelId,
          name,
          path: `/logos/${uniqueName}`,
          opacity: getNumber(formData, 'opacity', 0.8),
          posX: getString(formData, 'posX') ?? 'right',
          posY: getString(formData, 'posY') ?? 'top',
          offsetX: getNumber(formData, 'offsetX', 20),
          offsetY: getNumber(formData, 'offsetY', 20),
          sizeW: getNumber(formData, 'sizeW', 200),
          sizeH: getNumber(formData, 'sizeH', 0),
          active: getBoolean(formData, 'active', true),
          category: getString(formData, 'category') || null,
          startTime: getString(formData, 'startTime') || null,
          endTime: getString(formData, 'endTime') || null,
        },
      })

      triggerChannelReload(channelId)
      return NextResponse.json(logo, { status: 201 })
    }

    const body = await request.json()
    const {
      channelId, name, path: logoPath, opacity, posX, posY,
      offsetX, offsetY, sizeW, sizeH, active,
      bgColor, category, startTime, endTime,
    } = body

    if (!channelId || !name || !logoPath) {
      return NextResponse.json(
        { error: 'channelId, name, and path are required' },
        { status: 400 }
      )
    }

    const logo = await db.logoOverlay.create({
      data: {
        channelId,
        name,
        path: logoPath,
        opacity: opacity ?? 0.8,
        posX: posX ?? 'right',
        posY: posY ?? 'top',
        offsetX: offsetX ?? 20,
        offsetY: offsetY ?? 20,
        sizeW: sizeW ?? 200,
        sizeH: sizeH ?? 0,
        active: active ?? true,
        bgColor: bgColor ?? null,
        category: category ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
      },
    })

    triggerChannelReload(channelId)
    return NextResponse.json(logo, { status: 201 })
  } catch (error) {
    console.error('Error creating logo overlay:', error)
    return NextResponse.json({ error: 'Failed to create logo overlay' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Logo id is required' }, { status: 400 })
    }

    const data = await request.json()

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'path', 'opacity', 'posX', 'posY',
      'offsetX', 'offsetY', 'sizeW', 'sizeH', 'active',
      'bgColor', 'category', 'startTime', 'endTime',
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    const logo = await db.logoOverlay.update({
      where: { id },
      data: updateData,
    })

    const controlUrl = process.env.REALTIME_CONTROL_URL
    if (controlUrl) {
      fetch(`${controlUrl}/reload/${logo.channelId}`, { method: 'POST' }).catch((err) =>
        console.warn('Failed to trigger channel reload:', err)
      )
    }

    return NextResponse.json(logo)
  } catch (error: unknown) {
    console.error('Error updating logo overlay:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Logo overlay not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update logo overlay' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Logo id is required' }, { status: 400 })
    }

    const deleted = await db.logoOverlay.findUnique({ where: { id } })
    await db.logoOverlay.delete({
      where: { id },
    })
    if (deleted) triggerChannelReload(deleted.channelId)

    return NextResponse.json({ success: true, message: 'Logo overlay deleted' })
  } catch (error: unknown) {
    console.error('Error deleting logo overlay:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Logo overlay not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete logo overlay' }, { status: 500 })
  }
}