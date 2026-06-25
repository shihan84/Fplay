import { create } from 'zustand'
import type { ViewName, Channel, ChannelStatus } from '@/types'

interface AppState {
  // Navigation
  activeView: ViewName
  selectedChannelId: string | null
  selectedPlaylistId: string | null
  sidebarOpen: boolean

  // Actions
  setActiveView: (view: ViewName) => void
  setSelectedChannel: (id: string | null) => void
  setSelectedPlaylist: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  navigateToChannel: (id: string) => void
  navigateToPlaylist: (channelId: string, playlistId: string) => void

  // Channel statuses (real-time)
  channelStatuses: Record<string, ChannelStatus>
  updateChannelStatus: (status: ChannelStatus) => void
  removeChannelStatus: (channelId: string) => void

  // Channels list
  channels: Channel[]
  setChannels: (channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  updateChannel: (id: string, data: Partial<Channel>) => void
  removeChannel: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeView: 'dashboard',
  selectedChannelId: null,
  selectedPlaylistId: null,
  sidebarOpen: true,

  setActiveView: (view) => set({ activeView: view }),
  setSelectedChannel: (id) => set({ selectedChannelId: id }),
  setSelectedPlaylist: (id) => set({ selectedPlaylistId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  navigateToChannel: (id) => set({ selectedChannelId: id, activeView: 'channel-detail' }),
  navigateToPlaylist: (channelId, playlistId) => set({
    selectedChannelId: channelId,
    selectedPlaylistId: playlistId,
    activeView: 'playlist'
  }),

  // Channel statuses
  channelStatuses: {},
  updateChannelStatus: (status) => set((state) => ({
    channelStatuses: { ...state.channelStatuses, [status.channelId]: status }
  })),
  removeChannelStatus: (channelId) => set((state) => {
    const next = { ...state.channelStatuses }
    delete next[channelId]
    return { channelStatuses: next }
  }),

  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({ channels: [...state.channels, channel] })),
  updateChannel: (id, data) => set((state) => ({
    channels: state.channels.map((c) => c.id === id ? { ...c, ...data } : c)
  })),
  removeChannel: (id) => set((state) => ({
    channels: state.channels.filter((c) => c.id !== id)
  })),
}))