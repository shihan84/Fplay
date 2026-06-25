import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
    const body = await request.json()
    const {
      channelId, name, path, opacity, posX, posY,
      offsetX, offsetY, sizeW, sizeH, active,
      category, startTime, endTime,
    } = body

    if (!channelId || !name || !path) {
      return NextResponse.json(
        { error: 'channelId, name, and path are required' },
        { status: 400 }
      )
    }

    const logo = await db.logoOverlay.create({
      data: {
        channelId,
        name,
        path,
        opacity: opacity ?? 1.0,
        posX: posX ?? 'right',
        posY: posY ?? 'top',
        offsetX: offsetX ?? 20,
        offsetY: offsetY ?? 20,
        sizeW: sizeW ?? 200,
        sizeH: sizeH ?? 0,
        active: active ?? true,
        category: category ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
      },
    })

    return NextResponse.json(logo, { status: 201 })
  } catch (error) {
    console.error('Error creating logo overlay:', error)
    return NextResponse.json({ error: 'Failed to create logo overlay' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Logo id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'path', 'opacity', 'posX', 'posY',
      'offsetX', 'offsetY', 'sizeW', 'sizeH', 'active',
      'category', 'startTime', 'endTime',
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

    await db.logoOverlay.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Logo overlay deleted' })
  } catch (error: unknown) {
    console.error('Error deleting logo overlay:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Logo overlay not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete logo overlay' }, { status: 500 })
  }
}