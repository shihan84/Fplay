import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function seedDemoData() {
  const channels = await Promise.all([
    db.channel.create({
      data: {
        name: 'News 24',
        description: '24/7 rolling news channel with live breaking news coverage',
        status: 'running',
        color: '#ef4444',
        order: 0,
        settings: {
          create: {
            width: 1920, height: 1080, fps: 25.0,
            videoCodec: 'libx264', videoBitrate: 5000, videoPreset: 'medium', videoProfile: 'high', gopSize: 50, keyframeInt: 2,
            audioCodec: 'aac', audioBitrate: 192, audioSampleRate: 48000, audioChannels: 2, loudnessNorm: true, loudnessTarget: -23.0,
            outputFormat: 'mpegts', outputProtocol: 'rtmp', outputUrl: 'rtmp://stream.example.com/live', outputKey: 'news24',
            loopPlaylist: true, autoRecover: true, fillerMode: 'black',
          },
        },
      },
    }),
    db.channel.create({
      data: {
        name: 'Sports HD',
        description: 'Live sports broadcasting with multi-event coverage',
        status: 'stopped',
        color: '#22c55e',
        order: 1,
        settings: {
          create: {
            width: 1920, height: 1080, fps: 50.0,
            videoCodec: 'libx264', videoBitrate: 8000, videoPreset: 'fast', videoProfile: 'high', gopSize: 25, keyframeInt: 1,
            audioCodec: 'aac', audioBitrate: 256, audioSampleRate: 48000, audioChannels: 6, loudnessNorm: true, loudnessTarget: -24.0,
            outputFormat: 'mpegts', outputProtocol: 'srt', outputUrl: 'srt://stream.example.com:9000', outputKey: '',
            loopPlaylist: false, autoRecover: true, fillerMode: 'image', fillerPath: '/media/sports_filler.png',
          },
        },
      },
    }),
    db.channel.create({
      data: {
        name: 'Music Channel',
        description: 'Non-stop music videos and artist spotlights',
        status: 'stopped',
        color: '#a855f7',
        order: 2,
        settings: {
          create: {
            width: 1920, height: 1080, fps: 29.97,
            videoCodec: 'libx264', videoBitrate: 4500, videoPreset: 'medium', videoProfile: 'main', gopSize: 60, keyframeInt: 2,
            audioCodec: 'aac', audioBitrate: 192, audioSampleRate: 44100, audioChannels: 2, loudnessNorm: true, loudnessTarget: -16.0,
            outputFormat: 'mpegts', outputProtocol: 'rtmp', outputUrl: 'rtmp://stream.example.com/live', outputKey: 'music',
            loopPlaylist: true, autoRecover: true, fillerMode: 'black',
          },
        },
      },
    }),
  ])

  // Seed demo media
  const mediaEntries = await Promise.all([
    db.media.create({ data: { filename: 'breaking_news_intro.mp4', title: 'Breaking News Intro', path: '/media/news/intro.mp4', fileType: 'video', fileSize: 52428800, duration: 15.5, resolution: '1920x1080', codec: 'h264', bitrate: 5000, frameRate: 25.0, sampleRate: 48000, channels: 2, category: 'news', tags: '["intro","breaking","news"]' } }),
    db.media.create({ data: { filename: 'weather_segment_2024.mp4', title: 'Weather Segment', path: '/media/news/weather_2024.mp4', fileType: 'video', fileSize: 104857600, duration: 180.0, resolution: '1920x1080', codec: 'h264', bitrate: 5000, frameRate: 25.0, sampleRate: 48000, channels: 2, category: 'news', tags: '["weather","segment"]' } }),
    db.media.create({ data: { filename: 'sports_highlight_reel.mp4', title: 'Sports Highlight Reel', path: '/media/sports/highlights.mp4', fileType: 'video', fileSize: 314572800, duration: 600.0, resolution: '1920x1080', codec: 'h264', bitrate: 8000, frameRate: 50.0, sampleRate: 48000, channels: 6, category: 'sports', tags: '["highlights","reel","sports"]' } }),
    db.media.create({ data: { filename: 'football_match_premier.mp4', title: 'Premier League Highlights', path: '/media/sports/football_premier.mp4', fileType: 'video', fileSize: 524288000, duration: 2700.0, resolution: '3840x2160', codec: 'h265', bitrate: 12000, frameRate: 50.0, sampleRate: 48000, channels: 6, category: 'sports', tags: '["football","premier league","highlights"]' } }),
    db.media.create({ data: { filename: 'music_video_pop_hits.mp4', title: 'Pop Hits Music Video', path: '/media/music/pop_hits.mp4', fileType: 'video', fileSize: 209715200, duration: 240.0, resolution: '1920x1080', codec: 'h264', bitrate: 4500, frameRate: 29.97, sampleRate: 44100, channels: 2, category: 'music', tags: '["pop","music video","hits"]' } }),
    db.media.create({ data: { filename: 'concert_live_rock.mp4', title: 'Live Rock Concert', path: '/media/music/rock_concert.mp4', fileType: 'video', fileSize: 1073741824, duration: 5400.0, resolution: '1920x1080', codec: 'h264', bitrate: 6000, frameRate: 29.97, sampleRate: 48000, channels: 2, category: 'music', tags: '["concert","rock","live"]' } }),
    db.media.create({ data: { filename: 'channel_ident_10s.mp4', title: 'Channel Ident 10s', path: '/media/generic/ident_10s.mp4', fileType: 'video', fileSize: 10485760, duration: 10.0, resolution: '1920x1080', codec: 'h264', bitrate: 5000, frameRate: 25.0, sampleRate: 48000, channels: 2, category: 'ident', tags: '["ident","bumper"]' } }),
    db.media.create({ data: { filename: 'commercial_break_30s.mp4', title: 'Commercial Break', path: '/media/generic/commercial_30s.mp4', fileType: 'video', fileSize: 31457280, duration: 30.0, resolution: '1920x1080', codec: 'h264', bitrate: 5000, frameRate: 25.0, sampleRate: 48000, channels: 2, category: 'commercial', tags: '["commercial","ad","break"]' } }),
  ])

  // Link media to channels
  const newsChannelId = channels[0].id
  const sportsChannelId = channels[1].id
  const musicChannelId = channels[2].id

  await db.channelMedia.createMany({
    data: [
      { channelId: newsChannelId, mediaId: mediaEntries[0].id },
      { channelId: newsChannelId, mediaId: mediaEntries[1].id },
      { channelId: newsChannelId, mediaId: mediaEntries[6].id },
      { channelId: newsChannelId, mediaId: mediaEntries[7].id },
      { channelId: sportsChannelId, mediaId: mediaEntries[2].id },
      { channelId: sportsChannelId, mediaId: mediaEntries[3].id },
      { channelId: musicChannelId, mediaId: mediaEntries[4].id },
      { channelId: musicChannelId, mediaId: mediaEntries[5].id },
      { channelId: musicChannelId, mediaId: mediaEntries[6].id },
    ],
  })

  // Create demo playlist for channel 1 (News 24)
  const playlist = await db.playlist.create({
    data: {
      channelId: newsChannelId,
      name: 'Main News Loop',
      isActive: true,
      loop: true,
      items: {
        create: [
          { mediaId: mediaEntries[0].id, title: 'Breaking News Intro', artist: 'News Team', duration: 15.5, order: 0, transition: 'cut', transitionDur: 0.5, inPoint: 0, outPoint: 15.5 },
          { mediaId: mediaEntries[1].id, title: 'Weather Segment', artist: 'Meteorology Dept', duration: 180.0, order: 1, transition: 'crossfade', transitionDur: 1.0, inPoint: 0, outPoint: 180.0 },
          { mediaId: mediaEntries[6].id, title: 'Channel Ident', artist: null, duration: 10.0, order: 2, transition: 'fade-through-black', transitionDur: 0.5, inPoint: 0, outPoint: 10.0 },
          { mediaId: mediaEntries[7].id, title: 'Commercial Break', artist: null, duration: 30.0, order: 3, transition: 'cut', transitionDur: 0, inPoint: 0, outPoint: 30.0 },
        ],
      },
    },
    include: { items: true },
  })

  return { channels, mediaEntries, playlist }
}

export async function GET() {
  try {
    let channels = await db.channel.findMany({
      orderBy: { order: 'asc' },
      include: {
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

    // Seed demo data if empty
    if (channels.length === 0) {
      await seedDemoData()
      channels = await db.channel.findMany({
        orderBy: { order: 'asc' },
        include: {
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
    }

    return NextResponse.json(channels)
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, order, settings } = body

    if (!name) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    const channel = await db.channel.create({
      data: {
        name,
        description: description ?? null,
        color: color ?? '#ef4444',
        order: order ?? 0,
        ...(settings ? {
          settings: {
            create: {
              width: settings.width ?? 1920,
              height: settings.height ?? 1080,
              fps: settings.fps ?? 25.0,
              videoCodec: settings.videoCodec ?? 'libx264',
              videoBitrate: settings.videoBitrate ?? 4500,
              videoPreset: settings.videoPreset ?? 'medium',
              videoProfile: settings.videoProfile ?? 'high',
              gopSize: settings.gopSize ?? 50,
              keyframeInt: settings.keyframeInt ?? 2,
              audioCodec: settings.audioCodec ?? 'aac',
              audioBitrate: settings.audioBitrate ?? 128,
              audioSampleRate: settings.audioSampleRate ?? 48000,
              audioChannels: settings.audioChannels ?? 2,
              loudnessNorm: settings.loudnessNorm ?? false,
              loudnessTarget: settings.loudnessTarget ?? -23.0,
              outputFormat: settings.outputFormat ?? 'mpegts',
              outputProtocol: settings.outputProtocol ?? 'rtmp',
              outputUrl: settings.outputUrl ?? '',
              outputKey: settings.outputKey ?? '',
              customOutput: settings.customOutput ?? '',
              loopPlaylist: settings.loopPlaylist ?? true,
              autoRecover: settings.autoRecover ?? true,
              fillerMode: settings.fillerMode ?? 'black',
              fillerPath: settings.fillerPath ?? '',
            },
          },
        } : {}),
      },
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

    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}