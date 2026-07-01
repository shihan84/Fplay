'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { textOverlaysApi } from '@/lib/api'
import type { TextOverlay } from '@/types'
import { toast } from 'sonner'
import {
  Plus, Trash2, Edit, Type, AlignLeft, Clock, Layers,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  static: Type,
  ticker: AlignLeft,
  clock: Clock,
  lowerthird: Layers,
}

const TYPE_LABELS: Record<string, string> = {
  static: 'Static Text',
  ticker: 'Scrolling Ticker',
  clock: 'Live Clock',
  lowerthird: 'Lower Third',
}

const TYPE_COLORS: Record<string, string> = {
  static: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ticker: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  clock: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  lowerthird: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

const defaultForm = (): Partial<TextOverlay> => ({
  name: '',
  type: 'static',
  active: true,
  text: 'Sample Text',
  fontSize: 32,
  fontColor: 'white',
  bgColor: '',
  bgOpacity: 0.5,
  outline: 2,
  outlineColor: 'black',
  posX: 'center',
  posY: 'bottom',
  offsetX: 0,
  offsetY: 40,
  scrollSpeed: 100,
  subText: '',
  subFontSize: 22,
  startTime: '',
  endTime: '',
})

// ─── Form Component ───────────────────────────────────────────────────────────

function OverlayForm({
  initial,
  channelId,
  onClose,
}: {
  initial?: Partial<TextOverlay>
  channelId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<TextOverlay>>(initial ?? defaultForm())

  const set = <K extends keyof TextOverlay>(k: K, v: TextOverlay[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () =>
      form.id
        ? textOverlaysApi.update({ ...form, channelId })
        : textOverlaysApi.create({ ...form, channelId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['text-overlays', channelId] })
      toast.success(form.id ? 'Overlay updated' : 'Overlay created')
      onClose()
    },
    onError: () => toast.error('Failed to save overlay'),
  })

  const isEdit = !!form.id

  return (
    <div className="space-y-5 py-1">
      {/* Name + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Name</Label>
          <Input
            value={form.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
            placeholder="My Overlay"
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Type</Label>
          <Select value={form.type} onValueChange={(v) => set('type', v as TextOverlay['type'])}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Text content */}
      <div className="space-y-1.5">
        <Label className="text-sm text-zinc-300">
          {form.type === 'clock' ? 'Format (uses system time)' : 'Text'}
        </Label>
        <Input
          value={form.text ?? ''}
          onChange={(e) => set('text', e.target.value)}
          placeholder={form.type === 'clock' ? 'Clock auto-generates HH:MM:SS' : 'Enter text...'}
          disabled={form.type === 'clock'}
          className="bg-zinc-800 border-zinc-700 text-zinc-200 disabled:opacity-50"
        />
      </div>

      {/* Lower third sub-text */}
      {form.type === 'lowerthird' && (
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Sub Text (second line)</Label>
          <Input
            value={form.subText ?? ''}
            onChange={(e) => set('subText', e.target.value)}
            placeholder="Title / Role / Description"
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
          />
        </div>
      )}

      {/* Font */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Font Size</Label>
          <Input
            type="number"
            value={form.fontSize ?? 32}
            onChange={(e) => set('fontSize', parseInt(e.target.value) || 32)}
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Font Color</Label>
          <div className="flex gap-2">
            <Input
              value={form.fontColor ?? 'white'}
              onChange={(e) => set('fontColor', e.target.value)}
              placeholder="white or #ffffff"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
            <input
              type="color"
              value={form.fontColor?.startsWith('#') ? form.fontColor : '#ffffff'}
              onChange={(e) => set('fontColor', e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border border-zinc-700 bg-zinc-800 p-1"
            />
          </div>
        </div>
        {form.type === 'lowerthird' && (
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Sub Font Size</Label>
            <Input
              type="number"
              value={form.subFontSize ?? 22}
              onChange={(e) => set('subFontSize', parseInt(e.target.value) || 22)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        )}
      </div>

      {/* Outline */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Outline Width (px)</Label>
          <Input
            type="number"
            value={form.outline ?? 2}
            onChange={(e) => set('outline', parseInt(e.target.value) || 0)}
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Outline Color</Label>
          <div className="flex gap-2">
            <Input
              value={form.outlineColor ?? 'black'}
              onChange={(e) => set('outlineColor', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
            <input
              type="color"
              value={form.outlineColor?.startsWith('#') ? form.outlineColor : '#000000'}
              onChange={(e) => set('outlineColor', e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border border-zinc-700 bg-zinc-800 p-1"
            />
          </div>
        </div>
      </div>

      {/* Background */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-300">Background Color (empty = none)</Label>
          <div className="flex gap-2">
            <Input
              value={form.bgColor ?? ''}
              onChange={(e) => set('bgColor', e.target.value)}
              placeholder="e.g. black or #1a1a1a"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
            <input
              type="color"
              value={form.bgColor?.startsWith('#') ? form.bgColor : '#000000'}
              onChange={(e) => set('bgColor', e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border border-zinc-700 bg-zinc-800 p-1"
            />
          </div>
        </div>
        {form.bgColor && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm text-zinc-300">BG Opacity</Label>
              <span className="text-sm text-zinc-400">{Math.round((form.bgOpacity ?? 0.5) * 100)}%</span>
            </div>
            <Slider
              value={[(form.bgOpacity ?? 0.5) * 100]}
              onValueChange={([v]) => set('bgOpacity', v / 100)}
              min={5} max={100} step={5}
              className="mt-2"
            />
          </div>
        )}
      </div>

      {/* Position — not for ticker */}
      {form.type !== 'ticker' && form.type !== 'lowerthird' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Position X</Label>
            <Select value={form.posX ?? 'center'} onValueChange={(v) => set('posX', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['left', 'center', 'right'].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Position Y</Label>
            <Select value={form.posY ?? 'bottom'} onValueChange={(v) => set('posY', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['top', 'center', 'bottom'].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Offset */}
      {form.type !== 'ticker' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Offset X (px)</Label>
            <Input
              type="number"
              value={form.offsetX ?? 0}
              onChange={(e) => set('offsetX', parseInt(e.target.value) || 0)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Offset Y (px)</Label>
            <Input
              type="number"
              value={form.offsetY ?? 40}
              onChange={(e) => set('offsetY', parseInt(e.target.value) || 0)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        </div>
      )}

      {/* Ticker speed */}
      {form.type === 'ticker' && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-sm text-zinc-300">Scroll Speed</Label>
            <span className="text-sm text-zinc-400">{form.scrollSpeed ?? 100} px/s</span>
          </div>
          <Slider
            value={[form.scrollSpeed ?? 100]}
            onValueChange={([v]) => set('scrollSpeed', v)}
            min={20} max={400} step={10}
          />
        </div>
      )}

      {/* Active */}
      <div className="flex items-center gap-3">
        <Switch
          checked={form.active ?? true}
          onCheckedChange={(v) => set('active', v)}
        />
        <Label className="text-sm text-zinc-300">Active (show on stream)</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Overlay' : 'Create Overlay'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TextOverlayPage() {
  const { selectedChannelId, setSelectedChannel, channels } = useAppStore()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TextOverlay | null>(null)

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannel(channels[0].id)
    }
  }, [channels, selectedChannelId, setSelectedChannel])

  const channelId = selectedChannelId ?? ''
  const channel = channels.find((c) => c.id === channelId)

  const { data: overlays = [], isLoading } = useQuery<TextOverlay[]>({
    queryKey: ['text-overlays', channelId],
    queryFn: () => textOverlaysApi.list(channelId),
    enabled: !!channelId,
    refetchInterval: 10000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => textOverlaysApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['text-overlays', channelId] })
      toast.success('Overlay deleted')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (o: TextOverlay) =>
      textOverlaysApi.update({ ...o, channelId, active: !o.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['text-overlays', channelId] }),
  })

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (o: TextOverlay) => { setEditing(o); setDialogOpen(true) }

  if (!channelId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Select a channel from the sidebar to manage text overlays</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Text Overlays</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Scrolling tickers, static text, live clock, lower thirds</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={channelId} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-zinc-200">
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
          <Button
            onClick={openCreate}
            disabled={!channelId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="size-4" />
            Add Overlay
          </Button>
        </div>
      </div>

      {/* Type guide cards */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const Icon = TYPE_ICONS[type]
          const count = overlays.filter((o) => o.type === type).length
          return (
            <div key={type} className="border border-zinc-800 bg-zinc-900/60 rounded-lg p-3 flex items-center gap-3">
              <div className="size-8 rounded-md bg-zinc-800 flex items-center justify-center">
                <Icon className="size-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">{label}</p>
                <p className="text-xs text-zinc-600">{count} overlay{count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overlay list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 bg-zinc-800 mb-2" />
                <Skeleton className="h-4 w-64 bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overlays.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Type className="size-10 text-zinc-700" />
            <p className="text-zinc-500">No text overlays yet</p>
            <Button onClick={openCreate} variant="outline" className="border-zinc-700 text-zinc-300 gap-2">
              <Plus className="size-4" />
              Create your first overlay
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {overlays.map((o) => {
            const Icon = TYPE_ICONS[o.type] || Type
            return (
              <Card key={o.id} className={`border-zinc-800 bg-zinc-900/60 transition-opacity ${o.active ? '' : 'opacity-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="size-9 rounded-md bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="size-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-200">{o.name || 'Unnamed'}</span>
                          <Badge variant="outline" className={`text-xs ${TYPE_COLORS[o.type]}`}>
                            {TYPE_LABELS[o.type]}
                          </Badge>
                          <Badge variant="outline" className={o.active ? 'text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-xs bg-zinc-700/30 text-zinc-500 border-zinc-700'}>
                            {o.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 truncate">
                          {o.type === 'clock' ? '⏱ Live clock — HH:MM:SS' : `"${o.text}"`}
                          {o.type === 'lowerthird' && o.subText ? ` / "${o.subText}"` : ''}
                        </p>
                        <div className="flex gap-3 mt-1.5 text-xs text-zinc-600">
                          <span>{o.fontSize}px · {o.fontColor}</span>
                          {o.type !== 'ticker' && <span>{o.posX} · {o.posY}</span>}
                          {o.type === 'ticker' && <span>Speed: {o.scrollSpeed}px/s</span>}
                          {o.bgColor && <span>BG: {o.bgColor}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={o.active}
                        onCheckedChange={() => toggleMutation.mutate(o)}
                        title={o.active ? 'Deactivate' : 'Activate'}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(o)}
                        className="text-zinc-400 hover:text-zinc-100 size-8"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(o.id)}
                        className="text-zinc-600 hover:text-red-400 size-8"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Overlay' : 'New Text Overlay'}</DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <OverlayForm
              initial={editing ?? undefined}
              channelId={channelId}
              onClose={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
