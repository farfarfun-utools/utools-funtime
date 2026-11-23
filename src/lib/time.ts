export type TimerKind = 'custom' | 'pomodoro' | 'shortBreak' | 'longBreak'

export interface CountdownTimer {
  id: string
  label: string
  durationMs: number
  remainingMs: number
  running: boolean
  endAt: number | null
  kind: TimerKind
}

export interface StopwatchLap {
  id: string
  index: number
  splitMs: number
  totalMs: number
}

export interface LapStats {
  fastestId: string | null
  slowestId: string | null
  averageSplitMs: number
  fastestMs: number | null
  slowestMs: number | null
}

export interface CountdownPreset {
  id: string
  labelZh: string
  labelEn: string
  durationMs: number
  kind: TimerKind
}

export const COUNTDOWN_PRESETS: CountdownPreset[] = [
  { id: '1m', labelZh: '1分', labelEn: '1m', durationMs: 60_000, kind: 'custom' },
  { id: '3m', labelZh: '3分', labelEn: '3m', durationMs: 3 * 60_000, kind: 'custom' },
  { id: '5m', labelZh: '5分', labelEn: '5m', durationMs: 5 * 60_000, kind: 'shortBreak' },
  { id: '10m', labelZh: '10分', labelEn: '10m', durationMs: 10 * 60_000, kind: 'custom' },
  { id: '15m', labelZh: '15分', labelEn: '15m', durationMs: 15 * 60_000, kind: 'longBreak' },
  { id: '25m', labelZh: '25分 番茄', labelEn: '25m Focus', durationMs: 25 * 60_000, kind: 'pomodoro' },
  { id: '45m', labelZh: '45分', labelEn: '45m', durationMs: 45 * 60_000, kind: 'custom' },
  { id: '60m', labelZh: '60分', labelEn: '60m', durationMs: 60 * 60_000, kind: 'custom' },
]

export const POMODORO_MODES = [
  { kind: 'pomodoro' as const, durationMs: 25 * 60_000, labelZh: '专注 25m', labelEn: 'Focus 25m', titleZh: '番茄专注', titleEn: 'Pomodoro Focus' },
  { kind: 'shortBreak' as const, durationMs: 5 * 60_000, labelZh: '短休 5m', labelEn: 'Short 5m', titleZh: '短暂休息', titleEn: 'Short Break' },
  { kind: 'longBreak' as const, durationMs: 15 * 60_000, labelZh: '长休 15m', labelEn: 'Long 15m', titleZh: '深度休息', titleEn: 'Long Break' },
]

const MAX_DURATION_MS = 999 * 3600 * 1000

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0')
}

export function pad3(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(3, '0')
}

export interface MillisecondClockParts {
  hms: string
  ms: string
  full: string
}

export function formatClockWithMs(timestampMs: number, offsetMs = 0): MillisecondClockParts {
  const adjusted = new Date(timestampMs + offsetMs)
  const hms = `${pad2(adjusted.getHours())}:${pad2(adjusted.getMinutes())}:${pad2(adjusted.getSeconds())}`
  const ms = pad3(adjusted.getMilliseconds())
  return { hms, ms, full: `${hms}.${ms}` }
}

export function parseTargetClockTime(raw: string): { hours: number; minutes: number; seconds: number } | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = match[3] !== undefined ? Number(match[3]) : 0
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return { hours, minutes, seconds }
}

export function getNextWholeHourTarget(nowMs = Date.now(), offsetMs = 0): string {
  const d = new Date(nowMs + offsetMs)
  const nextHour = (d.getHours() + 1) % 24
  return `${pad2(nextHour)}:00:00`
}

export interface TargetCountdownInfo {
  targetLabel: string
  remainingMs: number
  formatted: string
  urgency: 'idle' | 'warn' | 'critical' | 'go'
}

export function getNextTargetCountdown(
  nowMs: number,
  targetTime: string,
  offsetMs = 0,
): TargetCountdownInfo | null {
  const parsed = parseTargetClockTime(targetTime)
  if (!parsed) return null
  const adjustedNow = nowMs + offsetMs
  const nowDate = new Date(adjustedNow)
  const targetDate = new Date(nowDate)
  targetDate.setHours(parsed.hours, parsed.minutes, parsed.seconds, 0)

  let diffMs = targetDate.getTime() - adjustedNow
  const targetLabel = `${pad2(parsed.hours)}:${pad2(parsed.minutes)}:${pad2(parsed.seconds)}`

  // Within 2 seconds after hitting the exact mark, show GO!
  if (diffMs <= 0 && diffMs >= -2000) {
    return {
      targetLabel,
      remainingMs: 0,
      formatted: '00:00.000',
      urgency: 'go',
    }
  }

  if (diffMs < -2000) {
    targetDate.setDate(targetDate.getDate() + 1)
    diffMs = targetDate.getTime() - adjustedNow
  }

  const totalSec = Math.floor(diffMs / 1000)
  const ms = Math.floor(diffMs % 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const formatted =
    h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}` : `${pad2(m)}:${pad2(s)}.${pad3(ms)}`

  const urgency: TargetCountdownInfo['urgency'] =
    diffMs <= 3000 ? 'critical' : diffMs <= 10_000 ? 'warn' : 'idle'

  return {
    targetLabel,
    remainingMs: diffMs,
    formatted,
    urgency,
  }
}

export function parseDurationExpression(raw: string): number | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text || text.length > 48) return null

  const colonMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (colonMatch) {
    let h = 0
    let m = 0
    let s = 0
    if (colonMatch[3] !== undefined) {
      h = Number(colonMatch[1])
      m = Number(colonMatch[2])
      s = Number(colonMatch[3])
    } else {
      m = Number(colonMatch[1])
      s = Number(colonMatch[2])
    }
    if (m >= 60 || s >= 60) return null
    const totalMs = (h * 3600 + m * 60 + s) * 1000
    return totalMs > 0 && totalMs <= MAX_DURATION_MS ? totalMs : null
  }

  const tokenRe =
    /(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|h|小时|时|minutes?|mins?|min|m|分钟|分|seconds?|secs?|sec|s|秒)/gi
  let count = 0
  let totalSeconds = 0
  let match = tokenRe.exec(text)
  while (match !== null) {
    const val = Number(match[1])
    const unit = match[2].toLowerCase()
    if (!Number.isFinite(val) || val < 0) return null
    if (unit === 'h' || unit.startsWith('hr') || unit.startsWith('hour') || unit === '小时' || unit === '时') {
      totalSeconds += val * 3600
    } else if (unit === 'm' || unit.startsWith('min') || unit === '分钟' || unit === '分') {
      totalSeconds += val * 60
    } else {
      totalSeconds += val
    }
    count += 1
    match = tokenRe.exec(text)
  }

  if (count === 0) return null
  const leftover = text.replace(tokenRe, '').replace(/\s+/g, '')
  if (leftover.length > 0) return null
  const ms = Math.round(totalSeconds * 1000)
  if (ms <= 0 || ms > MAX_DURATION_MS) return null
  return ms
}

export function getTimerRemainingMs(timer: CountdownTimer, now = Date.now()): number {
  if (!timer.running || timer.endAt === null) {
    return Math.max(0, timer.remainingMs)
  }
  return Math.max(0, timer.endAt - now)
}

export function getTimerProgress(timer: CountdownTimer, now = Date.now()): number {
  if (timer.durationMs <= 0) return 0
  const remaining = getTimerRemainingMs(timer, now)
  return Math.min(1, Math.max(0, remaining / timer.durationMs))
}

export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSeconds = clamped === 0 ? 0 : Math.ceil(clamped / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  }
  return `${pad2(minutes)}:${pad2(seconds)}`
}

export function formatStopwatch(ms: number): { main: string; centis: string; full: string } {
  const clamped = Math.max(0, Math.floor(ms))
  const totalCentis = Math.floor(clamped / 10)
  const centis = totalCentis % 100
  const totalSeconds = Math.floor(totalCentis / 100)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  const main = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  const centiStr = pad2(centis)
  return {
    main,
    centis: centiStr,
    full: `${main}.${centiStr}`,
  }
}

export function formatDurationLabel(ms: number, locale: 'zh-CN' | 'en' = 'zh-CN'): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(locale === 'en' ? `${h}h` : `${h}小时`)
  if (m > 0) parts.push(locale === 'en' ? `${m}m` : `${m}分钟`)
  if (s > 0 && h === 0) parts.push(locale === 'en' ? `${s}s` : `${s}秒`)
  return parts.join(locale === 'en' ? ' ' : '')
}

export function computeLapStats(laps: StopwatchLap[]): LapStats {
  if (laps.length === 0) {
    return {
      fastestId: null,
      slowestId: null,
      averageSplitMs: 0,
      fastestMs: null,
      slowestMs: null,
    }
  }
  let fastest = laps[0]
  let slowest = laps[0]
  let sum = 0
  for (const lap of laps) {
    sum += lap.splitMs
    if (lap.splitMs < fastest.splitMs) fastest = lap
    if (lap.splitMs > slowest.splitMs) slowest = lap
  }
  const hasSpread = laps.length >= 2 && fastest.id !== slowest.id
  return {
    fastestId: hasSpread ? fastest.id : null,
    slowestId: hasSpread ? slowest.id : null,
    averageSplitMs: Math.round(sum / laps.length),
    fastestMs: fastest.splitMs,
    slowestMs: slowest.splitMs,
  }
}

export function lapsToCsv(laps: StopwatchLap[]): string {
  const header = 'Lap,Split,Total,SplitMs,TotalMs'
  const rows = laps.map((lap) => {
    const split = formatStopwatch(lap.splitMs).full
    const total = formatStopwatch(lap.totalMs).full
    return `${lap.index},${split},${total},${lap.splitMs},${lap.totalMs}`
  })
  return [header, ...rows].join('\n')
}

export function playChime(kind: 'complete' | 'tick' = 'complete'): void {
  if (typeof window === 'undefined') return
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  try {
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const notes = kind === 'complete' ? [523.25, 659.25, 783.99, 1046.5] : [880]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.13)
      gain.gain.setValueAtTime(0.0001, now + idx * 0.13)
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.13 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.13 + (kind === 'complete' ? 0.42 : 0.1))
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.13)
      osc.stop(now + idx * 0.13 + (kind === 'complete' ? 0.45 : 0.12))
    })
    window.setTimeout(() => {
      void ctx.close().catch(() => {})
    }, 1400)
  } catch {
    // ignore headless/audio policy errors
  }
}
