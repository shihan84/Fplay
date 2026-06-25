'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Save,
  Film,
  ListMusic,
  Settings2,
  Activity,
  Clock,
  Gauge,
  Monitor,
  AlertTriangle,
  HardDrive,
  Repeat,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAppStore } from '@/stores/app-store'
import { channelsApi, playlistsApi, settingsApi, mediaApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { Channel, ChannelSettings, ChannelStatus, Playlist, Media } from '@/types'

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

function formatBitrate(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`
  return `${bps} bps`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stopped: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  starting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
}

// --- Overview Tab ---

function OverviewTab({
  channel,
  status,
}: {
  channel: Channel
  status: ChannelStatus | undefined
}) {
  const clipProgress =
    status && status.clipDuration && status.clipDuration > 0
      ? ((status.currentTime || 0) / status.clipDuration) * 100
      : 0

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Channel Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Status</p>
              <Badge
                variant="outline"
                className={`mt-1 text-[10px] px-1.5 py-0 ${statusColors[channel.status] || statusColors.stopped}`}
              >
                {channel.status}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Uptime</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">
                {status?.uptime ? formatUptime(status.uptime) : '--'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Bitrate</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">
                {status?.bitrate ? formatBitrate(status.bitrate) : '--'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">FPS</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">
                {status?.fps || '--'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Clip */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Now Playing</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-zinc-100 font-medium truncate">
            {status?.currentClip || 'Idle'}
          </p>
          {status?.clipDuration && status.clipDuration > 0 ? (
            <div className="mt-3">
              <Progress
                value={clipProgress}
                className="h-1.5 bg-zinc-700 [&>div]:bg-emerald-500"
              />
              <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
                <span>{formatUptime(status.currentTime || 0)}</span>
                <span>{formatUptime(status.clipDuration)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No clip currently playing</p>
          )}
        </CardContent>
      </Card>

      {/* Next Clip */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Next Up</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-zinc-400">
            {status?.nextClip || 'No upcoming clip'}
          </p>
        </CardContent>
      </Card>

      {/* Stream Health */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Stream Health</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-[10px] text-zinc-500">Uptime</p>
                <p className="text-sm text-zinc-100">
                  {status?.uptime ? formatUptime(status.uptime) : '0s'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-[10px] text-zinc-500">Bitrate</p>
                <p className="text-sm text-zinc-100">
                  {status?.bitrate ? formatBitrate(status.bitrate) : '--'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-[10px] text-zinc-500">FPS</p>
                <p className="text-sm text-zinc-100">{status?.fps || '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${status && status.droppedFrames > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div>
                <p className="text-[10px] text-zinc-500">Dropped</p>
                <p className={`text-sm ${status && status.droppedFrames > 0 ? 'text-amber-400' : 'text-zinc-100'}`}>
                  {status?.droppedFrames ?? 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Configuration */}
      {channel.settings && (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Output Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
              <div>
                <p className="text-zinc-500">Protocol</p>
                <p className="text-zinc-200 font-medium">{channel.settings.outputProtocol}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-zinc-500">URL</p>
                <p className="text-zinc-200 font-medium truncate">{channel.settings.outputUrl || '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500">Resolution</p>
                <p className="text-zinc-200 font-medium">{channel.settings.width}x{channel.settings.height}</p>
              </div>
              <div>
                <p className="text-zinc-500">Codec</p>
                <p className="text-zinc-200 font-medium">{channel.settings.videoCodec}</p>
              </div>
              <div>
                <p className="text-zinc-500">Bitrate</p>
                <p className="text-zinc-200 font-medium">{formatBitrate(channel.settings.videoBitrate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Format</p>
                <p className="text-zinc-200 font-medium">{channel.settings.outputFormat}</p>
              </div>
              <div>
                <p className="text-zinc-500">Audio</p>
                <p className="text-zinc-200 font-medium">{channel.settings.audioCodec} {formatBitrate(channel.settings.audioBitrate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">FPS</p>
                <p className="text-zinc-200 font-medium">{channel.settings.fps}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {status?.error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-300/70 mt-1">{status.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Playlists Tab ---

function PlaylistsTab({
  channelId,
}: {
  channelId: string
}) {
  const { navigateToPlaylist, setSelectedPlaylist } = useAppStore()
  const { toast } = useToast()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [settingActive, setSettingActive] = useState<string | null>(null)

  const fetchPlaylists = useCallback(async () => {
    try {
      const data = await playlistsApi.list(channelId)
      setPlaylists(data)
    } catch (err) {
      console.error('Failed to fetch playlists:', err)
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  const handleCreatePlaylist = useCallback(async () => {
    try {
      const res = await playlistsApi.create({
        channelId,
        name: `Playlist ${playlists.length + 1}`,
        loop: false,
      })
      setPlaylists((prev) => [...prev, res])
      toast({ title: 'Playlist Created', description: 'New playlist added' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create playlist', variant: 'destructive' })
    }
  }, [channelId, playlists.length, toast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await playlistsApi.delete(deleteTarget.id)
      setPlaylists((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast({ title: 'Deleted', description: `${deleteTarget.name} removed` })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, toast])

  const handleSetActive = useCallback(async (id: string) => {
    setSettingActive(id)
    try {
      await playlistsApi.setActive(id)
      setPlaylists((prev) =>
        prev.map((p) => ({ ...p, isActive: p.id === id }))
      )
      toast({ title: 'Active Playlist', description: 'Playlist set as active' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSettingActive(null)
    }
  }, [toast])

  const handleOpenPlaylist = useCallback((pl: Playlist) => {
    setSelectedPlaylist(pl.id)
    navigateToPlaylist(channelId, pl.id)
  }, [channelId, navigateToPlaylist, setSelectedPlaylist])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
        Loading playlists...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{playlists.length} playlist(s)</p>
        <Button
          size="sm"
          onClick={handleCreatePlaylist}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create Playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="flex h-32 flex-col items-center justify-center text-zinc-500 text-sm">
            No playlists yet. Create one to start building your playout.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((pl) => (
            <Card
              key={pl.id}
              className="bg-zinc-800/50 border-zinc-700/50 cursor-pointer transition-all hover:border-zinc-600/70 hover:bg-zinc-800/70"
              onClick={() => handleOpenPlaylist(pl)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-zinc-100 truncate">{pl.name}</h4>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {pl.isActive && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 border border-emerald-500/30">
                        Active
                      </Badge>
                    )}
                    {pl.loop && (
                      <Badge className="bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0">
                        <Repeat className="mr-1 h-2.5 w-2.5" />
                        Loop
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mb-3">
                  {pl._count?.items || 0} items
                  {pl.startDate && (
                    <span className="ml-2">
                      {new Date(pl.startDate).toLocaleDateString()} – {pl.endDate ? new Date(pl.endDate).toLocaleDateString() : 'ongoing'}
                    </span>
                  )}
                </p>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!pl.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      disabled={settingActive === pl.id}
                      onClick={() => handleSetActive(pl.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-400 hover:text-red-400 ml-auto"
                    onClick={() => setDeleteTarget(pl)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-800 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete &quot;{deleteTarget?.name}&quot;? This will remove all items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-zinc-400 hover:text-zinc-200 border-zinc-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// --- Media Tab ---

function MediaTab({
  channelId,
}: {
  channelId: string
}) {
  const { toast } = useToast()

  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mediaApi
      .list({ channelId })
      .then((data) => {
        setMedia(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [channelId])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
        Loading media...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{media.length} file(s) assigned</p>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 h-8"
          onClick={() => toast({ title: 'Coming Soon', description: 'Media upload will be available soon' })}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Media
        </Button>
      </div>

      {media.length === 0 ? (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="flex h-32 flex-col items-center justify-center text-zinc-500 text-sm">
            No media files assigned to this channel.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700/50 hover:bg-transparent">
                    <TableHead className="text-zinc-500 text-xs">Filename</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Duration</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Resolution</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Codec</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Size</TableHead>
                    <TableHead className="text-zinc-500 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {media.map((m) => (
                    <TableRow key={m.id} className="border-zinc-700/50">
                      <TableCell className="text-xs text-zinc-300 py-2 max-w-[200px] truncate font-medium">
                        {m.title || m.filename}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 py-2">
                        {m.duration ? formatUptime(m.duration) : '--'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 py-2">
                        {m.resolution || '--'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 py-2">
                        {m.codec || '--'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 py-2">
                        {m.fileSize ? formatBytes(m.fileSize) : '--'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            m.status === 'ready'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : m.status === 'error'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Settings Tab ---

type SettingsForm = Omit<ChannelSettings, 'id' | 'channelId' | 'createdAt' | 'updatedAt'>

const defaultSettings: SettingsForm = {
  width: 1920,
  height: 1080,
  fps: 30,
  videoCodec: 'libx264',
  videoBitrate: 5000000,
  videoPreset: 'medium',
  videoProfile: 'high',
  gopSize: 60,
  keyframeInt: 2,
  audioCodec: 'aac',
  audioBitrate: 128000,
  audioSampleRate: 48000,
  audioChannels: 2,
  loudnessNorm: false,
  loudnessTarget: -24,
  outputFormat: 'mpegts',
  outputProtocol: 'RTMP',
  outputUrl: '',
  outputKey: '',
  customOutput: '',
  loopPlaylist: true,
  autoRecover: true,
  fillerMode: 'black',
  fillerPath: '',
}

function SettingsTab({
  channelId,
}: {
  channelId: string
}) {
  const { toast } = useToast()

  const [settings, setSettings] = useState<SettingsForm>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi
      .get(channelId)
      .then((data) => {
        // Merge with defaults to handle missing fields
        setSettings({ ...defaultSettings, ...data })
      })
      .catch((err) => {
        console.error('Failed to load settings:', err)
        // Keep defaults
      })
      .finally(() => setLoading(false))
  }, [channelId])

  const update = useCallback(<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await settingsApi.update(channelId, settings)
      toast({ title: 'Settings Saved', description: 'Channel settings updated' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [channelId, settings, toast])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Video Settings */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Film className="h-4 w-4 text-zinc-500" />
            Video Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Width</Label>
              <Input
                type="number"
                value={settings.width}
                onChange={(e) => update('width', parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Height</Label>
              <Input
                type="number"
                value={settings.height}
                onChange={(e) => update('height', parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">FPS</Label>
              <Select
                value={String(settings.fps)}
                onValueChange={(v) => update('fps', parseInt(v))}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {[24, 25, 29.97, 30, 50, 59.94, 60].map((f) => (
                    <SelectItem key={f} value={String(f)} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Video Codec</Label>
              <Select
                value={settings.videoCodec}
                onValueChange={(v) => update('videoCodec', v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {['libx264', 'libx265', 'h264_nvenc', 'h265_nvenc', 'libvpx-vp9', 'libaom-av1'].map((c) => (
                    <SelectItem key={c} value={c} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Video Bitrate (bps)</Label>
              <Input
                type="number"
                value={settings.videoBitrate}
                onChange={(e) => update('videoBitrate', parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Preset</Label>
              <Select
                value={settings.videoPreset}
                onValueChange={(v) => update('videoPreset', v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].map((p) => (
                    <SelectItem key={p} value={p} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Profile</Label>
              <Select
                value={settings.videoProfile}
                onValueChange={(v) => update('videoProfile', v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {['baseline', 'main', 'high', 'high10', 'high422', 'high444'].map((p) => (
                    <SelectItem key={p} value={p} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">GOP Size</Label>
              <Input
                type="number"
                value={settings.gopSize}
                onChange={(e) => update('gopSize', parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Keyframe Interval (s)</Label>
              <Input
                type="number"
                value={settings.keyframeInt}
                onChange={(e) => update('keyframeInt', parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-zinc-500" />
            Audio Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Audio Codec</Label>
              <Select
                value={settings.audioCodec}
                onValueChange={(v) => update('audioCodec', v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {['aac', 'libmp3lame', 'libopus', 'pcm_s16le', 'ac3'].map((c) => (
                    <SelectItem key={c} value={c} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Audio Bitrate (bps)</Label>
              <Input
                type="number"
                value={settings.audioBitrate}
                onChange={(e) => update('audioBitrate', parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Sample Rate (Hz)</Label>
              <Select
                value={String(settings.audioSampleRate)}
                onValueChange={(v) => update('audioSampleRate', parseInt(v))}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {[44100, 48000, 96000].map((r) => (
                    <SelectItem key={r} value={String(r)} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Audio Channels</Label>
              <Select
                value={String(settings.audioChannels)}
                onValueChange={(v) => update('audioChannels', parseInt(v))}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {[1, 2, 6].map((c) => (
                    <SelectItem key={c} value={String(c)} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {c === 1 ? 'Mono' : c === 2 ? 'Stereo' : '5.1 Surround'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loudness Normalization */}
          <div className="mt-4 flex items-center justify-between rounded-md bg-zinc-900/50 p-3">
            <div>
              <p className="text-xs font-medium text-zinc-300">Loudness Normalization</p>
              <p className="text-[10px] text-zinc-500">Target: {settings.loudnessTarget} LUFS</p>
            </div>
            <div className="flex items-center gap-3">
              {settings.loudnessNorm && (
                <Input
                  type="number"
                  value={settings.loudnessTarget}
                  onChange={(e) => update('loudnessTarget', parseInt(e.target.value) || -24)}
                  className="bg-zinc-800 border-zinc-600 text-zinc-100 h-7 w-20 text-xs"
                />
              )}
              <Switch
                checked={settings.loudnessNorm}
                onCheckedChange={(v) => update('loudnessNorm', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Settings */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-zinc-500" />
            Output Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Output Format</Label>
              <Select
                value={settings.outputFormat}
                onValueChange={(v) => update('outputFormat', v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {['mpegts', 'mp4', 'flv', 'mkv', 'mov'].map((f) => (
                    <SelectItem key={f} value={f} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Output Protocol</Label>
              <Select
                value={settings.outputProtocol}
                onValueChange={(v) => update('outputProtocol', v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {['RTMP', 'SRT', 'UDP', 'RTP'].map((p) => (
                    <SelectItem key={p} value={p} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Output URL</Label>
              <Input
                value={settings.outputUrl}
                onChange={(e) => update('outputUrl', e.target.value)}
                placeholder={settings.outputProtocol === 'RTMP' ? 'rtmp://live.example.com/app' : 'srt://live.example.com:9000'}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 placeholder:text-zinc-600 h-8 text-xs"
              />
            </div>
            {settings.outputProtocol === 'RTMP' && (
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Stream Key</Label>
                <Input
                  value={settings.outputKey}
                  onChange={(e) => update('outputKey', e.target.value)}
                  placeholder="your-stream-key"
                  type="password"
                  className="bg-zinc-900 border-zinc-600 text-zinc-100 placeholder:text-zinc-600 h-8 text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Playout Settings */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-500" />
            Playout Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between rounded-md bg-zinc-900/50 p-3">
            <div>
              <p className="text-xs font-medium text-zinc-300">Loop Playlist</p>
              <p className="text-[10px] text-zinc-500">Restart playlist when all items are played</p>
            </div>
            <Switch
              checked={settings.loopPlaylist}
              onCheckedChange={(v) => update('loopPlaylist', v)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-900/50 p-3">
            <div>
              <p className="text-xs font-medium text-zinc-300">Auto Recover</p>
              <p className="text-[10px] text-zinc-500">Automatically restart on crash or error</p>
            </div>
            <Switch
              checked={settings.autoRecover}
              onCheckedChange={(v) => update('autoRecover', v)}
            />
          </div>

          <div className="rounded-md bg-zinc-900/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-zinc-300">Filler Mode</p>
                <p className="text-[10px] text-zinc-500">What to show when no content is available</p>
              </div>
              <Select
                value={settings.fillerMode}
                onValueChange={(v) => update('fillerMode', v as 'black' | 'image' | 'playlist')}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-600 text-zinc-100 h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="black" className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">Black</SelectItem>
                  <SelectItem value="image" className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">Image</SelectItem>
                  <SelectItem value="playlist" className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100 text-xs">Playlist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(settings.fillerMode === 'image' || settings.fillerMode === 'playlist') && (
              <Input
                value={settings.fillerPath}
                onChange={(e) => update('fillerPath', e.target.value)}
                placeholder={settings.fillerMode === 'image' ? '/path/to/filler.png' : '/path/to/filler-playlist'}
                className="bg-zinc-800 border-zinc-600 text-zinc-100 placeholder:text-zinc-600 h-8 text-xs mt-2"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
        >
          {saving ? (
            <>
              <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// --- Main ChannelDetail Component ---

export function ChannelDetail() {
  const { selectedChannelId, channels, channelStatuses, setActiveView, updateChannel } = useAppStore()
  const { toast } = useToast()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Find from store or fetch
  useEffect(() => {
    if (!selectedChannelId) return
    const found = channels.find((c) => c.id === selectedChannelId)
    if (found) {
      setChannel(found)
      setLoading(false)
    }
    // Always fetch full details
    channelsApi
      .get(selectedChannelId)
      .then((data) => {
        setChannel(data)
      })
      .catch((err) => {
        console.error('Failed to fetch channel:', err)
      })
      .finally(() => setLoading(false))
  }, [selectedChannelId, channels])

  const handleBack = useCallback(() => {
    setActiveView('channels')
  }, [setActiveView])

  const handleAction = useCallback(
    async (action: 'start' | 'stop' | 'restart') => {
      if (!selectedChannelId) return
      setActionLoading(true)
      try {
        await channelsApi[action](selectedChannelId)
        const statusMap = { start: 'starting', stop: 'stopped', restart: 'starting' } as const
        updateChannel(selectedChannelId, { status: statusMap[action] })
        if (channel) {
          setChannel({ ...channel, status: statusMap[action] })
        }
        toast({
          title: `Channel ${action === 'restart' ? 'Restarting' : action === 'start' ? 'Starting' : 'Stopping'}`,
          description: 'Action initiated successfully',
        })
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || `${action} failed`, variant: 'destructive' })
      } finally {
        setActionLoading(false)
      }
    },
    [selectedChannelId, channel, updateChannel, toast]
  )

  if (!selectedChannelId) {
    return (
      <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
        No channel selected
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
        Loading channel details...
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-zinc-500">
        <p className="text-sm">Channel not found</p>
        <Button variant="ghost" size="sm" className="text-zinc-400" onClick={handleBack}>
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to channels
        </Button>
      </div>
    )
  }

  const status = channelStatuses[channel.id]

  return (
    <div className="space-y-6">
      {/* Channel Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-zinc-200"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div
            className="h-8 w-1 rounded-full"
            style={{ backgroundColor: channel.color || '#10b981' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-100">{channel.name}</h1>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${statusColors[channel.status] || statusColors.stopped}`}
              >
                {channel.status}
              </Badge>
            </div>
            {channel.description && (
              <p className="text-xs text-zinc-500 mt-0.5">{channel.description}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {channel.status !== 'running' && (
            <Button
              size="sm"
              onClick={() => handleAction('start')}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Start
            </Button>
          )}
          {channel.status === 'running' && (
            <>
              <Button
                size="sm"
                onClick={() => handleAction('stop')}
                disabled={actionLoading}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8"
              >
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Stop
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction('restart')}
                disabled={actionLoading}
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 h-8"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Restart
              </Button>
            </>
          )}
          {channel.status === 'starting' && (
            <Button size="sm" disabled className="border-amber-500/30 text-amber-400 h-8">
              <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              Starting...
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="playlists" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
            <ListMusic className="mr-1.5 h-3.5 w-3.5" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="media" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
            <Film className="mr-1.5 h-3.5 w-3.5" />
            Media
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab channel={channel} status={status} />
        </TabsContent>

        <TabsContent value="playlists">
          <PlaylistsTab channelId={channel.id} />
        </TabsContent>

        <TabsContent value="media">
          <MediaTab channelId={channel.id} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab channelId={channel.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}