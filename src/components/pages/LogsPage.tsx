'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { logsApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
import { FileDown, Trash2, ScrollText, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import type { AsRunLog } from '@/types'

const PAGE_SIZE = 20

type SortField = 'time' | 'duration'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'success' | 'error' | 'skipped'

function formatDurationSec(sec: number | undefined | null): string {
  if (sec == null || sec < 0) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Success</Badge>
    case 'error':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Error</Badge>
    case 'skipped':
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Skipped</Badge>
    default:
      return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/50">{status}</Badge>
  }
}

function SortButton({ field, children, onToggle }: { field: SortField; children: React.ReactNode; onToggle: (f: SortField) => void }) {
  return (
    <button
      onClick={() => onToggle(field)}
      className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
    >
      {children}
      <ArrowUpDown className="size-3 text-zinc-500" />
    </button>
  )
}

export function LogsPage() {
  const { channels, selectedChannelId, setSelectedChannel } = useAppStore()
  const queryClient = useQueryClient()

  const [localChannelId, setLocalChannelId] = useState(selectedChannelId || '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [localLogs, setLocalLogs] = useState<AsRunLog[]>([])
  const [total, setTotal] = useState(0)

  const effectiveChannelId = useMemo(
    () => localChannelId || selectedChannelId || (channels.length > 0 ? channels[0].id : ''),
    [localChannelId, selectedChannelId, channels]
  )

  const handleChannelChange = (val: string) => {
    setLocalChannelId(val)
    setSelectedChannel(val)
    setPage(0)
  }

  const handleStatusFilterChange = (val: StatusFilter) => {
    setStatusFilter(val)
    setPage(0)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ['logs', effectiveChannelId, statusFilter, page, sortField, sortDir],
    queryFn: async () => {
      if (!effectiveChannelId) return { logs: [] as AsRunLog[], total: 0 }
      const res = await logsApi.list({
        channelId: effectiveChannelId,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      let logs = res.logs || []
      // Client-side status filter
      if (statusFilter !== 'all') {
        logs = logs.filter((l: AsRunLog) => l.status === statusFilter)
      }
      // Client-side sort
      logs = [...logs].sort((a: AsRunLog, b: AsRunLog) => {
        let cmp = 0
        if (sortField === 'time') {
          cmp = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
        } else {
          cmp = (a.duration || 0) - (b.duration || 0)
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
      setLocalLogs(logs)
      setTotal(res.total || logs.length)
      return res
    },
    enabled: !!effectiveChannelId,
  })

  const handleExportCsv = async () => {
    if (!effectiveChannelId) return
    try {
      const csv = await logsApi.exportCsv(effectiveChannelId)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asrun-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch {
      toast.error('Failed to export CSV')
    }
  }

  const handleClearLogs = () => {
    setLocalLogs([])
    setTotal(0)
    queryClient.invalidateQueries({ queryKey: ['logs'] })
    toast.success('Logs cleared')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="size-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100">As-Run Logs</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!localChannelId}
            className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300"
          >
            <FileDown className="size-4" />
            Export CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
              >
                <Trash2 className="size-4" />
                Clear Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-zinc-800 bg-zinc-900">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all logs?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  This will remove all as-run logs for this channel. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearLogs}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
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
        <div className="flex items-center gap-2">
          <Label className="text-sm text-zinc-400 whitespace-nowrap">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => handleStatusFilterChange(v as StatusFilter)}
          >
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm text-zinc-500">
          {total > 0 && (
            <span>{total} log{total !== 1 ? 's' : ''} total</span>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-zinc-800" />
              ))}
            </div>
          ) : localLogs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-zinc-500">No logs found</p>
            </div>
          ) : (
            <>
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400 w-12">#</TableHead>
                      <TableHead className="text-zinc-400">
                        <SortButton field="time" onToggle={toggleSort}>Time</SortButton>
                      </TableHead>
                      <TableHead className="text-zinc-400">Channel</TableHead>
                      <TableHead className="text-zinc-400">Clip Title</TableHead>
                      <TableHead className="text-zinc-400">
                        <SortButton field="duration" onToggle={toggleSort}>Duration</SortButton>
                      </TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localLogs.map((log, idx) => (
                      <TableRow key={log.id} className="border-zinc-800/50 hover:bg-zinc-800/40">
                        <TableCell className="text-zinc-500 font-mono text-xs">
                          {page * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm font-mono">
                          {format(new Date(log.startedAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {log.channel?.name || '—'}
                        </TableCell>
                        <TableCell className="text-zinc-200 text-sm font-medium max-w-[240px] truncate">
                          {log.title || '—'}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm font-mono">
                          {formatDurationSec(log.duration)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="text-red-400/80 text-xs max-w-[200px] truncate">
                          {log.error || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
                <p className="text-sm text-zinc-500">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm text-zinc-400 min-w-[60px] text-center">
                    {page + 1} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}