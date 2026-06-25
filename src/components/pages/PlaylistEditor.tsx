'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Trash2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  X,
  Play,
  Check,
  Music,
  Film,
  Image as ImageIcon,
  Clock,
  ListPlus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import { channelsApi, playlistsApi, mediaApi } from '@/lib/api'
import type { Media, Playlist, PlaylistItem, Channel } from '@/types'
import { useAppStore } from '@/stores/app-store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatSeconds(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseSeconds(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return Number(str) || 0
}

const TRANSITION_TYPES: PlaylistItem['transition'][] = [
  'cut',
  'crossfade',
  'fade-through-white',
  'fade-through-black',
  'dissolve',
]

const TRANSITION_COLORS: Record<string, string> = {
  cut: 'bg-zinc-500',
  crossfade: 'bg-emerald-500/70',
  'fade-through-white': 'bg-zinc-300/70',
  'fade-through-black': 'bg-zinc-700',
  dissolve: 'bg-amber-500/70',
}

function getTransitionLabel(t: string) {
  return t
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getStatusColor(status: string) {
  switch (status) {
    case 'playing':
      return 'bg-emerald-500 text-emerald-950'
    case 'played':
      return 'bg-zinc-600 text-zinc-300'
    case 'error':
      return 'bg-red-500 text-white'
    default:
      return 'bg-zinc-700/50 text-zinc-400'
  }
}

// ─── Sortable Item Component ──────────────────────────────────────────────────

function SortablePlaylistItem({
  item,
  onRemove,
  onTransitionChange,
  onTransitionDurChange,
  onInPointChange,
  onOutPointChange,
  isPlaying,
}: {
  item: PlaylistItem
  onRemove: (id: string) => void
  onTransitionChange: (id: string, val: PlaylistItem['transition']) => void
  onTransitionDurChange: (id: string, val: number) => void
  onInPointChange: (id: string, val: number) => void
  onOutPointChange: (id: string, val: number | null) => void
  isPlaying: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        group relative rounded-lg border p-3 transition-all
        ${
          isPlaying
            ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            : isDragging
            ? 'border-zinc-500 bg-zinc-800/80 shadow-lg'
            : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 transition-colors touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Order number */}
        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded bg-zinc-700/50 flex items-center justify-center text-xs font-mono text-zinc-400">
          {item.order + 1}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{item.title}</span>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                <Play className="h-3 w-3 fill-emerald-400" />
                LIVE
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] h-5 flex-shrink-0 ${getStatusColor(item.status)}`}
            >
              {item.status}
            </Badge>
          </div>

          {/* Duration */}
          <div className="text-xs text-zinc-500 font-mono">
            {formatDuration(item.duration)}
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Transition type */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Transition</Label>
              <Select
                value={item.transition}
                onValueChange={(v) => onTransitionChange(item.id, v as PlaylistItem['transition'])}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs bg-zinc-900 border-zinc-600 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {TRANSITION_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {getTransitionLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transition duration */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Dur</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={item.transitionDur}
                onChange={(e) => onTransitionDurChange(item.id, parseFloat(e.target.value) || 0)}
                className="h-7 w-16 text-xs font-mono bg-zinc-900 border-zinc-600 text-zinc-300"
              />
              <span className="text-[10px] text-zinc-500">s</span>
            </div>

            {/* In point */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">In</Label>
              <Input
                type="text"
                placeholder="00:00"
                value={formatSeconds(item.inPoint)}
                onChange={(e) => onInPointChange(item.id, parseSeconds(e.target.value))}
                className="h-7 w-16 text-xs font-mono bg-zinc-900 border-zinc-600 text-zinc-300"
              />
            </div>

            {/* Out point */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Out</Label>
              <Input
                type="text"
                placeholder={formatDuration(item.duration)}
                value={item.outPoint ? formatSeconds(item.outPoint) : ''}
                onChange={(e) => onOutPointChange(item.id, e.target.value ? parseSeconds(e.target.value) : null)}
                className="h-7 w-16 text-xs font-mono bg-zinc-900 border-zinc-600 text-zinc-300"
              />
            </div>
          </div>
        </div>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PlaylistEditor() {
  const queryClient = useQueryClient()
  const { channels, selectedChannelId, setSelectedChannel, navigateToPlaylist } = useAppStore()

  // State
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const [loop, setLoop] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(true)
  const [browserSearch, setBrowserSearch] = useState('')

  // Create playlist dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newLoop, setNewLoop] = useState(false)

  // Local item edits
  const [localItems, setLocalItems] = useState<PlaylistItem[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ─── Data fetching ───────────────────────────────────────────────────────

  const channelIdForFetch = editingPlaylistId
    ? selectedChannelId
    : selectedChannelId

  const { data: playlists = [], isLoading: playlistsLoading } = useQuery<Playlist[]>({
    queryKey: ['playlists', selectedChannelId],
    queryFn: () => (selectedChannelId ? playlistsApi.list(selectedChannelId) : Promise.resolve([])),
    refetchInterval: 5000,
    enabled: !!selectedChannelId,
  })

  const { data: playlistDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ['playlist-detail', editingPlaylistId],
    queryFn: () => playlistsApi.get(editingPlaylistId!),
    refetchInterval: 5000,
    enabled: !!editingPlaylistId,
  })

  const { data: allMedia = [], isLoading: mediaLoading } = useQuery<Media[]>({
    queryKey: ['media-all', browserSearch],
    queryFn: () => mediaApi.list({ search: browserSearch || undefined }),
    refetchInterval: 10000,
  })

  // Sync playlist detail to local state when playlist changes
  const prevPlaylistIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (playlistDetail && playlistDetail.id !== prevPlaylistIdRef.current) {
      prevPlaylistIdRef.current = playlistDetail.id
      const id = playlistDetail.id
      // Use timeout callback to satisfy React 19 lint (setState must be in callback, not sync in effect)
      const timer = setTimeout(() => {
        const items: PlaylistItem[] = playlistDetail.items || []
        setLocalItems(items.sort((a: PlaylistItem, b: PlaylistItem) => a.order - b.order))
        setPlaylistName(playlistDetail.name || '')
        setLoop(playlistDetail.loop || false)
        setHasUnsavedChanges(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [playlistDetail])

  // Current playlist from list
  const currentPlaylist = useMemo(
    () => playlists.find((p) => p.id === editingPlaylistId),
    [playlists, editingPlaylistId]
  )

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      playlistsApi.create({
        channelId: selectedChannelId,
        name: data.name,
        loop: data.loop,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      setCreateOpen(false)
      setNewPlaylistName('')
      setNewStartDate('')
      setNewEndDate('')
      setNewLoop(false)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlaylistId) return
      // Update playlist name and loop
      await playlistsApi.update(editingPlaylistId, {
        name: playlistName,
        loop,
      })
      // Update item orders
      const items = localItems.map((item, index) => ({
        id: item.id,
        order: index,
        transition: item.transition,
        transitionDur: item.transitionDur,
        inPoint: item.inPoint,
        outPoint: item.outPoint,
      }))
      await playlistsApi.updateItems(editingPlaylistId, items)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      queryClient.invalidateQueries({ queryKey: ['playlist-detail'] })
      setHasUnsavedChanges(false)
    },
  })

  const addItemsMutation = useMutation({
    mutationFn: ({ playlistId, items }: { playlistId: string; items: any[] }) =>
      playlistsApi.addItems(playlistId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-detail'] })
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      playlistsApi.removeItem(playlistId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-detail'] })
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: (id: string) => playlistsApi.setActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlaylistId || !localItems.length) return
      for (const item of localItems) {
        await playlistsApi.removeItem(editingPlaylistId, item.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-detail'] })
      setHasUnsavedChanges(false)
    },
  })

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      setLocalItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id)
        const newIndex = prev.findIndex((i) => i.id === over.id)
        return arrayMove(prev, oldIndex, newIndex).map((item, idx) => ({
          ...item,
          order: idx,
        }))
      })
      setHasUnsavedChanges(true)
    },
    []
  )

  const handleTransitionChange = useCallback((id: string, val: PlaylistItem['transition']) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, transition: val } : i))
    )
    setHasUnsavedChanges(true)
  }, [])

  const handleTransitionDurChange = useCallback((id: string, val: number) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, transitionDur: val } : i))
    )
    setHasUnsavedChanges(true)
  }, [])

  const handleInPointChange = useCallback((id: string, val: number) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, inPoint: val } : i))
    )
    setHasUnsavedChanges(true)
  }, [])

  const handleOutPointChange = useCallback((id: string, val: number | null) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, outPoint: val } : i))
    )
    setHasUnsavedChanges(true)
  }, [])

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (!editingPlaylistId) return
      removeItemMutation.mutate({ playlistId: editingPlaylistId, itemId })
    },
    [editingPlaylistId, removeItemMutation]
  )

  const handleAddMedia = useCallback(
    (media: Media) => {
      if (!editingPlaylistId) return
      addItemsMutation.mutate({
        playlistId: editingPlaylistId,
        items: [
          {
            mediaId: media.id,
            title: media.title || media.filename,
            duration: media.duration,
            transition: 'cut',
            transitionDur: 0.5,
            inPoint: 0,
            outPoint: null,
          },
        ],
      })
    },
    [editingPlaylistId, addItemsMutation]
  )

  const handleCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim() || !selectedChannelId) return
    createMutation.mutate({
      name: newPlaylistName.trim(),
      loop: newLoop,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
    })
  }, [newPlaylistName, newLoop, newStartDate, newEndDate, selectedChannelId, createMutation])

  const handleSave = useCallback(() => {
    saveMutation.mutate()
  }, [saveMutation])

  const totalDuration = useMemo(
    () => localItems.reduce((acc, i) => acc + (i.duration || 0), 0),
    [localItems]
  )

  const maxItemDuration = useMemo(
    () => Math.max(...localItems.map((i) => i.duration || 0), 1),
    [localItems]
  )

  // ─── Render: Channel/Playlist Selector ──────────────────────────────────

  const renderSelector = () => {
    if (!selectedChannelId) {
      return (
        <div className="space-y-6">
          <div className="text-center py-16">
            <ListPlus className="h-16 w-16 mx-auto text-zinc-700 mb-4" />
            <h2 className="text-lg font-medium text-zinc-300">Select a Channel</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Choose a channel from the sidebar to manage its playlists.
            </p>
          </div>

          {/* Show all channels as cards */}
          {channels.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600/50 hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ch.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-200">{ch.name}</div>
                      <div className="text-xs text-zinc-500">
                        {ch.status === 'running' ? '● Running' : `○ ${ch.status}`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    const channel = channels.find((c) => c.id === selectedChannelId)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
            onClick={() => setSelectedChannel(null)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {channel?.name || 'Channel'} Playlists
            </h2>
            <p className="text-xs text-zinc-500">
              {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="ml-auto">
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Playlist
            </Button>
          </div>
        </div>

        {/* Playlists grid */}
        {playlistsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg bg-zinc-800" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12">
            <ListPlus className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">No playlists yet</p>
            <p className="text-xs text-zinc-600 mt-1">Create your first playlist to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => (
              <motion.button
                key={pl.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setEditingPlaylistId(pl.id)}
                className={`
                  relative p-4 rounded-lg border text-left transition-colors
                  ${
                    pl.isActive
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600/50'
                  }
                `}
              >
                {pl.isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] h-5">
                      <Play className="h-2.5 w-2.5 mr-1 fill-emerald-400" />
                      Active
                    </Badge>
                  </div>
                )}
                <h3 className="text-sm font-medium text-zinc-200 pr-16">{pl.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {pl._count?.items || pl.items?.length || 0} items
                  </span>
                  {pl.loop && (
                    <Badge variant="outline" className="text-[10px] h-5 border-zinc-600 text-zinc-400">
                      Loop
                    </Badge>
                  )}
                </div>
                {pl.startDate && (
                  <p className="text-[11px] text-zinc-600 mt-2">
                    {new Date(pl.startDate).toLocaleDateString()} —{' '}
                    {pl.endDate ? new Date(pl.endDate).toLocaleDateString() : 'Ongoing'}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Playlist Editor ─────────────────────────────────────────────

  const renderEditor = () => {
    const playingItem = localItems.find((i) => i.status === 'playing')

    return (
      <div className="space-y-4">
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
              onClick={() => {
                setEditingPlaylistId(null)
                setLocalItems([])
                setHasUnsavedChanges(false)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <Input
                value={playlistName}
                onChange={(e) => {
                  setPlaylistName(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="h-7 text-base font-semibold bg-transparent border-0 p-0 focus-visible:ring-0 text-zinc-100 hover:bg-zinc-800/50 rounded px-2 -ml-2 w-auto"
              />
              {currentPlaylist?.isActive && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 ml-2">
                  <Play className="h-2.5 w-2.5 fill-emerald-400" />
                  Active Playlist
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <Label htmlFor="loop-toggle" className="text-xs text-zinc-400">
                Loop
              </Label>
              <Switch
                id="loop-toggle"
                checked={loop}
                onCheckedChange={(v) => {
                  setLoop(v)
                  setHasUnsavedChanges(true)
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => setBrowserOpen(!browserOpen)}
            >
              {browserOpen ? <PanelLeftClose className="h-3.5 w-3.5 mr-1" /> : <PanelLeftOpen className="h-3.5 w-3.5 mr-1" />}
              Media
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-zinc-400 hover:text-red-400"
              onClick={() => clearAllMutation.mutate()}
              disabled={!localItems.length}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Clear All
            </Button>
            {!currentPlaylist?.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                onClick={() => editingPlaylistId && setActiveMutation.mutate(editingPlaylistId)}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Set Active
              </Button>
            )}
            <Button
              size="sm"
              className={`h-8 text-xs ${hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-zinc-700 text-zinc-400'
              }`}
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasUnsavedChanges}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {saveMutation.isPending ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Main content: browser + playlist */}
        <div className="flex gap-4">
          {/* Left panel: Media Browser */}
          <AnimatePresence>
            {browserOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="w-[280px] h-full bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex flex-col">
                  <div className="p-3 border-b border-zinc-700/50">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Media Browser
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                      <Input
                        placeholder="Search media..."
                        value={browserSearch}
                        onChange={(e) => setBrowserSearch(e.target.value)}
                        className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-600 text-zinc-300 placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {mediaLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full bg-zinc-700/30 rounded" />
                        ))
                      ) : allMedia.length === 0 ? (
                        <p className="text-xs text-zinc-600 p-2 text-center">No media found</p>
                      ) : (
                        allMedia.map((media) => (
                          <button
                            key={media.id}
                            onClick={() => handleAddMedia(media)}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-zinc-700/50 transition-colors text-left group"
                          >
                            <div className="w-8 h-6 rounded bg-zinc-900 flex items-center justify-center flex-shrink-0">
                              {media.fileType === 'audio' ? (
                                <Music className="h-3.5 w-3.5 text-zinc-500" />
                              ) : media.fileType === 'image' ? (
                                <ImageIcon className="h-3.5 w-3.5 text-zinc-500" />
                              ) : (
                                <Film className="h-3.5 w-3.5 text-zinc-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-300 truncate">{media.filename}</p>
                              <p className="text-[10px] text-zinc-600 font-mono">
                                {formatDuration(media.duration)}
                              </p>
                            </div>
                            <Plus className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right panel: Playlist Items */}
          <div className="flex-1 min-w-0">
            {detailLoading && !localItems.length ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg bg-zinc-800" />
                ))}
              </div>
            ) : localItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Music className="h-12 w-12 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-400">No items in playlist</p>
                <p className="text-xs text-zinc-600 mt-1">
                  {browserOpen
                    ? 'Click media from the browser to add items'
                    : 'Open the media browser to add items'}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-360px)]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      <AnimatePresence>
                        {localItems.map((item) => (
                          <SortablePlaylistItem
                            key={item.id}
                            item={item}
                            onRemove={handleRemoveItem}
                            onTransitionChange={handleTransitionChange}
                            onTransitionDurChange={handleTransitionDurChange}
                            onInPointChange={handleInPointChange}
                            onOutPointChange={handleOutPointChange}
                            isPlaying={item.status === 'playing'}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeDragId ? (
                      <div className="rounded-lg border border-zinc-500 bg-zinc-800/90 p-3 shadow-2xl opacity-90">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm text-zinc-200">
                            {localItems.find((i) => i.id === activeDragId)?.title || 'Item'}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Timeline Bar */}
        {localItems.length > 0 && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Timeline
            </h3>
            <div className="relative flex gap-0.5 overflow-x-auto pb-1">
              {/* Playback position marker */}
              {playingItem && (
                <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-10"
                    style={{
                      left: `${
                        (localItems
                          .slice(0, localItems.findIndex((i) => i.id === playingItem.id))
                          .reduce((a, i) => a + (i.duration || 0), 0) /
                          Math.max(totalDuration, 1)) *
                        100
                      }%`,
                    }}
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  </div>
                </div>
              )}
              {localItems.map((item, idx) => {
                const widthPct = ((item.duration || 0) / totalDuration) * 100
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                    className={`
                      relative h-8 rounded-sm flex items-center justify-center overflow-hidden cursor-default
                      ${TRANSITION_COLORS[item.transition] || 'bg-zinc-500'}
                      ${item.status === 'playing' ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-900' : ''}
                      ${item.status === 'played' ? 'opacity-50' : ''}
                    `}
                    style={{ width: `${Math.max(widthPct, 2)}%` }}
                    title={`${item.title} (${formatDuration(item.duration)})`}
                  >
                    {widthPct > 6 && (
                      <span className="text-[10px] text-white/80 truncate px-1 font-medium">
                        {item.title}
                      </span>
                    )}
                    {widthPct > 14 && (
                      <span className="absolute bottom-0.5 text-[8px] text-white/50 font-mono">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Total Duration */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono">{formatDuration(totalDuration)}</span>
            </div>
            <span className="text-xs text-zinc-600">
              {localItems.length} item{localItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="h-full">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Playlist Editor</h1>
          {selectedChannelId && !editingPlaylistId && (
            <p className="text-sm text-zinc-400 mt-1">
              Managing playlists for{' '}
              <span className="text-zinc-300">
                {channels.find((c) => c.id === selectedChannelId)?.name || 'Channel'}
              </span>
            </p>
          )}
          {editingPlaylistId && (
            <p className="text-sm text-zinc-400 mt-1">
              Editing{' '}
              <span className="text-zinc-300">{playlistName || 'Playlist'}</span>
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {!editingPlaylistId ? renderSelector() : renderEditor()}

      {/* ─── Create Playlist Dialog ─────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Create Playlist</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a new playlist for this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Name</Label>
              <Input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="e.g. Morning Show, Evening News"
                className="bg-zinc-900 border-zinc-600 text-zinc-200 placeholder:text-zinc-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Start Date</Label>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-600 text-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">End Date</Label>
                <Input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-600 text-zinc-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newLoop} onCheckedChange={setNewLoop} id="new-loop" />
              <Label htmlFor="new-loop" className="text-zinc-300 text-sm">
                Loop playlist
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistName.trim() || createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}