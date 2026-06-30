# ffplayout — Multi-Channel TV Playout System

## Project Overview

ffplayout is a professional, web-based multi-channel broadcast playout system. It provides a dark-themed control UI for managing TV channels, media libraries, playlists, overlays, conformance recordings, and streaming output — all driven by an FFmpeg playout engine.

The system is a **single-page application** built with Next.js 16 (App Router, standalone output) using client-side view switching via Zustand. There is no URL-based navigation — all routing is handled by the `activeView` state in the Zustand store.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1 (App Router, `output: "standalone"`) |
| Language | TypeScript 5 (strict, `noImplicitAny: false`) |
| Runtime | Bun (both dev and production) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) |
| Database | SQLite via Prisma ORM 6.11 |
| Realtime | Socket.IO 4.8 (separate Bun mini-service on port 3005) |
| State | Zustand 5 (client global state), TanStack Query 5 (server state) |
| DnD | @dnd-kit 6 (playlist reordering) |
| Charts | Recharts 2.15 |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Proxy | Caddy 2 (dev: port 81, prod: port 80/443) |
| Containerization | Docker (3-service compose: app + realtime + caddy) |

## Architecture

```
Browser ──► Caddy (:80/:443)
               │
               ├── XTransformPort=3005 ──► realtime:3005 (Socket.IO)
               │
               └── default ──► app:3000 (Next.js + Prisma + API)
                                      │
                                      └── SQLite (/data/custom.db)
```

### Key Architectural Decisions

1. **SPA via Zustand** — `src/app/page.tsx` renders `<AppLayout />` which switches views based on `useAppStore().activeView`. The 10 possible views: `dashboard`, `channels`, `channel-detail`, `media`, `playlist`, `playout`, `settings`, `logs`, `overlay`, `recordings`.

2. **Caddy XTransformPort routing** — The gateway exposes one port. Clients route to different backend services by appending `?XTransformPort={port}` to the URL. The Socket.IO client connects via `io('/?XTransformPort=3005')`. This eliminates CORS issues.

3. **Separate Socket.IO service** — The realtime service (`mini-services/realtime-service/`) is an independent Bun project on port 3005. It simulates playout engine behavior (clip progression, system stats, channel status) and broadcasts via Socket.IO every 2 seconds.

4. **API routes as backend** — All data operations go through Next.js API routes under `src/app/api/`. These routes use Prisma to read/write SQLite. The `dynamic = 'force-dynamic'` export is required on every route.

5. **Seed data on first load** — The `/api/channels` GET endpoint auto-seeds 3 demo channels, 8 media files, and 1 playlist with 4 items when the database is empty.

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                    # SPA entry → <AppLayout />
│   ├── layout.tsx                  # Root layout (dark mode, fonts, Toaster, Providers)
│   ├── globals.css                 # Tailwind + dark theme CSS variables
│   └── api/                        # ALL backend API routes (use "use server" / Route Handlers)
│       ├── channels/route.ts       #   Channel CRUD + seed data
│       ├── channels/[id]/route.ts  #   Channel actions (start/stop/restart)
│       ├── media/route.ts          #   Media CRUD with search/filter/pagination
│       ├── playlists/route.ts      #   Playlist CRUD + 4 PATCH actions
│       ├── settings/route.ts       #   Channel settings upsert
│       ├── logs/route.ts           #   As-run logs + CSV export
│       ├── logos/route.ts          #   Logo overlay CRUD
│       ├── graphics/route.ts       #   Graphics overlay CRUD
│       ├── recordings/route.ts     #   Conformance recording list
│       └── system/route.ts         #   System stats (CPU/MEM/FFmpeg version)
├── components/
│   ├── Providers.tsx               # React Query provider (staleTime: 10s, retry: 1)
│   ├── layout/
│   │   ├── AppLayout.tsx           # Main shell: fetches channels, subscribes to WebSocket
│   │   ├── AppSidebar.tsx          # Collapsible sidebar with nav + channel quick-switch
│   │   └── AppHeader.tsx           # Breadcrumb + live system metrics
│   ├── pages/                      # 10 page components (one per view)
│   │   ├── Dashboard.tsx           # System overview, channel monitors, charts
│   │   ├── ChannelsPage.tsx        # Channel CRUD grid
│   │   ├── ChannelDetail.tsx       # 4-tab channel detail (Overview/Playlists/Media/Settings)
│   │   ├── MediaLibrary.tsx        # Media browser with grid/list, search, upload
│   │   ├── PlaylistEditor.tsx      # Drag-and-drop playlist builder
│   │   ├── PlayoutControls.tsx     # Play/Stop/Skip, now playing, stream health
│   │   ├── SettingsPage.tsx        # Video/Audio/Output/Playout settings
│   │   ├── LogsPage.tsx            # As-run logs with pagination, CSV export
│   │   ├── OverlayPage.tsx         # Logo + Graphics overlay management
│   │   └── RecordingsPage.tsx      # Conformance recordings table
│   └── ui/                         # ~40 shadcn/ui components (DO NOT modify)
├── stores/
│   └── app-store.ts                # Zustand store (navigation + channel state)
├── hooks/
│   ├── use-toast.ts                # Toast notification hook
│   └── use-mobile.ts               # Mobile breakpoint hook (768px)
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   ├── api.ts                      # API client with retry logic (3 retries for 404/500)
│   ├── socket.ts                   # Socket.IO client singleton + useSocket() hook
│   └── utils.ts                    # cn() utility (clsx + tailwind-merge)
└── types/
    └── index.ts                    # All TypeScript interfaces (Channel, Media, Playlist, etc.)

prisma/
└── schema.prisma                   # SQLite schema (8 models, cascade deletes from Channel)

mini-services/
└── realtime-service/
    ├── index.ts                    # Socket.IO server (port 3005, simulates playout engine)
    ├── package.json                # Independent Bun project
    └── Dockerfile                  # Lightweight container
```

## Database Schema (Prisma / SQLite)

8 models, all cascading from `Channel`:

- **Channel** — id, name, description, status (stopped/starting/running/error), color, order
- **ChannelSettings** — 1:1 with Channel. Full broadcast config: video (resolution, fps, codec, bitrate, preset, profile, GOP, keyframe interval), audio (codec, bitrate, sample rate, channels, EBU R128 loudness normalization with LUFS target), output (format, protocol, URL, stream key, custom FFmpeg output), playout (loop, auto-recover, filler mode)
- **Media** — filename, title, path, fileType (video/audio/image), fileSize, duration, resolution, codec, bitrate, frameRate, sampleRate, channels, category, tags (JSON), thumbnail, status (ready/processing/error)
- **Playlist** — name, channelId, isActive, isLoop, scheduledStart/End
- **PlaylistItem** — mediaId, title, artist, duration, order, transition (cut/crossfade/fade-through-white/fade-through-black/dissolve), transitionDur, inPoint, outPoint, customText, status (pending/playing/played/error), startedAt, endedAt
- **AsRunLog** — channelId, playlistId, mediaId, title, duration, startedAt, endedAt, status, error
- **LogoOverlay** — channelId, name, path, opacity, position (posX/posY + offset), size, active, schedule (startTime/endTime)
- **GraphicsOverlay** — channelId, name, html, css, position, duration, active
- **ConformanceRecording** — channelId, filePath, fileSize, duration, status (recording/completed/error)

## FFmpeg Integration

### Current State

The UI is a complete control layer. FFmpeg is **not yet invoked** from the codebase. The system is designed to drive FFmpeg processes for actual playout. When implementing FFmpeg integration, these are the key integration points:

### FFmpeg Usage Patterns (To Be Implemented)

#### 1. Playout Engine (Core)

Each running channel should spawn and manage an FFmpeg process:

```typescript
import { spawn, ChildProcess } from 'child_process'

interface FFmpegProcess {
  proc: ChildProcess
  channelId: string
  currentClip: string
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
}

// Generate FFmpeg command for a channel's active playlist
function buildPlayoutCommand(settings: ChannelSettings): string[] {
  const args: string[] = ['ffmpeg']

  // Global options
  args.push('-hide_banner')
  args.push('-loglevel', 'warning')
  args.push('-re')                    // Read input at native frame rate (critical for broadcast)

  // Input files (concatenated via concat demuxer or -f concat)
  args.push('-f', 'concat')
  args.push('-safe', '0')
  args.push('-i', 'playlist.txt')     // Generated from PlaylistItems

  // Video filters
  const vFilters: string[] = []
  vFilters.push(`scale=${settings.width}:${settings.height}`)
  vFilters.push(`fps=${settings.fps}`)
  vFilters.push(`format=yuv420p`)     // Broadcast-compatible pixel format

  // Logo overlay (if active)
  if (logoOverlay) {
    vFilters.push(`[1:v]overlay=${logoX}:${logoY}:format=auto[logo]`)
  }

  // EBU R128 loudness normalization
  if (settings.loudnessNorm) {
    args.push('-af', `loudnorm=I=${settings.loudnessTarget || -23}:TP=-1.5:LRA=11`)
  }

  // Encoding
  args.push('-c:v', settings.videoCodec || 'libx264')
  args.push('-b:v', `${settings.videoBitrate || 4500}k`)
  args.push('-preset', settings.videoPreset || 'medium')
  args.push('-profile:v', settings.videoProfile || 'high')
  args.push('-g', String(settings.gopSize || 12))         // GOP size
  args.push('-keyint_min', String(settings.keyframeInt || 12))

  args.push('-c:a', settings.audioCodec || 'aac')
  args.push('-b:a', `${settings.audioBitrate || 128}k`)
  args.push('-ar', String(settings.audioSampleRate || 48000))
  args.push('-ac', String(settings.audioChannels || 2))

  // Output
  if (settings.customOutput) {
    args.push(settings.customOutput.split(' '))  // Custom FFmpeg output args
  } else {
    const outputUrl = buildOutputUrl(settings)
    if (settings.outputProtocol === 'rtmp') {
      args.push('-f', 'flv')
      args.push(outputUrl)
    } else if (settings.outputProtocol === 'srt') {
      args.push('-f', 'mpegts')
      args.push(outputUrl)
    } else {
      // MPEG-TS over UDP
      args.push('-f', 'mpegts')
      args.push(outputUrl)
    }
  }

  return args
}
```

#### 2. Media Probing

Use `ffprobe` to extract metadata from uploaded media files:

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function probeMedia(filePath: string): Promise<MediaMetadata> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ])

  const data = JSON.parse(stdout)
  const videoStream = data.streams.find((s: any) => s.codec_type === 'video')
  const audioStream = data.streams.find((s: any) => s.codec_type === 'audio')

  return {
    duration: parseFloat(data.format.duration),
    fileSize: parseInt(data.format.size),
    width: videoStream?.width,
    height: videoStream?.height,
    codec: videoStream?.codec_name || audioStream?.codec_name,
    bitrate: parseInt(data.format.bit_rate),
    frameRate: videoStream ? eval(videoStream.r_frame_rate) : undefined,
    sampleRate: audioStream?.sample_rate,
    channels: audioStream?.channels,
    fileType: videoStream ? 'video' : audioStream ? 'audio' : 'image'
  }
}
```

#### 3. Transcoding Pipeline

Transcode uploaded files to broadcast-compatible format:

```typescript
function buildTranscodeCommand(input: string, output: string, settings: ChannelSettings): string[] {
  return [
    'ffmpeg', '-i', input,
    '-c:v', 'libx264',
    '-b:v', `${settings.videoBitrate || 4500}k`,
    '-preset', 'medium',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    '-keyint_min', '25',
    '-g', '50',
    '-sc_threshold', '0',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-ac', '2',
    '-af', 'loudnorm=I=-23:TP=-1.5:LRA=11',
    '-movflags', '+faststart',
    '-y',
    output
  ]
}
```

#### 4. Transition Effects

Implement clip transitions using FFmpeg filter_complex:

```typescript
// Crossfade between two clips
function buildCrossfadeCommand(
  clipA: string, clipB: string, output: string,
  durationA: number, durationB: number, transitionDur: number
): string[] {
  const offsetA = durationA - transitionDur
  return [
    'ffmpeg',
    '-i', clipA, '-i', clipB,
    '-filter_complex',
    `[0:v][1:v]xfade=transition=fade:duration=${transitionDur}:offset=${offsetA}[v]`,
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-y', output
  ]
}

// Available xfade transitions: fade, fadeblack, fadewhite,
// slideleft, slideright, slideup, slidedown,
// circlecrop, dissolve, pixelize, wipeleft, wiperight
```

#### 5. Conformance Recording

Record the output stream with hourly file splitting:

```typescript
function buildRecordCommand(streamUrl: string, outputPath: string): string[] {
  return [
    'ffmpeg',
    '-i', streamUrl,
    '-c', 'copy',                              // No re-encoding (passthrough)
    '-f', 'segment',
    '-segment_time', '3600',                   // Split every hour
    '-segment_format', 'mp4',
    '-movflags', '+frag_keyframe+empty_moov',  // Streamable MP4
    '-reset_timestamps', '1',
    '-strftime', '1',
    `${outputPath}/recording_%Y%m%d_%H%M%S.mp4`
  ]
}
```

#### 6. Live Input Switching

Switch between playlist playout and a live RTMP input source:

```typescript
// For live switching, use a relay/stream copy approach:
function buildLiveRelayCommand(liveInput: string, outputUrl: string): string[] {
  return [
    'ffmpeg',
    '-i', liveInput,
    '-c', 'copy',               // Pass-through without re-encoding
    '-f', 'flv',
    outputUrl
  ]
}
```

#### 7. Thumbnail Generation

Extract a frame from a video file for the media library:

```typescript
function buildThumbnailCommand(videoPath: string, outputPath: string, time = '00:00:03'): string[] {
  return [
    'ffmpeg',
    '-i', videoPath,
    '-ss', time,
    '-vframes', '1',
    '-q:v', '2',
    '-vf', 'scale=320:-1',       // 320px width, auto height
    '-y', outputPath
  ]
}
```

### FFmpeg Requirements for Docker

The production Dockerfile should install FFmpeg:

```dockerfile
# Add to the runner stage of Dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*
```

FFmpeg should be invoked via `child_process.spawn()` from API routes or a dedicated playout engine service (recommended as another mini-service on its own port, e.g., 3006).

## Coding Standards

### Style

- **Dark broadcast theme**: Use `bg-zinc-900` (main), `bg-zinc-800/50` (cards), `text-zinc-100` (primary text), `text-zinc-400/500` (secondary text)
- **Accent color**: Emerald for active/running/success states (`bg-emerald-500`, `text-emerald-400`). Red for errors/stopped. Amber for warnings.
- **NO indigo or blue** unless explicitly requested by the user
- **Responsive**: Mobile-first with `sm:`, `md:`, `lg:`, `xl:` breakpoints
- **Sticky footer**: Use `min-h-screen flex flex-col` on root + `mt-auto` on footer
- **Card alignment**: Consistent `p-4` or `p-6` padding, `gap-4` or `gap-6` spacing
- **Long lists**: `max-h-96 overflow-y-auto` with custom scrollbar styling

### Patterns

- **API routes**: Always use `export const dynamic = 'force-dynamic'`. Return `NextResponse.json()`. Use try/catch with Prisma `P2025` detection for 404s.
- **API client**: Use `apiFetch()` from `@/lib/api.ts` (has built-in retry for 404/500). Use `Promise.allSettled()` for parallel calls.
- **State management**: Use Zustand for client global state, TanStack Query for server state. Import `useAppStore` from `@/stores/app-store`.
- **Realtime**: Use `useSocket()` hook from `@/lib/socket.ts`. Events: `system:stats`, `channel:status`, `overlay:triggered`.
- **UI components**: Always use shadcn/ui from `@/components/ui/`. Never build custom when a shadcn component exists.
- **Icons**: Always use Lucide React icons.
- **No URL routing**: Navigation is done via `useAppStore().setActiveView()`, not `router.push()`.
- **Single route**: All user-visible content is at `/` (src/app/page.tsx). Do NOT create additional routes.

### React 19 Rules

- Use `'use client'` for all interactive components
- Never call `setState` during render — wrap in `setTimeout(() => ..., 0)` or use event handlers
- `useMemo` must be pure — no side effects or setState calls inside
- `useRef` reads should not trigger re-renders — avoid reading `.current` in JSX

### Socket.IO Client

```typescript
import { useSocket } from '@/lib/socket'

const { socket, connected, on, emit } = useSocket()

// Listen for events
const off = on('channel:status', (data) => { /* ... */ })
return () => off()  // Clean up!

// Emit events
emit('channel:subscribe', channelId)
emit('overlay:trigger', { channelId, overlayId })
```

### API Client

```typescript
import { channelsApi, mediaApi, playlistsApi, systemApi } from '@/lib/api'

// CRUD operations
const channels = await channelsApi.list()
const channel = await channelsApi.get(id)
await channelsApi.start(id)  // PATCH with { action: 'start' }
```

## Development Commands

```bash
# Install dependencies
bun install

# Push schema to database (SQLite)
bun run db:push

# Start development server (port 3000)
bun run dev

# Start realtime service (port 3005)
cd mini-services/realtime-service && bun run dev

# Lint
bun run lint

# Production build
bun run build

# Production start
bun run start

# Docker
docker compose up -d --build
docker compose logs -f
docker compose down
```

## Docker Deployment

3-service stack orchestrated by docker-compose.yml:

| Service | Container | Port | Role |
|---|---|---|---|
| **app** | ffplayout-app | 3000 (internal) | Next.js + API + Prisma |
| **realtime** | ffplayout-realtime | 3005 (internal) | Socket.IO real-time service |
| **caddy** | ffplayout-proxy | 80/443 (external) | Reverse proxy + routing |

Volumes: `app-data` (SQLite), `app-media` (media files), `app-recordings` (conformance recordings).

Set `DOMAIN=your-domain.com` in `.env` for automatic HTTPS via Caddy, or leave as `localhost` for plain HTTP.

## Important Notes

- **`reactStrictMode: false`** in next.config.ts — this is intentional to avoid double-rendering issues with Socket.IO and real-time state
- **`ignoreBuildErrors: true`** in next.config.ts — type errors don't block builds
- **ESLint is very permissive** — explicit `any`, unused vars, no-console are all allowed
- **The `examples/` directory** contains a generic WebSocket chat demo (port 3003) that is NOT part of the application
- **API retry logic** in `apiFetch()` retries 404/500 up to 2 times with backoff to handle Turbopack compilation races
- **Dashboard uses `Promise.allSettled`** so one failed API call doesn't block the entire page
- **The `XTransformPort` query parameter** is the routing mechanism — always use relative paths with this param for cross-service requests