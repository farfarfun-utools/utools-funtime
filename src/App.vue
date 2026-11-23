<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppIcon, { type IconName } from './components/AppIcon.vue'
import CountdownView from './components/views/CountdownView.vue'
import StopwatchView from './components/views/StopwatchView.vue'
import WorldClockView from './components/views/WorldClockView.vue'
import WidgetView from './components/views/WidgetView.vue'
import CalcView from './components/views/CalcView.vue'
import { registerFunTimeAiTools } from './lib/ai-tools'
import { t } from './lib/i18n'
import {
  loadStudioState,
  saveStudioState,
  type ThemeMode,
  type ViewId,
  type WidgetConfig,
  type WidgetDisplayMode,
} from './lib/storage'
import { createSyncBridge, type WidgetLiveSnapshot } from './lib/sync'
import {
  formatCountdown,
  formatDurationLabel,
  getTimerRemainingMs,
  parseDurationExpression,
  playChime,
  type TimerKind,
} from './lib/time'
import { formatUtcOffset, getLocalTimeZone, getUtcOffsetMinutes, getZonedDateParts } from './lib/worldclock'
import logoUrl from '../utools/logo.png'

const state = reactive(loadStudioState())
const nowMs = ref(Date.now())
const sidebarCollapsed = ref(false)
const toastText = ref('')
const widgetOpen = ref(false)

let popupWindow: Window | null = null
let tickHandle: number | null = null
let toastTimer: number | null = null
let unsubscribeEnter: (() => void) | null = null
let syncBridge: ReturnType<typeof createSyncBridge> | null = null

const navItems: Array<{ id: ViewId; icon: IconName; labelKey: Parameters<typeof t>[1] }> = [
  { id: 'countdown', icon: 'timer', labelKey: 'nav.countdown' },
  { id: 'stopwatch', icon: 'stopwatch', labelKey: 'nav.stopwatch' },
  { id: 'worldclock', icon: 'globe', labelKey: 'nav.worldclock' },
  { id: 'widget', icon: 'pip', labelKey: 'nav.widget' },
  { id: 'calc', icon: 'calculator', labelKey: 'nav.calc' },
]

const activeTimer = computed(
  () => state.timers.find((item) => item.id === state.activeTimerId) ?? state.timers[0],
)

const stopwatchElapsedMs = computed(() => {
  if (!state.stopwatch.running || state.stopwatch.startedAt === null) {
    return state.stopwatch.elapsedMs
  }
  return state.stopwatch.elapsedMs + Math.max(0, nowMs.value - state.stopwatch.startedAt)
})

const localTz = getLocalTimeZone()
const localClock = computed(() => {
  const d = new Date(nowMs.value)
  return {
    parts: getZonedDateParts(d, localTz, state.settings.locale),
    utcOffset: formatUtcOffset(getUtcOffsetMinutes(d, localTz)),
  }
})

function showToast(msg: string) {
  toastText.value = msg
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
  }, 2000)
}

function resolveSystemDark(): boolean {
  if (typeof window.utools?.isDarkColors === 'function') {
    try {
      return window.utools.isDarkColors()
    } catch {
      // ignore
    }
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyTheme(mode: ThemeMode) {
  const effective = mode === 'system' ? (resolveSystemDark() ? 'dark' : 'light') : mode
  document.documentElement.dataset.theme = effective
}

function buildSnapshot(): WidgetLiveSnapshot {
  const timer = activeTimer.value
  return {
    updatedAt: Date.now(),
    locale: state.settings.locale,
    widget: { ...state.widget },
    activeTimer: { ...timer },
    stopwatch: {
      elapsedMs: state.stopwatch.elapsedMs,
      running: state.stopwatch.running,
      startedAt: state.stopwatch.startedAt,
      lapCount: state.stopwatch.laps.length,
    },
  }
}

function broadcastSnapshot() {
  syncBridge?.post({ type: 'snapshot', payload: buildSnapshot() })
}

function persist() {
  saveStudioState({
    version: state.version,
    activeView: state.activeView,
    timers: state.timers.map((item) => ({ ...item })),
    activeTimerId: state.activeTimerId,
    pomodoroCycles: state.pomodoroCycles,
    stopwatch: {
      elapsedMs: state.stopwatch.elapsedMs,
      running: state.stopwatch.running,
      startedAt: state.stopwatch.startedAt,
      laps: state.stopwatch.laps.map((l) => ({ ...l })),
    },
    pinnedZones: [...state.pinnedZones],
    widget: { ...state.widget },
    settings: { ...state.settings },
  })
  broadcastSnapshot()
}

watch(
  () => state.settings.theme,
  (mode) => {
    applyTheme(mode)
    persist()
  },
  { immediate: true },
)

watch(
  () => [state.activeView, state.settings.locale, state.settings.soundEnabled],
  () => {
    persist()
  },
)

function checkTimerCompletions(now: number) {
  let changed = false
  for (const timer of state.timers) {
    if (timer.running && timer.endAt !== null && now >= timer.endAt) {
      timer.running = false
      timer.remainingMs = 0
      timer.endAt = null
      changed = true
      if (timer.kind === 'pomodoro') {
        state.pomodoroCycles += 1
      }
      if (state.settings.soundEnabled) {
        playChime('complete')
      }
      const title = state.settings.locale === 'en' ? 'FunTime Timer Done' : '分秒必争 · 计时结束'
      const body =
        state.settings.locale === 'en' ? `"${timer.label}" finished.` : `「${timer.label}」倒计时已完成`
      window.funtime?.notify?.(title, body)
      showToast(body)
    }
  }
  if (changed) {
    persist()
  }
}

function handleTick() {
  const now = Date.now()
  nowMs.value = now
  checkTimerCompletions(now)
  if (window.funtime?.isWidgetOpen) {
    widgetOpen.value = window.funtime.isWidgetOpen()
  } else if (popupWindow && popupWindow.closed) {
    popupWindow = null
    widgetOpen.value = false
  }
}

function toggleTimer(id: string) {
  const timer = state.timers.find((item) => item.id === id)
  if (!timer) return
  const now = Date.now()
  if (timer.running) {
    timer.remainingMs = getTimerRemainingMs(timer, now)
    timer.running = false
    timer.endAt = null
  } else {
    if (timer.remainingMs <= 0) {
      timer.remainingMs = timer.durationMs
    }
    timer.running = true
    timer.endAt = now + timer.remainingMs
  }
  nowMs.value = now
  persist()
}

function resetTimer(id: string) {
  const timer = state.timers.find((item) => item.id === id)
  if (!timer) return
  timer.running = false
  timer.endAt = null
  timer.remainingMs = timer.durationMs
  persist()
}

function addMinute(id: string) {
  const timer = state.timers.find((item) => item.id === id)
  if (!timer) return
  const extra = 60_000
  timer.durationMs += extra
  if (timer.running && timer.endAt !== null) {
    timer.endAt += extra
  } else {
    timer.remainingMs += extra
  }
  persist()
}

function deleteTimer(id: string) {
  if (state.timers.length <= 1) return
  const idx = state.timers.findIndex((item) => item.id === id)
  if (idx < 0) return
  state.timers.splice(idx, 1)
  if (state.activeTimerId === id) {
    state.activeTimerId = state.timers[0].id
  }
  persist()
}

function createTimer(payload: { label: string; durationMs: number; kind: TimerKind; autoStart: boolean }) {
  const now = Date.now()
  const id = `timer-${now}-${Math.random().toString(36).slice(2, 6)}`
  const next = {
    id,
    label: payload.label,
    durationMs: payload.durationMs,
    remainingMs: payload.durationMs,
    running: payload.autoStart,
    endAt: payload.autoStart ? now + payload.durationMs : null,
    kind: payload.kind,
  }
  state.timers.unshift(next)
  if (state.timers.length > 12) {
    state.timers.pop()
  }
  state.activeTimerId = id
  nowMs.value = now
  persist()
}

function applyPomodoro(payload: { kind: TimerKind; durationMs: number; label: string }) {
  const timer = activeTimer.value
  timer.kind = payload.kind
  timer.label = payload.label
  timer.durationMs = payload.durationMs
  timer.remainingMs = payload.durationMs
  timer.running = false
  timer.endAt = null
  persist()
}

function toggleStopwatch() {
  const now = Date.now()
  if (state.stopwatch.running && state.stopwatch.startedAt !== null) {
    state.stopwatch.elapsedMs += Math.max(0, now - state.stopwatch.startedAt)
    state.stopwatch.running = false
    state.stopwatch.startedAt = null
  } else {
    state.stopwatch.running = true
    state.stopwatch.startedAt = now
  }
  nowMs.value = now
  persist()
}

function recordLap() {
  const totalMs = stopwatchElapsedMs.value
  if (totalMs <= 0) return
  const prevTotal = state.stopwatch.laps.length > 0 ? state.stopwatch.laps[state.stopwatch.laps.length - 1].totalMs : 0
  const splitMs = Math.max(0, totalMs - prevTotal)
  state.stopwatch.laps.push({
    id: `lap-${Date.now()}-${state.stopwatch.laps.length + 1}`,
    index: state.stopwatch.laps.length + 1,
    splitMs,
    totalMs,
  })
  persist()
}

function resetStopwatch() {
  state.stopwatch.running = false
  state.stopwatch.startedAt = null
  state.stopwatch.elapsedMs = 0
  state.stopwatch.laps = []
  persist()
}

function addZone(timeZone: string) {
  if (state.pinnedZones.includes(timeZone)) return
  state.pinnedZones.push(timeZone)
  persist()
}

function removeZone(timeZone: string) {
  if (state.pinnedZones.length <= 1) return
  const idx = state.pinnedZones.indexOf(timeZone)
  if (idx >= 0) {
    state.pinnedZones.splice(idx, 1)
    persist()
  }
}

function updateWidgetConfig(patch: Partial<WidgetConfig>) {
  Object.assign(state.widget, patch)
  if (patch.alwaysOnTop !== undefined) {
    window.funtime?.setWidgetAlwaysOnTop?.(patch.alwaysOnTop)
  }
  if (patch.opacity !== undefined) {
    window.funtime?.setWidgetOpacity?.(patch.opacity)
  }
  persist()
}

function openFloatingWidget(preferredMode?: WidgetDisplayMode) {
  if (preferredMode) {
    state.widget.mode = preferredMode
  }
  persist()
  const width = state.widget.style === 'compact' ? 276 : 324
  const height = state.widget.style === 'compact' ? 62 : 132

  if (window.funtime?.openFloatingWidget) {
    const res = window.funtime.openFloatingWidget({
      width,
      height,
      opacity: state.widget.opacity,
      alwaysOnTop: state.widget.alwaysOnTop,
    })
    if (res.ok) {
      widgetOpen.value = true
      showToast(state.settings.locale === 'en' ? 'Floating widget opened' : '已打开桌面置顶悬浮小窗')
      return
    }
  }

  // Browser preview fallback: open widget.html popup
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const popup = window.open(
      './widget.html',
      'funtime-floating-widget',
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=no`,
    )
    if (popup) {
      popupWindow = popup
      widgetOpen.value = true
      showToast(state.settings.locale === 'en' ? 'Opened floating preview window' : '已打开悬浮预览窗口')
      return
    }
  }
  showToast(state.settings.locale === 'en' ? 'Floating widget requires uTools desktop' : '请在 uTools 桌面端中打开悬浮小窗')
}

function closeFloatingWidget() {
  let closed = false
  if (window.funtime?.closeFloatingWidget) {
    closed = window.funtime.closeFloatingWidget()
  }
  if (popupWindow && !popupWindow.closed) {
    popupWindow.close()
    popupWindow = null
    closed = true
  }
  widgetOpen.value = false
  if (closed) {
    showToast(state.settings.locale === 'en' ? 'Floating widget closed' : '已关闭桌面悬浮窗')
  }
}

async function copyText(text: string, label?: string) {
  try {
    if (window.utools?.copyText) {
      window.utools.copyText(text)
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
    const prefix = state.settings.locale === 'en' ? 'Copied' : '已复制'
    showToast(label ? `${prefix} ${label}` : `${prefix} ${text.slice(0, 32)}`)
  } catch {
    showToast(state.settings.locale === 'en' ? 'Copy failed' : '复制失败')
  }
}

function saveExportFile(filename: string, content: string) {
  if (window.funtime?.saveTextFile) {
    const ok = window.funtime.saveTextFile(filename, content)
    if (ok) {
      showToast(state.settings.locale === 'en' ? `Saved ${filename}` : `已导出 ${filename}`)
    }
    return
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  showToast(state.settings.locale === 'en' ? `Exported ${filename}` : `已导出 ${filename}`)
}

function cycleTheme() {
  const order: ThemeMode[] = ['system', 'light', 'dark']
  state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % order.length]
}

function toggleLocale() {
  state.settings.locale = state.settings.locale === 'zh-CN' ? 'en' : 'zh-CN'
}

function handleKeydown(e: KeyboardEvent) {
  const tag = (document.activeElement?.tagName ?? '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return
  if (e.code === 'Space') {
    if (state.activeView === 'countdown') {
      e.preventDefault()
      toggleTimer(activeTimer.value.id)
    } else if (state.activeView === 'stopwatch') {
      e.preventDefault()
      toggleStopwatch()
    }
  } else if ((e.key === 'l' || e.key === 'L') && state.activeView === 'stopwatch') {
    if (state.stopwatch.running || stopwatchElapsedMs.value > 0) {
      e.preventDefault()
      recordLap()
    }
  }
}

onMounted(() => {
  registerFunTimeAiTools()
  window.addEventListener('keydown', handleKeydown)

  syncBridge = createSyncBridge((msg) => {
    if (msg.type === 'request-sync') {
      broadcastSnapshot()
      return
    }
    if (msg.type === 'set-widget-mode') {
      updateWidgetConfig({ mode: msg.mode })
      return
    }
    if (msg.type === 'command') {
      if (msg.command === 'toggle-countdown') toggleTimer(activeTimer.value.id)
      else if (msg.command === 'reset-countdown') resetTimer(activeTimer.value.id)
      else if (msg.command === 'toggle-stopwatch') toggleStopwatch()
      else if (msg.command === 'lap-stopwatch') recordLap()
      else if (msg.command === 'reset-stopwatch') resetStopwatch()
      else if (msg.command === 'close-widget') closeFloatingWidget()
    }
  })
  broadcastSnapshot()

  tickHandle = window.setInterval(handleTick, 50)

  if (window.funtime?.onEnter) {
    unsubscribeEnter = window.funtime.onEnter((action) => {
      if (action.code === 'time-stopwatch') {
        state.activeView = 'stopwatch'
        return
      }
      if (action.code === 'time-pomodoro') {
        state.activeView = 'countdown'
        applyPomodoro({
          kind: 'pomodoro',
          durationMs: 25 * 60_000,
          label: state.settings.locale === 'en' ? 'Pomodoro Focus' : '番茄专注',
        })
        return
      }
      if (action.code === 'time-float') {
        state.activeView = 'widget'
        openFloatingWidget()
        return
      }
      if (action.code === 'time-quick' && typeof action.payload === 'string') {
        const ms = parseDurationExpression(action.payload)
        if (ms) {
          state.activeView = 'countdown'
          createTimer({
            label: `${formatDurationLabel(ms, state.settings.locale)}`,
            durationMs: ms,
            kind: 'custom',
            autoStart: true,
          })
        }
      }
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  unsubscribeEnter?.()
  syncBridge?.close()
  if (tickHandle !== null) window.clearInterval(tickHandle)
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="studio-shell">
    <!-- Left Flat Navigation Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="brand-row">
        <img :src="logoUrl" alt="FunTime" class="brand-logo" />
        <div v-if="!sidebarCollapsed" class="brand-text">
          <div class="brand-title">{{ t(state.settings.locale, 'app.name') }}</div>
          <div class="brand-sub">{{ t(state.settings.locale, 'app.subtitle') }}</div>
        </div>
      </div>

      <div v-if="!sidebarCollapsed" class="nav-label">
        {{ t(state.settings.locale, 'nav.section') }}
      </div>

      <nav class="nav-list" :aria-label="t(state.settings.locale, 'nav.section')">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="nav-item"
          :class="{ active: state.activeView === item.id }"
          :data-testid="`nav-${item.id}`"
          :title="t(state.settings.locale, item.labelKey)"
          @click="state.activeView = item.id"
        >
          <AppIcon :name="item.icon" :size="15" />
          <span v-if="!sidebarCollapsed" class="nav-text">
            {{ t(state.settings.locale, item.labelKey) }}
          </span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          data-testid="theme-btn"
          :title="state.settings.theme"
          @click="cycleTheme"
        >
          <AppIcon
            :name="
              state.settings.theme === 'dark'
                ? 'moon'
                : state.settings.theme === 'light'
                  ? 'sun'
                  : 'monitor'
            "
            :size="14"
          />
        </button>

        <button
          v-if="!sidebarCollapsed"
          type="button"
          class="btn btn-ghost btn-icon"
          :title="state.settings.soundEnabled ? 'Sound On' : 'Muted'"
          @click="state.settings.soundEnabled = !state.settings.soundEnabled"
        >
          <AppIcon :name="state.settings.soundEnabled ? 'bell' : 'bell-off'" :size="14" />
        </button>

        <button
          v-if="!sidebarCollapsed"
          type="button"
          class="btn btn-ghost btn-sm mono"
          data-testid="locale-btn"
          @click="toggleLocale"
        >
          {{ state.settings.locale === 'zh-CN' ? 'EN' : '中' }}
        </button>

        <button
          type="button"
          class="btn btn-ghost btn-icon"
          :title="sidebarCollapsed ? 'Expand' : 'Collapse'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <AppIcon name="panel-left" :size="14" />
        </button>
      </div>
    </aside>

    <!-- Main Workspace Column -->
    <div class="workspace-col">
      <!-- Slim Chronometer Topbar -->
      <header class="topbar">
        <div class="live-clock-pill">
          <AppIcon name="clock" :size="14" class="clock-accent" />
          <span class="top-time mono">{{ localClock.parts.timeStr }}</span>
          <span class="top-meta mono">
            {{ localClock.parts.dateStr }} {{ localClock.parts.weekday }} · {{ localClock.utcOffset }}
          </span>
        </div>

        <div class="topbar-actions">
          <span v-if="activeTimer.running" class="pill pill-ok mono hide-narrow">
            ⏱ {{ formatCountdown(getTimerRemainingMs(activeTimer, nowMs)) }}
          </span>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            data-testid="topbar-float-btn"
            @click="
              openFloatingWidget(
                state.activeView === 'stopwatch'
                  ? 'stopwatch'
                  : state.activeView === 'worldclock'
                    ? 'dual'
                    : 'countdown',
              )
            "
          >
            <AppIcon name="pip" :size="13" />
            <span class="hide-narrow">{{ t(state.settings.locale, 'action.floatWindow') }}</span>
          </button>
        </div>
      </header>

      <!-- Active View Stage -->
      <main class="main-stage">
        <CountdownView
          v-if="state.activeView === 'countdown'"
          :timers="state.timers"
          :active-timer-id="state.activeTimerId"
          :pomodoro-cycles="state.pomodoroCycles"
          :now-ms="nowMs"
          :locale="state.settings.locale"
          @select-timer="(id) => { state.activeTimerId = id; persist() }"
          @toggle-timer="toggleTimer"
          @reset-timer="resetTimer"
          @add-minute="addMinute"
          @delete-timer="deleteTimer"
          @create-timer="createTimer"
          @apply-pomodoro="applyPomodoro"
          @open-float="openFloatingWidget('countdown')"
        />

        <StopwatchView
          v-else-if="state.activeView === 'stopwatch'"
          :elapsed-ms="stopwatchElapsedMs"
          :running="state.stopwatch.running"
          :laps="state.stopwatch.laps"
          :locale="state.settings.locale"
          @toggle="toggleStopwatch"
          @lap="recordLap"
          @reset="resetStopwatch"
          @open-float="openFloatingWidget('stopwatch')"
          @copy="copyText"
          @export-csv="saveExportFile"
        />

        <WorldClockView
          v-else-if="state.activeView === 'worldclock'"
          :pinned-zones="state.pinnedZones"
          :now-ms="nowMs"
          :locale="state.settings.locale"
          @add-zone="addZone"
          @remove-zone="removeZone"
          @copy="copyText"
        />

        <WidgetView
          v-else-if="state.activeView === 'widget'"
          :config="state.widget"
          :widget-open="widgetOpen"
          :active-timer="activeTimer"
          :stopwatch-elapsed-ms="stopwatchElapsedMs"
          :stopwatch-running="state.stopwatch.running"
          :now-ms="nowMs"
          :locale="state.settings.locale"
          @update:config="updateWidgetConfig"
          @open-widget="openFloatingWidget()"
          @close-widget="closeFloatingWidget"
          @toggle-countdown="toggleTimer(activeTimer.id)"
          @reset-countdown="resetTimer(activeTimer.id)"
          @toggle-stopwatch="toggleStopwatch"
          @reset-stopwatch="resetStopwatch"
        />

        <CalcView
          v-else
          :locale="state.settings.locale"
          @copy="copyText"
        />
      </main>

      <!-- Slim Status Bar -->
      <footer class="statusbar">
        <span class="status-left">
          <span class="status-dot" />
          {{ t(state.settings.locale, 'status.offline') }}
        </span>
        <span v-if="toastText" class="status-toast">
          <AppIcon name="check" :size="12" />
          {{ toastText }}
        </span>
        <span v-else class="status-right mono">
          {{ state.timers.length }} {{ state.settings.locale === 'en' ? 'timers' : '计时' }} ·
          {{ state.pinnedZones.length }} {{ state.settings.locale === 'en' ? 'cities' : '城市' }}
        </span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.studio-shell {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-app);
}

.sidebar {
  width: 152px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 8px 8px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  transition: width 0.16s ease;
}

.sidebar.collapsed {
  width: 54px;
  align-items: center;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 10px;
}

.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  flex-shrink: 0;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 10.5px;
  color: var(--text-muted);
}

.nav-label {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  width: 100%;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 33px;
  padding: 0 9px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  width: 100%;
  text-align: left;
  transition: background 0.14s, color 0.14s;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-active);
  color: var(--accent);
  font-weight: 600;
}

.nav-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  width: 100%;
}

.sidebar.collapsed .sidebar-footer {
  flex-direction: column;
}

.workspace-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.live-clock-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.clock-accent {
  color: var(--accent);
  flex-shrink: 0;
}

.top-time {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.top-meta {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.main-stage {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}

.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  padding: 0 12px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.status-left {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.status-toast {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 640px) {
  .sidebar {
    width: 50px;
    align-items: center;
    padding: 8px 4px;
  }
  .brand-text,
  .nav-label,
  .nav-text,
  .top-meta,
  .hide-narrow {
    display: none;
  }
  .nav-item {
    justify-content: center;
    padding: 0;
  }
  .sidebar-footer {
    flex-direction: column;
  }
  .main-stage {
    padding: 8px;
  }
}
</style>
