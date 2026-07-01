'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Search,
  Grid3X3,
  List,
  Film,
  Music,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Edit,
  Plus,
  X,
  FileVideo,
  ArrowUpDown,
  Eye,
  FolderOpen,
} from 'lucide-react'

import { mediaApi } from '@/lib/api'
import type { Media } from '@/types'
import { useAppStore } from '@/stores/app-store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = bytes / Math.pow(k, i)
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatBitrate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`
  return `${kbps} kbps`
}

function getFileTypeIcon(fileType: string) {
  if (fileType === 'audio') return Music
  if (fileType === 'image') return ImageIcon
  return FileVideo
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'processing':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'error':
      return 'bg-red-500/15 text-red-400 border-red-500/30'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type SortField =
  | 'filename'
  | 'duration'
  | 'resolution'
  | 'codec'
  | 'bitrate'
  | 'fileSize'
  | 'category'
  | 'status'
  | 'createdAt'
type SortDir = 'asc' | 'desc'

type ViewMode = 'grid' | 'list'

// ─── Component ───────────────────────────────────────────────────────────────

export function MediaLibrary() {
  const queryClient = useQueryClient()
  const { channels, selectedChannelId } = useAppStore()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Dialog state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [activeMedia, setActiveMedia] = useState<Media | null>(null)

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTags, setEditTags] = useState('')

  // Assign state
  const [assignChannelId, setAssignChannelId] = useState<string>('')

  // ─── Data fetching ───────────────────────────────────────────────────────

  const { data: mediaList = [], isLoading } = useQuery<Media[]>({
    queryKey: ['media', selectedChannelId, searchQuery, categoryFilter, fileTypeFilter],
    queryFn: () =>
      mediaApi.list({
        channelId: selectedChannelId ?? undefined,
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      }),
    refetchInterval: 5000,
  })

  // ─── Mutations ───────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => mediaApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setEditOpen(false)
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (data: { file?: File; category: string; tags: string }) => {
      const fileName = data.file?.name
      const fileType = data.file?.type
      const fileSize = data.file?.size
      if (data.file) {
        const formData = new FormData()
        formData.append('file', data.file)
        formData.append('category', data.category)
        formData.append('tags', data.tags)
        return mediaApi.upload(formData)
      }
      // Fallback: create via JSON
      return fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fileName || 'uploaded-file.mp4',
          title: fileName?.replace(/\.[^.]+$/, '') || 'Uploaded File',
          path: `/media/${fileName || 'uploaded-file.mp4'}`,
          fileType: fileType?.startsWith('audio') ? 'audio' : 'video',
          fileSize: fileSize || 0,
          duration: 0,
          category: data.category || null,
          tags: data.tags || null,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error('Create failed')
        return r.json()
      })
    },
    onMutate: () => {
      setIsUploading(true)
      setUploadProgress(0)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setUploadOpen(false)
      setIsUploading(false)
      setUploadProgress(0)
    },
    onError: () => {
      setIsUploading(false)
      setUploadProgress(0)
    },
  })

  // ─── Computed ────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = new Set<string>()
    mediaList.forEach((m) => {
      if (m.category) cats.add(m.category)
    })
    return Array.from(cats).sort()
  }, [mediaList])

  const filteredMedia = useMemo(() => {
    let result = [...mediaList]

    // Client-side file type filter
    if (fileTypeFilter !== 'all') {
      result = result.filter((m) => m.fileType === fileTypeFilter)
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]
      if (valA == null) valA = ''
      if (valB == null) valB = ''
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB)
        return sortDir === 'asc' ? cmp : -cmp
      }
      return sortDir === 'asc' ? valA - valB : valB - valA
    })

    return result
  }, [mediaList, fileTypeFilter, sortField, sortDir])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('asc')
      }
    },
    [sortField]
  )

  const handleUpload = useCallback(() => {
    if (!fileInputRef.current?.files?.length) return
    const file = fileInputRef.current.files[0]
    // Simulate progress
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }
      setUploadProgress(Math.min(progress, 100))
    }, 200)

    uploadMutation.mutate({
      file,
      category: (document.getElementById('upload-category') as HTMLInputElement)?.value || '',
      tags: (document.getElementById('upload-tags') as HTMLInputElement)?.value || '',
    })
  }, [uploadMutation])

  const openEditDialog = useCallback((media: Media) => {
    setActiveMedia(media)
    setEditTitle(media.title || '')
    setEditCategory(media.category || '')
    setEditTags(media.tags || '')
    setEditOpen(true)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!activeMedia) return
    updateMutation.mutate({
      id: activeMedia.id,
      data: {
        title: editTitle,
        category: editCategory || null,
        tags: editTags || null,
      },
    })
  }, [activeMedia, editTitle, editCategory, editTags, updateMutation])

  const toggleRowSelect = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === filteredMedia.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredMedia.map((m) => m.id)))
    }
  }, [selectedRows.size, filteredMedia])

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedRows) {
      await deleteMutation.mutateAsync(id)
    }
    setSelectedRows(new Set())
  }, [selectedRows, deleteMutation])

  const SortHeader = ({
    field,
    children,
    className = '',
  }: {
    field: SortField
    children: React.ReactNode
    className?: string
  }) => (
    <button
      className={`flex items-center gap-1 hover:text-zinc-200 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="h-3 w-3 text-zinc-500" />
    </button>
  )

  // ─── Render: Grid View ───────────────────────────────────────────────────

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {filteredMedia.map((media) => {
          const TypeIcon = getFileTypeIcon(media.fileType)
          return (
            <motion.div
              key={media.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="group relative bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden hover:border-zinc-600/50 transition-colors cursor-pointer"
              onClick={() => {
                setActiveMedia(media)
                setInfoOpen(true)
              }}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
                {media.thumbnail ? (
                  <img
                    src={media.thumbnail}
                    alt={media.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <TypeIcon className="h-10 w-10 text-zinc-600" />
                )}
                {/* Duration badge */}
                <div className="absolute bottom-1.5 right-1.5 bg-black/70 rounded px-1.5 py-0.5 text-[11px] font-mono text-white">
                  {formatDuration(media.duration)}
                </div>
                {/* Status dot */}
                <div
                  className={`absolute top-1.5 left-1.5 h-2 w-2 rounded-full ${
                    media.status === 'ready'
                      ? 'bg-emerald-500'
                      : media.status === 'processing'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
                {/* Action menu */}
                <div
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => {
                          setActiveMedia(media)
                          setInfoOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(media)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setActiveMedia(media)
                          setAssignOpen(true)
                        }}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Assign to Channel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(media.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div className="truncate text-sm font-medium text-zinc-200" title={media.filename}>
                  {media.filename}
                </div>
                {media.title && media.title !== media.filename && (
                  <div className="truncate text-xs text-zinc-400" title={media.title}>
                    {media.title}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {media.resolution && (
                    <span className="text-[11px] text-zinc-500 font-mono">{media.resolution}</span>
                  )}
                  {media.codec && (
                    <span className="text-[11px] text-zinc-500 font-mono uppercase">{media.codec}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">{formatFileSize(media.fileSize)}</span>
                  <div className="flex items-center gap-1.5">
                    {media.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-zinc-600 text-zinc-400">
                        {media.category}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(media.status)}`}
                    >
                      {media.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )

  // ─── Render: List View ───────────────────────────────────────────────────

  const renderListView = () => (
    <div className="rounded-lg border border-zinc-700/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-700/50 bg-zinc-800/80 hover:bg-zinc-800/80">
            <TableHead className="w-10">
              <Checkbox
                checked={selectedRows.size === filteredMedia.length && filteredMedia.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-12">Thumb</TableHead>
            <TableHead>
              <SortHeader field="filename">Filename</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="duration">Duration</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="resolution">Resolution</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="codec">Codec</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="bitrate">Bitrate</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="fileSize">Size</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="category">Category</SortHeader>
            </TableHead>
            <TableHead>
              <SortHeader field="status">Status</SortHeader>
            </TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMedia.map((media) => {
            const TypeIcon = getFileTypeIcon(media.fileType)
            return (
              <TableRow
                key={media.id}
                className="border-zinc-700/30 hover:bg-zinc-800/50 cursor-pointer"
                onClick={() => {
                  setActiveMedia(media)
                  setInfoOpen(true)
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedRows.has(media.id)}
                    onCheckedChange={() => toggleRowSelect(media.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="w-10 h-7 rounded bg-zinc-900 flex items-center justify-center overflow-hidden">
                    {media.thumbnail ? (
                      <img src={media.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <TypeIcon className="h-4 w-4 text-zinc-600" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="truncate max-w-[200px]" title={media.filename}>
                    {media.filename}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-300">
                  {formatDuration(media.duration)}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-400">{media.resolution || '—'}</TableCell>
                <TableCell className="font-mono text-xs uppercase text-zinc-400">
                  {media.codec || '—'}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-400">
                  {media.bitrate ? formatBitrate(media.bitrate) : '—'}
                </TableCell>
                <TableCell className="text-xs text-zinc-400">{formatFileSize(media.fileSize)}</TableCell>
                <TableCell>
                  {media.category ? (
                    <Badge variant="outline" className="text-[10px] h-5 border-zinc-600 text-zinc-400">
                      {media.category}
                    </Badge>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 ${getStatusColor(media.status)}`}
                  >
                    {media.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => {
                          setActiveMedia(media)
                          setInfoOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(media)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setActiveMedia(media)
                          setAssignOpen(true)
                        }}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Assign to Channel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(media.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Media Library</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {isLoading ? 'Loading...' : `${mediaList.length} media file${mediaList.length !== 1 ? 's' : ''}`}
            {selectedChannelId && (
              <span className="text-zinc-500">
                {' '}
                · Filtered by channel
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk actions */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-sm text-zinc-400">{selectedRows.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          )}
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by filename or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-zinc-800/50 border-zinc-700/50 text-zinc-300">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px] bg-zinc-800/50 border-zinc-700/50 text-zinc-300">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-zinc-700/50 rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-none bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-none bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg bg-zinc-800" />
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                <Skeleton className="h-3 w-1/2 bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-zinc-800" />
            ))}
          </div>
        )
      ) : filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Film className="h-12 w-12 mb-3 text-zinc-700" />
          <p className="text-sm">No media files found</p>
          <p className="text-xs text-zinc-600 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}

      {/* ─── Upload Dialog ──────────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Upload Media</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Upload video or audio files to the media library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">File</Label>
              <div className="border-2 border-dashed border-zinc-600 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={() => {}}
                />
                <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-2" />
                <p className="text-sm text-zinc-400">
                  No file selected
                </p>
                <p className="text-xs text-zinc-600 mt-1">Video and audio files only</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Category</Label>
              <Input
                id="upload-category"
                placeholder="e.g. News, Sports, Music"
                className="bg-zinc-900 border-zinc-600 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Tags (comma separated)</Label>
              <Input
                id="upload-tags"
                placeholder="e.g. breaking, live, hd"
                className="bg-zinc-900 border-zinc-600 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setUploadOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Media Info Dialog ──────────────────────────────────────────── */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Media Details</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Full metadata for this media file.
            </DialogDescription>
          </DialogHeader>
          {activeMedia && (
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-5">
                {/* Preview */}
                <div className="aspect-video bg-zinc-900 rounded-lg flex items-center justify-center overflow-hidden">
                  {activeMedia.thumbnail ? (
                    <img
                      src={activeMedia.thumbnail}
                      alt={activeMedia.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (() => {
                    const TypeIcon = getFileTypeIcon(activeMedia.fileType)
                    return <TypeIcon className="h-16 w-16 text-zinc-600" />
                  })()}
                </div>

                {/* Filename */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">Filename</h3>
                  <p className="text-sm text-zinc-200 font-mono break-all">{activeMedia.filename}</p>
                </div>

                {/* Title */}
                {activeMedia.title && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-1">Title</h3>
                    <p className="text-sm text-zinc-200">{activeMedia.title}</p>
                  </div>
                )}

                <Separator className="bg-zinc-700/50" />

                {/* Video Info */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <FileVideo className="h-4 w-4" />
                    Video Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Resolution" value={activeMedia.resolution} />
                    <InfoItem label="Codec" value={activeMedia.codec?.toUpperCase()} />
                    <InfoItem label="Bitrate" value={activeMedia.bitrate ? formatBitrate(activeMedia.bitrate) : null} />
                    <InfoItem label="Frame Rate" value={activeMedia.frameRate ? `${activeMedia.frameRate} fps` : null} />
                  </div>
                </div>

                <Separator className="bg-zinc-700/50" />

                {/* Audio Info */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Audio Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Sample Rate" value={activeMedia.sampleRate ? `${activeMedia.sampleRate} Hz` : null} />
                    <InfoItem label="Channels" value={activeMedia.channels ? `${activeMedia.channels}ch` : null} />
                  </div>
                </div>

                <Separator className="bg-zinc-700/50" />

                {/* File Info */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">File Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Size" value={formatFileSize(activeMedia.fileSize)} />
                    <InfoItem label="Duration" value={formatDuration(activeMedia.duration)} />
                    <InfoItem label="Type" value={activeMedia.fileType} />
                    <InfoItem label="Path" value={activeMedia.path} mono />
                  </div>
                </div>

                <Separator className="bg-zinc-700/50" />

                {/* Metadata */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">Metadata</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Category" value={activeMedia.category} />
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Status</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${getStatusColor(activeMedia.status)}`}
                      >
                        {activeMedia.status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-zinc-500 mb-1">Tags</p>
                      {activeMedia.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {activeMedia.tags.split(',').map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] h-5 border-zinc-600 text-zinc-400"
                            >
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600">No tags</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Edit Media Dialog ──────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Media</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Update metadata for {activeMedia?.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Media title"
                className="bg-zinc-900 border-zinc-600 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Category</Label>
              <Input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g. News, Sports"
                className="bg-zinc-900 border-zinc-600 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Tags (comma separated)</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="e.g. breaking, live, hd"
                className="bg-zinc-900 border-zinc-600 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign to Channel Dialog ───────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Assign to Channel</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select a channel to assign {activeMedia?.filename} to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {channels.length === 0 ? (
              <p className="text-sm text-zinc-500">No channels available. Create a channel first.</p>
            ) : (
              <Select value={assignChannelId} onValueChange={setAssignChannelId}>
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-200">
                  <SelectValue placeholder="Select channel..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ch.color }} />
                        {ch.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAssignOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAssignOpen(false)
                // Channel assignment would go through a linking API
              }}
              disabled={!assignChannelId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-sm text-zinc-200 ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value || '—'}
      </p>
    </div>
  )
}