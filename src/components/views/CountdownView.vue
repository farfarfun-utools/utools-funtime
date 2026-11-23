<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import { t } from '../../lib/i18n'
import type { Locale } from '../../lib/storage'
import {
  COUNTDOWN_PRESETS,
  formatCountdown,
  formatDurationLabel,
  getTimerProgress,
  getTimerRemainingMs,
  parseDurationExpression,
  POMODORO_MODES,
  type CountdownTimer,
  type TimerKind,
} from '../../lib/time'

const props = defineProps<{
  timers: CountdownTimer[]
  activeTimerId: string
  pomodoroCycles: number
  nowMs: number
  locale: Locale
}>()

const emit = defineEmits<{
  'select-timer': [id: string]
  'toggle-timer': [id: string]
  'reset-timer': [id: string]
  'add-minute': [id: string]
  'delete-timer': [id: string]
  'rename-timer': [payload: { id: string; label: string }]
  'create-timer': [payload: { label: string; durationMs: number; kind: TimerKind; autoStart: boolean }]
  'apply-pomodoro': [payload: { kind: TimerKind; durationMs: number; label: string }]
  'open-float': []
}>()

const customExpr = ref('')
const customLabel = ref('')
const inputError = ref('')
const editingLabel = ref(false)
const labelDraft = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)

const activeTimer = computed(
  () => props.timers.find((item) => item.id === props.activeTimerId) ?? props.timers[0],
)

const remainingMs = computed(() => getTimerRemainingMs(activeTimer.value, props.nowMs))
const progress = computed(() => getTimerProgress(activeTimer.value, props.nowMs))
const formattedRemaining = computed(() => formatCountdown(remainingMs.value))

const RING_R = 92
const RING_C = 2 * Math.PI * RING_R
const dashOffset = computed(() => RING_C * (1 - progress.value))

const statusLabel = computed(() => {
  if (activeTimer.value.running) return t(props.locale, 'countdown.running')
  if (remainingMs.value === 0) return t(props.locale, 'countdown.done')
  if (remainingMs.value < activeTimer.value.durationMs) return t(props.locale, 'countdown.paused')
  return t(props.locale, 'countdown.ready')
})

watch(
  () => props.activeTimerId,
  () => {
    editingLabel.value = false
  },
)

function startEditLabel() {
  labelDraft.value = activeTimer.value.label
  editingLabel.value = true
  void nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
}

function commitEditLabel() {
  if (!editingLabel.value) return
  editingLabel.value = false
  const clean = labelDraft.value.trim()
  if (clean && clean !== activeTimer.value.label) {
    emit('rename-timer', { id: activeTimer.value.id, label: clean })
  }
}

function cancelEditLabel() {
  editingLabel.value = false
}

function handleQuickAdd() {
  const raw = customExpr.value.trim()
  if (!raw) {
    inputError.value =
      props.locale === 'en'
        ? 'Enter a duration, e.g. 5m, 1h30m, 90s, 05:00'
        : '请输入时长，支持 5m、1h30m、90s、05:00、25分钟'
    return
  }
  const ms = parseDurationExpression(raw)
  if (!ms) {
    inputError.value =
      props.locale === 'en'
        ? `Invalid format "${raw.slice(0, 16)}" — try 5m, 1h30m, 05:00`
        : `无法识别「${raw.slice(0, 16)}」，支持 5m、1h30m、90s、05:00`
    return
  }
  inputError.value = ''
  const label =
    customLabel.value.trim() ||
    (props.locale === 'en'
      ? `Timer ${formatDurationLabel(ms, 'en')}`
      : `${formatDurationLabel(ms, 'zh-CN')}倒计时`)
  emit('create-timer', { label, durationMs: ms, kind: 'custom', autoStart: true })
  customExpr.value = ''
  customLabel.value = ''
}

function handlePresetClick(preset: (typeof COUNTDOWN_PRESETS)[number]) {
  const label = props.locale === 'en' ? preset.labelEn : preset.labelZh
  emit('create-timer', {
    label,
    durationMs: preset.durationMs,
    kind: preset.kind,
    autoStart: false,
  })
}
</script>

<template>
  <div class="countdown-layout">
    <!-- Left Hero Chronometer Ring -->
    <section class="card hero-card">
      <div class="hero-header">
        <div class="seg-group" role="tablist">
          <button
            v-for="mode in POMODORO_MODES"
            :key="mode.kind"
            type="button"
            class="seg-btn"
            :class="{ active: activeTimer.kind === mode.kind && activeTimer.durationMs === mode.durationMs }"
            @click="
              emit('apply-pomodoro', {
                kind: mode.kind,
                durationMs: mode.durationMs,
                label: locale === 'en' ? mode.titleEn : mode.titleZh,
              })
            "
          >
            {{ locale === 'en' ? mode.labelEn : mode.labelZh }}
          </button>
        </div>
        <span class="pill pill-accent mono" :title="t(locale, 'countdown.pomoCount')">
          🍅 {{ pomodoroCycles }}
        </span>
      </div>

      <div class="ring-stage">
        <svg class="ring-svg" viewBox="0 0 220 220" aria-hidden="true">
          <defs>
            <linearGradient id="funtimeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#14B8A6" />
              <stop offset="100%" stop-color="#0D9488" />
            </linearGradient>
          </defs>
          <!-- Subtle outer dial marks -->
          <circle
            cx="110"
            cy="110"
            r="102"
            fill="none"
            stroke="var(--border)"
            stroke-width="1"
            stroke-dasharray="2 8.68"
          />
          <circle
            cx="110"
            cy="110"
            :r="RING_R"
            fill="none"
            stroke="var(--bg-subtle)"
            stroke-width="10"
          />
          <circle
            cx="110"
            cy="110"
            :r="RING_R"
            fill="none"
            stroke="url(#funtimeRingGrad)"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="RING_C"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 110 110)"
            class="ring-progress"
          />
        </svg>

        <div class="ring-center">
          <span
            class="pill"
            :class="activeTimer.running ? 'pill-ok' : remainingMs === 0 ? 'pill-warn' : 'pill-neutral'"
          >
            {{ statusLabel }}
          </span>
          <div class="ring-time mono" data-testid="countdown-display">{{ formattedRemaining }}</div>
          <input
            v-if="editingLabel"
            ref="labelInputRef"
            v-model="labelDraft"
            type="text"
            maxlength="36"
            class="input ring-label-input"
            data-testid="timer-label-input"
            @keydown.enter.prevent="commitEditLabel"
            @keydown.escape.prevent="cancelEditLabel"
            @blur="commitEditLabel"
          />
          <button
            v-else
            type="button"
            class="ring-label ring-label-btn"
            data-testid="timer-label-btn"
            :title="locale === 'en' ? 'Click to rename timer' : '点击重命名计时器'"
            @click="startEditLabel"
          >
            {{ activeTimer.label }}
          </button>
          <div class="ring-total mono">
            {{ formatDurationLabel(activeTimer.durationMs, locale) }}
          </div>
        </div>
      </div>

      <div class="hero-controls">
        <button
          type="button"
          class="btn btn-lg btn-primary primary-action"
          data-testid="countdown-toggle"
          @click="emit('toggle-timer', activeTimer.id)"
        >
          <AppIcon :name="activeTimer.running ? 'pause' : 'play'" :size="14" />
          {{
            activeTimer.running
              ? t(locale, 'action.pause')
              : remainingMs < activeTimer.durationMs && remainingMs > 0
                ? t(locale, 'action.resume')
                : t(locale, 'action.start')
          }}
        </button>

        <button
          type="button"
          class="btn btn-lg"
          @click="emit('reset-timer', activeTimer.id)"
        >
          <AppIcon name="rotate-ccw" :size="14" />
          {{ t(locale, 'action.reset') }}
        </button>

        <button
          type="button"
          class="btn btn-lg"
          @click="emit('add-minute', activeTimer.id)"
        >
          {{ t(locale, 'action.addMinute') }}
        </button>
      </div>

      <div class="hero-footer">
        <div class="kbd-hint">
          <span class="kbd">Space</span>
          <span>{{ locale === 'en' ? 'Start / Pause' : '开始 / 暂停' }}</span>
        </div>
        <button
          type="button"
          class="btn btn-soft float-cta"
          data-testid="countdown-float-btn"
          @click="emit('open-float')"
        >
          <AppIcon name="pip" :size="14" />
          {{ locale === 'en' ? 'Pop out Always-on-Top Floating Widget' : '一键弹出桌面置顶悬浮小窗' }}
        </button>
      </div>
    </section>

    <!-- Right Column: Quick Presets + Natural Input + Multi-Timer Queue -->
    <div class="right-col">
      <section class="card panel-block">
        <div class="panel-head">
          <h3 class="section-title">{{ t(locale, 'countdown.presets') }}</h3>
          <span class="hint-text">{{ locale === 'en' ? 'Click to add' : '点击创建计时' }}</span>
        </div>
        <div class="preset-grid">
          <button
            v-for="preset in COUNTDOWN_PRESETS"
            :key="preset.id"
            type="button"
            class="preset-chip"
            :class="{ highlight: preset.kind === 'pomodoro' }"
            @click="handlePresetClick(preset)"
          >
            {{ locale === 'en' ? preset.labelEn : preset.labelZh }}
          </button>
        </div>
      </section>

      <section class="card panel-block">
        <div class="panel-head">
          <h3 class="section-title nowrap">{{ t(locale, 'countdown.quickAdd') }}</h3>
          <span class="hint-text mono nowrap">5m · 1h30m · 05:00</span>
        </div>
        <form class="quick-form" @submit.prevent="handleQuickAdd">
          <input
            v-model="customExpr"
            type="text"
            class="input mono expr-input"
            :class="{ 'is-error': Boolean(inputError) }"
            data-testid="quick-expr-input"
            :placeholder="locale === 'en' ? '12m / 01:30' : '如 12m / 15分'"
            @input="inputError = ''"
          />
          <input
            v-model="customLabel"
            type="text"
            class="input label-input"
            :placeholder="locale === 'en' ? 'Label' : '标签'"
          />
          <button type="submit" class="btn btn-primary" data-testid="quick-add-btn">
            <AppIcon name="plus" :size="13" />
            {{ t(locale, 'action.add') }}
          </button>
        </form>
        <div v-if="inputError" class="input-err">{{ inputError }}</div>
      </section>

      <section class="card panel-block queue-card">
        <div class="panel-head">
          <h3 class="section-title">{{ t(locale, 'countdown.multiList') }}</h3>
          <span class="pill pill-neutral mono">{{ timers.length }}</span>
        </div>
        <div class="timer-list">
          <div
            v-for="item in timers"
            :key="item.id"
            class="timer-row"
            :class="{ selected: item.id === activeTimer.id, running: item.running }"
            @click="emit('select-timer', item.id)"
          >
            <div class="timer-meta">
              <div class="timer-name-row">
                <span class="dot" :class="{ active: item.running }" />
                <span class="timer-name">{{ item.label }}</span>
              </div>
              <div class="mini-bar">
                <div
                  class="mini-bar-fill"
                  :style="{ width: `${Math.round(getTimerProgress(item, nowMs) * 100)}%` }"
                />
              </div>
            </div>

            <div class="timer-right">
              <span class="timer-val mono">{{ formatCountdown(getTimerRemainingMs(item, nowMs)) }}</span>
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                :title="item.running ? t(locale, 'action.pause') : t(locale, 'action.start')"
                @click.stop="emit('toggle-timer', item.id)"
              >
                <AppIcon :name="item.running ? 'pause' : 'play'" :size="13" />
              </button>
              <button
                v-if="timers.length > 1"
                type="button"
                class="btn btn-ghost btn-icon"
                :title="locale === 'en' ? 'Delete' : '删除'"
                @click.stop="emit('delete-timer', item.id)"
              >
                <AppIcon name="trash" :size="13" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.countdown-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  min-height: 0;
}

.hero-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ring-stage {
  position: relative;
  width: 242px;
  height: 242px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px 0;
}

.ring-svg {
  width: 100%;
  height: 100%;
}

.ring-progress {
  transition: stroke-dashoffset 0.25s linear;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  padding: 20px;
}

.ring-time {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--text-primary);
}

.ring-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  max-width: 165px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ring-label-btn {
  padding: 1px 6px;
  border-radius: 5px;
  transition: background 0.14s, color 0.14s;
}

.ring-label-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.ring-label-input {
  width: 148px;
  height: 24px;
  padding: 0 6px;
  font-size: 12px;
  text-align: center;
}

.hero-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ring-total {
  font-size: 11px;
  color: var(--text-muted);
}

.hero-controls {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary-action {
  min-width: 108px;
}

.float-cta {
  width: 100%;
  height: 34px;
}

.right-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.panel-block {
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hint-text {
  font-size: 11px;
  color: var(--text-muted);
}

.nowrap {
  white-space: nowrap;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.preset-chip {
  height: 30px;
  padding: 0 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.14s, background 0.14s, color 0.14s;
}

.preset-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.preset-chip.highlight {
  border-color: rgba(13, 148, 136, 0.35);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.quick-form {
  display: flex;
  gap: 6px;
}

.expr-input {
  flex: 1.1;
  min-width: 0;
}

.expr-input.is-error {
  border-color: var(--err-text);
  box-shadow: 0 0 0 2px var(--err-bg);
}

.label-input {
  flex: 0.9;
  min-width: 0;
}

.input-err {
  font-size: 11px;
  color: var(--err-text);
}

.queue-card {
  flex: 1;
  min-height: 0;
}

.timer-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  cursor: pointer;
  transition: border-color 0.14s, background 0.14s;
}

.timer-row:hover {
  border-color: var(--border-strong);
}

.timer-row.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.timer-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.timer-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}

.dot.active {
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.timer-name {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-bar {
  height: 3px;
  width: 100%;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.timer-right {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.timer-val {
  font-size: 14px;
  font-weight: 700;
  margin-right: 4px;
}

@media (max-width: 640px) {
  .countdown-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .ring-stage {
    width: 184px;
    height: 184px;
  }
  .ring-time {
    font-size: 30px;
  }
  .quick-form {
    flex-wrap: wrap;
  }
}
</style>
