import { pad2 } from './time'

export interface TimeDiffResult {
  direction: 'forward' | 'backward' | 'same'
  totalMs: number
  totalSeconds: number
  totalMinutes: number
  totalHours: number
  days: number
  hours: number
  minutes: number
  seconds: number
  formattedZh: string
  formattedEn: string
}

export interface DateOffsetInput {
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
}

export interface DateOffsetResult {
  targetLocal: string
  isoUtc: string
  unixSeconds: number
  unixMilliseconds: number
  deltaMs: number
}

export function parseFlexibleTimestamp(raw: string): Date | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null

  if (/^-?\d{9,13}$/.test(text)) {
    const num = Number(text)
    if (!Number.isFinite(num)) return null
    const ms = text.replace('-', '').length <= 10 ? num * 1000 : num
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text) ? text.replace(/\s+/, 'T') : text
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

export function toLocalDateTimeInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export function calculateTimeDiff(startRaw: string, endRaw: string): TimeDiffResult | null {
  const start = parseFlexibleTimestamp(startRaw)
  const end = parseFlexibleTimestamp(endRaw)
  if (!start || !end) return null

  const signedMs = end.getTime() - start.getTime()
  const direction = signedMs > 0 ? 'forward' : signedMs < 0 ? 'backward' : 'same'
  const totalMs = Math.abs(signedMs)
  const totalSeconds = Math.floor(totalMs / 1000)
  const totalMinutes = Number((totalMs / 60_000).toFixed(2))
  const totalHours = Number((totalMs / 3_600_000).toFixed(2))

  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const formattedZh = `${days} 天 ${hours} 小时 ${minutes} 分钟 ${seconds} 秒`
  const formattedEn = `${days}d ${hours}h ${minutes}m ${seconds}s`

  return {
    direction,
    totalMs,
    totalSeconds,
    totalMinutes,
    totalHours,
    days,
    hours,
    minutes,
    seconds,
    formattedZh,
    formattedEn,
  }
}

export function offsetDateTime(
  baseRaw: string,
  offset: DateOffsetInput,
  operation: 'add' | 'subtract' = 'add',
): DateOffsetResult | null {
  const base = parseFlexibleTimestamp(baseRaw)
  if (!base) return null
  const days = Number(offset.days ?? 0)
  const hours = Number(offset.hours ?? 0)
  const minutes = Number(offset.minutes ?? 0)
  const seconds = Number(offset.seconds ?? 0)
  if (![days, hours, minutes, seconds].every(Number.isFinite)) return null

  const sign = operation === 'subtract' ? -1 : 1
  const deltaMs = sign * Math.round((((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000)
  const target = new Date(base.getTime() + deltaMs)
  if (Number.isNaN(target.getTime())) return null

  return {
    targetLocal: formatLocalDateTime(target),
    isoUtc: target.toISOString(),
    unixSeconds: Math.floor(target.getTime() / 1000),
    unixMilliseconds: target.getTime(),
    deltaMs,
  }
}
