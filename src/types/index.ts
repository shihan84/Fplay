export type ViewName =
  | 'dashboard'
  | 'channels'
  | 'channel-detail'
  | 'media'
  | 'playlist'
  | 'playout'
  | 'settings'
  | 'logs'
  | 'overlay'
  | 'text-overlay'
  | 'domains'

export interface Channel {
  id: string
  name: string
  description: string | null
  status: 'stopped' | 'starting' | 'running' | 'error'
  color: string
  order: number
  createdAt: string
  updatedAt: string
  settings?: ChannelSettings
  playlists?: Playlist[]
  _count?: { media: number; logs: number; logos: number; playlists: number }
}

export interface ChannelSettings {
  id: string
  channelId: string
  width: number
  height: number
  fps: number
  videoCodec: string
  videoBitrate: number
  videoPreset: string
  videoProfile: string
  gopSize: number
  keyframeInt: number
  audioCodec: string
  audioBitrate: number
  audioSampleRate: number
  audioChannels: number
  loudnessNorm: boolean
  loudnessTarget: number
  videoPid: number
  audioPid: number
  pmtPid: number
  outputFormat: string
  outputProtocol: string
  outputUrl: string
  outputKey: string
  customOutput: string
  loopPlaylist: boolean
  autoRecover: boolean
  fillerMode: 'black' | 'image' | 'playlist'
  fillerPath: string
  createdAt: string
  updatedAt: string
}

export interface Media {
  id: string
  filename: string
  title: string | null
  path: string
  fileType: string
  fileSize: number
  duration: number
  resolution: string | null
  codec: string | null
  bitrate: number
  frameRate: number | null
  sampleRate: number | null
  channels: number | null
  category: string | null
  tags: string | null
  thumbnail: string | null
  status: 'ready' | 'processing' | 'error'
  createdAt: string
  updatedAt: string
}

export interface Playlist {
  id: string
  channelId: string
  name: string
  isActive: boolean
  loop: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  items?: PlaylistItem[]
  _count?: { items: number }
}

export interface PlaylistItem {
  id: string
  playlistId: string
  mediaId: string
  title: string
  artist: string | null
  duration: number
  order: number
  transition: 'cut' | 'crossfade' | 'fade-through-white' | 'fade-through-black' | 'dissolve'
  transitionDur: number
  inPoint: number
  outPoint: number | null
  customText: string | null
  status: 'pending' | 'playing' | 'played' | 'error'
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AsRunLog {
  id: string
  channelId: string
  channel?: Channel
  playlistId: string | null
  mediaId: string | null
  title: string
  duration: number
  startedAt: string
  endedAt: string | null
  status: 'success' | 'error' | 'skipped'
  error: string | null
  createdAt: string
}

export interface LogoOverlay {
  id: string
  channelId: string
  name: string
  path: string
  opacity: number
  posX: string
  posY: string
  offsetX: number
  offsetY: number
  sizeW: number
  sizeH: number
  active: boolean
  bgColor: string | null
  category: string | null
  startTime: string | null
  endTime: string | null
  createdAt: string
  updatedAt: string
}

export interface GraphicsOverlay {
  id: string
  channelId: string
  name: string
  html: string
  css: string
  position: string
  duration: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface TextOverlay {
  id: string
  channelId: string
  name: string
  type: 'static' | 'ticker' | 'clock' | 'lowerthird'
  active: boolean
  text: string
  fontFile: string
  fontSize: number
  fontColor: string
  bgColor: string
  bgOpacity: number
  outline: number
  outlineColor: string
  posX: string
  posY: string
  offsetX: number
  offsetY: number
  scrollSpeed: number
  subText: string
  subFontSize: number
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface DomainConfig {
  id: string
  domain: string
  sslEnabled: boolean
  sslStatus: 'none' | 'pending' | 'active' | 'error'
  sslExpiry: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ChannelStatus {
  channelId: string
  status: 'stopped' | 'starting' | 'running' | 'error'
  currentClip?: string
  nextClip?: string
  currentTime?: number
  clipDuration?: number
  uptime?: number
  cpuUsage: number
  memoryUsage: number
  bitrate: number
  fps: number
  droppedFrames: number
  error?: string
}

export interface SystemStats {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  uptime: number
  ffmpegVersion: string
  activeChannels: number
  totalChannels: number
}