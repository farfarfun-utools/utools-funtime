import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { launch } from './cdp.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'docs/screenshots')
const plugin = JSON.parse(fs.readFileSync(path.join(root, 'utools/plugin.json'), 'utf8'))
fs.mkdirSync(out, { recursive: true })

const server = await preview({
  root,
  build: { outDir: 'utools/dist' },
  preview: { host: '127.0.0.1', port: 0, open: false },
})

let browser
try {
  const baseUrl = server.resolvedUrls.local[0]
  browser = await launch({ url: baseUrl })
  const { session } = browser
  const errors = []
  const externalRequests = []

  session.on('Runtime.exceptionThrown', (event) => {
    errors.push(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text)
  })
  session.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') {
      errors.push(args.map((a) => a.value ?? a.description ?? '').join(' '))
    }
  })
  session.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') errors.push(entry.text)
  })
  session.on('Network.requestWillBeSent', ({ request }) => {
    if (/^https?:/.test(request.url) && new URL(request.url).hostname !== '127.0.0.1') {
      externalRequests.push(request.url)
    }
  })

  await session.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ],
  })

  async function setViewport(width, height = plugin.pluginSetting.height) {
    await session.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: false,
    })
  }

  async function raf(times = 2) {
    for (let i = 0; i < times; i += 1) {
      await session.evaluate('new Promise(resolve => requestAnimationFrame(resolve))')
    }
  }

  async function click(selector) {
    const ok = await session.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.click();
      return true;
    })()`)
    assert.equal(ok, true, `找不到元素: ${selector}`)
    await raf(2)
  }

  async function capture(name) {
    await session.evaluate('document.fonts.ready')
    await raf(2)
    const overflow = await session.evaluate('document.documentElement.scrollWidth > window.innerWidth')
    assert.equal(overflow, false, `${name}: 出现横向溢出`)
    const { cssContentSize } = await session.send('Page.getLayoutMetrics')
    assert.ok(
      cssContentSize.height <= plugin.pluginSetting.height,
      `${name}: 页面高度超出 ${plugin.pluginSetting.height}px，实际 ${cssContentSize.height}px`,
    )
    const result = await session.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(result.data, 'base64'))
    process.stdout.write(`${name}.png (${cssContentSize.width} × ${cssContentSize.height})\n`)
  }

  await setViewport(800)
  await browser.navigate()
  await session.waitForExpression('document.querySelector(".countdown-layout") !== null')

  // Seed reproducible showcase state (partial progress ring + realistic stopwatch laps)
  const demoState = {
    version: 1,
    activeView: 'countdown',
    timers: [
      {
        id: 'timer-pomo-1',
        label: '番茄专注 · 深度开发',
        durationMs: 25 * 60_000,
        remainingMs: 18 * 60_000 + 42_000,
        running: false,
        endAt: null,
        kind: 'pomodoro',
      },
      {
        id: 'timer-tea-2',
        label: '手冲咖啡闷蒸',
        durationMs: 3 * 60_000,
        remainingMs: 2 * 60_000 + 15_000,
        running: false,
        endAt: null,
        kind: 'custom',
      },
      {
        id: 'timer-meeting-3',
        label: '跨区周会提醒',
        durationMs: 15 * 60_000,
        remainingMs: 15 * 60_000,
        running: false,
        endAt: null,
        kind: 'custom',
      },
    ],
    activeTimerId: 'timer-pomo-1',
    pomodoroCycles: 4,
    stopwatch: {
      elapsedMs: 142_680,
      running: false,
      startedAt: null,
      laps: [
        { id: 'lap-1', index: 1, splitMs: 34_120, totalMs: 34_120 },
        { id: 'lap-2', index: 2, splitMs: 31_450, totalMs: 65_570 },
        { id: 'lap-3', index: 3, splitMs: 41_890, totalMs: 107_460 },
        { id: 'lap-4', index: 4, splitMs: 35_220, totalMs: 142_680 },
      ],
    },
    pinnedZones: [
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Europe/London',
      'America/New_York',
      'America/Los_Angeles',
      'UTC',
    ],
    widget: {
      style: 'standard',
      theme: 'dark',
      opacity: 0.96,
      mode: 'countdown',
      alwaysOnTop: true,
      dualZoneA: 'Asia/Shanghai',
      dualZoneB: 'America/New_York',
    },
    settings: {
      theme: 'light',
      locale: 'zh-CN',
      soundEnabled: true,
    },
  }

  await session.evaluate(
    `localStorage.setItem("funtime_studio_state_v1", ${JSON.stringify(JSON.stringify(demoState))})`,
  )
  await browser.navigate()
  await session.waitForExpression('document.querySelector(".countdown-layout") !== null')
  await raf(3)

  // 1. Countdown & Pomodoro (Light)
  await capture('home')

  // 2. Stopwatch with sample laps (fastest & slowest highlighted)
  await click('[data-testid="nav-stopwatch"]')
  await session.waitForExpression('document.querySelector(".laps-table") !== null')
  await capture('stopwatch')

  // 3. World Clock & Cross-Timezone Meeting Planner
  await click('[data-testid="nav-worldclock"]')
  await session.waitForExpression('document.querySelector(".planner-card") !== null')
  await capture('worldclock')

  // 4. Floating Widget Control Center & Live Preview
  await click('[data-testid="nav-widget"]')
  await session.waitForExpression('document.querySelector("[data-testid=\\"floating-widget-surface\\"]") !== null')
  await capture('widget')

  // Verify Time Calc view renders cleanly too
  await click('[data-testid="nav-calc"]')
  await session.waitForExpression('document.querySelector("[data-testid=\\"calc-diff-output\\"]") !== null')

  // 5. Dark mode Countdown view
  await click('[data-testid="nav-countdown"]')
  await session.waitForExpression('document.querySelector(".countdown-layout") !== null')
  await click('[data-testid="theme-btn"]') // light -> dark
  await session.waitForExpression('document.documentElement.dataset.theme === "dark"')
  await capture('dark')

  // Verify narrow mobile viewport (375px) has zero horizontal overflow
  await setViewport(375, 720)
  await raf(2)
  const mobileOverflow = await session.evaluate('document.documentElement.scrollWidth > window.innerWidth')
  assert.equal(mobileOverflow, false, '375px 窄屏出现横向溢出')

  // Verify standalone widget.html renders cleanly with zero errors
  await setViewport(324, 132)
  const widgetUrl = new URL('widget.html', baseUrl).href
  await session.send('Page.navigate', { url: widgetUrl })
  await session.waitForExpression('document.querySelector("[data-testid=\\"floating-widget-surface\\"]") !== null')
  await raf(2)

  assert.deepEqual(errors, [], '浏览器运行报错')
  assert.deepEqual(externalRequests, [], '不应请求任何外部网络资源')
  process.stdout.write('FunTime 浏览器检查与 5 张截图全部通过。\n')
} catch (err) {
  if (browser) {
    try {
      const html = await browser.session.evaluate('document.body.innerHTML.slice(0, 400)')
      console.error('[screenshots] body snippet:', html)
    } catch {
      // ignore
    }
  }
  throw err
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
