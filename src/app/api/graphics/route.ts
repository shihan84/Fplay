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

    const graphics = await db.graphicsOverlay.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(graphics)
  } catch (error) {
    console.error('Error fetching graphics overlays:', error)
    return NextResponse.json({ error: 'Failed to fetch graphics overlays' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, name, html, css, position, duration, active } = body

    if (!channelId || !name) {
      return NextResponse.json(
        { error: 'channelId and name are required' },
        { status: 400 }
      )
    }

    const graphic = await db.graphicsOverlay.create({
      data: {
        channelId,
        name,
        html: html ?? '',
        css: css ?? '',
        position: position ?? 'bottom-left',
        duration: duration ?? 5.0,
        active: active ?? true,
      },
    })

    return NextResponse.json(graphic, { status: 201 })
  } catch (error) {
    console.error('Error creating graphics overlay:', error)
    return NextResponse.json({ error: 'Failed to create graphics overlay' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Graphics overlay id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'html', 'css', 'position', 'duration', 'active',
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    const graphic = await db.graphicsOverlay.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(graphic)
  } catch (error: unknown) {
    console.error('Error updating graphics overlay:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Graphics overlay not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update graphics overlay' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Graphics overlay id is required' }, { status: 400 })
    }

    await db.graphicsOverlay.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Graphics overlay deleted' })
  } catch (error: unknown) {
    console.error('Error deleting graphics overlay:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Graphics overlay not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete graphics overlay' }, { status: 500 })
  }
}