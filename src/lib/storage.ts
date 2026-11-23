import type { CountdownTimer, StopwatchLap } from './time'
import { DEFAULT_PINNED_ZONES, isValidTimeZone } from './worldclock'

export type ViewId = 'countdown' | 'stopwatch' | 'worldclock' | 'widget' | 'calc'
export type ThemeMode = 'system' | 'light' | 'dark'
export type Locale = 'zh-CN' | 'en'
export type WidgetStyle = 'standard' | 'compact'
export type WidgetTheme = 'dark' | 'light'
export type WidgetDisplayMode = 'countdown' | 'stopwatch' | 'clock' | 'msclock' | 'dual'

export interface WidgetConfig {
  style: WidgetStyle
  theme: WidgetTheme
  opacity: number
  mode: WidgetDisplayMode
  alwaysOnTop: boolean
  dualZoneA: string
  dualZoneB: string
  msOffsetMs: number
  snipeTarget: string
}

export interface StopwatchState {
  elapsedMs: number
  running: boolean
  startedAt: number | null
  laps: StopwatchLap[]
}

export interface StudioState {
  version: number
  activeView: ViewId
  timers: CountdownTimer[]
  activeTimerId: string
  pomodoroCycles: number
  stopwatch: StopwatchState
  pinnedZones: string[]
  widget: WidgetConfig
  settings: {
    theme: ThemeMode
    locale: Locale
    soundEnabled: boolean
  }
}

const STORAGE_KEY = 'funtime_studio_state_v1'

export function createDefaultTimers(): CountdownTimer[] {
  return [
    {
      id: 'timer-pomo-1',
      label: '番茄专注',
      durationMs: 25 * 60_000,
      remainingMs: 25 * 60_000,
      running: false,
      endAt: null,
      kind: 'pomodoro',
    },
    {
      id: 'timer-tea-2',
      label: '泡茶计时',
      durationMs: 3 * 60_000,
      remainingMs: 3 * 60_000,
      running: false,
      endAt: null,
      kind: 'custom',
    },
    {
      id: 'timer-meeting-3',
      label: '会议提醒',
      durationMs: 15 * 60_000,
      remainingMs: 15 * 60_000,
      running: false,
      endAt: null,
      kind: 'custom',
    },
  ]
}

export function createDefaultState(): StudioState {
  const timers = createDefaultTimers()
  return {
    version: 1,
    activeView: 'countdown',
    timers,
    activeTimerId: timers[0].id,
    pomodoroCycles: 2,
    stopwatch: {
      elapsedMs: 0,
      running: false,
      startedAt: null,
      laps: [],
    },
    pinnedZones: [...DEFAULT_PINNED_ZONES],
    widget: {
      style: 'standard',
      theme: 'dark',
      opacity: 0.96,
      mode: 'countdown',
      alwaysOnTop: true,
      dualZoneA: 'Asia/Shanghai',
      dualZoneB: 'America/New_York',
      msOffsetMs: 0,
      snipeTarget: '',
    },
    settings: {
      theme: 'system',
      locale: 'zh-CN',
      soundEnabled: true,
    },
  }
}

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

function readRaw(): unknown {
  try {
    if (typeof window !== 'undefined' && window.utools?.dbStorage?.getItem) {
      return window.utools.dbStorage.getItem(STORAGE_KEY)
    }
    const ls = getSafeLocalStorage()
    if (ls) {
      const s = ls.getItem(STORAGE_KEY)
      return s ? JSON.parse(s) : null
    }
  } catch {
    return null
  }
  return null
}

function writeRaw(state: StudioState): void {
  try {
    if (typeof window !== 'undefined' && window.utools?.dbStorage?.setItem) {
      window.utools.dbStorage.setItem(STORAGE_KEY, state)
      return
    }
    const ls = getSafeLocalStorage()
    if (ls) {
      ls.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch {
    // ignore storage quota errors
  }
}

const VALID_VIEWS = new Set<ViewId>(['countdown', 'stopwatch', 'worldclock', 'widget', 'calc'])
const VALID_THEMES = new Set<ThemeMode>(['system', 'light', 'dark'])
const VALID_WIDGET_MODES = new Set<WidgetDisplayMode>(['countdown', 'stopwatch', 'clock', 'msclock', 'dual'])

export function loadStudioState(): StudioState {
  const fallback = createDefaultState()
  const raw = readRaw()
  if (!raw || typeof raw !== 'object') return fallback
  const data = raw as Partial<StudioState>

  const timers =
    Array.isArray(data.timers) && data.timers.length > 0
      ? data.timers
          .filter((item): item is CountdownTimer => Boolean(item && typeof item.id === 'string' && typeof item.durationMs === 'number' && item.durationMs > 0))
          .slice(0, 12)
          .map((item) => ({
            id: item.id,
            label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : '倒计时',
            durationMs: item.durationMs,
            remainingMs: Math.max(0, Math.min(item.durationMs, Number(item.remainingMs) || item.durationMs)),
            running: Boolean(item.running && typeof item.endAt === 'number' && item.endAt > Date.now()),
            endAt: item.running && typeof item.endAt === 'number' && item.endAt > Date.now() ? item.endAt : null,
            kind: item.kind ?? 'custom',
          }))
      : fallback.timers

  const activeTimerId = timers.some((t) => t.id === data.activeTimerId)
    ? (data.activeTimerId as string)
    : timers[0].id

  const pinnedZones =
    Array.isArray(data.pinnedZones) && data.pinnedZones.length > 0
      ? data.pinnedZones.filter((tz): tz is string => typeof tz === 'string' && isValidTimeZone(tz)).slice(0, 10)
      : fallback.pinnedZones

  const widgetRaw = data.widget && typeof data.widget === 'object' ? data.widget : fallback.widget
  const settingsRaw = data.settings && typeof data.settings === 'object' ? data.settings : fallback.settings
  const swRaw = data.stopwatch && typeof data.stopwatch === 'object' ? data.stopwatch : fallback.stopwatch

  return {
    version: 1,
    activeView: VALID_VIEWS.has(data.activeView as ViewId) ? (data.activeView as ViewId) : fallback.activeView,
    timers,
    activeTimerId,
    pomodoroCycles: typeof data.pomodoroCycles === 'number' && data.pomodoroCycles >= 0 ? Math.floor(data.pomodoroCycles) : fallback.pomodoroCycles,
    stopwatch: {
      elapsedMs: Math.max(0, Number(swRaw.elapsedMs) || 0),
      running: Boolean(swRaw.running && typeof swRaw.startedAt === 'number'),
      startedAt: swRaw.running && typeof swRaw.startedAt === 'number' ? swRaw.startedAt : null,
      laps: Array.isArray(swRaw.laps) ? swRaw.laps.slice(0, 200) : [],
    },
    pinnedZones: pinnedZones.length > 0 ? pinnedZones : fallback.pinnedZones,
    widget: {
      style: widgetRaw.style === 'compact' ? 'compact' : 'standard',
      theme: widgetRaw.theme === 'light' ? 'light' : 'dark',
      opacity: Math.min(1, Math.max(0.65, Number(widgetRaw.opacity) || 0.96)),
      mode: VALID_WIDGET_MODES.has(widgetRaw.mode as WidgetDisplayMode) ? (widgetRaw.mode as WidgetDisplayMode) : 'countdown',
      alwaysOnTop: widgetRaw.alwaysOnTop !== false,
      dualZoneA: isValidTimeZone(String(widgetRaw.dualZoneA ?? '')) ? String(widgetRaw.dualZoneA) : 'Asia/Shanghai',
      dualZoneB: isValidTimeZone(String(widgetRaw.dualZoneB ?? '')) ? String(widgetRaw.dualZoneB) : 'America/New_York',
      msOffsetMs: Math.min(5000, Math.max(-5000, Math.round(Number(widgetRaw.msOffsetMs) || 0))),
      snipeTarget: typeof widgetRaw.snipeTarget === 'string' ? widgetRaw.snipeTarget.slice(0, 8) : '',
    },
    settings: {
      theme: VALID_THEMES.has(settingsRaw.theme as ThemeMode) ? (settingsRaw.theme as ThemeMode) : 'system',
      locale: settingsRaw.locale === 'en' ? 'en' : 'zh-CN',
      soundEnabled: settingsRaw.soundEnabled !== false,
    },
  }
}

export function saveStudioState(state: StudioState): void {
  writeRaw(state)
}
