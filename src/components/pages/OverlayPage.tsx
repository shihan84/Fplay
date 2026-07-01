'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { logosApi, graphicsApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Image as ImageIcon,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Zap,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import type { LogoOverlay, GraphicsOverlay } from '@/types'

// ── Position Grid (3x3) ──────────────────────────────────
function PositionGrid({ posX, posY }: { posX: string; posY: string }) {
  const xMap: Record<string, number> = { left: 0, center: 1, right: 2 }
  const yMap: Record<string, number> = { top: 0, center: 1, bottom: 2 }
  const col = xMap[posX] ?? 1
  const row = yMap[posY] ?? 1

  return (
    <div className="grid grid-cols-3 gap-0.5 w-12 h-12 bg-zinc-800 rounded-sm p-0.5">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <div
            key={`${r}-${c}`}
            className={`rounded-[2px] ${
              r === row && c === col ? 'bg-emerald-500' : 'bg-zinc-700/50'
            }`}
          />
        ))
      )}
    </div>
  )
}

// ── Logo Form Dialog ─────────────────────────────────────
function LogoDialog({
  open,
  onClose,
  channelId,
  logo,
}: {
  open: boolean
  onClose: () => void
  channelId: string
  logo?: LogoOverlay | null
}) {
  const [form, setForm] = useState({
    name: '',
    path: '',
    opacity: 0.8,
    posX: 'right',
    posY: 'top',
    offsetX: 20,
    offsetY: 20,
    sizeW: 200,
    sizeH: 80,
    bgColor: '',
    category: '',
    active: true,
    startTime: '',
    endTime: '',
  })
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (logo) {
      setForm({
        name: logo.name || '',
        path: logo.path || '',
        opacity: logo.opacity ?? 0.8,
        posX: logo.posX || 'top',
        posY: logo.posY || 'right',
        offsetX: logo.offsetX || 0,
        offsetY: logo.offsetY || 0,
        sizeW: logo.sizeW || 200,
        sizeH: logo.sizeH || 80,
        bgColor: logo.bgColor || '',
        category: logo.category || '',
        active: logo.active ?? true,
        startTime: logo.startTime || '',
        endTime: logo.endTime || '',
      })
    } else {
      setForm({
        name: '',
        path: '',
        opacity: 0.8,
        posX: 'right',
        posY: 'top',
        offsetX: 20,
        offsetY: 20,
        sizeW: 200,
        sizeH: 80,
        bgColor: '',
        category: '',
        active: true,
        startTime: '',
        endTime: '',
      })
    }
    setFile(null)
  }, [logo, open])

  const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, channelId }
      if (logo) {
        await logosApi.update(logo.id, payload)
        toast.success('Logo updated')
      } else if (file) {
        await logosApi.upload(channelId, file, {
          name: form.name,
          opacity: form.opacity,
          posX: form.posX,
          posY: form.posY,
          offsetX: form.offsetX,
          offsetY: form.offsetY,
          sizeW: form.sizeW,
          sizeH: form.sizeH,
          category: form.category,
          active: form.active,
          startTime: form.startTime,
          endTime: form.endTime,
        })
        toast.success('Logo uploaded')
      } else {
        await logosApi.create(payload)
        toast.success('Logo created')
      }
      onClose()
    } catch {
      toast.error('Failed to save logo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-zinc-800 bg-zinc-900 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{logo ? 'Edit Logo' : 'Add Logo'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Configure a logo overlay for the selected channel
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Logo name"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Path / Upload</Label>
            <div className="flex gap-2">
              <Input
                value={file ? file.name : form.path}
                onChange={(e) => update('path', e.target.value)}
                placeholder="/path/to/logo.png"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-sm"
                readOnly={!!file}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null
                  setFile(selected)
                  if (selected && !form.name.trim()) {
                    update('name', selected.name.replace(/\.[^.]+$/, ''))
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="shrink-0 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm text-zinc-300">Opacity</Label>
              <span className="text-xs text-zinc-500">{(form.opacity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[form.opacity]}
              onValueChange={([v]) => update('opacity', v)}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Position X</Label>
              <Select value={form.posX} onValueChange={(v) => update('posX', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Position Y</Label>
              <Select value={form.posY} onValueChange={(v) => update('posY', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Offset X (px)</Label>
              <Input
                type="number"
                value={form.offsetX}
                onChange={(e) => update('offsetX', parseInt(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Offset Y (px)</Label>
              <Input
                type="number"
                value={form.offsetY}
                onChange={(e) => update('offsetY', parseInt(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Width (px)</Label>
              <Input
                type="number"
                value={form.sizeW}
                onChange={(e) => update('sizeW', parseInt(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Height (px)</Label>
              <Input
                type="number"
                value={form.sizeH}
                onChange={(e) => update('sizeH', parseInt(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">BG Color to Remove <span className="text-zinc-500 text-xs">(JPEG only — pick the background color to key out)</span></Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.bgColor || '#5e5e5e'}
                onChange={(e) => update('bgColor', e.target.value)}
                className="w-10 h-9 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
              />
              <Input
                value={form.bgColor}
                onChange={(e) => update('bgColor', e.target.value)}
                placeholder="#5e5e5e (leave blank to skip)"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Category</Label>
            <Input
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="e.g. watermark, bug, lower-third"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
            <Label className="text-sm text-zinc-300">Active</Label>
            <Switch checked={form.active} onCheckedChange={(v) => update('active', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Start Time (HH:MM:SS)</Label>
              <Input
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                placeholder="06:00:00"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">End Time (HH:MM:SS)</Label>
              <Input
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                placeholder="23:59:59"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? 'Saving...' : logo ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Graphics Form Dialog ─────────────────────────────────
function GraphicsDialog({
  open,
  onClose,
  channelId,
  overlay,
}: {
  open: boolean
  onClose: () => void
  channelId: string
  overlay?: GraphicsOverlay | null
}) {
  const [form, setForm] = useState({
    name: '',
    html: '<div class="overlay">\n  <span>Text Overlay</span>\n</div>',
    css: '.overlay {\n  color: white;\n  font-size: 24px;\n  padding: 8px 16px;\n}',
    position: 'bottom-left',
    duration: 10,
    active: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (overlay) {
      setForm({
        name: overlay.name || '',
        html: overlay.html || '',
        css: overlay.css || '',
        position: overlay.position || 'bottom-left',
        duration: overlay.duration ?? 10,
        active: overlay.active ?? true,
      })
    } else {
      setForm({
        name: '',
        html: '<div class="overlay">\n  <span>Text Overlay</span>\n</div>',
        css: '.overlay {\n  color: white;\n  font-size: 24px;\n  padding: 8px 16px;\n}',
        position: 'bottom-left',
        duration: 10,
        active: true,
      })
    }
  }, [overlay, open])

  const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, channelId }
      if (overlay) {
        await graphicsApi.update(overlay.id, payload)
        toast.success('Overlay updated')
      } else {
        await graphicsApi.create(payload)
        toast.success('Overlay created')
      }
      onClose()
    } catch {
      toast.error('Failed to save overlay')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-zinc-800 bg-zinc-900 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{overlay ? 'Edit Overlay' : 'Add Overlay'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Create or edit a graphics overlay
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Overlay name"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">HTML Content</Label>
            <Textarea
              value={form.html}
              onChange={(e) => update('html', e.target.value)}
              rows={5}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">CSS Styles</Label>
            <Textarea
              value={form.css}
              onChange={(e) => update('css', e.target.value)}
              rows={5}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Position</Label>
              <Select value={form.position} onValueChange={(v) => update('position', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((p) => (
                    <SelectItem key={p} value={p}>{p.replace('-', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Duration (seconds)</Label>
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => update('duration', parseInt(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
            <Label className="text-sm text-zinc-300">Active</Label>
            <Switch checked={form.active} onCheckedChange={(v) => update('active', v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? 'Saving...' : overlay ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Logo Card ────────────────────────────────────────────
function LogoCard({
  logo,
  onEdit,
  onDelete,
}: {
  logo: LogoOverlay
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60 py-4 gap-0">
      <CardHeader className="pb-0 px-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-medium text-zinc-200 truncate">{logo.name}</CardTitle>
            {logo.category && (
              <Badge className="mt-1 bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                {logo.category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <PositionGrid posX={logo.posX} posY={logo.posY} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-3 space-y-3">
        {logo.path && (
          <div className="flex items-center justify-center h-16 rounded-md bg-zinc-800/60 border border-zinc-700 overflow-hidden">
            <img
              src={logo.path}
              alt={logo.name}
              className="max-h-full max-w-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Opacity: {(logo.opacity * 100).toFixed(0)}%</span>
          <span>{logo.sizeW}×{logo.sizeH}</span>
        </div>

        {(logo.startTime || logo.endTime) && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="size-3" />
            <span>
              {logo.startTime || '—'} → {logo.endTime || '—'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge
            className={
              logo.active
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-700/50 text-zinc-500 border-zinc-600/50'
            }
          >
            {logo.active ? 'Active' : 'Inactive'}
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-200" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-400">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-zinc-800 bg-zinc-900">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete logo &quot;{logo.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Graphics Card ────────────────────────────────────────
function GraphicsCardItem({
  overlay,
  onEdit,
  onDelete,
  onTrigger,
}: {
  overlay: GraphicsOverlay
  onEdit: () => void
  onDelete: () => void
  onTrigger: () => void
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60 py-4 gap-0">
      <CardHeader className="pb-0 px-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-zinc-200 truncate">{overlay.name}</CardTitle>
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-2 shrink-0">
            {overlay.position?.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-3 space-y-3">
        <div className="text-xs text-zinc-500">
          Duration: {overlay.duration}s
        </div>
        <div className="flex items-center justify-between">
          <Badge
            className={
              overlay.active
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-700/50 text-zinc-500 border-zinc-600/50'
            }
          >
            {overlay.active ? 'Active' : 'Inactive'}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1"
              onClick={onTrigger}
            >
              <Zap className="size-3" />
              Trigger
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-200" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-400">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-zinc-800 bg-zinc-900">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete overlay &quot;{overlay.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────
export function OverlayPage() {
  const { channels, selectedChannelId, setSelectedChannel } = useAppStore()
  const { emit } = useSocket()
  const queryClient = useQueryClient()

  const [localChannelId, setLocalChannelId] = useState(selectedChannelId || '')
  const [logoChannelId, setLogoChannelId] = useState(selectedChannelId || '')
  const [graphicsChannelId, setGraphicsChannelId] = useState(selectedChannelId || '')

  const effectiveChannelId = useMemo(
    () => localChannelId || selectedChannelId || (channels.length > 0 ? channels[0].id : ''),
    [localChannelId, selectedChannelId, channels]
  )

  const effectiveLogoChannelId = useMemo(
    () => logoChannelId || selectedChannelId || (channels.length > 0 ? channels[0].id : ''),
    [logoChannelId, selectedChannelId, channels]
  )

  const effectiveGraphicsChannelId = useMemo(
    () => graphicsChannelId || selectedChannelId || (channels.length > 0 ? channels[0].id : ''),
    [graphicsChannelId, selectedChannelId, channels]
  )

  const [logoDialogOpen, setLogoDialogOpen] = useState(false)
  const [editingLogo, setEditingLogo] = useState<LogoOverlay | null>(null)
  const [graphicsDialogOpen, setGraphicsDialogOpen] = useState(false)
  const [editingGraphics, setEditingGraphics] = useState<GraphicsOverlay | null>(null)

  const handleChannelChange = (val: string) => {
    setLocalChannelId(val)
    setLogoChannelId(val)
    setGraphicsChannelId(val)
    setSelectedChannel(val)
  }

  // Queries
  const { data: logos = [], isLoading: logosLoading } = useQuery({
    queryKey: ['logos', effectiveLogoChannelId],
    queryFn: () => logosApi.list(effectiveLogoChannelId),
    enabled: !!effectiveLogoChannelId,
  })

  const { data: graphics = [], isLoading: graphicsLoading } = useQuery({
    queryKey: ['graphics', effectiveGraphicsChannelId],
    queryFn: () => graphicsApi.list(effectiveGraphicsChannelId),
    enabled: !!effectiveGraphicsChannelId,
  })

  const handleDeleteLogo = async (logo: LogoOverlay) => {
    try {
      await logosApi.delete(logo.id)
      queryClient.invalidateQueries({ queryKey: ['logos', effectiveLogoChannelId] })
      toast.success('Logo deleted')
    } catch {
      toast.error('Failed to delete logo')
    }
  }

  const handleDeleteGraphics = async (overlay: GraphicsOverlay) => {
    try {
      await graphicsApi.delete(overlay.id)
      queryClient.invalidateQueries({ queryKey: ['graphics', effectiveGraphicsChannelId] })
      toast.success('Overlay deleted')
    } catch {
      toast.error('Failed to delete overlay')
    }
  }

  const handleTriggerOverlay = (overlay: GraphicsOverlay) => {
    emit('overlay:trigger', overlay.id)
    toast.success(`Triggered "${overlay.name}"`)
  }

  const handleLogoDialogClose = () => {
    setLogoDialogOpen(false)
    setEditingLogo(null)
    queryClient.invalidateQueries({ queryKey: ['logos', effectiveLogoChannelId] })
  }

  const handleGraphicsDialogClose = () => {
    setGraphicsDialogOpen(false)
    setEditingGraphics(null)
    queryClient.invalidateQueries({ queryKey: ['graphics', graphicsChannelId] })
  }

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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logos" className="space-y-6">
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="logos" className="gap-1.5 data-[state=active]:bg-zinc-700/50 data-[state=active]:text-zinc-100">
            <ImageIcon className="size-4" />
            Logo Overlays
          </TabsTrigger>
          <TabsTrigger value="graphics" className="gap-1.5 data-[state=active]:bg-zinc-700/50 data-[state=active]:text-zinc-100">
            <Layers className="size-4" />
            Graphics Overlays
          </TabsTrigger>
        </TabsList>

        {/* ── Logo Tab ── */}
        <TabsContent value="logos">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Select value={logoChannelId} onValueChange={(v) => setLogoChannelId(v)}>
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
            <Button
              onClick={() => { setEditingLogo(null); setLogoDialogOpen(true) }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="size-4" />
              Add Logo
            </Button>
          </div>

          {logosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-zinc-800 bg-zinc-900/60 py-4">
                  <CardHeader className="px-4">
                    <Skeleton className="h-4 w-32 bg-zinc-800" />
                    <Skeleton className="h-3 w-16 bg-zinc-800 mt-2" />
                  </CardHeader>
                  <CardContent className="px-4 space-y-2">
                    <Skeleton className="h-3 w-24 bg-zinc-800" />
                    <Skeleton className="h-8 w-full bg-zinc-800" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : logos.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ImageIcon className="size-10 text-zinc-700 mb-3" />
                <p className="text-zinc-500">No logos configured for this channel</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {logos.map((logo: LogoOverlay) => (
                <LogoCard
                  key={logo.id}
                  logo={logo}
                  onEdit={() => { setEditingLogo(logo); setLogoDialogOpen(true) }}
                  onDelete={() => handleDeleteLogo(logo)}
                />
              ))}
            </div>
          )}

          {logoChannelId && (
            <LogoDialog
              open={logoDialogOpen}
              onClose={handleLogoDialogClose}
              channelId={logoChannelId}
              logo={editingLogo}
            />
          )}
        </TabsContent>

        {/* ── Graphics Tab ── */}
        <TabsContent value="graphics">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Select value={graphicsChannelId} onValueChange={(v) => setGraphicsChannelId(v)}>
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
            <Button
              onClick={() => { setEditingGraphics(null); setGraphicsDialogOpen(true) }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="size-4" />
              Add Overlay
            </Button>
          </div>

          {graphicsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-zinc-800 bg-zinc-900/60 py-4">
                  <CardHeader className="px-4">
                    <Skeleton className="h-4 w-32 bg-zinc-800" />
                  </CardHeader>
                  <CardContent className="px-4 space-y-2">
                    <Skeleton className="h-3 w-24 bg-zinc-800" />
                    <Skeleton className="h-8 w-full bg-zinc-800" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : graphics.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Layers className="size-10 text-zinc-700 mb-3" />
                <p className="text-zinc-500">No graphics overlays configured</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {graphics.map((overlay: GraphicsOverlay) => (
                <GraphicsCardItem
                  key={overlay.id}
                  overlay={overlay}
                  onEdit={() => { setEditingGraphics(overlay); setGraphicsDialogOpen(true) }}
                  onDelete={() => handleDeleteGraphics(overlay)}
                  onTrigger={() => handleTriggerOverlay(overlay)}
                />
              ))}
            </div>
          )}

          {graphicsChannelId && (
            <GraphicsDialog
              open={graphicsDialogOpen}
              onClose={handleGraphicsDialogClose}
              channelId={graphicsChannelId}
              overlay={editingGraphics}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}