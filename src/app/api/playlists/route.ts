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

    const playlists = await db.playlist.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })

    return NextResponse.json(playlists)
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, name, loop, startDate, endDate, items } = body

    if (!channelId || !name) {
      return NextResponse.json(
        { error: 'channelId and name are required' },
        { status: 400 }
      )
    }

    const playlist = await db.playlist.create({
      data: {
        channelId,
        name,
        loop: loop ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ...(items ? {
          items: {
            create: items.map((item: Record<string, unknown>, index: number) => ({
              mediaId: item.mediaId,
              title: item.title ?? '',
              artist: item.artist ?? null,
              duration: item.duration ?? 0,
              order: item.order ?? index,
              transition: item.transition ?? 'cut',
              transitionDur: item.transitionDur ?? 1.0,
              inPoint: item.inPoint ?? 0,
              outPoint: item.outPoint ?? null,
              customText: item.customText ?? null,
            })),
          },
        } : {}),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(playlist, { status: 201 })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, loop, startDate, endDate } = body

    if (!id) {
      return NextResponse.json({ error: 'Playlist id is required' }, { status: 400 })
    }

    const playlist = await db.playlist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(loop !== undefined && { loop }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(playlist)
  } catch (error: unknown) {
    console.error('Error updating playlist:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Playlist id is required' }, { status: 400 })
    }

    await db.playlist.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Playlist deleted' })
  } catch (error: unknown) {
    console.error('Error deleting playlist:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('id') || ''
    const body = await request.json()
    const { action, items, itemId, orderMap } = body

    switch (action) {
      case 'addItems': {
        if (!playlistId || !items || !Array.isArray(items)) {
          return NextResponse.json(
            { error: 'playlistId and items array are required' },
            { status: 400 }
          )
        }

        // Get current max order
        const existingItems = await db.playlistItem.findMany({
          where: { playlistId },
          orderBy: { order: 'desc' },
          take: 1,
        })
        const startOrder = existingItems.length > 0 ? (existingItems[0].order + 1) : 0

        const createdItems = await db.playlistItem.createMany({
          data: items.map((item: Record<string, unknown>, index: number) => ({
            playlistId,
            mediaId: item.mediaId,
            title: item.title ?? '',
            artist: item.artist ?? null,
            duration: item.duration ?? 0,
            order: item.order ?? (startOrder + index),
            transition: item.transition ?? 'cut',
            transitionDur: item.transitionDur ?? 1.0,
            inPoint: item.inPoint ?? 0,
            outPoint: item.outPoint ?? null,
            customText: item.customText ?? null,
          })),
        })

        return NextResponse.json({
          success: true,
          count: createdItems.count,
          message: `${createdItems.count} items added`,
        })
      }

      case 'updateItems': {
        const mapToUpdate = orderMap || (items ? Object.fromEntries(
          items.map((item: Record<string, unknown>) => [item.id, item])
        ) : null)
        if (!mapToUpdate || typeof mapToUpdate !== 'object') {
          return NextResponse.json(
            { error: 'orderMap or items with id is required' },
            { status: 400 }
          )
        }

        const updatePromises = Object.entries(mapToUpdate).map(
          async ([itemId, updates]: [string, unknown]) => {
            const data = updates as Record<string, unknown>
            return db.playlistItem.update({
              where: { id: itemId },
              data: {
                ...(data.order !== undefined && { order: data.order as number }),
                ...(data.title !== undefined && { title: data.title as string }),
                ...(data.duration !== undefined && { duration: data.duration as number }),
                ...(data.transition !== undefined && { transition: data.transition as string }),
                ...(data.transitionDur !== undefined && { transitionDur: data.transitionDur as number }),
                ...(data.inPoint !== undefined && { inPoint: data.inPoint as number }),
                ...(data.outPoint !== undefined && { outPoint: data.outPoint as number }),
              },
            })
          }
        )

        const updatedItems = await Promise.all(updatePromises)
        return NextResponse.json({
          success: true,
          items: updatedItems,
          message: `${updatedItems.length} items updated`,
        })
      }

      case 'removeItem': {
        if (!itemId) {
          return NextResponse.json(
            { error: 'itemId is required' },
            { status: 400 }
          )
        }

        // Get the playlist to re-order remaining items
        const item = await db.playlistItem.findUnique({
          where: { id: itemId },
          select: { playlistId: true, order: true },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        await db.playlistItem.delete({ where: { id: itemId } })

        // Re-order remaining items
        const remainingItems = await db.playlistItem.findMany({
          where: { playlistId: item.playlistId },
          orderBy: { order: 'asc' },
        })

        await Promise.all(
          remainingItems.map((ri, index) =>
            db.playlistItem.update({
              where: { id: ri.id },
              data: { order: index },
            })
          )
        )

        return NextResponse.json({
          success: true,
          message: 'Item removed and remaining items reordered',
        })
      }

      case 'setActive': {
        if (!playlistId) {
          return NextResponse.json(
            { error: 'playlistId is required' },
            { status: 400 }
          )
        }

        // Find the playlist to get its channelId
        const playlist = await db.playlist.findUnique({
          where: { id: playlistId },
          select: { channelId: true },
        })

        if (!playlist) {
          return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
        }

        // Deactivate all playlists for the channel
        await db.playlist.updateMany({
          where: { channelId: playlist.channelId },
          data: { isActive: false },
        })

        // Activate the target playlist
        const activated = await db.playlist.update({
          where: { id: playlistId },
          data: { isActive: true },
        })

        return NextResponse.json({
          success: true,
          playlist: activated,
          message: 'Playlist activated',
        })
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Must be: addItems, updateItems, removeItem, setActive` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in playlist PATCH action:', error)
    return NextResponse.json({ error: 'Failed to perform playlist action' }, { status: 500 })
  }
}