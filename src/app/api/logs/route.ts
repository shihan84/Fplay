import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const skip = (page - 1) * limit
    const exportCsv = searchParams.get('export') === 'csv'
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (channelId) {
      where.channelId = channelId
    }

    if (status) {
      where.status = status
    }

    // CSV export
    if (exportCsv) {
      const logs = await db.asRunLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: {
          channel: {
            select: { name: true },
          },
        },
      })

      const header = 'ID,Channel,Title,Duration,Started At,Ended At,Status,Error'
      const rows = logs.map((log) =>
        [
          log.id,
          log.channel.name,
          `"${(log.title || '').replace(/"/g, '""')}"`,
          log.duration.toFixed(2),
          log.startedAt.toISOString(),
          log.endedAt ? log.endedAt.toISOString() : '',
          log.status,
          log.error ? `"${log.error.replace(/"/g, '""')}"` : '',
        ].join(',')
      )

      const csv = [header, ...rows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="asrun-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Paginated JSON response
    const [logs, total] = await Promise.all([
      db.asRunLog.findMany({
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
      db.asRunLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}