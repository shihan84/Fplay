import { Server } from 'socket.io'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createServer } from 'node:http'

const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 5000,
  pingTimeout: 10000,
})

const PORT = process.env.PORT || 3005
const APP_API_URL = process.env.APP_API_URL || 'http://localhost:3000/api'
const MEDIA_DIR = process.env.MEDIA_DIR || '/srv/media'
const LOGOS_DIR = process.env.LOGOS_DIR || '/srv/logos'

// ─── Types ───────────────────────────────────────────────────────────────────

type ChannelSettings = {
  width?: number
  height?: number
  fps?: number
  videoCodec?: string
  videoBitrate?: number
  videoPreset?: string
  audioCodec?: string
  audioBitrate?: number
  audioSampleRate?: number
  audioChannels?: number
  outputProtocol?: string
  outputUrl?: string
  outputKey?: string
  loopPlaylist?: boolean
  autoRecover?: boolean
  fillerMode?: string
  fillerPath?: string
}

type Channel = {
  id: string
  name: string
  status: string
  settings?: ChannelSettings
}

type Media = {
  id: string
  filename: string
  title?: string
  path: string
  fileType: string
  duration: number
  fileSize: number
  status: string
}

type PlaylistItem = {
  id: string
  mediaId: string
  title?: string
  duration: number
  order: number
  media?: Media
}

type LogoOverlay = {
  id: string
  channelId: string
  name: string
  path: string
  opacity: number
  posX: string
  posY: string
  offsetX: number
  offsetY: number
  sizeW: number
  sizeH: number
  active: boolean
  bgColor?: string | null
}

type Playlist = {
  id: string
  channelId: string
  isActive: boolean
  loop: boolean
  items?: PlaylistItem[]
  _count?: { items: number }
}

// ─── State ───────────────────────────────────────────────────────────────────

const channelStatuses: Map<string, any> = new Map()
const ffmpegProcesses: Map<string, ChildProcess> = new Map()
const systemStats = {
  cpuUsage: 0,
  memoryUsage: 0,
  diskUsage: 0,
  networkIn: 0,
  networkOut: 0,
  uptime: Date.now(),
  ffmpegVersion: '7.0.1',
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${APP_API_URL}${path}`
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${path} failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

async function fetchChannels(): Promise<Channel[]> {
  return apiFetch('/channels')
}

async function fetchChannelSettings(channelId: string): Promise<ChannelSettings | undefined> {
  try {
    return await apiFetch<ChannelSettings>(`/settings?channelId=${channelId}`)
  } catch (err) {
    console.error(`Failed to fetch settings for ${channelId}:`, err)
    return undefined
  }
}

async function fetchPlaylists(channelId: string): Promise<Playlist[]> {
  return apiFetch(`/playlists?channelId=${channelId}`)
}

async function fetchLogos(channelId: string): Promise<LogoOverlay[]> {
  try {
    return await apiFetch<LogoOverlay[]>(`/logos?channelId=${channelId}`)
  } catch (err) {
    console.error(`Failed to fetch logos for ${channelId}:`, err)
    return []
  }
}

async function fetchActivePlaylist(playlistId: string): Promise<Playlist | undefined> {
  try {
    return await apiFetch<Playlist>(`/playlists?id=${playlistId}`)
  } catch (err) {
    console.error(`Failed to fetch playlist ${playlistId}:`, err)
    return undefined
  }
}

async function updateChannelStatus(channelId: string, status: string): Promise<void> {
  try {
    await apiFetch(`/channels/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  } catch (err) {
    console.error(`Failed to update channel ${channelId} status:`, err)
  }
}

// ─── System Stats Simulation ─────────────────────────────────────────────────

function generateSystemStats() {
  systemStats.cpuUsage = Math.max(5, Math.min(95, systemStats.cpuUsage + (Math.random() - 0.5) * 10))
  systemStats.memoryUsage = Math.max(20, Math.min(85, systemStats.memoryUsage + (Math.random() - 0.5) * 5))
  systemStats.diskUsage = 42.3 + Math.random() * 2
  systemStats.networkIn = Math.max(1, Math.min(100, systemStats.networkIn + (Math.random() - 0.5) * 20))
  systemStats.networkOut = Math.max(5, Math.min(500, systemStats.networkOut + (Math.random() - 0.5) * 50))
  return { ...systemStats, uptime: Date.now() - systemStats.uptime }
}

// ─── Channel Status Simulation ─────────────────────────────────────────────────

function simulateChannelUpdate(channelId: string) {
  const status = channelStatuses.get(channelId)
  if (!status || status.status !== 'running') return

  const clipDuration = status.clipDuration || 180 + Math.random() * 300
  const currentTime = (status.currentTime || 0) + Math.random() * 3

  if (currentTime >= clipDuration) {
    const titles = [
      'News Broadcast Segment', 'Commercial Break', 'Weather Update',
      'Documentary Part', 'Entertainment Show', 'Sports Highlight Reel',
      'Music Video Block', 'Talk Show Segment', 'Movie Opening',
      'Breaking News Live', 'Cooking Show Episode', 'Tech Review'
    ]
    status.currentClip = titles[Math.floor(Math.random() * titles.length)]
    status.nextClip = titles[Math.floor(Math.random() * titles.length)]
    status.currentTime = 0
    status.clipDuration = clipDuration
  } else {
    status.currentTime = currentTime
  }

  status.cpuUsage = Math.max(5, Math.min(80, (status.cpuUsage || 20) + (Math.random() - 0.5) * 8))
  status.memoryUsage = Math.max(10, Math.min(60, (status.memoryUsage || 15) + (Math.random() - 0.5) * 4))
  status.bitrate = Math.round((status.videoBitrate || 4500) + (Math.random() - 0.5) * 200)
  status.fps = Math.round(((status.targetFps || 25) + (Math.random() - 0.5) * 0.5) * 100) / 100
  status.droppedFrames = (status.droppedFrames || 0) + (Math.random() > 0.9 ? 1 : 0)
  status.uptime = Date.now() - (status.startedAt || Date.now())
}

// ─── Playout Engine ──────────────────────────────────────────────────────────

function mediaFilePath(mediaPath: string): string {
  return join(MEDIA_DIR, basename(mediaPath))
}

function buildPlaylistFile(channelId: string, items: PlaylistItem[]): string | null {
  const validItems = items.filter((item) => {
    if (!item.media || !item.media.path) return false
    const filePath = mediaFilePath(item.media.path)
    return existsSync(filePath)
  })

  if (validItems.length === 0) return null

  const tmpDir = '/tmp'
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  const filePath = join(tmpDir, `ffplayout-${channelId}.txt`)
  const content = validItems
    .map((item) => `file '${mediaFilePath(item.media!.path)}'`)
    .join('\n')
  writeFileSync(filePath, content)
  return filePath
}

function buildOutputUrl(settings: ChannelSettings): string | null {
  const url = settings.outputUrl?.trim()
  if (!url) return null

  if (settings.outputProtocol?.toLowerCase() === 'rtmp' && settings.outputKey) {
    // Count path segments after the host to decide whether to append the stream key.
    // rtmp://host:port/app        → 1 segment  → append key → rtmp://host:port/app/key
    // rtmp://host:port/app/key   → 2 segments → already complete, use as-is
    const pathParts = url.replace(/^rtmp:\/\/[^/]+/, '').split('/').filter(Boolean)
    if (pathParts.length === 1) {
      return url.replace(/\/?$/, `/${settings.outputKey}`)
    }
  }

  return url
}

function logoFilePath(logoPath: string): string {
  return join(LOGOS_DIR, basename(logoPath))
}

function buildLogoFilter(logos: LogoOverlay[], width: number, height: number): { inputs: string[]; filterComplex: string } | null {
  const active = logos.filter((l) => l.active && existsSync(logoFilePath(l.path)))
  if (active.length === 0) return null

  const inputs: string[] = []
  const filters: string[] = []
  let lastLabel = '0:v'

  active.forEach((logo, idx) => {
    inputs.push('-i', logoFilePath(logo.path))
    const inputIdx = idx + 1
    const isLast = idx === active.length - 1
    const outLabel = isLast ? 'vout' : `v${idx}`
    const scaleW = logo.sizeW || 200
    const scaleH = logo.sizeH && logo.sizeH > 0 ? logo.sizeH : -1

    const posX = logo.posX === 'left' ? logo.offsetX : logo.posX === 'right' ? `W-w-${logo.offsetX}` : '(W-w)/2'
    const posY = logo.posY === 'top' ? logo.offsetY : logo.posY === 'bottom' ? `H-h-${logo.offsetY}` : '(H-h)/2'

    const isJpeg = /\.(jpg|jpeg)$/i.test(logo.path)

    if (isJpeg) {
      // JPEGs have no alpha channel. Use colorkey to remove the background color,
      // then convert to rgba so the overlay filter can blend transparently.
      // similarity=0.35 gives tolerance for JPEG compression artefacts around solid bg.
      const keyColor = (logo.bgColor || '#5e5e5e').replace('#', '0x')
      filters.push(
        `[${inputIdx}:v]scale=${scaleW}:${scaleH},` +
        `colorkey=color=${keyColor}:similarity=0.35:blend=0.05,` +
        `format=rgba[logo${idx}]`
      )
    } else {
      // PNG/WebP: convert to rgba first so alpha survives scale (ya8, palette etc → rgba)
      filters.push(`[${inputIdx}:v]format=rgba,scale=${scaleW}:${scaleH}[logo${idx}]`)
    }

    // format=auto is required for FFmpeg 7.x to use the alpha plane for blending.
    // Only on the last logo force yuv420p so libx264 gets a compatible pixel format.
    const postFmt = isLast ? ',format=yuv420p' : ''
    filters.push(`[${lastLabel}][logo${idx}]overlay=${posX}:${posY}:format=auto${postFmt}[${outLabel}]`)

    lastLabel = outLabel
  })

  return { inputs, filterComplex: filters.join(';') }
}

function buildFfmpegArgs(channelId: string, items: PlaylistItem[], settings: ChannelSettings, logos: LogoOverlay[] = []): string[] | null {
  const outputUrl = buildOutputUrl(settings)
  if (!outputUrl) {
    console.error(`No output URL configured for channel ${channelId}`)
    return null
  }

  const isRtmp = outputUrl.startsWith('rtmp://')
  const outFormat = isRtmp ? 'flv' : 'mpegts'

  const width = settings.width || 1280
  const height = settings.height || 720
  const fps = settings.fps || 25
  const videoBitrate = settings.videoBitrate || 1000
  const audioBitrate = settings.audioBitrate || 128
  const audioSampleRate = settings.audioSampleRate || 44100
  const audioChannels = settings.audioChannels || 2

  const concatFile = buildPlaylistFile(channelId, items)

  if (concatFile) {
    const logoFilter = buildLogoFilter(logos, width, height)

    const baseArgs = [
      '-re',
      '-f', 'concat',
      '-safe', '0',
      '-protocol_whitelist', 'file,http,https,tcp,tls',
      '-i', concatFile,
    ]

    if (settings.loopPlaylist) {
      baseArgs.splice(0, 0, '-stream_loop', '-1')
    }

    if (logoFilter) {
      const args = [
        ...baseArgs,
        ...logoFilter.inputs,
        '-filter_complex', logoFilter.filterComplex,
        '-map', '[vout]',
        '-map', '0:a',
        '-c:v', 'libx264',
        '-preset', settings.videoPreset || 'veryfast',
        '-b:v', `${videoBitrate}k`,
        '-r', String(fps),
        '-c:a', 'aac',
        '-b:a', `${audioBitrate}k`,
        '-ar', String(audioSampleRate),
        '-ac', String(audioChannels),
        '-f', outFormat,
        outputUrl,
      ]
      return args
    }

    return [
      ...baseArgs,
      '-c:v', 'libx264',
      '-preset', settings.videoPreset || 'veryfast',
      '-b:v', `${videoBitrate}k`,
      '-r', String(fps),
      '-c:a', 'aac',
      '-b:a', `${audioBitrate}k`,
      '-ar', String(audioSampleRate),
      '-ac', String(audioChannels),
      '-f', outFormat,
      outputUrl,
    ]
  }

  // Fallback: test pattern when no valid media files exist
  console.warn(`No valid media for channel ${channelId}, streaming test pattern`)
  return [
    '-re',
    '-f', 'lavfi',
    '-i', `testsrc=size=${width}x${height}:rate=${fps}`,
    '-f', 'lavfi',
    '-i', `sine=frequency=1000:sample_rate=${audioSampleRate}`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', `${videoBitrate}k`,
    '-r', String(fps),
    '-c:a', 'aac',
    '-b:a', `${audioBitrate}k`,
    '-ar', String(audioSampleRate),
    '-ac', String(audioChannels),
    '-f', outFormat,
    outputUrl,
  ]
}

async function startChannel(channel: Channel) {
  const channelId = channel.id
  if (ffmpegProcesses.has(channelId)) return

  const settings = await fetchChannelSettings(channelId)
  if (!settings) {
    console.error(`Cannot start channel ${channelId}: settings not found`)
    return
  }

  const playlists = await fetchPlaylists(channelId)
  const activePlaylist = playlists.find((p) => p.isActive)
  let items: PlaylistItem[] = []

  if (activePlaylist) {
    const detail = await fetchActivePlaylist(activePlaylist.id)
    items = detail?.items || []
  }

  const logos = await fetchLogos(channelId)
  const activeLogos = logos.filter((l) => l.active)
  console.log(`Channel ${channelId}: ${activeLogos.length} active logo(s)`)

  const args = buildFfmpegArgs(channelId, items, settings, activeLogos)
  if (!args) {
    console.error(`Cannot build ffmpeg command for channel ${channelId}`)
    return
  }

  console.log(`Starting ffmpeg for channel ${channelId}: ffmpeg ${args.join(' ')}`)
  const proc = spawn('ffmpeg', args, { stdio: 'pipe' })
  ffmpegProcesses.set(channelId, proc)

  proc.stdout?.on('data', (data) => {
    console.log(`[ffmpeg ${channelId}] ${data.toString().trim()}`)
  })
  proc.stderr?.on('data', (data) => {
    const line = data.toString().trim()
    if (line.includes('Error') || line.includes('error') || line.includes('failed')) {
      console.error(`[ffmpeg ${channelId}] ${line}`)
    }
  })

  proc.on('error', (err) => {
    console.error(`ffmpeg process error for channel ${channelId}:`, err)
  })

  proc.on('exit', async (code) => {
    console.log(`ffmpeg for channel ${channelId} exited with code ${code}`)
    ffmpegProcesses.delete(channelId)

    const shouldRestart = settings.autoRecover !== false && (channel.status === 'running' || channel.status === 'starting')
    if (shouldRestart) {
      console.warn(`Restarting channel ${channelId} (autoRecover)`)
      await updateChannelStatus(channelId, 'starting')
      // Brief delay before restart
      setTimeout(() => syncChannels(), 2000)
    } else {
      await updateChannelStatus(channelId, 'stopped')
    }

    const status = channelStatuses.get(channelId) || {}
    status.status = shouldRestart ? 'starting' : code === 0 ? 'stopped' : 'error'
    io.emit('channel:status', { channelId, ...status })
  })

  // Update the realtime service UI state
  const startedAt = Date.now()
  const newStatus = {
    ...channelStatuses.get(channelId),
    channelId,
    status: 'running',
    videoBitrate: settings.videoBitrate || 4500,
    targetFps: settings.fps || 25,
    startedAt,
    currentClip: items[0]?.media?.filename || items[0]?.title || 'Broadcast Start',
    nextClip: items[1]?.media?.filename || items[1]?.title || 'Next Clip',
    currentTime: 0,
    clipDuration: items[0]?.duration || 300,
    cpuUsage: 25,
    memoryUsage: 15,
    bitrate: settings.videoBitrate || 4500,
    fps: settings.fps || 25,
    droppedFrames: 0,
    uptime: 0,
  }
  channelStatuses.set(channelId, newStatus)
  io.emit('channel:status', newStatus)

  // Persist the running state to the database
  if (channel.status === 'starting') {
    await updateChannelStatus(channelId, 'running')
  }
}

function stopChannel(channelId: string) {
  const proc = ffmpegProcesses.get(channelId)
  if (!proc) return
  console.log(`Stopping ffmpeg for channel ${channelId}`)
  proc.kill('SIGTERM')
  ffmpegProcesses.delete(channelId)

  const status = channelStatuses.get(channelId) || {}
  status.status = 'stopped'
  channelStatuses.set(channelId, status)
  io.emit('channel:status', { channelId, ...status })
}

async function syncChannels() {
  try {
    const channels = await fetchChannels()
    for (const channel of channels) {
      const shouldRun = channel.status === 'starting' || channel.status === 'running'
      const isRunning = ffmpegProcesses.has(channel.id)

      if (shouldRun && !isRunning) {
        await startChannel(channel)
      } else if (!shouldRun && isRunning) {
        stopChannel(channel.id)
      } else if (shouldRun && isRunning) {
        // Verify the process is still alive
        const proc = ffmpegProcesses.get(channel.id)
        if (proc && proc.exitCode !== null) {
          ffmpegProcesses.delete(channel.id)
          await startChannel(channel)
        }
      }
    }
  } catch (err) {
    console.error('syncChannels error:', err)
  }
}

// ─── Socket.IO ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send current state on connect
  socket.emit('system:stats', generateSystemStats())

  const statuses = Array.from(channelStatuses.entries()).map(([id, s]) => ({ channelId: id, ...s }))
  socket.emit('channels:status-all', statuses)

  // Subscribe to channel
  socket.on('channel:subscribe', (channelId: string) => {
    socket.join(`channel:${channelId}`)
    const status = channelStatuses.get(channelId)
    if (status) {
      socket.emit('channel:status', { channelId, ...status })
    }
  })

  socket.on('channel:unsubscribe', (channelId: string) => {
    socket.leave(`channel:${channelId}`)
  })

  // Update channel status (from UI)
  socket.on('channel:update', (data: { channelId: string; status: string; videoBitrate?: number; targetFps?: number }) => {
    const existing = channelStatuses.get(data.channelId) || {}
    const newStatus = {
      ...existing,
      channelId: data.channelId,
      status: data.status,
      videoBitrate: data.videoBitrate || existing.videoBitrate || 4500,
      targetFps: data.targetFps || existing.targetFps || 25,
      ...(data.status === 'running' ? {
        startedAt: Date.now(),
        currentClip: 'Broadcast Start',
        nextClip: 'News Broadcast Segment',
        currentTime: 0,
        clipDuration: 300,
        cpuUsage: 25,
        memoryUsage: 15,
        bitrate: data.videoBitrate || 4500,
        fps: data.targetFps || 25,
        droppedFrames: 0,
      } : {}),
      ...(data.status === 'stopped' ? {
        currentClip: undefined,
        nextClip: undefined,
        currentTime: undefined,
        clipDuration: undefined,
        uptime: undefined,
      } : {}),
    }
    channelStatuses.set(data.channelId, newStatus)
    io.emit('channel:status', { channelId: data.channelId, ...newStatus })
  })

  // Trigger overlay
  socket.on('overlay:trigger', (data: { channelId: string; overlayId: string }) => {
    io.to(`channel:${data.channelId}`).emit('overlay:triggered', data)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// ─── Periodic Tasks ─────────────────────────────────────────────────────────

setInterval(() => {
  // System stats
  io.emit('system:stats', generateSystemStats())

  // Channel status updates for running channels
  for (const [channelId] of channelStatuses) {
    simulateChannelUpdate(channelId)
    const status = channelStatuses.get(channelId)
    if (status && status.status === 'running') {
      io.emit('channel:status', { channelId, ...status })
    }
  }
}, 2000)

// Sync with the database and manage ffmpeg processes
setInterval(syncChannels, 5000)

// ─── Channel Reload (for logo/overlay changes) ───────────────────────────────

async function reloadChannel(channelId: string) {
  const proc = ffmpegProcesses.get(channelId)
  if (!proc) {
    console.log(`reloadChannel: channel ${channelId} not running, skipping`)
    return
  }
  console.log(`Reloading ffmpeg for channel ${channelId} (overlay change)`)
  proc.kill('SIGTERM')
  ffmpegProcesses.delete(channelId)

  // Wait briefly then restart
  await new Promise((r) => setTimeout(r, 1500))

  const channels = await fetchChannels()
  const channel = channels.find((c) => c.id === channelId)
  if (channel && (channel.status === 'running' || channel.status === 'starting')) {
    await startChannel(channel)
  }
}

// ─── HTTP control server ──────────────────────────────────────────────────────

const CONTROL_PORT = process.env.CONTROL_PORT || 3006

const controlServer = createServer((req, res) => {
  const match = req.url?.match(/^\/reload\/([^/?]+)$/)
  if (req.method === 'POST' && match) {
    const channelId = match[1]
    res.writeHead(202, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, channelId }))
    reloadChannel(channelId).catch((err) =>
      console.error(`reloadChannel error for ${channelId}:`, err)
    )
    return
  }
  res.writeHead(404)
  res.end()
})

controlServer.listen(CONTROL_PORT, () => {
  console.log(`Control server listening on port ${CONTROL_PORT}`)
})

io.listen(PORT as number)
console.log(`Realtime / playout engine running on port ${PORT}`)
console.log(`Using app API: ${APP_API_URL}`)
console.log(`Using media directory: ${MEDIA_DIR}`)
