import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (channelId) {
      where.channelId = channelId
    }

    if (status) {
      where.status = status
    }

    const [recordings, total] = await Promise.all([
      db.conformanceRecording.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          channel: {
            select: { name: true },
          },
        },
      }),
      db.conformanceRecording.count({ where }),
    ])

    return NextResponse.json({
      data: recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching recordings:', error)
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 })
  }
}