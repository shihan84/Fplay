'use client'

import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'
import { channelsApi } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { Dashboard } from '@/components/pages/Dashboard'
import { ChannelsPage } from '@/components/pages/ChannelsPage'
import { ChannelDetail } from '@/components/pages/ChannelDetail'
import { MediaLibrary } from '@/components/pages/MediaLibrary'
import { PlaylistEditor } from '@/components/pages/PlaylistEditor'
import { PlayoutControls } from '@/components/pages/PlayoutControls'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { LogsPage } from '@/components/pages/LogsPage'
import { OverlayPage } from '@/components/pages/OverlayPage'
import { TextOverlayPage } from '@/components/pages/TextOverlayPage'
import { DomainsPage } from '@/components/pages/DomainsPage'
import type { ChannelStatus } from '@/types'

export function AppLayout() {
  const { activeView, setChannels, updateChannelStatus, channels } = useAppStore()
  const { on, connected, emit } = useSocket()

  // Fetch channels on mount
  useEffect(() => {
    channelsApi.list().then((data) => {
      setChannels(data)
    }).catch(console.error)
  }, [setChannels])

  // Listen for real-time channel status updates
  const handleChannelStatus = useCallback((data: ChannelStatus) => {
    updateChannelStatus(data)
    // Only propagate stable statuses to the channels list.
    // Skip 'starting' — it is transient and causes dashboard badge flickering
    // during autoRecover restarts while the stream is actually continuous.
    if (data.status !== 'starting') {
      useAppStore.getState().updateChannel(data.channelId, { status: data.status })
    }
  }, [updateChannelStatus])

  useEffect(() => {
    const off = on('channel:status', handleChannelStatus)
    return off
  }, [on, handleChannelStatus])

  // Subscribe to running channels
  useEffect(() => {
    channels.forEach((ch) => {
      if (ch.status === 'running') {
        emit('channel:subscribe', ch.id)
      }
    })
  }, [channels, emit])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />
      case 'channels': return <ChannelsPage />
      case 'channel-detail': return <ChannelDetail />
      case 'media': return <MediaLibrary />
      case 'playlist': return <PlaylistEditor />
      case 'playout': return <PlayoutControls />
      case 'settings': return <SettingsPage />
      case 'logs': return <LogsPage />
      case 'overlay': return <OverlayPage />
      case 'text-overlay': return <TextOverlayPage />
      case 'domains': return <DomainsPage />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-900">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-0">
        <AppHeader connected={connected} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderView()}
        </main>
        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-zinc-600">
          <span className="truncate">© {new Date().getFullYear()} <span className="text-zinc-500 font-medium">Itassist Broadcast Solutions</span></span>
          <span className="text-zinc-700 hidden sm:inline shrink-0">F-play — Licensed Broadcast Playout Software</span>
        </footer>
      </div>
    </div>
  )
}