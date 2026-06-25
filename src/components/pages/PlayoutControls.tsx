'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/stores/app-store'
import { channelsApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Play,
  Square,
  RotateCcw,
  SkipForward,
  Radio,
  Wifi,
  WifiOff,
  Activity,
  Cpu,
  MonitorPlay,
  ArrowRightLeft,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Helpers ──────────────────────────────────────────────
function formatTimecode(seconds: number | undefined, fps = 25): string {
  if (seconds == null || seconds < 0) return '00:00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

function formatDuration(sec: number | undefined): string {
  if (sec == null || sec < 0) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Mini Sparkline Component ─────────────────────────────
function Sparkline({ data, color = 'text-emerald-400' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={color}
      />
    </svg>
  )
}

// ── Metric Card ──────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  sparkData,
  sparkColor,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  unit?: string
  sub?: string
  sparkData?: number[]
  sparkColor?: string
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60 py-4">
      <CardContent className="flex items-start justify-between gap-3 p-0 px-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="size-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
          </div>
          <div className="text-xl font-bold text-zinc-100">
            {value}
            {unit && <span className="text-sm font-normal text-zinc-500 ml-1">{unit}</span>}
          </div>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} color={sparkColor} />
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────
export function PlayoutControls() {
  const { channels, selectedChannelId, setSelectedChannel, channelStatuses } = useAppStore()
  const { emit } = useSocket()
  const [localChannelId, setLocalChannelId] = useState<string>(selectedChannelId || '')
  const [rtmpUrl, setRtmpUrl] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Sparkline history buffers
  const bitrateHistory = useRef<number[]>([])
  const cpuHistory = useRef<number[]>([])

  const status = localChannelId ? channelStatuses[localChannelId] : null
  const isRunning = status?.status === 'running'
  const isStarting = status?.status === 'starting'
  const isOnError = status?.status === 'error'
  const progress = status?.clipDuration ? ((status.currentTime || 0) / status.clipDuration) * 100 : 0
  const targetFps = 25 // default assumption

  // Sync local channel selector
  useEffect(() => {
    if (selectedChannelId) setLocalChannelId(selectedChannelId)
  }, [selectedChannelId])

  // Auto-select first channel
  useEffect(() => {
    if (!localChannelId && channels.length > 0) {
      const first = channels[0].id
      setLocalChannelId(first)
      setSelectedChannel(first)
    }
  }, [channels, localChannelId, setSelectedChannel])

  // Track sparkline data
  useEffect(() => {
    if (status) {
      bitrateHistory.current = [...bitrateHistory.current.slice(-19), status.bitrate || 0]
      cpuHistory.current = [...cpuHistory.current.slice(-19), status.cpuUsage || 0]
    }
  }, [status])

  const handleChannelChange = useCallback((val: string) => {
    setLocalChannelId(val)
    setSelectedChannel(val)
    setIsLive(false)
    setRtmpUrl('')
  }, [setSelectedChannel])

  const handleAction = useCallback(async (action: 'start' | 'stop' | 'restart') => {
    if (!localChannelId) return
    setActionLoading(action)
    try {
      await channelsApi[action](localChannelId)
      emit('channel:subscribe', localChannelId)
      toast.success(`${action === 'start' ? 'Started' : action === 'stop' ? 'Stopped' : 'Restarted'} playout`)
    } catch {
      toast.error(`Failed to ${action} playout`)
    } finally {
      setActionLoading(null)
    }
  }, [localChannelId, emit])

  const handleSkip = useCallback(() => {
    if (!localChannelId) return
    emit('channel:skip', localChannelId)
    toast.success('Skipping to next clip')
  }, [localChannelId, emit])

  const handleSwitchToLive = useCallback(() => {
    if (!rtmpUrl.trim()) {
      toast.error('Enter an RTMP input URL first')
      return
    }
    if (!localChannelId) return
    emit('channel:live', { channelId: localChannelId, rtmpUrl })
    setIsLive(true)
    toast.success('Switched to live input')
  }, [localChannelId, rtmpUrl, emit])

  const handleSwitchToPlaylist = useCallback(() => {
    if (!localChannelId) return
    emit('channel:playlist', { channelId: localChannelId })
    setIsLive(false)
    toast.success('Switched back to playlist')
  }, [localChannelId, emit])

  const selectedChannel = channels.find((c) => c.id === localChannelId)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Channel Selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium text-zinc-400 whitespace-nowrap">Channel</Label>
        <Select value={localChannelId} onValueChange={handleChannelChange}>
          <SelectTrigger className="w-64 bg-zinc-900 border-zinc-700">
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: ch.color }} />
                  {ch.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {status && (
          <div className="flex items-center gap-2 ml-auto">
            {status.status === 'running' && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5">
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                ON AIR
              </Badge>
            )}
            {status.status === 'stopped' && (
              <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/50 gap-1.5">
                <WifiOff className="size-3" />
                OFFLINE
              </Badge>
            )}
            {status.status === 'starting' && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1.5">
                <Activity className="size-3 animate-pulse" />
                STARTING
              </Badge>
            )}
            {status.status === 'error' && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5">
                <WifiOff className="size-3" />
                ERROR
              </Badge>
            )}
          </div>
        )}
      </div>

      {!localChannelId ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="flex items-center justify-center py-20">
            <p className="text-zinc-500">Select a channel to control playout</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Control Area */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MonitorPlay className="size-4 text-emerald-400" />
                {selectedChannel?.name || 'Playout Control'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap">
                {/* PLAY / STOP */}
                <Button
                  size="lg"
                  className={`h-16 w-40 text-lg font-bold rounded-xl transition-all ${
                    isRunning
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  onClick={() => handleAction(isRunning ? 'stop' : 'start')}
                  disabled={isStarting || !!actionLoading}
                >
                  {isRunning ? (
                    <>
                      <Square className="size-6" />
                      STOP
                    </>
                  ) : (
                    <>
                      <Play className="size-6" />
                      PLAY
                    </>
                  )}
                </Button>

                {/* RESTART */}
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-28 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 rounded-xl"
                  onClick={() => handleAction('restart')}
                  disabled={isStarting || !!actionLoading}
                >
                  <RotateCcw className="size-5" />
                  RESTART
                </Button>

                {/* SKIP / NEXT */}
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-28 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 rounded-xl"
                  onClick={handleSkip}
                  disabled={!isRunning}
                >
                  <SkipForward className="size-5" />
                  SKIP
                </Button>

                {/* Error Display */}
                {isOnError && status?.error && (
                  <div className="ml-auto max-w-xs">
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {status.error}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Clip Info */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRunning && status?.currentClip ? (
                <>
                  <h3 className="text-2xl font-bold text-zinc-100 truncate">
                    {status.currentClip}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>{formatTimecode(status.currentTime)}</span>
                      <span>{formatTimecode(status.clipDuration)}</span>
                    </div>
                    <div className="relative">
                      <Progress value={progress} className="h-2 [&>div]:bg-emerald-500" />
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    TC: {formatTimecode(status.currentTime)}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Play className="size-4 text-zinc-600 ml-0.5" />
                  </div>
                  <p className="text-zinc-500">No clip currently playing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Clip Info */}
          {status?.nextClip && (
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="flex items-center gap-4 py-4">
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 shrink-0">
                  UP NEXT
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {status.nextClip}
                  </p>
                </div>
                <ArrowRightLeft className="size-4 text-zinc-600 shrink-0" />
              </CardContent>
            </Card>
          )}

          {/* Stream Health */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Stream Health
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={Activity}
                label="Bitrate"
                value={status?.bitrate || 0}
                unit="kbps"
                sparkData={bitrateHistory.current}
                sparkColor="text-emerald-400"
              />
              <MetricCard
                icon={MonitorPlay}
                label="FPS"
                value={status?.fps || 0}
                unit="fps"
                sub={`Target: ${targetFps} fps`}
              />
              <MetricCard
                icon={Wifi}
                label="Dropped Frames"
                value={status?.droppedFrames || 0}
              />
              <MetricCard
                icon={Cpu}
                label="CPU Usage"
                value={status?.cpuUsage ? `${status.cpuUsage.toFixed(1)}` : 0}
                unit="%"
                sparkData={cpuHistory.current}
                sparkColor={status?.cpuUsage && status.cpuUsage > 80 ? 'text-red-400' : status?.cpuUsage && status.cpuUsage > 60 ? 'text-amber-400' : 'text-emerald-400'}
              />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Live Input Panel */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Radio className="size-4 text-amber-400" />
                  Live Input
                </CardTitle>
                {isLive && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5 animate-pulse">
                    <span className="size-2 rounded-full bg-red-500" />
                    LIVE
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-zinc-500">RTMP Input URL</Label>
                  <Input
                    placeholder="rtmp://localhost/live/stream"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                    disabled={isLive}
                  />
                </div>
                {!isLive ? (
                  <Button
                    onClick={handleSwitchToLive}
                    disabled={!isRunning || !rtmpUrl.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    <Radio className="size-4" />
                    Switch to Live
                  </Button>
                ) : (
                  <Button
                    onClick={handleSwitchToPlaylist}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 shrink-0"
                  >
                    <ArrowRightLeft className="size-4" />
                    Back to Playlist
                  </Button>
                )}
              </div>
              {isLive && rtmpUrl && (
                <p className="text-xs text-zinc-500 font-mono">
                  Connected to: {rtmpUrl}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}