import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  calculateTimeDiffTool,
  convertTimezoneTool,
  registerFunTimeAiTools,
  worldClockNowTool,
} from '../src/lib/ai-tools'

const manifestPath = path.resolve(process.cwd(), 'utools/plugin.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

describe('FunTime AI / MCP tools and manifest parity', () => {
  it('enforces uTools feature cmds <= 5 rule in plugin.json', () => {
    expect(Array.isArray(manifest.features)).toBe(true)
    expect(manifest.features.length).toBe(5)
    for (const feat of manifest.features) {
      expect(Array.isArray(feat.cmds)).toBe(true)
      expect(feat.cmds.length).toBeGreaterThanOrEqual(1)
      expect(feat.cmds.length).toBeLessThanOrEqual(5)
    }
  })

  it('registers exact tool names matching utools/plugin.json#tools', () => {
    const registered: string[] = []
    const prevUtools = window.utools
    window.utools = {
      registerTool: vi.fn((name: string) => {
        registered.push(name)
      }),
    }
    try {
      registerFunTimeAiTools()
    } finally {
      window.utools = prevUtools
    }
    expect(registered.sort()).toEqual(Object.keys(manifest.tools).sort())
    expect(registered).toEqual(['calculate_time_diff', 'convert_timezone', 'world_clock_now'])
  })

  it('world_clock_now returns live times for valid zones and rejects invalid input', () => {
    const defaultRes = worldClockNowTool({})
    expect(defaultRes.ok).toBe(true)
    if (defaultRes.ok) {
      expect(defaultRes.clocks.length).toBeGreaterThanOrEqual(5)
    }

    const customRes = worldClockNowTool({ timezones: ['Beijing', 'Europe/London', 'America/New_York'] })
    expect(customRes.ok).toBe(true)
    if (customRes.ok) {
      expect(customRes.clocks.map((c) => c.timeZone)).toEqual([
        'Asia/Shanghai',
        'Europe/London',
        'America/New_York',
      ])
    }

    const badRes = worldClockNowTool({ timezones: ['Invalid/Zone'] })
    expect(badRes.ok).toBe(false)
  })

  it('convert_timezone converts timestamps across timezones accurately', () => {
    const res = convertTimezoneTool({
      datetime: '2026-01-15 10:00',
      from: 'Asia/Shanghai',
      to: 'UTC',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.targetDateTime).toBe('2026-01-15 02:00:00')
      expect(res.hourDiff).toBe(-8)
    }

    expect(convertTimezoneTool({ datetime: 'bad', from: 'UTC', to: 'Asia/Tokyo' }).ok).toBe(false)
    expect(convertTimezoneTool(null).ok).toBe(false)
  })

  it('calculate_time_diff handles both diff and offset modes', () => {
    const diffRes = calculateTimeDiffTool({
      start: '2026-03-01T00:00:00Z',
      end: '2026-03-02T12:30:00Z',
    })
    expect(diffRes.ok).toBe(true)
    if (diffRes.ok && diffRes.mode === 'diff') {
      expect(diffRes.days).toBe(1)
      expect(diffRes.hours).toBe(12)
      expect(diffRes.minutes).toBe(30)
    }

    const offRes = calculateTimeDiffTool({
      base: '2026-03-01T00:00:00Z',
      operation: 'add',
      offset: { days: 5, hours: 2 },
    })
    expect(offRes.ok).toBe(true)
    if (offRes.ok && offRes.mode === 'offset') {
      expect(offRes.isoUtc).toBe('2026-03-06T02:00:00.000Z')
    }

    expect(calculateTimeDiffTool({}).ok).toBe(false)
  })
})
