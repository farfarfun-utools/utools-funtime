import { describe, expect, it, beforeEach } from 'vitest'
import {
  claimSnipeChimeKey,
  computeLapStats,
  formatClockWithMs,
  formatCountdown,
  formatDurationLabel,
  formatStopwatch,
  getNextTargetCountdown,
  getSnipeHitKey,
  getTimerProgress,
  getTimerRemainingMs,
  lapsToCsv,
  parseDurationExpression,
  parseTargetClockTime,
  resetSnipeChimeTracker,
  type CountdownTimer,
} from '../src/lib/time'
import {
  buildMeetingPlannerRows,
  convertTimezoneDateTime,
  formatMeetingScheduleText,
  formatUtcOffset,
  getCityClockSnapshot,
  getUtcOffsetMinutes,
  isValidTimeZone,
  resolveTimeZone,
  WORLD_CITIES,
} from '../src/lib/worldclock'
import { calculateTimeDiff, offsetDateTime } from '../src/lib/calc'
import { createDefaultState, loadStudioState, saveStudioState } from '../src/lib/storage'

describe('time utilities', () => {
  it('parses natural duration expressions in English, Chinese, and colon syntax', () => {
    expect(parseDurationExpression('5m')).toBe(5 * 60_000)
    expect(parseDurationExpression('1h30m')).toBe(90 * 60_000)
    expect(parseDurationExpression('1h 2m 3s')).toBe((3600 + 120 + 3) * 1000)
    expect(parseDurationExpression('90s')).toBe(90_000)
    expect(parseDurationExpression('0.5h')).toBe(30 * 60_000)
    expect(parseDurationExpression('05:00')).toBe(5 * 60_000)
    expect(parseDurationExpression('1:30:15')).toBe((3600 + 1800 + 15) * 1000)
    expect(parseDurationExpression('25分钟')).toBe(25 * 60_000)
    expect(parseDurationExpression('1小时30分')).toBe(90 * 60_000)
    expect(parseDurationExpression('45秒')).toBe(45_000)

    expect(parseDurationExpression('')).toBeNull()
    expect(parseDurationExpression('0m')).toBeNull()
    expect(parseDurationExpression('abc')).toBeNull()
    expect(parseDurationExpression('10:75')).toBeNull()
    expect(parseDurationExpression('5m foo')).toBeNull()
  })

  it('formats countdown and stopwatch with tabular precision', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(1)).toBe('00:01')
    expect(formatCountdown(65_000)).toBe('01:05')
    expect(formatCountdown(3_661_000)).toBe('01:01:01')

    expect(formatStopwatch(0)).toEqual({ main: '00:00:00', centis: '00', full: '00:00:00.00' })
    expect(formatStopwatch(3_723_450)).toEqual({
      main: '01:02:03',
      centis: '45',
      full: '01:02:03.45',
    })
    expect(formatDurationLabel(90 * 60_000, 'zh-CN')).toBe('1小时30分钟')
    expect(formatDurationLabel(90 * 60_000, 'en')).toBe('1h 30m')
  })

  it('computes countdown remaining time and progress accurately', () => {
    const timer: CountdownTimer = {
      id: 't1',
      label: 'Focus',
      durationMs: 100_000,
      remainingMs: 100_000,
      running: true,
      endAt: 1_050_000,
      kind: 'pomodoro',
    }
    expect(getTimerRemainingMs(timer, 1_000_000)).toBe(50_000)
    expect(getTimerProgress(timer, 1_000_000)).toBeCloseTo(0.5, 4)
    expect(getTimerRemainingMs(timer, 1_100_000)).toBe(0)
  })

  it('computes stopwatch lap statistics and CSV output', () => {
    const laps = [
      { id: 'l1', index: 1, splitMs: 12_500, totalMs: 12_500 },
      { id: 'l2', index: 2, splitMs: 10_200, totalMs: 22_700 },
      { id: 'l3', index: 3, splitMs: 15_800, totalMs: 38_500 },
    ]
    const stats = computeLapStats(laps)
    expect(stats.fastestId).toBe('l2')
    expect(stats.slowestId).toBe('l3')
    expect(stats.averageSplitMs).toBe(Math.round((12_500 + 10_200 + 15_800) / 3))

    const csv = lapsToCsv(laps)
    expect(csv.split('\n')).toHaveLength(4)
    expect(csv).toContain('1,00:00:12.50,00:00:12.50,12500,12500')
  })

  it('formats millisecond snipe clock with offset compensation and target countdown urgency', () => {
    const base = new Date(2026, 10, 23, 19, 59, 57, 250).getTime()
    expect(formatClockWithMs(base, 0)).toEqual({
      hms: '19:59:57',
      ms: '250',
      full: '19:59:57.250',
    })
    expect(formatClockWithMs(base, 150)).toEqual({
      hms: '19:59:57',
      ms: '400',
      full: '19:59:57.400',
    })

    expect(parseTargetClockTime('20:00:00')).toEqual({ hours: 20, minutes: 0, seconds: 0 })
    expect(parseTargetClockTime('09:30')).toEqual({ hours: 9, minutes: 30, seconds: 0 })
    expect(parseTargetClockTime('25:00')).toBeNull()

    const critical = getNextTargetCountdown(base, '20:00:00', 0)
    expect(critical?.urgency).toBe('critical')
    expect(critical?.formatted).toBe('00:02.750')

    const warn = getNextTargetCountdown(new Date(2026, 10, 23, 19, 59, 52, 0).getTime(), '20:00:00', 0)
    expect(warn?.urgency).toBe('warn')

    const go = getNextTargetCountdown(new Date(2026, 10, 23, 20, 0, 0, 500).getTime(), '20:00:00', 0)
    expect(go?.urgency).toBe('go')
    expect(go?.remainingMs).toBe(0)

    // Snipe chime deduplication: only claims once per target hit window
    resetSnipeChimeTracker()
    expect(getSnipeHitKey(base, '20:00:00', 0)).toBeNull()
    const hitKey = getSnipeHitKey(new Date(2026, 10, 23, 20, 0, 0, 250).getTime(), '20:00:00', 0)
    expect(hitKey).toBe('2026-11-23|20:00:00')
    expect(claimSnipeChimeKey(hitKey!)).toBe(true)
    expect(claimSnipeChimeKey(hitKey!)).toBe(false)
    expect(claimSnipeChimeKey('2026-11-23|21:00:00')).toBe(true)
  })
})

describe('world clock and timezone conversion', () => {
  it('provides 28 valid curated global IANA cities', () => {
    expect(WORLD_CITIES).toHaveLength(28)
    for (const city of WORLD_CITIES) {
      expect(isValidTimeZone(city.timeZone)).toBe(true)
    }
    expect(resolveTimeZone('北京')?.timeZone).toBe('Asia/Shanghai')
    expect(resolveTimeZone('NYC')?.timeZone).toBe('America/New_York')
    expect(resolveTimeZone('sf')?.timeZone).toBe('America/Los_Angeles')
    expect(resolveTimeZone('UTC')?.timeZone).toBe('UTC')
    expect(resolveTimeZone('Not/A_Zone')).toBeNull()
  })

  it('computes accurate UTC offsets and converts timezones across DST', () => {
    const summer = new Date('2026-07-15T12:00:00Z')
    expect(getUtcOffsetMinutes(summer, 'Asia/Shanghai')).toBe(480)
    expect(formatUtcOffset(480)).toBe('UTC+08:00')
    expect(formatUtcOffset(-240)).toBe('UTC-04:00')
    expect(getUtcOffsetMinutes(summer, 'America/New_York')).toBe(-240) // EDT

    const conv = convertTimezoneDateTime('2026-07-15 20:00', 'Asia/Shanghai', 'America/New_York')
    expect('error' in conv).toBe(false)
    if (!('error' in conv)) {
      expect(conv.sourceDateTime).toBe('2026-07-15 20:00:00')
      expect(conv.targetDateTime).toBe('2026-07-15 08:00:00')
      expect(conv.hourDiff).toBe(-12)
      expect(conv.dayDelta).toBe(0)
    }

    const snap = getCityClockSnapshot('Asia/Tokyo', summer, 'en', 'Asia/Shanghai')
    expect(snap.relativeOffsetStr).toBe('+1h')
    expect(snap.parts.hmStr).toBe('21:00')
  })

  it('maps cross-timezone meeting planner rows and formatted schedule', () => {
    const base = new Date('2026-06-15T00:00:00Z')
    const rows = buildMeetingPlannerRows(
      ['Asia/Shanghai', 'Europe/London', 'America/New_York'],
      base,
      'Asia/Shanghai',
      21 * 60, // 21:00 Beijing = 14:00 London (BST) = 09:00 New York (EDT)
      'zh-CN',
    )
    expect(rows[0].hmStr).toBe('21:00')
    expect(rows[0].workStatus).toBe('edge')
    expect(rows[1].hmStr).toBe('14:00')
    expect(rows[1].workStatus).toBe('work')
    expect(rows[2].hmStr).toBe('09:00')
    expect(rows[2].workStatus).toBe('work')

    const text = formatMeetingScheduleText(rows, 'zh-CN')
    expect(text).toContain('21:00')
    expect(text).toContain('14:00')
    expect(text).toContain('09:00')
  })
})

describe('date diff, offset calculator, and storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, String(v))
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
        clear: () => {
          store.clear()
        },
      },
    })
  })

  it('calculates exact diff and date offset', () => {
    const diff = calculateTimeDiff('2026-01-01T00:00:00Z', '2026-01-04T05:30:15Z')
    expect(diff).not.toBeNull()
    expect(diff?.days).toBe(3)
    expect(diff?.hours).toBe(5)
    expect(diff?.minutes).toBe(30)
    expect(diff?.seconds).toBe(15)
    expect(diff?.direction).toBe('forward')

    const added = offsetDateTime('2026-01-01T00:00:00Z', { days: 2, hours: 3 }, 'add')
    expect(added?.isoUtc).toBe('2026-01-03T03:00:00.000Z')

    const sub = offsetDateTime('2026-01-03T03:00:00Z', { days: 2, hours: 3 }, 'subtract')
    expect(sub?.isoUtc).toBe('2026-01-01T00:00:00.000Z')
  })

  it('persists and recovers state gracefully from corrupted storage', () => {
    const state = createDefaultState()
    state.activeView = 'worldclock'
    state.pomodoroCycles = 7
    saveStudioState(state)

    const loaded = loadStudioState()
    expect(loaded.activeView).toBe('worldclock')
    expect(loaded.pomodoroCycles).toBe(7)

    localStorage.setItem('funtime_studio_state_v1', '{broken json')
    const recovered = loadStudioState()
    expect(recovered.timers.length).toBeGreaterThanOrEqual(3)
    expect(recovered.activeView).toBe('countdown')
  })
})
