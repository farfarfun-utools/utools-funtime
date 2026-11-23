<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { Locale, WidgetConfig, WidgetDisplayMode } from '../lib/storage'
import {
  formatClockWithMs,
  formatCountdown,
  formatStopwatch,
  getNextTargetCountdown,
  getTimerProgress,
  getTimerRemainingMs,
  type CountdownTimer,
} from '../lib/time'
import { getCityClockSnapshot, getLocalTimeZone, getZonedDateParts } from '../lib/worldclock'

const props = withDefaults(
  defineProps<{
    config: WidgetConfig
    activeTimer: CountdownTimer
    stopwatchElapsedMs: number
    stopwatchRunning: boolean
    nowMs: number
    locale: Locale
    standalone?: boolean
  }>(),
  { standalone: false },
)

const emit = defineEmits<{
  'toggle-countdown': []
  'reset-countdown': []
  'toggle-stopwatch': []
  'reset-stopwatch': []
  'change-mode': [mode: WidgetDisplayMode]
  close: []
}>()

const nowDate = computed(() => new Date(props.nowMs))
const countdownRemainingMs = computed(() => getTimerRemainingMs(props.activeTimer, props.nowMs))
const countdownProgress = computed(() => getTimerProgress(props.activeTimer, props.nowMs))
const countdownText = computed(() => formatCountdown(countdownRemainingMs.value))
const stopwatchText = computed(() => formatStopwatch(props.stopwatchElapsedMs))

const localParts = computed(() => getZonedDateParts(nowDate.value, getLocalTimeZone(), props.locale))
const msClock = computed(() => formatClockWithMs(props.nowMs, props.config.msOffsetMs ?? 0))
const snipeInfo = computed(() =>
  props.config.snipeTarget
    ? getNextTargetCountdown(props.nowMs, props.config.snipeTarget, props.config.msOffsetMs ?? 0)
    : null,
)
const dualA = computed(() => getCityClockSnapshot(props.config.dualZoneA, nowDate.value, props.locale))
const dualB = computed(() => getCityClockSnapshot(props.config.dualZoneB, nowDate.value, props.locale))

const modes: Array<{ id: WidgetDisplayMode; labelZh: string; labelEn: string }> = [
  { id: 'countdown', labelZh: '倒计时', labelEn: 'Timer' },
  { id: 'msclock', labelZh: '毫秒时钟', labelEn: 'Ms Clock' },
  { id: 'stopwatch', labelZh: '秒表', labelEn: 'Watch' },
  { id: 'clock', labelZh: '时钟', labelEn: 'Clock' },
  { id: 'dual', labelZh: '双时区', labelEn: 'Dual' },
]

function cycleMode() {
  const idx = modes.findIndex((m) => m.id === props.config.mode)
  const next = modes[(idx + 1) % modes.length]
  emit('change-mode', next.id)
}
</script>

<template>
  <div
    class="float-widget"
    :class="[
      `theme-${config.theme}`,
      `style-${config.style}`,
      { standalone },
    ]"
    :style="{ opacity: standalone ? 1 : config.opacity }"
    data-testid="floating-widget-surface"
  >
    <!-- Compact Pill Layout -->
    <template v-if="config.style === 'compact'">
      <div class="compact-row">
        <span
          class="pulse-dot"
          :class="[
            {
              running:
                (config.mode === 'countdown' && activeTimer.running) ||
                (config.mode === 'stopwatch' && stopwatchRunning) ||
                config.mode === 'clock' ||
                config.mode === 'msclock' ||
                config.mode === 'dual',
            },
            config.mode === 'msclock' && snipeInfo ? `urgency-${snipeInfo.urgency}` : '',
          ]"
        />

        <div class="compact-readout">
          <template v-if="config.mode === 'countdown'">
            <span class="compact-time mono">{{ countdownText }}</span>
            <span class="compact-tag">{{ activeTimer.label }}</span>
          </template>
          <template v-else-if="config.mode === 'msclock'">
            <span class="compact-time mono" data-testid="widget-msclock-readout">
              {{ msClock.hms }}<small class="ms-accent">.{{ msClock.ms }}</small>
            </span>
          </template>
          <template v-else-if="config.mode === 'stopwatch'">
            <span class="compact-time mono">{{ stopwatchText.main }}<small>.{{ stopwatchText.centis }}</small></span>
          </template>
          <template v-else-if="config.mode === 'clock'">
            <span class="compact-time mono">{{ localParts.timeStr }}</span>
            <span class="compact-tag">{{ localParts.weekday }}</span>
          </template>
          <template v-else>
            <span class="compact-dual mono">
              <span>{{ dualA.code }} {{ dualA.parts.hmStr }}</span>
              <span class="sep">/</span>
              <span>{{ dualB.code }} {{ dualB.parts.hmStr }}</span>
            </span>
          </template>
        </div>

        <div class="widget-actions no-drag">
          <button
            v-if="config.mode === 'countdown'"
            type="button"
            class="w-btn w-btn-accent"
            :title="activeTimer.running ? 'Pause' : 'Start'"
            @click="emit('toggle-countdown')"
          >
            <AppIcon :name="activeTimer.running ? 'pause' : 'play'" :size="12" />
          </button>
          <button
            v-else-if="config.mode === 'stopwatch'"
            type="button"
            class="w-btn w-btn-accent"
            :title="stopwatchRunning ? 'Pause' : 'Start'"
            @click="emit('toggle-stopwatch')"
          >
            <AppIcon :name="stopwatchRunning ? 'pause' : 'play'" :size="12" />
          </button>
          <button
            type="button"
            class="w-btn"
            :title="locale === 'en' ? 'Switch mode' : '切换显示模式'"
            @click="cycleMode"
          >
            <AppIcon name="clock" :size="12" />
          </button>
          <button
            v-if="standalone"
            type="button"
            class="w-btn"
            :title="locale === 'en' ? 'Close' : '关闭悬浮窗'"
            @click="emit('close')"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
      </div>
    </template>

    <!-- Standard Card Layout -->
    <template v-else>
      <div class="card-top">
        <div class="card-title-row">
          <span
            class="pulse-dot"
            :class="[
              {
                running:
                  (config.mode === 'countdown' && activeTimer.running) ||
                  (config.mode === 'stopwatch' && stopwatchRunning) ||
                  config.mode === 'clock' ||
                  config.mode === 'msclock' ||
                  config.mode === 'dual',
              },
              config.mode === 'msclock' && snipeInfo ? `urgency-${snipeInfo.urgency}` : '',
            ]"
          />
          <span class="card-label">
            <template v-if="config.mode === 'countdown'">{{ activeTimer.label }}</template>
            <template v-else-if="config.mode === 'msclock'">
              {{ locale === 'en' ? 'Millisecond Precision Clock' : '准点抢购 · 毫秒时钟' }}
              <span v-if="config.msOffsetMs" class="offset-tag mono">
                {{ config.msOffsetMs > 0 ? `+${config.msOffsetMs}ms` : `${config.msOffsetMs}ms` }}
              </span>
            </template>
            <template v-else-if="config.mode === 'stopwatch'">{{ locale === 'en' ? 'Stopwatch' : '精密秒表' }}</template>
            <template v-else-if="config.mode === 'clock'">{{ localParts.dateStr }} · {{ localParts.weekday }}</template>
            <template v-else>{{ locale === 'en' ? 'Dual World Clock' : '世界双时区' }}</template>
          </span>
        </div>

        <div class="widget-actions no-drag">
          <button
            type="button"
            class="mode-chip"
            @click="cycleMode"
          >
            {{
              locale === 'en'
                ? modes.find((m) => m.id === config.mode)?.labelEn
                : modes.find((m) => m.id === config.mode)?.labelZh
            }}
          </button>
          <button
            v-if="standalone"
            type="button"
            class="w-btn"
            :title="locale === 'en' ? 'Close' : '关闭悬浮窗'"
            @click="emit('close')"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
      </div>

      <div class="card-body">
        <template v-if="config.mode === 'countdown'">
          <div class="big-readout mono">{{ countdownText }}</div>
          <div class="widget-actions no-drag">
            <button
              type="button"
              class="w-btn w-btn-accent"
              data-testid="widget-toggle-btn"
              @click="emit('toggle-countdown')"
            >
              <AppIcon :name="activeTimer.running ? 'pause' : 'play'" :size="13" />
            </button>
            <button
              type="button"
              class="w-btn"
              @click="emit('reset-countdown')"
            >
              <AppIcon name="rotate-ccw" :size="13" />
            </button>
          </div>
        </template>

        <template v-else-if="config.mode === 'stopwatch'">
          <div class="big-readout mono">
            {{ stopwatchText.main }}<span class="centis">.{{ stopwatchText.centis }}</span>
          </div>
          <div class="widget-actions no-drag">
            <button
              type="button"
              class="w-btn w-btn-accent"
              @click="emit('toggle-stopwatch')"
            >
              <AppIcon :name="stopwatchRunning ? 'pause' : 'play'" :size="13" />
            </button>
            <button
              type="button"
              class="w-btn"
              @click="emit('reset-stopwatch')"
            >
              <AppIcon name="rotate-ccw" :size="13" />
            </button>
          </div>
        </template>

        <template v-else-if="config.mode === 'msclock'">
          <div class="msclock-wrap">
            <div class="big-readout ms-readout mono" data-testid="widget-msclock-readout">
              {{ msClock.hms }}<span class="ms-digits" :class="snipeInfo ? `urgency-${snipeInfo.urgency}` : ''">.{{ msClock.ms }}</span>
            </div>
            <div v-if="snipeInfo" class="snipe-bar mono" :class="`urgency-${snipeInfo.urgency}`">
              <span v-if="snipeInfo.urgency === 'go'">
                ⚡ {{ snipeInfo.targetLabel }} · GO!
              </span>
              <span v-else>
                {{ locale === 'en' ? `To ${snipeInfo.targetLabel}` : `距 ${snipeInfo.targetLabel}` }}
                · {{ snipeInfo.formatted }}
              </span>
            </div>
            <div v-else class="ms-sub mono">
              {{ localParts.dateStr }} {{ localParts.weekday }} · {{ dualA.utcOffsetStr }}
            </div>
          </div>
        </template>

        <template v-else-if="config.mode === 'clock'">
          <div class="big-readout mono">{{ localParts.timeStr }}</div>
          <span class="tz-badge mono">{{ dualA.utcOffsetStr }}</span>
        </template>

        <template v-else>
          <div class="dual-grid">
            <div class="dual-item">
              <span class="dual-city">{{ locale === 'en' ? dualA.nameEn : dualA.nameZh }}</span>
              <span class="dual-time mono">{{ dualA.parts.hmStr }}</span>
            </div>
            <div class="dual-divider" />
            <div class="dual-item">
              <span class="dual-city">{{ locale === 'en' ? dualB.nameEn : dualB.nameZh }}</span>
              <span class="dual-time mono">{{ dualB.parts.hmStr }}</span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="config.mode === 'countdown'" class="progress-rail">
        <div class="progress-fill" :style="{ width: `${Math.round(countdownProgress * 100)}%` }" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.float-widget {
  position: relative;
  border-radius: 14px;
  border: 1px solid rgba(20, 184, 166, 0.32);
  user-select: none;
  transition: opacity 0.15s ease, background 0.15s ease;
  overflow: hidden;
}

.float-widget.standalone {
  width: 100%;
  height: 100%;
  border-radius: 0;
  border: none;
  -webkit-app-region: drag;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.float-widget.theme-dark {
  background: linear-gradient(145deg, #0d171c 0%, #112228 100%);
  color: #f0fdfa;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.42);
}

.float-widget.theme-light {
  background: linear-gradient(145deg, #ffffff 0%, #eefaf8 100%);
  color: #0f172a;
  border-color: rgba(13, 148, 136, 0.28);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.14);
}

.float-widget.style-standard {
  width: 316px;
  padding: 12px 14px 13px;
}

.float-widget.style-standard.standalone {
  width: 100%;
  height: 100%;
}

.float-widget.style-compact {
  width: 268px;
  border-radius: 999px;
  padding: 8px 10px 8px 14px;
}

.float-widget.style-compact.standalone {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.no-drag {
  -webkit-app-region: no-drag;
}

.compact-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compact-readout {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.compact-time {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.compact-time small {
  font-size: 12px;
  opacity: 0.72;
}

.compact-tag {
  font-size: 11px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-dual {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.compact-dual .sep {
  opacity: 0.45;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #64748b;
  flex-shrink: 0;
}

.pulse-dot.running {
  background: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.25);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.card-label {
  font-size: 11.5px;
  font-weight: 600;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.big-readout {
  font-size: 31px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.big-readout .centis {
  font-size: 17px;
  opacity: 0.65;
}

.tz-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(20, 184, 166, 0.16);
  color: #14b8a6;
}

.dual-grid {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dual-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dual-city {
  font-size: 11px;
  opacity: 0.72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dual-time {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
}

.dual-divider {
  width: 1px;
  height: 34px;
  background: rgba(148, 163, 184, 0.25);
}

.widget-actions {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.w-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.16);
  color: inherit;
  transition: background 0.14s, transform 0.1s;
}

.w-btn:hover {
  background: rgba(148, 163, 184, 0.28);
}

.w-btn-accent {
  background: #0d9488;
  color: #ffffff;
}

.w-btn-accent:hover {
  background: #14b8a6;
}

.mode-chip {
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: rgba(20, 184, 166, 0.18);
  color: #14b8a6;
}

.theme-light .mode-chip {
  color: #0f766e;
}

.progress-rail {
  margin-top: 10px;
  height: 3px;
  width: 100%;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
  border-radius: 999px;
  transition: width 0.2s linear;
}

.msclock-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ms-readout {
  font-size: 30px;
  letter-spacing: -0.02em;
}

.ms-digits,
.ms-accent {
  color: #2dd4bf;
  font-weight: 800;
}

.theme-light .ms-digits,
.theme-light .ms-accent {
  color: #0d9488;
}

.ms-digits.urgency-warn,
.snipe-bar.urgency-warn {
  color: #fbbf24;
}

.ms-digits.urgency-critical,
.snipe-bar.urgency-critical {
  color: #f87171;
}

.ms-digits.urgency-go,
.snipe-bar.urgency-go {
  color: #34d399;
}

.pulse-dot.urgency-warn {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.28);
}

.pulse-dot.urgency-critical {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.32);
}

.pulse-dot.urgency-go {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.35);
}

.ms-sub {
  font-size: 10.5px;
  opacity: 0.7;
}

.snipe-bar {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(20, 184, 166, 0.16);
  color: #5eead4;
}

.theme-light .snipe-bar {
  background: rgba(13, 148, 136, 0.12);
  color: #0f766e;
}

.offset-tag {
  margin-left: 5px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}
</style>
