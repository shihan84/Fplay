import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const channelId = searchParams.get('channelId')
    const category = searchParams.get('category')
    const fileType = searchParams.get('fileType')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { filename: { contains: search } },
        { title: { contains: search } },
      ]
    }

    if (channelId) {
      where.channelLinks = {
        some: { channelId },
      }
    }

    if (category) {
      where.category = category
    }

    if (fileType) {
      where.fileType = fileType
    }

    const [media, total] = await Promise.all([
      db.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.media.count({ where }),
    ])

    return NextResponse.json({
      data: media,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      filename, title, path, fileType, fileSize, duration,
      resolution, codec, bitrate, frameRate, sampleRate,
      channels, category, tags, thumbnail, status,
    } = body

    if (!filename || !path) {
      return NextResponse.json(
        { error: 'filename and path are required' },
        { status: 400 }
      )
    }

    const media = await db.media.create({
      data: {
        filename,
        title: title ?? null,
        path,
        fileType: fileType ?? 'video',
        fileSize: fileSize ?? 0,
        duration: duration ?? 0,
        resolution: resolution ?? null,
        codec: codec ?? null,
        bitrate: bitrate ?? 0,
        frameRate: frameRate ?? null,
        sampleRate: sampleRate ?? null,
        channels: channels ?? null,
        category: category ?? null,
        tags: tags ?? null,
        thumbnail: thumbnail ?? null,
        status: status ?? 'ready',
      },
    })

    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    console.error('Error creating media:', error)
    return NextResponse.json({ error: 'Failed to create media' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Media id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'filename', 'title', 'path', 'fileType', 'fileSize', 'duration',
      'resolution', 'codec', 'bitrate', 'frameRate', 'sampleRate',
      'channels', 'category', 'tags', 'thumbnail', 'status',
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    const media = await db.media.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(media)
  } catch (error: unknown) {
    console.error('Error updating media:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Media id is required' }, { status: 400 })
    }

    await db.media.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Media deleted' })
  } catch (error: unknown) {
    console.error('Error deleting media:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }
}