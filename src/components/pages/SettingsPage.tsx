'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'
import { settingsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Video,
  Volume2,
  Radio,
  Settings2,
  Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ChannelSettings } from '@/types'

// ── Default Settings ─────────────────────────────────────
const defaultSettings: Omit<ChannelSettings, 'id' | 'channelId' | 'createdAt' | 'updatedAt'> = {
  width: 1920,
  height: 1080,
  fps: 25,
  videoCodec: 'libx264',
  videoBitrate: 5000,
  videoPreset: 'medium',
  videoProfile: 'high',
  gopSize: 25,
  keyframeInt: 2,
  audioCodec: 'aac',
  audioBitrate: 192,
  audioSampleRate: 48000,
  audioChannels: 2,
  loudnessNorm: false,
  loudnessTarget: -23.0,
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

type SectionKey = 'video' | 'audio' | 'output' | 'playout'

// ── Main Component ───────────────────────────────────────
export function SettingsPage() {
  const { channels, selectedChannelId, setSelectedChannel } = useAppStore()
  const [localChannelId, setLocalChannelId] = useState(selectedChannelId || '')
  const [settings, setSettings] = useState<Omit<ChannelSettings, 'id' | 'channelId' | 'createdAt' | 'updatedAt'> | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<SectionKey | null>(null)

  useEffect(() => {
    if (selectedChannelId) setLocalChannelId(selectedChannelId)
  }, [selectedChannelId])

  useEffect(() => {
    if (!localChannelId && channels.length > 0) {
      const first = channels[0].id
      setLocalChannelId(first)
      setSelectedChannel(first)
    }
  }, [channels, localChannelId, setSelectedChannel])

  const fetchSettings = useCallback(async (channelId: string) => {
    setLoading(true)
    try {
      const data = await settingsApi.get(channelId)
      setSettings({
        width: data.width ?? defaultSettings.width,
        height: data.height ?? defaultSettings.height,
        fps: data.fps ?? defaultSettings.fps,
        videoCodec: data.videoCodec ?? defaultSettings.videoCodec,
        videoBitrate: data.videoBitrate ?? defaultSettings.videoBitrate,
        videoPreset: data.videoPreset ?? defaultSettings.videoPreset,
        videoProfile: data.videoProfile ?? defaultSettings.videoProfile,
        gopSize: data.gopSize ?? defaultSettings.gopSize,
        keyframeInt: data.keyframeInt ?? defaultSettings.keyframeInt,
        audioCodec: data.audioCodec ?? defaultSettings.audioCodec,
        audioBitrate: data.audioBitrate ?? defaultSettings.audioBitrate,
        audioSampleRate: data.audioSampleRate ?? defaultSettings.audioSampleRate,
        audioChannels: data.audioChannels ?? defaultSettings.audioChannels,
        loudnessNorm: data.loudnessNorm ?? defaultSettings.loudnessNorm,
        loudnessTarget: data.loudnessTarget ?? defaultSettings.loudnessTarget,
        outputFormat: data.outputFormat ?? defaultSettings.outputFormat,
        outputProtocol: data.outputProtocol ?? defaultSettings.outputProtocol,
        outputUrl: data.outputUrl ?? defaultSettings.outputUrl,
        outputKey: data.outputKey ?? defaultSettings.outputKey,
        customOutput: data.customOutput ?? defaultSettings.customOutput,
        loopPlaylist: data.loopPlaylist ?? defaultSettings.loopPlaylist,
        autoRecover: data.autoRecover ?? defaultSettings.autoRecover,
        fillerMode: data.fillerMode ?? defaultSettings.fillerMode,
        fillerPath: data.fillerPath ?? defaultSettings.fillerPath,
      })
    } catch {
      setSettings({ ...defaultSettings })
      toast.info('No existing settings — using defaults')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localChannelId) fetchSettings(localChannelId)
  }, [localChannelId, fetchSettings])

  const handleChannelChange = (val: string) => {
    setLocalChannelId(val)
    setSelectedChannel(val)
  }

  const updateField = <K extends keyof typeof defaultSettings>(key: K, value: (typeof defaultSettings)[K]) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const saveSection = async (section: SectionKey) => {
    if (!localChannelId || !settings) return
    setSaving(section)
    try {
      await settingsApi.update(localChannelId, settings)
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`)
    } catch {
      toast.error(`Failed to save ${section} settings`)
    } finally {
      setSaving(null)
    }
  }

  const selectedChannel = channels.find((c) => c.id === localChannelId)

  const resolutionPresets = [
    { label: '3840×2160', w: 3840, h: 2160 },
    { label: '1920×1080', w: 1920, h: 1080 },
    { label: '1280×720', w: 1280, h: 720 },
    { label: 'Custom', w: 0, h: 0 },
  ]

  const currentPreset = resolutionPresets.find(
    (p) => p.w === settings?.width && p.h === settings?.height
  )?.label || 'Custom'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

      {!localChannelId ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="flex items-center justify-center py-20">
            <p className="text-zinc-500">Select a channel to configure</p>
          </CardContent>
        </Card>
      ) : loading || !settings ? (
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <Skeleton className="h-5 w-40 bg-zinc-800" />
                <Skeleton className="h-4 w-64 bg-zinc-800" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-9 w-full bg-zinc-800" />
                <Skeleton className="h-9 w-full bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* ── Video Settings ── */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="size-4 text-emerald-400" />
                  <CardTitle className="text-base">Video Settings</CardTitle>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveSection('video')}
                  disabled={saving === 'video'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving === 'video' ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <CardDescription className="text-zinc-500">
                Encoding parameters for {selectedChannel?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resolution Presets */}
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300">Resolution</Label>
                <div className="flex gap-2 flex-wrap">
                  {resolutionPresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant={currentPreset === preset.label ? 'default' : 'outline'}
                      size="sm"
                      className={
                        currentPreset === preset.label
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                          : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300'
                      }
                      onClick={() => {
                        if (preset.w > 0 && preset.h > 0) {
                          updateField('width', preset.w)
                          updateField('height', preset.h)
                        }
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom W/H */}
              {currentPreset === 'Custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">Width (px)</Label>
                    <Input
                      type="number"
                      value={settings.width}
                      onChange={(e) => updateField('width', parseInt(e.target.value) || 0)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">Height (px)</Label>
                    <Input
                      type="number"
                      value={settings.height}
                      onChange={(e) => updateField('height', parseInt(e.target.value) || 0)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    />
                  </div>
                </div>
              )}

              {/* Frame Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Frame Rate</Label>
                  <Select
                    value={String(settings.fps)}
                    onValueChange={(v) => updateField('fps', parseFloat(v))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['23.976', '24', '25', '29.97', '30', '50', '59.94', '60'].map((f) => (
                        <SelectItem key={f} value={f}>{f} fps</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Video Codec</Label>
                  <Select
                    value={settings.videoCodec}
                    onValueChange={(v) => updateField('videoCodec', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['libx264', 'libx265', 'h264_nvenc', 'h264_vaapi', 'copy'].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bitrate */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm text-zinc-300">Bitrate</Label>
                  <span className="text-sm text-zinc-400">{settings.videoBitrate} kbps</span>
                </div>
                <Slider
                  value={[settings.videoBitrate]}
                  onValueChange={([v]) => updateField('videoBitrate', v)}
                  min={500}
                  max={20000}
                  step={100}
                />
              </div>

              {/* Preset / Profile */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Preset</Label>
                  <Select
                    value={settings.videoPreset}
                    onValueChange={(v) => updateField('videoPreset', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Profile</Label>
                  <Select
                    value={settings.videoProfile}
                    onValueChange={(v) => updateField('videoProfile', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['baseline', 'main', 'high', 'high10', 'high422', 'high444'].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* GOP / Keyframe */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">GOP Size</Label>
                  <Input
                    type="number"
                    value={settings.gopSize}
                    onChange={(e) => updateField('gopSize', parseInt(e.target.value) || 0)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Keyframe Interval (sec)</Label>
                  <Input
                    type="number"
                    value={settings.keyframeInt}
                    onChange={(e) => updateField('keyframeInt', parseInt(e.target.value) || 0)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Audio Settings ── */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="size-4 text-emerald-400" />
                  <CardTitle className="text-base">Audio Settings</CardTitle>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveSection('audio')}
                  disabled={saving === 'audio'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving === 'audio' ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Audio Codec</Label>
                  <Select
                    value={settings.audioCodec}
                    onValueChange={(v) => updateField('audioCodec', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['aac', 'mp3', 'opus', 'copy'].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Sample Rate</Label>
                  <Select
                    value={String(settings.audioSampleRate)}
                    onValueChange={(v) => updateField('audioSampleRate', parseInt(v))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['44100', '48000', '96000'].map((r) => (
                        <SelectItem key={r} value={r}>{parseInt(r).toLocaleString()} Hz</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Channels</Label>
                  <Select
                    value={String(settings.audioChannels)}
                    onValueChange={(v) => updateField('audioChannels', parseInt(v))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — Mono</SelectItem>
                      <SelectItem value="2">2 — Stereo</SelectItem>
                      <SelectItem value="6">6 — 5.1 Surround</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Loudness Normalization</Label>
                  <div className="flex items-center gap-3 h-9">
                    <Switch
                      checked={settings.loudnessNorm}
                      onCheckedChange={(v) => updateField('loudnessNorm', v)}
                    />
                    <span className="text-sm text-zinc-400">
                      {settings.loudnessNorm ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audio Bitrate */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm text-zinc-300">Audio Bitrate</Label>
                  <span className="text-sm text-zinc-400">{settings.audioBitrate} kbps</span>
                </div>
                <Slider
                  value={[settings.audioBitrate]}
                  onValueChange={([v]) => updateField('audioBitrate', v)}
                  min={64}
                  max={320}
                  step={16}
                />
              </div>

              {settings.loudnessNorm && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Target Loudness (LUFS)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.loudnessTarget}
                    onChange={(e) => updateField('loudnessTarget', parseFloat(e.target.value) || -23.0)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 max-w-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Output Settings ── */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-emerald-400" />
                  <CardTitle className="text-base">Output Settings</CardTitle>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveSection('output')}
                  disabled={saving === 'output'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving === 'output' ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Output Format</Label>
                  <Select
                    value={settings.outputFormat}
                    onValueChange={(v) => updateField('outputFormat', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['mpegts', 'mp4', 'flv', 'hls'].map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Output Protocol</Label>
                  <Select
                    value={settings.outputProtocol}
                    onValueChange={(v) => updateField('outputProtocol', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['RTMP', 'RTMPS', 'SRT', 'UDP', 'RTP'].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-300">Output URL</Label>
                <Input
                  placeholder="rtmp://your-server/live"
                  value={settings.outputUrl}
                  onChange={(e) => updateField('outputUrl', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-300">Stream Key</Label>
                <Input
                  type="password"
                  placeholder="Enter stream key"
                  value={settings.outputKey}
                  onChange={(e) => updateField('outputKey', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-300">Custom FFmpeg Output</Label>
                <Textarea
                  placeholder="-f mpegts pipe:1"
                  value={settings.customOutput}
                  onChange={(e) => updateField('customOutput', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 font-mono text-sm min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-zinc-600">
                  Advanced: overrides other output settings when specified
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Playout Settings ── */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="size-4 text-emerald-400" />
                  <CardTitle className="text-base">Playout Settings</CardTitle>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveSection('playout')}
                  disabled={saving === 'playout'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving === 'playout' ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
                  <div>
                    <Label className="text-sm text-zinc-300">Loop Playlist</Label>
                    <p className="text-xs text-zinc-600 mt-0.5">Restart playlist when it reaches the end</p>
                  </div>
                  <Switch
                    checked={settings.loopPlaylist}
                    onCheckedChange={(v) => updateField('loopPlaylist', v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
                  <div>
                    <Label className="text-sm text-zinc-300">Auto-Recovery</Label>
                    <p className="text-xs text-zinc-600 mt-0.5">Automatically restart on error</p>
                  </div>
                  <Switch
                    checked={settings.autoRecover}
                    onCheckedChange={(v) => updateField('autoRecover', v)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-300">Filler Mode</Label>
                <Select
                  value={settings.fillerMode}
                  onValueChange={(v) => updateField('fillerMode', v as 'black' | 'image' | 'playlist')}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="playlist">Playlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(settings.fillerMode === 'image' || settings.fillerMode === 'playlist') && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">
                    Filler {settings.fillerMode === 'image' ? 'Image Path' : 'Playlist Path'}
                  </Label>
                  <Input
                    placeholder={`/path/to/${settings.fillerMode}`}
                    value={settings.fillerPath}
                    onChange={(e) => updateField('fillerPath', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}