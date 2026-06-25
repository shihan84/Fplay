import { Server } from 'socket.io'

const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 5000,
  pingTimeout: 10000,
})

const PORT = 3005

// Store channel statuses in memory
const channelStatuses: Map<string, any> = new Map()
const systemStats = {
  cpuUsage: 0,
  memoryUsage: 0,
  diskUsage: 0,
  networkIn: 0,
  networkOut: 0,
  uptime: Date.now(),
  ffmpegVersion: '7.0.1',
}

// Simulate system stats
function generateSystemStats() {
  systemStats.cpuUsage = Math.max(5, Math.min(95, systemStats.cpuUsage + (Math.random() - 0.5) * 10))
  systemStats.memoryUsage = Math.max(20, Math.min(85, systemStats.memoryUsage + (Math.random() - 0.5) * 5))
  systemStats.diskUsage = 42.3 + Math.random() * 2
  systemStats.networkIn = Math.max(1, Math.min(100, systemStats.networkIn + (Math.random() - 0.5) * 20))
  systemStats.networkOut = Math.max(5, Math.min(500, systemStats.networkOut + (Math.random() - 0.5) * 50))
  return { ...systemStats, uptime: Date.now() - systemStats.uptime }
}

// Simulate channel status updates for running channels
function simulateChannelUpdate(channelId: string) {
  const status = channelStatuses.get(channelId)
  if (!status || status.status !== 'running') return

  const clipDuration = 180 + Math.random() * 300 // 3-8 min clips
  const currentTime = (status.currentTime || 0) + Math.random() * 3

  if (currentTime >= clipDuration) {
    // Switch to next clip
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

  // Update channel status (from API)
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

// Broadcast periodic updates
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

io.listen(PORT)
console.log(`Realtime service running on port ${PORT}`)