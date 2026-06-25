'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { recordingsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Disc,
  Download,
  Trash2,
  HardDrive,
  Clock,
  FileVideo,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { ConformanceRecording } from '@/types'

function formatDurationSec(sec: number | undefined | null): string {
  if (sec == null || sec < 0) return '--:--'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'recording':
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5">
          <span className="size-2 rounded-full bg-red-500 animate-pulse" />
          Recording
        </Badge>
      )
    case 'completed':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>
    case 'error':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Error</Badge>
    default:
      return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/50">{status}</Badge>
  }
}

export function RecordingsPage() {
  const { channels, selectedChannelId, setSelectedChannel } = useAppStore()
  const [localChannelId, setLocalChannelId] = useState(selectedChannelId || '')
  const [deleteTarget, setDeleteTarget] = useState<ConformanceRecording | null>(null)

  const effectiveChannelId = useMemo(
    () => localChannelId || selectedChannelId || (channels.length > 0 ? channels[0].id : ''),
    [localChannelId, selectedChannelId, channels]
  )

  const handleChannelChange = (val: string) => {
    setLocalChannelId(val)
    setSelectedChannel(val)
  }

  const { data: allRecordings = [], isLoading } = useQuery({
    queryKey: ['recordings', effectiveChannelId],
    queryFn: () => recordingsApi.list(effectiveChannelId || undefined),
  })

  const recordings = effectiveChannelId
    ? allRecordings.filter((r: ConformanceRecording) => r.channelId === effectiveChannelId)
    : allRecordings

  // Summary calculations
  const totalRecordings = recordings.length
  const totalDuration = recordings.reduce((sum: number, r: ConformanceRecording) => sum + (r.duration || 0), 0)
  const totalDiskUsage = recordings.reduce((sum: number, r: ConformanceRecording) => sum + (r.fileSize || 0), 0)

  const handleDownload = (rec: ConformanceRecording) => {
    toast.success(`Download started: ${rec.filePath.split('/').pop() || 'recording'}`)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      toast.success(`Deleted: ${deleteTarget.filePath.split('/').pop() || 'recording'}`)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Disc className="size-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100">Conformance Recordings</h2>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-zinc-400 whitespace-nowrap">Channel</Label>
          <Select value={localChannelId} onValueChange={handleChannelChange}>
            <SelectTrigger className="w-56 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Select channel" />
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/60 py-4">
          <CardContent className="flex items-center gap-3 p-0 px-4">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <FileVideo className="size-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Recordings</p>
              <p className="text-2xl font-bold text-zinc-100">{totalRecordings}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60 py-4">
          <CardContent className="flex items-center gap-3 p-0 px-4">
            <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Duration</p>
              <p className="text-2xl font-bold text-zinc-100">{formatDurationSec(totalDuration)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60 py-4">
          <CardContent className="flex items-center gap-3 p-0 px-4">
            <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <HardDrive className="size-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Disk Usage</p>
              <p className="text-2xl font-bold text-zinc-100">{formatFileSize(totalDiskUsage)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-zinc-800" />
              ))}
            </div>
          ) : recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Disc className="size-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500">No recordings found</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 w-12">#</TableHead>
                    <TableHead className="text-zinc-400">Channel</TableHead>
                    <TableHead className="text-zinc-400">File</TableHead>
                    <TableHead className="text-zinc-400">Duration</TableHead>
                    <TableHead className="text-zinc-400">Size</TableHead>
                    <TableHead className="text-zinc-400">Started</TableHead>
                    <TableHead className="text-zinc-400">Ended</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400 w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordings.map((rec: ConformanceRecording, idx: number) => {
                    const channel = channels.find((c) => c.id === rec.channelId)
                    return (
                      <TableRow key={rec.id} className="border-zinc-800/50 hover:bg-zinc-800/40">
                        <TableCell className="text-zinc-500 font-mono text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {channel?.name || '—'}
                        </TableCell>
                        <TableCell className="text-zinc-200 text-sm font-mono max-w-[200px] truncate">
                          {rec.filePath.split('/').pop() || '—'}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm font-mono">
                          {formatDurationSec(rec.duration)}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm">
                          {formatFileSize(rec.fileSize)}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm font-mono">
                          {rec.startedAt ? format(new Date(rec.startedAt), 'MM/dd HH:mm:ss') : '—'}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm font-mono">
                          {rec.endedAt ? format(new Date(rec.endedAt), 'MM/dd HH:mm:ss') : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={rec.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-emerald-400"
                              onClick={() => handleDownload(rec)}
                              title="Download"
                            >
                              <Download className="size-3.5" />
                            </Button>
                            <AlertDialog open={deleteTarget?.id === rec.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-red-400"
                                  onClick={() => setDeleteTarget(rec)}
                                  title="Delete"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-zinc-800 bg-zinc-900">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete recording?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-zinc-400">
                                    This will permanently delete the recording file. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}