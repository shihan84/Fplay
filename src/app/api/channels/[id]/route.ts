import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const channel = await db.channel.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: {
            playlists: true,
            media: true,
            logs: true,
            logos: true,
            graphics: true,
            recordings: true,
          },
        },
      },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Error fetching channel:', error)
    return NextResponse.json({ error: 'Failed to fetch channel' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, color, order } = body

    const channel = await db.channel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
      },
      include: {
        settings: true,
        _count: {
          select: {
            playlists: true,
            media: true,
            logs: true,
          },
        },
      },
    })

    return NextResponse.json(channel)
  } catch (error: unknown) {
    console.error('Error updating channel:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.channel.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Channel deleted' })
  } catch (error: unknown) {
    console.error('Error deleting channel:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: start, stop, or restart' },
        { status: 400 }
      )
    }

    let newStatus: string
    switch (action) {
      case 'start':
        newStatus = 'starting'
        break
      case 'stop':
        newStatus = 'stopped'
        break
      case 'restart':
        newStatus = 'starting'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const channel = await db.channel.update({
      where: { id },
      data: { status: newStatus },
    })

    return NextResponse.json({
      ...channel,
      message: `Channel ${action} initiated`,
      previousStatus: action === 'restart' ? 'running' : undefined,
    })
  } catch (error: unknown) {
    console.error('Error performing channel action:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to perform channel action' }, { status: 500 })
  }
}