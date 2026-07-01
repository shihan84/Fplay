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

    const settings = await db.channelSettings.findUnique({
      where: { channelId },
    })

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found for this channel' }, { status: 404 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, ...settingsData } = body

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
    }

    // Verify channel exists
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Build update data with defaults for missing fields
    const updateData: Record<string, unknown> = {
      width: settingsData.width ?? 1920,
      height: settingsData.height ?? 1080,
      fps: settingsData.fps ?? 25.0,
      videoCodec: settingsData.videoCodec ?? 'libx264',
      videoBitrate: settingsData.videoBitrate ?? 4500,
      videoPreset: settingsData.videoPreset ?? 'medium',
      videoProfile: settingsData.videoProfile ?? 'high',
      gopSize: settingsData.gopSize ?? 50,
      keyframeInt: settingsData.keyframeInt ?? 2,
      audioCodec: settingsData.audioCodec ?? 'aac',
      audioBitrate: settingsData.audioBitrate ?? 128,
      audioSampleRate: settingsData.audioSampleRate ?? 48000,
      audioChannels: settingsData.audioChannels ?? 2,
      loudnessNorm: settingsData.loudnessNorm ?? false,
      loudnessTarget: settingsData.loudnessTarget ?? -23.0,
      outputFormat: settingsData.outputFormat ?? 'mpegts',
      outputProtocol: settingsData.outputProtocol ?? 'rtmp',
      outputUrl: settingsData.outputUrl ?? '',
      outputKey: settingsData.outputKey ?? '',
      customOutput: settingsData.customOutput ?? '',
      loopPlaylist: settingsData.loopPlaylist ?? true,
      autoRecover: settingsData.autoRecover ?? true,
      fillerMode: settingsData.fillerMode ?? 'black',
      fillerPath: settingsData.fillerPath ?? '',
    }

    // Upsert: update if exists, create if not
    const settings = await db.channelSettings.upsert({
      where: { channelId },
      update: updateData,
      create: {
        channelId,
        ...updateData,
      },
    })

    // Trigger FFmpeg reload so new settings take effect immediately
    const controlUrl = process.env.REALTIME_CONTROL_URL
    if (controlUrl) {
      fetch(`${controlUrl}/reload/${channelId}`, { method: 'POST' }).catch((err) =>
        console.warn('Failed to trigger channel reload after settings update:', err)
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error upserting settings:', error)
    return NextResponse.json({ error: 'Failed to upsert settings' }, { status: 500 })
  }
}