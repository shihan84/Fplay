'use client'

import { useEffect, useState } from 'react'
import { PanelLeft, Wifi, WifiOff, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { useSocket } from '@/lib/socket'
import { cn } from '@/lib/utils'
import type { SystemStats } from '@/types'

const viewLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  channels: 'Channel Management',
  'channel-detail': 'Channel Detail',
  media: 'Media Library',
  playlist: 'Playlist Editor',
  playout: 'Playout Controls',
  settings: 'Settings',
  logs: 'As-Run Logs',
  overlay: 'Graphics & Overlays',
  recordings: 'Conformance Recordings',
}

export function AppHeader({ connected }: { connected: boolean }) {
  const { activeView, sidebarOpen, setSidebarOpen, selectedChannelId, channels } = useAppStore()
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const { on } = useSocket()

  useEffect(() => {
    const off = on('system:stats', (stats: SystemStats) => {
      setSystemStats(stats)
    })
    return off
  }, [on])

  const selectedChannel = channels.find(c => c.id === selectedChannelId)
  const breadcrumb = activeView === 'channel-detail' && selectedChannel
    ? `${viewLabels[activeView]} / ${selectedChannel.name}`
    : viewLabels[activeView] || 'Dashboard'

  return (
    <header className="flex h-14 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 flex-shrink-0">
      {/* Mobile menu toggle */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 md:hidden"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500 font-medium">ffplayout</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200 font-medium">{breadcrumb}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* System metrics */}
        {systemStats && (
          <div className="hidden md:flex items-center gap-3">
            <MetricBadge
              icon={<Cpu className="h-3 w-3" />}
              label="CPU"
              value={Math.round(systemStats.cpuUsage)}
              color={systemStats.cpuUsage > 80 ? 'text-red-400' : systemStats.cpuUsage > 60 ? 'text-amber-400' : 'text-emerald-400'}
            />
            <MetricBadge
              icon={<MemoryStick className="h-3 w-3" />}
              label="MEM"
              value={Math.round(systemStats.memoryUsage)}
              color={systemStats.memoryUsage > 80 ? 'text-red-400' : systemStats.memoryUsage > 60 ? 'text-amber-400' : 'text-emerald-400'}
            />
            <MetricBadge
              icon={<HardDrive className="h-3 w-3" />}
              label="DISK"
              value={Math.round(systemStats.diskUsage)}
              color="text-zinc-400"
            />
          </div>
        )}

        {/* WebSocket status */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className={cn(
            'text-[11px] font-medium',
            connected ? 'text-emerald-400' : 'text-red-400'
          )}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  )
}

function MetricBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-zinc-800/50 rounded-md px-2 py-1">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
      <span className={cn('text-[11px] font-bold', color)}>{value}%</span>
    </div>
  )
}

