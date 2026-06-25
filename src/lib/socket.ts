'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io('/?XTransformPort=3005', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return socketInstance
}

export function useSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Check initial connection state asynchronously
    if (socket.connected) {
      const timer = setTimeout(() => setConnected(true), 0)
      return () => {
        clearTimeout(timer)
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
      }
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = getSocket()
    socket.on(event, handler)
    return () => { socket.off(event, handler) }
  }, [])

  const emit = useCallback((event: string, ...args: any[]) => {
    getSocket().emit(event, ...args)
  }, [])

  return { socket: getSocket(), connected, on, emit }
}

export { getSocket }