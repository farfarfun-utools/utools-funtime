import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const preloadPath = path.resolve(process.cwd(), 'utools/preload.js')
const preloadCode = fs.readFileSync(preloadPath, 'utf8')

function loadPreloadSandbox(utoolsMock?: Record<string, unknown>) {
  const windowObj: Record<string, unknown> = {}
  const moduleObj = { exports: {} as Record<string, any> }
  const sandbox: Record<string, unknown> = {
    require: createRequire(preloadPath),
    module: moduleObj,
    exports: moduleObj.exports,
    window: windowObj,
    queueMicrotask,
    console,
  }
  if (utoolsMock) {
    sandbox.utools = utoolsMock
  }
  vm.runInNewContext(preloadCode, sandbox, { filename: preloadPath })
  return { exports: moduleObj.exports, windowObj }
}

describe('utools/preload.js bridge', () => {
  it('opens, reuses, updates, and closes the always-on-top floating widget window', () => {
    let closedHandler: (() => void) | null = null
    let destroyed = false
    const fakeWin = {
      isDestroyed: vi.fn(() => destroyed),
      setSize: vi.fn(),
      setOpacity: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      show: vi.fn(),
      focus: vi.fn(),
      close: vi.fn(() => {
        destroyed = true
        closedHandler?.()
      }),
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'closed') closedHandler = cb
      }),
    }

    const createBrowserWindow = vi.fn((url: string, opts: any, readyCb?: () => void) => {
      readyCb?.()
      return fakeWin
    })
    const showNotification = vi.fn()

    const { exports, windowObj } = loadPreloadSandbox({
      createBrowserWindow,
      showNotification,
    })

    expect(windowObj.funtime).toBeDefined()
    expect(exports.isWidgetOpen()).toBe(false)

    const res1 = exports.openFloatingWidget({ width: 320, height: 130, opacity: 0.9 })
    expect(res1).toEqual({ ok: true, mode: 'utools' })
    expect(createBrowserWindow).toHaveBeenCalledTimes(1)
    expect(createBrowserWindow.mock.calls[0][0]).toBe('dist/widget.html')
    expect(createBrowserWindow.mock.calls[0][1].alwaysOnTop).toBe(true)
    expect(exports.isWidgetOpen()).toBe(true)

    // Calling open again focuses & reuses existing window instead of creating a duplicate
    const res2 = exports.openFloatingWidget({ width: 270, height: 64, opacity: 0.85 })
    expect(res2).toEqual({ ok: true, mode: 'utools' })
    expect(createBrowserWindow).toHaveBeenCalledTimes(1)
    expect(fakeWin.focus).toHaveBeenCalledTimes(1)
    expect(fakeWin.setSize).toHaveBeenCalledWith(270, 64)

    expect(exports.setWidgetAlwaysOnTop(false)).toBe(true)
    expect(fakeWin.setAlwaysOnTop).toHaveBeenLastCalledWith(false)
    expect(exports.setWidgetOpacity(0.75)).toBe(true)
    expect(fakeWin.setOpacity).toHaveBeenLastCalledWith(0.75)

    expect(exports.notify('FunTime', 'Done')).toBe(true)
    expect(showNotification).toHaveBeenCalledWith('FunTime · Done')

    expect(exports.closeFloatingWidget()).toBe(true)
    expect(exports.isWidgetOpen()).toBe(false)
  })

  it('returns unsupported mode gracefully when utools API is unavailable', () => {
    const { exports } = loadPreloadSandbox(undefined)
    expect(exports.openFloatingWidget()).toEqual({ ok: false, mode: 'unsupported' })
    expect(exports.isWidgetOpen()).toBe(false)
    expect(exports.notify('Title', 'Body')).toBe(false)
  })

  it('buffers early onPluginEnter calls until listener subscribes', async () => {
    const callbacks: Array<(action: any) => void> = []
    const { exports } = loadPreloadSandbox({
      onPluginEnter: (cb: (action: any) => void) => {
        callbacks.push(cb)
      },
    })

    expect(callbacks).toHaveLength(1)
    callbacks[0]({ code: 'time-quick', type: 'regex', payload: '5m' })

    const received: any[] = []
    const unsub = exports.onEnter((action: any) => received.push(action))
    await Promise.resolve()
    expect(received).toHaveLength(1)
    expect(received[0].payload).toBe('5m')
    unsub()
  })

  it('clamps widget config and parses durations cleanly', () => {
    const { exports } = loadPreloadSandbox(undefined)
    const cfg = exports.buildWidgetWindowConfig({ width: 999, height: 10, opacity: 0.1 })
    expect(cfg.width).toBe(520)
    expect(cfg.height).toBe(56)
    expect(cfg.opacity).toBe(0.4)
    expect(exports.parseDurationExpression('15分钟')).toBe(15 * 60_000)
    expect(exports.parseDurationExpression('02:30')).toBe(150_000)
  })
})
