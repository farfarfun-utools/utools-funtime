import { pad2 } from './time'

export interface WorldCity {
  timeZone: string
  nameZh: string
  nameEn: string
  regionZh: string
  regionEn: string
  code: string
  aliases: string[]
}

export const WORLD_CITIES: WorldCity[] = [
  { timeZone: 'Asia/Shanghai', nameZh: '北京 / 上海', nameEn: 'Beijing / Shanghai', regionZh: '中国', regionEn: 'China', code: 'CST', aliases: ['beijing', 'shanghai', 'china', '北京', '上海', '中国', 'cst', 'bjs', 'sha'] },
  { timeZone: 'Asia/Hong_Kong', nameZh: '香港', nameEn: 'Hong Kong', regionZh: '中国香港', regionEn: 'Hong Kong', code: 'HKT', aliases: ['hongkong', 'hong kong', 'hk', '香港', 'hkt'] },
  { timeZone: 'Asia/Taipei', nameZh: '台北', nameEn: 'Taipei', regionZh: '中国台湾', regionEn: 'Taiwan', code: 'CST', aliases: ['taipei', 'taiwan', '台北', '台湾'] },
  { timeZone: 'Asia/Tokyo', nameZh: '东京', nameEn: 'Tokyo', regionZh: '日本', regionEn: 'Japan', code: 'JST', aliases: ['tokyo', 'japan', '东京', '日本', 'jst'] },
  { timeZone: 'Asia/Seoul', nameZh: '首尔', nameEn: 'Seoul', regionZh: '韩国', regionEn: 'South Korea', code: 'KST', aliases: ['seoul', 'korea', '首尔', '韩国', 'kst'] },
  { timeZone: 'Asia/Singapore', nameZh: '新加坡', nameEn: 'Singapore', regionZh: '新加坡', regionEn: 'Singapore', code: 'SGT', aliases: ['singapore', 'sg', '新加坡', 'sgt'] },
  { timeZone: 'Asia/Bangkok', nameZh: '曼谷', nameEn: 'Bangkok', regionZh: '泰国', regionEn: 'Thailand', code: 'ICT', aliases: ['bangkok', 'thailand', '曼谷', '泰国'] },
  { timeZone: 'Asia/Kolkata', nameZh: '孟买 / 新德里', nameEn: 'Mumbai / Delhi', regionZh: '印度', regionEn: 'India', code: 'IST', aliases: ['mumbai', 'delhi', 'india', 'kolkata', '孟买', '新德里', '印度', 'ist'] },
  { timeZone: 'Asia/Dubai', nameZh: '迪拜', nameEn: 'Dubai', regionZh: '阿联酋', regionEn: 'UAE', code: 'GST', aliases: ['dubai', 'uae', '迪拜', '阿联酋'] },
  { timeZone: 'Australia/Sydney', nameZh: '悉尼', nameEn: 'Sydney', regionZh: '澳大利亚', regionEn: 'Australia', code: 'AET', aliases: ['sydney', 'australia', '悉尼', '澳大利亚'] },
  { timeZone: 'Australia/Melbourne', nameZh: '墨尔本', nameEn: 'Melbourne', regionZh: '澳大利亚', regionEn: 'Australia', code: 'AET', aliases: ['melbourne', '墨尔本'] },
  { timeZone: 'Pacific/Auckland', nameZh: '奥克兰', nameEn: 'Auckland', regionZh: '新西兰', regionEn: 'New Zealand', code: 'NZT', aliases: ['auckland', 'nz', '奥克兰', '新西兰'] },
  { timeZone: 'Europe/London', nameZh: '伦敦', nameEn: 'London', regionZh: '英国', regionEn: 'UK', code: 'GMT', aliases: ['london', 'uk', 'britain', '伦敦', '英国', 'bst'] },
  { timeZone: 'Europe/Paris', nameZh: '巴黎', nameEn: 'Paris', regionZh: '法国', regionEn: 'France', code: 'CET', aliases: ['paris', 'france', '巴黎', '法国', 'cet'] },
  { timeZone: 'Europe/Berlin', nameZh: '柏林', nameEn: 'Berlin', regionZh: '德国', regionEn: 'Germany', code: 'CET', aliases: ['berlin', 'germany', '柏林', '德国'] },
  { timeZone: 'Europe/Zurich', nameZh: '苏黎世', nameEn: 'Zurich', regionZh: '瑞士', regionEn: 'Switzerland', code: 'CET', aliases: ['zurich', 'switzerland', '苏黎世', '瑞士'] },
  { timeZone: 'Europe/Amsterdam', nameZh: '阿姆斯特丹', nameEn: 'Amsterdam', regionZh: '荷兰', regionEn: 'Netherlands', code: 'CET', aliases: ['amsterdam', 'netherlands', '阿姆斯特丹', '荷兰'] },
  { timeZone: 'Europe/Madrid', nameZh: '马德里', nameEn: 'Madrid', regionZh: '西班牙', regionEn: 'Spain', code: 'CET', aliases: ['madrid', 'spain', '马德里', '西班牙'] },
  { timeZone: 'Europe/Moscow', nameZh: '莫斯科', nameEn: 'Moscow', regionZh: '俄罗斯', regionEn: 'Russia', code: 'MSK', aliases: ['moscow', 'russia', '莫斯科', '俄罗斯', 'msk'] },
  { timeZone: 'Africa/Cairo', nameZh: '开罗', nameEn: 'Cairo', regionZh: '埃及', regionEn: 'Egypt', code: 'EET', aliases: ['cairo', 'egypt', '开罗', '埃及'] },
  { timeZone: 'America/New_York', nameZh: '纽约', nameEn: 'New York', regionZh: '美国东部', regionEn: 'US East', code: 'ET', aliases: ['new york', 'nyc', 'newyork', 'est', 'edt', '纽约', '美东'] },
  { timeZone: 'America/Chicago', nameZh: '芝加哥', nameEn: 'Chicago', regionZh: '美国中部', regionEn: 'US Central', code: 'CT', aliases: ['chicago', '芝加哥', '美中'] },
  { timeZone: 'America/Denver', nameZh: '丹佛', nameEn: 'Denver', regionZh: '美国山地', regionEn: 'US Mountain', code: 'MT', aliases: ['denver', '丹佛'] },
  { timeZone: 'America/Los_Angeles', nameZh: '旧金山 / 洛杉矶', nameEn: 'San Francisco', regionZh: '美国西部', regionEn: 'US West', code: 'PT', aliases: ['san francisco', 'sf', 'los angeles', 'la', 'silicon valley', 'pst', 'pdt', '旧金山', '洛杉矶', '美西', '硅谷'] },
  { timeZone: 'America/Toronto', nameZh: '多伦多', nameEn: 'Toronto', regionZh: '加拿大', regionEn: 'Canada', code: 'ET', aliases: ['toronto', 'canada', '多伦多', '加拿大'] },
  { timeZone: 'America/Vancouver', nameZh: '温哥华', nameEn: 'Vancouver', regionZh: '加拿大', regionEn: 'Canada', code: 'PT', aliases: ['vancouver', '温哥华'] },
  { timeZone: 'America/Sao_Paulo', nameZh: '圣保罗', nameEn: 'São Paulo', regionZh: '巴西', regionEn: 'Brazil', code: 'BRT', aliases: ['sao paulo', 'brazil', '圣保罗', '巴西'] },
  { timeZone: 'UTC', nameZh: '协调世界时', nameEn: 'UTC', regionZh: '国际标准', regionEn: 'Universal', code: 'UTC', aliases: ['utc', 'gmt', 'z', 'zulu', '协调世界时', '格林威治'] },
]

export const DEFAULT_PINNED_ZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
]

export type WorkHourStatus = 'work' | 'edge' | 'night'

export interface ZonedDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: string
  timeStr: string
  hmStr: string
  dateStr: string
  isDaytime: boolean
  workStatus: WorkHourStatus
}

export interface CityClockSnapshot {
  timeZone: string
  nameZh: string
  nameEn: string
  regionZh: string
  regionEn: string
  code: string
  parts: ZonedDateParts
  utcOffsetMinutes: number
  utcOffsetStr: string
  relativeOffsetStr: string
  dayDelta: number
}

export interface MeetingPlannerRow {
  timeZone: string
  nameZh: string
  nameEn: string
  code: string
  utcOffsetStr: string
  hour: number
  minute: number
  hmStr: string
  dateStr: string
  dayDelta: number
  workStatus: WorkHourStatus
  isDaytime: boolean
}

export function isValidTimeZone(tz: string): boolean {
  if (typeof tz !== 'string' || !tz.trim()) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz.trim() }).format(new Date(0))
    return true
  } catch {
    return false
  }
}

export function getCityByZone(timeZone: string): WorldCity | undefined {
  return WORLD_CITIES.find((c) => c.timeZone.toLowerCase() === timeZone.toLowerCase())
}

export function resolveTimeZone(query: string): { timeZone: string; city?: WorldCity } | null {
  if (typeof query !== 'string') return null
  const trimmed = query.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()

  const exactCity = WORLD_CITIES.find(
    (c) =>
      c.timeZone.toLowerCase() === lower ||
      c.nameZh.toLowerCase() === lower ||
      c.nameEn.toLowerCase() === lower ||
      c.aliases.some((a) => a.toLowerCase() === lower),
  )
  if (exactCity) return { timeZone: exactCity.timeZone, city: exactCity }

  if (isValidTimeZone(trimmed)) {
    const canonical = new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).resolvedOptions().timeZone
    return { timeZone: canonical, city: getCityByZone(canonical) }
  }

  const partialCity = WORLD_CITIES.find(
    (c) =>
      c.nameZh.toLowerCase().includes(lower) ||
      c.nameEn.toLowerCase().includes(lower) ||
      c.timeZone.toLowerCase().includes(lower) ||
      c.aliases.some((a) => a.toLowerCase().includes(lower)),
  )
  if (partialCity) return { timeZone: partialCity.timeZone, city: partialCity }
  return null
}

export function getWorkHourStatus(hour: number): WorkHourStatus {
  if (hour >= 9 && hour < 18) return 'work'
  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 22)) return 'edge'
  return 'night'
}

export function getZonedDateParts(
  date: Date,
  timeZone: string,
  locale: 'zh-CN' | 'en' = 'zh-CN',
): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour') % 24
  const minute = get('minute')
  const second = get('second')

  const weekday = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    timeZone,
    weekday: 'short',
  }).format(date)

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    timeStr: `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`,
    hmStr: `${pad2(hour)}:${pad2(minute)}`,
    dateStr: `${year}-${pad2(month)}-${pad2(day)}`,
    isDaytime: hour >= 6 && hour < 18,
    workStatus: getWorkHourStatus(hour),
  }
}

export function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const roundedDateMs = Math.floor(date.getTime() / 1000) * 1000
  return Math.round((asUtc - roundedDateMs) / 60_000)
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${pad2(h)}:${pad2(m)}`
}

export function formatRelativeOffset(diffMinutes: number): string {
  if (diffMinutes === 0) return '+0h'
  const sign = diffMinutes > 0 ? '+' : '-'
  const abs = Math.abs(diffMinutes)
  const h = abs / 60
  if (Number.isInteger(h)) {
    return `${sign}${h}h`
  }
  return `${sign}${h.toFixed(1)}h`
}

function compareYmd(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): number {
  const aUtc = Date.UTC(a.year, a.month - 1, a.day)
  const bUtc = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((aUtc - bUtc) / 86_400_000)
}

export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  } catch {
    return 'Asia/Shanghai'
  }
}

export function getCityClockSnapshot(
  timeZone: string,
  date: Date,
  locale: 'zh-CN' | 'en' = 'zh-CN',
  referenceTimeZone = getLocalTimeZone(),
): CityClockSnapshot {
  const city = getCityByZone(timeZone)
  const parts = getZonedDateParts(date, timeZone, locale)
  const refParts = getZonedDateParts(date, referenceTimeZone, locale)
  const utcOffsetMinutes = getUtcOffsetMinutes(date, timeZone)
  const refOffsetMinutes = getUtcOffsetMinutes(date, referenceTimeZone)
  const shortLabel = timeZone.includes('/') ? timeZone.split('/').pop()!.replace(/_/g, ' ') : timeZone

  return {
    timeZone,
    nameZh: city?.nameZh ?? shortLabel,
    nameEn: city?.nameEn ?? shortLabel,
    regionZh: city?.regionZh ?? timeZone,
    regionEn: city?.regionEn ?? timeZone,
    code: city?.code ?? formatUtcOffset(utcOffsetMinutes),
    parts,
    utcOffsetMinutes,
    utcOffsetStr: formatUtcOffset(utcOffsetMinutes),
    relativeOffsetStr: formatRelativeOffset(utcOffsetMinutes - refOffsetMinutes),
    dayDelta: compareYmd(parts, refParts),
  }
}

export function zonedWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  let guess = targetUtc
  for (let i = 0; i < 3; i += 1) {
    const offsetMin = getUtcOffsetMinutes(new Date(guess), timeZone)
    const next = targetUtc - offsetMin * 60_000
    if (Math.abs(next - guess) < 1000) {
      guess = next
      break
    }
    guess = next
  }
  return new Date(guess)
}

export interface TimezoneConversionResult {
  fromTimeZone: string
  toTimeZone: string
  sourceDateTime: string
  targetDateTime: string
  sourceUtcOffset: string
  targetUtcOffset: string
  hourDiff: number
  dayDelta: number
  isoUtc: string
  unixSeconds: number
}

export function convertTimezoneDateTime(
  dateTimeStr: string,
  fromQuery: string,
  toQuery: string,
): TimezoneConversionResult | { error: string } {
  const fromResolved = resolveTimeZone(fromQuery)
  if (!fromResolved) return { error: `Unknown source timezone: "${fromQuery}"` }
  const toResolved = resolveTimeZone(toQuery)
  if (!toResolved) return { error: `Unknown target timezone: "${toQuery}"` }

  const raw = dateTimeStr.trim()
  if (!raw) return { error: 'Empty datetime string' }

  let instant: Date
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) {
      return { error: `Invalid ISO datetime: "${dateTimeStr}"` }
    }
    instant = parsed
  } else {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw)
    if (!m) {
      return { error: `Unsupported datetime format: "${dateTimeStr}". Use YYYY-MM-DD HH:mm[:ss]` }
    }
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    const hour = m[4] !== undefined ? Number(m[4]) : 0
    const minute = m[5] !== undefined ? Number(m[5]) : 0
    const second = m[6] !== undefined ? Number(m[6]) : 0
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
      return { error: `Out-of-range date/time components in "${dateTimeStr}"` }
    }
    instant = zonedWallClockToDate(year, month, day, hour, minute, second, fromResolved.timeZone)
  }

  const srcParts = getZonedDateParts(instant, fromResolved.timeZone)
  const dstParts = getZonedDateParts(instant, toResolved.timeZone)
  const srcOffset = getUtcOffsetMinutes(instant, fromResolved.timeZone)
  const dstOffset = getUtcOffsetMinutes(instant, toResolved.timeZone)

  return {
    fromTimeZone: fromResolved.timeZone,
    toTimeZone: toResolved.timeZone,
    sourceDateTime: `${srcParts.dateStr} ${srcParts.timeStr}`,
    targetDateTime: `${dstParts.dateStr} ${dstParts.timeStr}`,
    sourceUtcOffset: formatUtcOffset(srcOffset),
    targetUtcOffset: formatUtcOffset(dstOffset),
    hourDiff: Number(((dstOffset - srcOffset) / 60).toFixed(2)),
    dayDelta: compareYmd(dstParts, srcParts),
    isoUtc: instant.toISOString(),
    unixSeconds: Math.floor(instant.getTime() / 1000),
  }
}

export function buildMeetingPlannerRows(
  zones: string[],
  baseDate: Date,
  refTimeZone: string,
  refMinutesOfDay: number,
  locale: 'zh-CN' | 'en' = 'zh-CN',
): MeetingPlannerRow[] {
  const refParts = getZonedDateParts(baseDate, refTimeZone, locale)
  const clampedMin = Math.max(0, Math.min(23 * 60 + 30, Math.round(refMinutesOfDay)))
  const refHour = Math.floor(clampedMin / 60)
  const refMinute = clampedMin % 60
  const instant = zonedWallClockToDate(
    refParts.year,
    refParts.month,
    refParts.day,
    refHour,
    refMinute,
    0,
    refTimeZone,
  )
  const anchorParts = getZonedDateParts(instant, refTimeZone, locale)

  return zones.map((tz) => {
    const city = getCityByZone(tz)
    const parts = getZonedDateParts(instant, tz, locale)
    const offset = getUtcOffsetMinutes(instant, tz)
    const shortLabel = tz.includes('/') ? tz.split('/').pop()!.replace(/_/g, ' ') : tz
    return {
      timeZone: tz,
      nameZh: city?.nameZh ?? shortLabel,
      nameEn: city?.nameEn ?? shortLabel,
      code: city?.code ?? formatUtcOffset(offset),
      utcOffsetStr: formatUtcOffset(offset),
      hour: parts.hour,
      minute: parts.minute,
      hmStr: parts.hmStr,
      dateStr: parts.dateStr,
      dayDelta: compareYmd(parts, anchorParts),
      workStatus: parts.workStatus,
      isDaytime: parts.isDaytime,
    }
  })
}

export function formatMeetingScheduleText(rows: MeetingPlannerRow[], locale: 'zh-CN' | 'en' = 'zh-CN'): string {
  const header = locale === 'en' ? 'Cross-Timezone Schedule (FunTime)' : '跨时区会议时间对照（FunTime）'
  const lines = rows.map((r) => {
    const city = locale === 'en' ? r.nameEn : r.nameZh
    const dayTag = r.dayDelta > 0 ? ' (+1d)' : r.dayDelta < 0 ? ' (-1d)' : ''
    return `- ${city} (${r.utcOffsetStr}): ${r.dateStr} ${r.hmStr}${dayTag}`
  })
  return [header, ...lines].join('\n')
}
