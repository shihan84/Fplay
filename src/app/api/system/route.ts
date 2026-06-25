import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [totalChannels, activeChannels] = await Promise.all([
      db.channel.count(),
      db.channel.count({ where: { status: 'running' } }),
    ])

    return NextResponse.json({
      cpuUsage: 34.2,
      memoryUsage: 61.8,
      diskUsage: 42.5,
      networkIn: 15.7,
      networkOut: 85.3,
      uptime: process.uptime(),
      ffmpegVersion: '6.1.1',
      activeChannels,
      totalChannels,
    })
  } catch (error) {
    console.error('Error fetching system stats:', error)
    return NextResponse.json({ error: 'Failed to fetch system stats' }, { status: 500 })
  }
}