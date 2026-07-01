'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Radio, FolderOpen, ListVideo, Play,
  Layers, Settings, FileText, HardDrive, Tv, ChevronLeft,
  PanelLeftClose, PanelLeft, Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import type { ViewName } from '@/types'

const navItems: { view: ViewName; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'channels', label: 'Channels', icon: Radio },
  { view: 'media', label: 'Media Library', icon: FolderOpen },
  { view: 'playlist', label: 'Playlist Editor', icon: ListVideo },
  { view: 'playout', label: 'Playout Controls', icon: Play },
  { view: 'overlay', label: 'Graphics & Overlays', icon: Layers },
  { view: 'text-overlay', label: 'Text Overlays', icon: Type },
  { view: 'settings', label: 'Settings', icon: Settings },
  { view: 'logs', label: 'As-Run Logs', icon: FileText },
  { view: 'recordings', label: 'Recordings', icon: HardDrive },
]

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500',
  stopped: 'bg-zinc-500',
  starting: 'bg-amber-500',
  error: 'bg-red-500',
}

export function AppSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, channels, navigateToChannel } = useAppStore()
  const runningCount = channels.filter(c => c.status === 'running').length

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden flex-shrink-0"
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 px-4 border-b border-zinc-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white flex-shrink-0">
            <Tv className="h-4 w-4" />
          </div>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <span className="font-bold text-lg text-white tracking-tight">F-play</span>
              <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-400 text-[10px] px-1.5 py-0">
                v2.0
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.view
            const Icon = item.icon
            const showBadge = item.view === 'channels' && runningCount > 0

            const button = (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5 flex-shrink-0', isActive && 'text-emerald-400')} />
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                {sidebarOpen && showBadge && (
                  <Badge className="ml-auto bg-emerald-600/20 text-emerald-400 text-[10px] px-1.5">
                    {runningCount}
                  </Badge>
                )}
              </button>
            )

            if (!sidebarOpen) {
              return (
                <Tooltip key={item.view}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }
            return button
          })}
        </nav>

        {/* Channel Quick Switch */}
        {channels.length > 0 && (
          <div className="border-t border-zinc-800 px-2 py-3">
            {sidebarOpen && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-3">
                Quick Switch
              </p>
            )}
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {channels.map((ch) => (
                <Tooltip key={ch.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigateToChannel(ch.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors"
                    >
                      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', statusColors[ch.status] || 'bg-zinc-500')} />
                      {sidebarOpen && <span className="truncate">{ch.name}</span>}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                      {ch.name} ({ch.status})
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Collapse Button */}
        <Separator className="bg-zinc-800" />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            {sidebarOpen && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}