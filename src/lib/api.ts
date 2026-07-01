const API_BASE = '/api'
const MAX_RETRIES = 2
const RETRY_DELAY = 500

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const isFormData = options?.body instanceof FormData
      const res = await fetch(`${API_BASE}${path}`, {
        headers: isFormData
          ? options?.headers
          : {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
        ...options,
      })

      if (res.ok) {
        return res.json()
      }

      // Retry on 404 (Turbopack compilation race) or 500 (server not ready)
      if ((res.status === 404 || res.status === 500) && attempt < MAX_RETRIES) {
        lastError = new Error(`API ${res.status} (attempt ${attempt + 1}, retrying...)`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)))
        continue
      }

      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `API Error: ${res.status}`)
    } catch (err) {
      if (err instanceof TypeError && attempt < MAX_RETRIES) {
        // Network error - retry
        lastError = err as Error
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)))
        continue
      }
      throw err
    }
  }

  throw lastError || new Error(`API Error: ${path}`)
}

// Channels
export const channelsApi = {
  list: () => apiFetch<any[]>('/channels'),
  get: (id: string) => apiFetch<any>(`/channels/${id}`),
  create: (data: any) => apiFetch<any>('/channels', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/channels/${id}`, { method: 'DELETE' }),
  start: (id: string) => apiFetch<any>(`/channels/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'start' }) }),
  stop: (id: string) => apiFetch<any>(`/channels/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'stop' }) }),
  restart: (id: string) => apiFetch<any>(`/channels/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'restart' }) }),
}

// Media
export const mediaApi = {
  list: async (params?: { channelId?: string; search?: string; category?: string }) => {
    const query = new URLSearchParams()
    if (params?.channelId) query.set('channelId', params.channelId)
    if (params?.search) query.set('search', params.search)
    if (params?.category) query.set('category', params.category)
    const res = await apiFetch<{ data: any[]; pagination: any }>(`/media?${query}`)
    return res.data ?? res
  },
  upload: (formData: FormData) =>
    fetch(`${API_BASE}/media`, { method: 'POST', body: formData }).then((r) => {
      if (!r.ok) throw new Error('Upload failed')
      return r.json()
    }),
  delete: (id: string) => apiFetch<void>(`/media?id=${id}`, { method: 'DELETE' }),
  update: (id: string, data: any) => apiFetch<any>(`/media?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// Playlists
export const playlistsApi = {
  list: (channelId: string) => apiFetch<any[]>(`/playlists?channelId=${channelId}`),
  get: (id: string) => apiFetch<any>(`/playlists?id=${id}`),
  create: (data: any) => apiFetch<any>('/playlists', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/playlists?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/playlists?id=${id}`, { method: 'DELETE' }),
  addItems: (playlistId: string, items: any[]) =>
    apiFetch<any>(`/playlists?id=${playlistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addItems', items }),
    }),
  updateItems: (playlistId: string, items: any[]) =>
    apiFetch<any>(`/playlists?id=${playlistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateItems', items }),
    }),
  removeItem: (playlistId: string, itemId: string) =>
    apiFetch<void>(`/playlists?id=${playlistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'removeItem', itemId }),
    }),
  setActive: (id: string) =>
    apiFetch<any>(`/playlists?id=${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'setActive' }) }),
}

// Settings
export const settingsApi = {
  get: (channelId: string) => apiFetch<any>(`/settings?channelId=${channelId}`),
  update: (channelId: string, data: any) =>
    apiFetch<any>(`/settings?channelId=${channelId}`, { method: 'PUT', body: JSON.stringify({ ...data, channelId }) }),
}

// Text Overlays
export const textOverlaysApi = {
  list: (channelId: string) => apiFetch<any[]>(`/text-overlays?channelId=${channelId}`),
  create: (data: any) => apiFetch<any>('/text-overlays', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: any) => apiFetch<any>('/text-overlays', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/text-overlays?id=${id}`, { method: 'DELETE' }),
}

// Logs
export const logsApi = {
  list: (params?: { channelId?: string; page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.channelId) query.set('channelId', params.channelId)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    return apiFetch<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/logs?${query}`)
  },
  exportCsv: (channelId: string) =>
    fetch(`${API_BASE}/logs?channelId=${channelId}&export=csv`).then((r) => r.text()),
}

// Logos
export const logosApi = {
  list: (channelId: string) => apiFetch<any[]>(`/logos?channelId=${channelId}`),
  create: (data: any) => apiFetch<any>('/logos', { method: 'POST', body: JSON.stringify(data) }),
  upload: (channelId: string, file: File, data?: any) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('channelId', channelId)
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      })
    }
    return apiFetch<any>('/logos', { method: 'POST', body: formData })
  },
  update: (id: string, data: any) => apiFetch<any>(`/logos?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/logos?id=${id}`, { method: 'DELETE' }),
}

// Graphics
export const graphicsApi = {
  list: (channelId: string) => apiFetch<any[]>(`/graphics?channelId=${channelId}`),
  create: (data: any) => apiFetch<any>('/graphics', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/graphics?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/graphics?id=${id}`, { method: 'DELETE' }),
  trigger: (id: string) =>
    apiFetch<any>(`/graphics?id=${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'trigger' }) }),
}

// Recordings
export const recordingsApi = {
  list: (channelId?: string) => {
    const query = channelId ? `?channelId=${channelId}` : ''
    return apiFetch<any[]>(`/recordings${query}`)
  },
}

// System
export const systemApi = {
  stats: () => apiFetch<any>('/system'),
  info: () => apiFetch<any>('/system'),
}