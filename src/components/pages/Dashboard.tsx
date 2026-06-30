'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Radio, Wifi, FolderOpen, Clock, RefreshCw, Play, Square, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/stores/app-store'
import { useSocket } from '@/lib/socket'
import { systemApi, channelsApi, logsApi } from '@/lib/api'
import type { SystemStats, ChannelStatus } from '@/types'

// --- Helpers ---

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatBitrate(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`
  return `${bps} bps`
}

function generateSparkline(base: number, variance: number, points: number = 7) {
  return Array.from({ length: points }, (_, i) => ({
    v: Math.max(0, base + (Math.sin(i * 0.8) + (Math.random() - 0.5)) * variance),
  }))
}

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stopped: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  starting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const statusDotColors: Record<string, string> = {
  running: 'bg-emerald-400',
  stopped: 'bg-zinc-500',
  starting: 'bg-amber-400',
  error: 'bg-red-400',
}

// --- Sparkline component ---

function Sparkline({ data, color = '#10b981' }: { data: { v: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// --- Stat Card ---

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  sparkData: { v: number }[]
  sparkColor?: string
}

function StatCard({ icon, label, value, sub, sparkData, sparkColor = '#10b981' }: StatCardProps) {
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-zinc-700/50 p-2 text-zinc-400">
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{value}</p>
              <p className="text-xs text-zinc-500">{label}</p>
              {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
            </div>
          </div>
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      </CardContent>
    </Card>
  )
}

// --- Recent Activity Log Entry ---

interface LogEntry {
  id: string
  channel?: { name: string }
  title: string
  duration: number
  startedAt: string
  status: string
}

// --- Main Dashboard ---

export function Dashboard() {
  const { channels, channelStatuses, navigateToChannel } = useAppStore()
  const { on, connected } = useSocket()

  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [systemHistory, setSystemHistory] = useState<
    { time: string; cpu: number; memory: number; network: number }[]
  >([])
  const [totalMedia, setTotalMedia] = useState(0)
  const [loading, setLoading] = useState(true)

  const statsRef = useRef(systemStats)
  statsRef.current = systemStats

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          systemApi.stats(),
          logsApi.list({ limit: 5 }),
          channelsApi.list(),
        ])

        if (results[0].status === 'fulfilled') {
          setSystemStats(results[0].value)
        }

        if (results[1].status === 'fulfilled') {
          const logsRes = results[1].value
          if (logsRes?.data) {
            setRecentLogs(logsRes.data)
          } else if (logsRes?.logs) {
            setRecentLogs(logsRes.logs)
          }
        }

        if (results[2].status === 'fulfilled') {
          const channelsList = results[2].value
          const mediaCount = channelsList.reduce((sum: number, ch: any) => sum + (ch._count?.media || 0), 0)
          setTotalMedia(mediaCount)
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Listen for system stats via socket
  useEffect(() => {
    if (!connected) return

    const off = on('system:stats', (data: SystemStats) => {
      setSystemStats(data)
      setSystemHistory((prev) => {
        const now = new Date()
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        const next = [...prev, { time, cpu: data.cpuUsage, memory: data.memoryUsage, network: data.networkOut }]
        return next.slice(-30)
      })
    })
    return off
  }, [connected, on])

  // Also poll system stats every 2s as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await systemApi.stats()
        setSystemStats(data)
        setSystemHistory((prev) => {
          const now = new Date()
          const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
          const next = [...prev, { time, cpu: data.cpuUsage, memory: data.memoryUsage, network: data.networkOut }]
          return next.slice(-30)
        })
      } catch {
        // ignore
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      systemApi.stats(),
      logsApi.list({ limit: 5 }),
      channelsApi.list(),
    ])
      .then((results) => {
        if (results[0].status === 'fulfilled') setSystemStats(results[0].value)
        if (results[1].status === 'fulfilled') {
          const logsRes = results[1].value
          if (logsRes?.data) setRecentLogs(logsRes.data)
          else if (logsRes?.logs) setRecentLogs(logsRes.logs)
        }
        if (results[2].status === 'fulfilled') {
          const mediaCount = results[2].value.reduce((sum: number, ch: any) => sum + (ch._count?.media || 0), 0)
          setTotalMedia(mediaCount)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const runningChannels = channels.filter((c) => c.status === 'running').length

  const handleChannelAction = useCallback(
    async (channelId: string, action: 'start' | 'stop') => {
      try {
        if (action === 'start') {
          await channelsApi.start(channelId)
        } else {
          await channelsApi.stop(channelId)
        }
      } catch (err) {
        console.error(`Failed to ${action} channel:`, err)
      }
    },
    []
  )

  // Sparkline data (simulated)
  const sparkChannels = useState(() => generateSparkline(channels.length || 3, 1, 7))[0]
  const sparkStreams = useState(() => generateSparkline(runningChannels || 1, 0.8, 7))[0]
  const sparkMedia = useState(() => generateSparkline(totalMedia || 5, 2, 7))[0]
  const sparkUptime = useState(() => generateSparkline(70, 15, 7))[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500">Broadcast system overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-zinc-500">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Radio className="h-4 w-4" />}
          label="Total Channels"
          value={`${runningChannels}/${channels.length || 0}`}
          sub="running / total"
          sparkData={sparkChannels}
          sparkColor="#10b981"
        />
        <StatCard
          icon={<Wifi className="h-4 w-4" />}
          label="Active Streams"
          value={runningChannels}
          sub="currently broadcasting"
          sparkData={sparkStreams}
          sparkColor="#10b981"
        />
        <StatCard
          icon={<FolderOpen className="h-4 w-4" />}
          label="Media Files"
          value={totalMedia}
          sub="in library"
          sparkData={sparkMedia}
          sparkColor="#f59e0b"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="System Uptime"
          value={systemStats ? formatUptime(systemStats.uptime) : '--:--'}
          sub={systemStats?.ffmpegVersion ? `FFmpeg ${systemStats.ffmpegVersion}` : 'loading...'}
          sparkData={sparkUptime}
          sparkColor="#10b981"
        />
      </div>

      {/* Main Content: Channel Monitor + System Resources */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Channel Monitor */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-800/50 border-zinc-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold text-zinc-100">Channel Monitor</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-zinc-400 hover:text-zinc-200">
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {channels.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
                  No channels configured. Create one in Channel Management.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {channels.map((channel) => {
                    const status = channelStatuses[channel.id]
                    const clipProgress =
                      status && status.clipDuration && status.clipDuration > 0
                        ? (status.currentTime || 0) / status.clipDuration
                        : 0

                    return (
                      <div
                        key={channel.id}
                        className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-600/50"
                        style={{ borderLeftWidth: '3px', borderLeftColor: channel.color || '#10b981' }}
                      >
                        {/* Channel name + status */}
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-zinc-100 truncate">{channel.name}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${statusColors[channel.status] || statusColors.stopped}`}
                          >
                            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${statusDotColors[channel.status] || statusDotColors.stopped}`} />
                            {channel.status}
                          </Badge>
                        </div>

                        {/* Current clip */}
                        <div className="mb-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Now Playing</p>
                          <p className="text-xs text-zinc-300 truncate">
                            {status?.currentClip || 'Idle'}
                          </p>
                          {status?.clipDuration && status.clipDuration > 0 && (
                            <div className="mt-1.5">
                              <Progress
                                value={clipProgress * 100}
                                className="h-1 bg-zinc-700 [&>div]:bg-emerald-500"
                              />
                              <div className="mt-0.5 flex justify-between text-[10px] text-zinc-500">
                                <span>{formatUptime(status.currentTime || 0)}</span>
                                <span>{formatUptime(status.clipDuration)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mini metrics */}
                        <div className="mb-3 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-zinc-500">Bitrate</p>
                            <p className="text-xs font-medium text-zinc-300">
                              {status?.bitrate ? formatBitrate(status.bitrate) : '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">FPS</p>
                            <p className="text-xs font-medium text-zinc-300">
                              {status?.fps || '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">Dropped</p>
                            <p className={`text-xs font-medium ${status && status.droppedFrames > 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
                              {status?.droppedFrames ?? '--'}
                            </p>
                          </div>
                        </div>

                        {/* CPU/Memory mini bars */}
                        {status && (
                          <div className="mb-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-8 text-[10px] text-zinc-500">CPU</span>
                              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${status.cpuUsage}%`,
                                    backgroundColor: status.cpuUsage > 80 ? '#ef4444' : status.cpuUsage > 60 ? '#f59e0b' : '#10b981',
                                  }}
                                />
                              </div>
                              <span className="w-8 text-right text-[10px] text-zinc-400">{status.cpuUsage.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-8 text-[10px] text-zinc-500">MEM</span>
                              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                  style={{ width: `${status.memoryUsage}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-[10px] text-zinc-400">{status.memoryUsage.toFixed(0)}%</span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {channel.status === 'running' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              onClick={(e) => { e.stopPropagation(); handleChannelAction(channel.id, 'stop') }}
                            >
                              <Square className="mr-1 h-3 w-3" />
                              Stop
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 flex-1 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                              onClick={(e) => { e.stopPropagation(); handleChannelAction(channel.id, 'start') }}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Start
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={(e) => { e.stopPropagation(); navigateToChannel(channel.id) }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Resources Panel */}
        <div>
          <Card className="bg-zinc-800/50 border-zinc-700/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-zinc-100">System Resources</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {systemStats && (
                <>
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-zinc-900/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">CPU</p>
                      <p className="text-xl font-bold text-zinc-100">{systemStats.cpuUsage.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-md bg-zinc-900/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Memory</p>
                      <p className="text-xl font-bold text-zinc-100">{systemStats.memoryUsage.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-md bg-zinc-900/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Disk</p>
                      <p className="text-xl font-bold text-zinc-100">{systemStats.diskUsage.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-md bg-zinc-900/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Network</p>
                      <p className="text-xl font-bold text-zinc-100">{formatBitrate(systemStats.networkOut)}</p>
                    </div>
                  </div>

                  {/* Chart */}
                  {systemHistory.length > 1 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Resource Usage (Live)</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={systemHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9, fill: '#71717a' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: '#71717a' }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                          />
                          <Line
                            type="monotone"
                            dataKey="cpu"
                            stroke="#10b981"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                            name="CPU %"
                          />
                          <Line
                            type="monotone"
                            dataKey="memory"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                            name="Memory %"
                          />
                          <Line
                            type="monotone"
                            dataKey="network"
                            stroke="#06b6d4"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                            name="Network"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="mt-2 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-zinc-500">CPU</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-zinc-500">Memory</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-cyan-500" />
                          <span className="text-[10px] text-zinc-500">Network</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FFmpeg version */}
                  {systemStats.ffmpegVersion && (
                    <div className="rounded-md bg-zinc-900/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">FFmpeg Version</p>
                      <p className="text-xs font-mono text-zinc-300 mt-1 truncate">{systemStats.ffmpegVersion}</p>
                    </div>
                  )}
                </>
              )}

              {!systemStats && (
                <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
                  Loading system data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-zinc-100">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {recentLogs.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-zinc-500 text-sm">
              No recent activity
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700/50 hover:bg-transparent">
                    <TableHead className="text-zinc-500 text-xs">Time</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Channel</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Clip</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Duration</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id} className="border-zinc-700/50">
                      <TableCell className="text-xs text-zinc-400 font-mono py-2">
                        {log.startedAt ? new Date(log.startedAt).toLocaleTimeString() : '--'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-300 py-2">
                        {log.channel?.name || '--'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-300 py-2 max-w-[200px] truncate">
                        {log.title}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 py-2">
                        {log.duration ? formatUptime(log.duration) : '--'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            log.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : log.status === 'error'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}