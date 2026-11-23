'use strict'

const fs = require('node:fs')
const path = require('node:path')

let floatingWin = null

function clamp(val, min, max, fallback) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function buildWidgetWindowConfig(options) {
  const opts = options && typeof options === 'object' ? options : {}
  const width = Math.round(clamp(opts.width, 200, 520, 316))
  const height = Math.round(clamp(opts.height, 56, 260, 128))
  const opacity = clamp(opts.opacity, 0.4, 1, 0.96)
  const alwaysOnTop = opts.alwaysOnTop !== false
  return {
    width,
    height,
    opacity,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop,
    skipTaskbar: false,
    webPreferences: {
      preload: 'preload.js',
    },
  }
}

function parseDurationExpression(raw) {
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
    return totalMs > 0 ? totalMs : null
  }

  const tokenRe = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|h|小时|时|minutes?|mins?|min|m|分钟|分|seconds?|secs?|sec|s|秒)/gi
  let matchedLength = 0
  let totalSeconds = 0
  let match = tokenRe.exec(text)
  while (match !== null) {
    const num = Number(match[1])
    const unit = match[2].toLowerCase()
    if (!Number.isFinite(num) || num < 0) return null
    if (unit === 'h' || unit.startsWith('hr') || unit.startsWith('hour') || unit === '小时' || unit === '时') {
      totalSeconds += num * 3600
    } else if (unit === 'm' || unit.startsWith('min') || unit === '分钟' || unit === '分') {
      totalSeconds += num * 60
    } else {
      totalSeconds += num
    }
    matchedLength += match[0].length
    match = tokenRe.exec(text)
  }

  const stripped = text.replace(/\s+/g, '')
  const matchedNoSpace = text
    .replace(tokenRe, '')
    .replace(/\s+/g, '')
  if (matchedLength === 0 || stripped.length === 0 || matchedNoSpace.length > 0) {
    return null
  }
  const ms = Math.round(totalSeconds * 1000)
  if (ms <= 0 || ms > 999 * 3600 * 1000) return null
  return ms
}

function isWindowAlive(win) {
  if (!win) return false
  if (typeof win.isDestroyed === 'function') {
    try {
      return !win.isDestroyed()
    } catch {
      return false
    }
  }
  return true
}

function openFloatingWidget(options) {
  if (typeof utools === 'undefined' || typeof utools.createBrowserWindow !== 'function') {
    return { ok: false, mode: 'unsupported' }
  }
  const config = buildWidgetWindowConfig(options)
  if (isWindowAlive(floatingWin)) {
    try {
      if (typeof floatingWin.setSize === 'function') {
        floatingWin.setSize(config.width, config.height)
      }
      if (typeof floatingWin.setOpacity === 'function') {
        floatingWin.setOpacity(config.opacity)
      }
      if (typeof floatingWin.setAlwaysOnTop === 'function') {
        floatingWin.setAlwaysOnTop(config.alwaysOnTop)
      }
      if (typeof floatingWin.show === 'function') floatingWin.show()
      if (typeof floatingWin.focus === 'function') floatingWin.focus()
      return { ok: true, mode: 'utools' }
    } catch {
      floatingWin = null
    }
  }

  const win = utools.createBrowserWindow(
    'dist/widget.html',
    {
      width: config.width,
      height: config.height,
      frame: config.frame,
      transparent: config.transparent,
      resizable: config.resizable,
      alwaysOnTop: config.alwaysOnTop,
      skipTaskbar: config.skipTaskbar,
      webPreferences: config.webPreferences,
    },
    () => {
      try {
        if (typeof win.setOpacity === 'function') {
          win.setOpacity(config.opacity)
        }
        if (typeof win.show === 'function') {
          win.show()
        }
      } catch {
        // ignore window init errors
      }
    },
  )

  if (!win) {
    return { ok: false, mode: 'unsupported' }
  }

  floatingWin = win
  if (typeof win.setOpacity === 'function') {
    try {
      win.setOpacity(config.opacity)
    } catch {
      // ignore
    }
  }
  if (typeof win.on === 'function') {
    win.on('closed', () => {
      if (floatingWin === win) {
        floatingWin = null
      }
    })
  }
  return { ok: true, mode: 'utools' }
}

function closeFloatingWidget() {
  if (!isWindowAlive(floatingWin)) {
    floatingWin = null
    return false
  }
  const target = floatingWin
  floatingWin = null
  try {
    if (typeof target.close === 'function') {
      target.close()
      return true
    }
    if (typeof target.destroy === 'function') {
      target.destroy()
      return true
    }
  } catch {
    return false
  }
  return false
}

function setWidgetAlwaysOnTop(flag) {
  if (!isWindowAlive(floatingWin)) return false
  if (typeof floatingWin.setAlwaysOnTop !== 'function') return false
  try {
    floatingWin.setAlwaysOnTop(Boolean(flag))
    return true
  } catch {
    return false
  }
}

function setWidgetOpacity(opacity) {
  if (!isWindowAlive(floatingWin)) return false
  if (typeof floatingWin.setOpacity !== 'function') return false
  try {
    floatingWin.setOpacity(clamp(opacity, 0.4, 1, 0.96))
    return true
  } catch {
    return false
  }
}

function isWidgetOpen() {
  if (!isWindowAlive(floatingWin)) {
    floatingWin = null
    return false
  }
  return true
}

function notify(title, body) {
  const text = [title, body].filter((part) => typeof part === 'string' && part.trim()).join(' · ')
  if (!text) return false
  if (typeof utools !== 'undefined' && typeof utools.showNotification === 'function') {
    try {
      utools.showNotification(text)
      return true
    } catch {
      return false
    }
  }
  return false
}

function saveTextFile(defaultName, content) {
  if (typeof content !== 'string') throw new Error('Invalid file content')
  if (typeof utools === 'undefined' || typeof utools.showSaveDialog !== 'function') {
    return false
  }
  const safeName = String(defaultName || 'funtime-export.csv').replace(/[\\/:*?"<>|]/g, '_')
  const target = utools.showSaveDialog({
    title: '导出计时记录',
    defaultPath: safeName,
  })
  if (!target) return false
  fs.writeFileSync(path.resolve(target), content, 'utf8')
  return true
}

let pendingEnter = null
const enterListeners = new Set()

if (typeof utools !== 'undefined' && typeof utools.onPluginEnter === 'function') {
  utools.onPluginEnter((action) => {
    pendingEnter = action
    for (const cb of enterListeners) {
      try {
        cb(action)
      } catch {
        // ignore listener errors
      }
    }
  })
}

function onEnter(callback) {
  if (typeof callback !== 'function') return () => {}
  enterListeners.add(callback)
  if (pendingEnter) {
    const queued = pendingEnter
    pendingEnter = null
    queueMicrotask(() => callback(queued))
  }
  return () => {
    enterListeners.delete(callback)
  }
}

const api = {
  openFloatingWidget,
  closeFloatingWidget,
  setWidgetAlwaysOnTop,
  setWidgetOpacity,
  isWidgetOpen,
  notify,
  saveTextFile,
  onEnter,
}

if (typeof window !== 'undefined') {
  window.funtime = api
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ...api,
    buildWidgetWindowConfig,
    parseDurationExpression,
  }
}
