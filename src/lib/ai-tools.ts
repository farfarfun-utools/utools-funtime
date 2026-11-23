import { calculateTimeDiff, offsetDateTime, type DateOffsetInput } from './calc'
import {
  convertTimezoneDateTime,
  DEFAULT_PINNED_ZONES,
  getCityClockSnapshot,
  resolveTimeZone,
} from './worldclock'

export function worldClockNowTool(params: unknown) {
  const now = new Date()
  let queries: string[] = [...DEFAULT_PINNED_ZONES]

  if (params !== undefined && params !== null) {
    if (typeof params !== 'object') {
      return { ok: false as const, error: 'Parameters must be an object' }
    }
    const rec = params as Record<string, unknown>
    if (rec.timezones !== undefined) {
      if (!Array.isArray(rec.timezones) || rec.timezones.length === 0 || rec.timezones.length > 20) {
        return { ok: false as const, error: '"timezones" must be a non-empty array of up to 20 timezone strings' }
      }
      if (!rec.timezones.every((item) => typeof item === 'string' && item.trim().length > 0)) {
        return { ok: false as const, error: 'Each item in "timezones" must be a non-empty string' }
      }
      queries = rec.timezones as string[]
    }
  }

  const results: Array<{
    query: string
    timeZone: string
    city: string
    localTime: string
    date: string
    weekday: string
    utcOffset: string
    isDaytime: boolean
    workStatus: string
  }> = []
  const unknown: string[] = []

  for (const q of queries) {
    const resolved = resolveTimeZone(q)
    if (!resolved) {
      unknown.push(q)
      continue
    }
    const snap = getCityClockSnapshot(resolved.timeZone, now, 'en')
    results.push({
      query: q,
      timeZone: snap.timeZone,
      city: snap.nameEn,
      localTime: snap.parts.timeStr,
      date: snap.parts.dateStr,
      weekday: snap.parts.weekday,
      utcOffset: snap.utcOffsetStr,
      isDaytime: snap.parts.isDaytime,
      workStatus: snap.parts.workStatus,
    })
  }

  if (results.length === 0) {
    return { ok: false as const, error: `No valid timezones found: ${unknown.join(', ')}` }
  }

  return {
    ok: true as const,
    isoUtc: now.toISOString(),
    unixSeconds: Math.floor(now.getTime() / 1000),
    clocks: results,
    ...(unknown.length > 0 ? { unknown } : {}),
  }
}

export function convertTimezoneTool(params: unknown) {
  if (!params || typeof params !== 'object') {
    return { ok: false as const, error: 'Parameters must be an object with "datetime", "from", and "to"' }
  }
  const rec = params as Record<string, unknown>
  if (
    typeof rec.datetime !== 'string' ||
    typeof rec.from !== 'string' ||
    typeof rec.to !== 'string'
  ) {
    return { ok: false as const, error: '"datetime", "from", and "to" must all be strings' }
  }
  const result = convertTimezoneDateTime(rec.datetime, rec.from, rec.to)
  if ('error' in result) {
    return { ok: false as const, error: result.error }
  }
  return {
    ok: true as const,
    ...result,
  }
}

export function calculateTimeDiffTool(params: unknown) {
  if (!params || typeof params !== 'object') {
    return {
      ok: false as const,
      error: 'Parameters must include either ("start" and "end") or ("offset" with optional "base")',
    }
  }
  const rec = params as Record<string, unknown>

  if (typeof rec.start === 'string' && typeof rec.end === 'string') {
    const diff = calculateTimeDiff(rec.start, rec.end)
    if (!diff) {
      return { ok: false as const, error: 'Invalid "start" or "end" date/timestamp value' }
    }
    return {
      ok: true as const,
      mode: 'diff' as const,
      start: rec.start,
      end: rec.end,
      ...diff,
    }
  }

  if (rec.offset && typeof rec.offset === 'object') {
    const baseStr = typeof rec.base === 'string' && rec.base.trim() ? rec.base : new Date().toISOString()
    const op = rec.operation === 'subtract' ? 'subtract' : 'add'
    if (rec.operation !== undefined && rec.operation !== 'add' && rec.operation !== 'subtract') {
      return { ok: false as const, error: '"operation" must be "add" or "subtract"' }
    }
    const offset = rec.offset as DateOffsetInput
    const res = offsetDateTime(baseStr, offset, op)
    if (!res) {
      return { ok: false as const, error: 'Invalid "base" date or numeric "offset" fields' }
    }
    return {
      ok: true as const,
      mode: 'offset' as const,
      base: baseStr,
      operation: op,
      ...res,
    }
  }

  return {
    ok: false as const,
    error: 'Provide either ("start" and "end") or ("offset" object with optional "base")',
  }
}

export function registerFunTimeAiTools(): void {
  if (typeof window === 'undefined' || typeof window.utools?.registerTool !== 'function') {
    return
  }
  window.utools.registerTool('world_clock_now', worldClockNowTool)
  window.utools.registerTool('convert_timezone', convertTimezoneTool)
  window.utools.registerTool('calculate_time_diff', calculateTimeDiffTool)
}
