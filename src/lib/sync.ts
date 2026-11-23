import type { CountdownTimer } from './time'
import type { Locale, WidgetConfig, WidgetDisplayMode } from './storage'

export const SYNC_CHANNEL_NAME = 'funtime-sync'
export const LIVE_SNAPSHOT_KEY = 'funtime_widget_live_v1'

export interface WidgetLiveSnapshot {
  updatedAt: number
  locale: Locale
  widget: WidgetConfig
  activeTimer: CountdownTimer
  stopwatch: {
    elapsedMs: number
    running: boolean
    startedAt: number | null
    lapCount: number
  }
}

export type SyncMessage =
  | { type: 'snapshot'; payload: WidgetLiveSnapshot }
  | { type: 'request-sync' }
  | { type: 'command'; command: 'toggle-countdown' | 'reset-countdown' | 'toggle-stopwatch' | 'lap-stopwatch' | 'reset-stopwatch' | 'close-widget' }
  | { type: 'set-widget-mode'; mode: WidgetDisplayMode }

function getSafeLocalStorage(): Storage | null {
  try {
    const s = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage
    if (s && typeof s.getItem === 'function' && typeof s.setItem === 'function') {
      return s
    }
  } catch {
    return null
  }
  return null
}

export function writeLiveSnapshot(snapshot: WidgetLiveSnapshot): void {
  try {
    const ls = getSafeLocalStorage()
    ls?.setItem(LIVE_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore storage errors
  }
}

export function readLiveSnapshot(): WidgetLiveSnapshot | null {
  try {
    const ls = getSafeLocalStorage()
    const raw = ls?.getItem(LIVE_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WidgetLiveSnapshot
    if (!parsed || typeof parsed !== 'object' || !parsed.widget || !parsed.activeTimer) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function createSyncBridge(onMessage: (msg: SyncMessage) => void) {
  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL_NAME)
      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        if (event.data && typeof event.data === 'object' && 'type' in event.data) {
          onMessage(event.data)
        }
      }
    } catch {
      channel = null
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === LIVE_SNAPSHOT_KEY && event.newValue) {
      try {
        const snapshot = JSON.parse(event.newValue) as WidgetLiveSnapshot
        onMessage({ type: 'snapshot', payload: snapshot })
      } catch {
        // ignore
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }

  function post(msg: SyncMessage): void {
    if (msg.type === 'snapshot') {
      writeLiveSnapshot(msg.payload)
    }
    try {
      channel?.postMessage(msg)
    } catch {
      // ignore
    }
  }

  function close(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
    try {
      channel?.close()
    } catch {
      // ignore
    }
  }

  return { post, close }
}
