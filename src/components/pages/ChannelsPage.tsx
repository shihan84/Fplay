'use client'

import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Play, Square, RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { channelsApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { Channel } from '@/types'

// --- Preset colors ---
const PRESET_COLORS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Lime', value: '#84cc16' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Violet', value: '#8b5cf6' },
]

const RESOLUTION_PRESETS = [
  { label: '1920x1080 (HD)', value: '1920x1080' },
  { label: '1280x720 (SD)', value: '1280x720' },
  { label: '3840x2160 (4K)', value: '3840x2160' },
  { label: 'Custom', value: 'custom' },
]

const PROTOCOLS = ['RTMP', 'SRT', 'UDP', 'RTP']

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stopped: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  starting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
}

interface ChannelFormData {
  name: string
  description: string
  color: string
  outputProtocol: string
  outputUrl: string
  outputKey: string
  resolution: string
}

const emptyForm: ChannelFormData = {
  name: '',
  description: '',
  color: '#10b981',
  outputProtocol: 'RTMP',
  outputUrl: '',
  outputKey: '',
  resolution: '1920x1080',
}

export function ChannelsPage() {
  const { channels, addChannel, updateChannel, removeChannel, navigateToChannel } = useAppStore()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [form, setForm] = useState<ChannelFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Open dialog for create
  const handleCreate = useCallback(() => {
    setEditingChannel(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }, [])

  // Open dialog for edit
  const handleEdit = useCallback((ch: Channel, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingChannel(ch)
    setForm({
      name: ch.name,
      description: ch.description || '',
      color: ch.color || '#10b981',
      outputProtocol: ch.settings?.outputProtocol || 'RTMP',
      outputUrl: ch.settings?.outputUrl || '',
      outputKey: ch.settings?.outputKey || '',
      resolution: ch.settings
        ? `${ch.settings.width}x${ch.settings.height}`
        : '1920x1080',
    })
    setDialogOpen(true)
  }, [])

  // Submit create/edit
  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'Channel name is required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      let res
      let [w, h] = [1920, 1080]
      if (form.resolution !== 'custom') {
        const parts = form.resolution.split('x')
        w = parseInt(parts[0], 10)
        h = parseInt(parts[1], 10)
      }

      if (editingChannel) {
        // Update
        res = await channelsApi.update(editingChannel.id, {
          name: form.name,
          description: form.description || null,
          color: form.color,
        })
        updateChannel(editingChannel.id, {
          name: form.name,
          description: form.description,
          color: form.color,
        })
        toast({ title: 'Channel Updated', description: `${form.name} has been updated` })
      } else {
        // Create
        res = await channelsApi.create({
          name: form.name,
          description: form.description || null,
          color: form.color,
          settings: {
            outputProtocol: form.outputProtocol,
            outputUrl: form.outputUrl,
            outputKey: form.outputKey,
            width: w,
            height: h,
          },
        })
        addChannel(res)
        toast({ title: 'Channel Created', description: `${form.name} has been created` })
      }

      setDialogOpen(false)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Operation failed', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [form, editingChannel, addChannel, updateChannel, toast])

  // Delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await channelsApi.delete(deleteTarget.id)
      removeChannel(deleteTarget.id)
      toast({ title: 'Deleted', description: `${deleteTarget.name} has been removed` })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, removeChannel, toast])

  // Channel actions
  const handleAction = useCallback(
    async (channelId: string, action: 'start' | 'stop' | 'restart') => {
      setActionLoading(channelId)
      try {
        await channelsApi[action](channelId)
        const statusMap = { start: 'starting', stop: 'stopped', restart: 'starting' } as const
        updateChannel(channelId, { status: statusMap[action] })
        toast({ title: `Channel ${action === 'restart' ? 'Restarting' : action === 'start' ? 'Starting' : 'Stopping'}`, description: 'Action initiated' })
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || `${action} failed`, variant: 'destructive' })
      } finally {
        setActionLoading(null)
      }
    },
    [updateChannel, toast]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Channel Management</h1>
          <p className="text-sm text-zinc-500">Configure and manage broadcast channels</p>
        </div>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create Channel
        </Button>
      </div>

      {/* Channel Grid */}
      {channels.length === 0 ? (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="flex h-48 flex-col items-center justify-center text-zinc-500">
            <p className="text-sm">No channels yet</p>
            <p className="text-xs mt-1">Click &quot;Create Channel&quot; to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <Card
              key={channel.id}
              className="bg-zinc-800/50 border-zinc-700/50 cursor-pointer transition-all hover:border-zinc-600/70 hover:bg-zinc-800/70"
              style={{ borderTopWidth: '4px', borderTopColor: channel.color || '#10b981' }}
              onClick={() => navigateToChannel(channel.id)}
            >
              <CardContent className="p-4">
                {/* Name + Status */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-zinc-100 truncate">{channel.name}</h3>
                    {channel.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{channel.description}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-2 shrink-0 text-[10px] px-1.5 py-0 ${statusColors[channel.status] || statusColors.stopped}`}
                  >
                    {channel.status}
                  </Badge>
                </div>

                {/* Settings summary */}
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
                  {channel.settings && (
                    <>
                      <span className="text-[11px] text-zinc-400">
                        {channel.settings.width}x{channel.settings.height}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {channel.settings.videoCodec?.toUpperCase() || 'H264'}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {channel.settings.outputProtocol || 'RTMP'}
                      </span>
                    </>
                  )}
                  {!channel.settings && (
                    <span className="text-[11px] text-zinc-500">No settings configured</span>
                  )}
                </div>

                {/* Counts */}
                <div className="mb-4 flex gap-3">
                  <div className="text-[11px] text-zinc-500">
                    <span className="text-zinc-300">{channel._count?.playlists || 0}</span> playlists
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    <span className="text-zinc-300">{channel._count?.media || 0}</span> media
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {channel.status !== 'running' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      disabled={actionLoading === channel.id}
                      onClick={() => handleAction(channel.id, 'start')}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Start
                    </Button>
                  )}
                  {channel.status === 'running' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      disabled={actionLoading === channel.id}
                      onClick={() => handleAction(channel.id, 'stop')}
                    >
                      <Square className="mr-1 h-3 w-3" />
                      Stop
                    </Button>
                  )}
                  {channel.status === 'running' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      disabled={actionLoading === channel.id}
                      onClick={() => handleAction(channel.id, 'restart')}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                    onClick={(e) => handleEdit(channel, e)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-400 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(channel) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingChannel ? 'Edit Channel' : 'Create Channel'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {editingChannel ? 'Update channel settings' : 'Add a new broadcast channel'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Channel Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. News 24"
                className="bg-zinc-900 border-zinc-600 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 placeholder:text-zinc-600 resize-none"
              />
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      form.color === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  />
                ))}
              </div>
            </div>

            {/* Output Protocol - only on create or when editing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Output Protocol</Label>
                <Select
                  value={form.outputProtocol}
                  onValueChange={(v) => setForm((f) => ({ ...f, outputProtocol: v }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {PROTOCOLS.map((p) => (
                      <SelectItem key={p} value={p} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Resolution</Label>
                <Select
                  value={form.resolution}
                  onValueChange={(v) => setForm((f) => ({ ...f, resolution: v }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-600 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {RESOLUTION_PRESETS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Output URL */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Output URL</Label>
              <Input
                value={form.outputUrl}
                onChange={(e) => setForm((f) => ({ ...f, outputUrl: e.target.value }))}
                placeholder={form.outputProtocol === 'RTMP' ? 'rtmp://live.example.com/app' : 'srt://live.example.com:9000'}
                className="bg-zinc-900 border-zinc-600 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            {/* Output Key - only for RTMP */}
            {form.outputProtocol === 'RTMP' && (
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Stream Key</Label>
                <Input
                  value={form.outputKey}
                  onChange={(e) => setForm((f) => ({ ...f, outputKey: e.target.value }))}
                  placeholder="your-stream-key"
                  type="password"
                  className="bg-zinc-900 border-zinc-600 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? 'Saving...' : editingChannel ? 'Update Channel' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-800 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Channel</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This will remove all associated playlists, media links, logs, and settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-zinc-400 hover:text-zinc-200 border-zinc-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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