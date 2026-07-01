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
import { RecordingsPage } from '@/components/pages/RecordingsPage'
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
    // Also update channel status in the channels list
    useAppStore.getState().updateChannel(data.channelId, { status: data.status })
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
      case 'recordings': return <RecordingsPage />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-900">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader connected={connected} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderView()}
        </main>
        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-6 py-2 flex items-center justify-between text-xs text-zinc-600">
          <span>© {new Date().getFullYear()} <span className="text-zinc-500 font-medium">Itassist Broadcast Solutions</span>. All rights reserved.</span>
          <span className="text-zinc-700">Fplay — Licensed Broadcast Playout Software</span>
        </footer>
      </div>
    </div>
  )
}