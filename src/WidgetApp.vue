<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import FloatingWidgetPreview from './components/FloatingWidgetPreview.vue'
import { createDefaultState, type WidgetDisplayMode } from './lib/storage'
import { createSyncBridge, readLiveSnapshot, type WidgetLiveSnapshot } from './lib/sync'
import { claimSnipeChimeKey, getSnipeHitKey, getTimerRemainingMs, playChime } from './lib/time'

function initialSnapshot(): WidgetLiveSnapshot {
  const saved = readLiveSnapshot()
  if (saved) return saved
  const fallback = createDefaultState()
  return {
    updatedAt: Date.now(),
    locale: fallback.settings.locale,
    widget: { ...fallback.widget },
    activeTimer: { ...fallback.timers[0] },
    stopwatch: {
      elapsedMs: 0,
      running: false,
      startedAt: null,
      lapCount: 0,
    },
  }
}

const snapshot = reactive<WidgetLiveSnapshot>(initialSnapshot())
const nowMs = ref(Date.now())
let rafHandle: number | null = null
let fallbackTimer: number | null = null
let bridge: ReturnType<typeof createSyncBridge> | null = null

const stopwatchElapsedMs = computed(() => {
  if (!snapshot.stopwatch.running || snapshot.stopwatch.startedAt === null) {
    return snapshot.stopwatch.elapsedMs
  }
  return snapshot.stopwatch.elapsedMs + Math.max(0, nowMs.value - snapshot.stopwatch.startedAt)
})

function applySnapshot(next: WidgetLiveSnapshot) {
  snapshot.updatedAt = next.updatedAt
  snapshot.locale = next.locale
  if (next.soundEnabled !== undefined) {
    snapshot.soundEnabled = next.soundEnabled
  }
  Object.assign(snapshot.widget, next.widget)
  Object.assign(snapshot.activeTimer, next.activeTimer)
  Object.assign(snapshot.stopwatch, next.stopwatch)
}

function handleToggleCountdown() {
  bridge?.post({ type: 'command', command: 'toggle-countdown' })
  // Optimistic update for responsive standalone feel
  const now = Date.now()
  if (snapshot.activeTimer.running) {
    snapshot.activeTimer.remainingMs = getTimerRemainingMs(snapshot.activeTimer, now)
    snapshot.activeTimer.running = false
    snapshot.activeTimer.endAt = null
  } else {
    if (snapshot.activeTimer.remainingMs <= 0) {
      snapshot.activeTimer.remainingMs = snapshot.activeTimer.durationMs
    }
    snapshot.activeTimer.running = true
    snapshot.activeTimer.endAt = now + snapshot.activeTimer.remainingMs
  }
}

function handleResetCountdown() {
  bridge?.post({ type: 'command', command: 'reset-countdown' })
  snapshot.activeTimer.running = false
  snapshot.activeTimer.endAt = null
  snapshot.activeTimer.remainingMs = snapshot.activeTimer.durationMs
}

function handleToggleStopwatch() {
  bridge?.post({ type: 'command', command: 'toggle-stopwatch' })
  const now = Date.now()
  if (snapshot.stopwatch.running && snapshot.stopwatch.startedAt !== null) {
    snapshot.stopwatch.elapsedMs += Math.max(0, now - snapshot.stopwatch.startedAt)
    snapshot.stopwatch.running = false
    snapshot.stopwatch.startedAt = null
  } else {
    snapshot.stopwatch.running = true
    snapshot.stopwatch.startedAt = now
  }
}

function handleResetStopwatch() {
  bridge?.post({ type: 'command', command: 'reset-stopwatch' })
  snapshot.stopwatch.running = false
  snapshot.stopwatch.startedAt = null
  snapshot.stopwatch.elapsedMs = 0
}

function handleChangeMode(mode: WidgetDisplayMode) {
  snapshot.widget.mode = mode
  bridge?.post({ type: 'set-widget-mode', mode })
}

function handleClose() {
  bridge?.post({ type: 'command', command: 'close-widget' })
  if (window.funtime?.closeFloatingWidget) {
    window.funtime.closeFloatingWidget()
  }
  window.close()
}

function checkWidgetSnipeChime(now: number) {
  if (snapshot.widget.mode !== 'msclock' || !snapshot.widget.snipeTarget) return
  const hitKey = getSnipeHitKey(now, snapshot.widget.snipeTarget, snapshot.widget.msOffsetMs ?? 0)
  if (!hitKey) return
  if (claimSnipeChimeKey(hitKey) && snapshot.soundEnabled !== false) {
    playChime('snipe')
  }
}

function startTickLoop() {
  const step = () => {
    const now = Date.now()
    nowMs.value = now
    checkWidgetSnipeChime(now)
    rafHandle = window.requestAnimationFrame(step)
  }
  if (typeof window.requestAnimationFrame === 'function') {
    rafHandle = window.requestAnimationFrame(step)
  }
  // Keep clock updating smoothly even when window is unfocused/backgrounded
  fallbackTimer = window.setInterval(() => {
    const now = Date.now()
    nowMs.value = now
    checkWidgetSnipeChime(now)
  }, 16)
}

onMounted(() => {
  bridge = createSyncBridge((msg) => {
    if (msg.type === 'snapshot') {
      applySnapshot(msg.payload)
    }
  })
  bridge.post({ type: 'request-sync' })
  startTickLoop()
})

onBeforeUnmount(() => {
  bridge?.close()
  if (rafHandle !== null) window.cancelAnimationFrame(rafHandle)
  if (fallbackTimer !== null) window.clearInterval(fallbackTimer)
})
</script>

<template>
  <main class="widget-shell">
    <FloatingWidgetPreview
      :config="snapshot.widget"
      :active-timer="snapshot.activeTimer"
      :stopwatch-elapsed-ms="stopwatchElapsedMs"
      :stopwatch-running="snapshot.stopwatch.running"
      :now-ms="nowMs"
      :locale="snapshot.locale"
      :standalone="true"
      @toggle-countdown="handleToggleCountdown"
      @reset-countdown="handleResetCountdown"
      @toggle-stopwatch="handleToggleStopwatch"
      @reset-stopwatch="handleResetStopwatch"
      @change-mode="handleChangeMode"
      @close="handleClose"
    />
  </main>
</template>

<style scoped>
.widget-shell {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
