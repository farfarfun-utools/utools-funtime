<script setup lang="ts">
import AppIcon from '../AppIcon.vue'
import FloatingWidgetPreview from '../FloatingWidgetPreview.vue'
import { t } from '../../lib/i18n'
import type {
  Locale,
  WidgetConfig,
  WidgetDisplayMode,
  WidgetStyle,
  WidgetTheme,
} from '../../lib/storage'
import { getNextWholeHourTarget, type CountdownTimer } from '../../lib/time'
import { WORLD_CITIES } from '../../lib/worldclock'

const props = defineProps<{
  config: WidgetConfig
  widgetOpen: boolean
  activeTimer: CountdownTimer
  stopwatchElapsedMs: number
  stopwatchRunning: boolean
  nowMs: number
  locale: Locale
}>()

const emit = defineEmits<{
  'update:config': [patch: Partial<WidgetConfig>]
  'open-widget': [mode?: WidgetDisplayMode]
  'close-widget': []
  'toggle-countdown': []
  'reset-countdown': []
  'toggle-stopwatch': []
  'reset-stopwatch': []
}>()

const modes: Array<{ id: WidgetDisplayMode; key: Parameters<typeof t>[1] }> = [
  { id: 'countdown', key: 'widget.modeCountdown' },
  { id: 'msclock', key: 'widget.modeMsClock' },
  { id: 'stopwatch', key: 'widget.modeStopwatch' },
  { id: 'clock', key: 'widget.modeClock' },
  { id: 'dual', key: 'widget.modeDual' },
]

function adjustOffset(delta: number) {
  const next = Math.min(5000, Math.max(-5000, (props.config.msOffsetMs ?? 0) + delta))
  emit('update:config', { msOffsetMs: next })
}

function setNextHourTarget() {
  emit('update:config', {
    snipeTarget: getNextWholeHourTarget(props.nowMs, props.config.msOffsetMs ?? 0),
  })
}

function setStyle(style: WidgetStyle) {
  emit('update:config', { style })
}

function setTheme(theme: WidgetTheme) {
  emit('update:config', { theme })
}

function setMode(mode: WidgetDisplayMode) {
  emit('update:config', { mode })
}

function handleOpacity(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  emit('update:config', { opacity: val / 100 })
}
</script>

<template>
  <div class="widget-layout">
    <!-- Live Interactive Desktop Stage -->
    <section class="card preview-stage">
      <div class="stage-top">
        <div class="stage-title-wrap">
          <h3 class="section-title">{{ t(locale, 'widget.livePreview') }}</h3>
          <span class="pill" :class="widgetOpen ? 'pill-ok' : 'pill-neutral'">
            {{ widgetOpen ? t(locale, 'widget.statusOpen') : t(locale, 'widget.statusClosed') }}
          </span>
        </div>
        <span class="stage-hint mono">
          {{ config.style === 'compact' ? '268 × 56 px' : '316 × 126 px' }} · {{ Math.round(config.opacity * 100) }}%
        </span>
      </div>

      <div class="desktop-canvas">
        <div class="desktop-grid-overlay" />
        <FloatingWidgetPreview
          :config="config"
          :active-timer="activeTimer"
          :stopwatch-elapsed-ms="stopwatchElapsedMs"
          :stopwatch-running="stopwatchRunning"
          :now-ms="nowMs"
          :locale="locale"
          @toggle-countdown="emit('toggle-countdown')"
          @reset-countdown="emit('reset-countdown')"
          @toggle-stopwatch="emit('toggle-stopwatch')"
          @reset-stopwatch="emit('reset-stopwatch')"
          @change-mode="setMode"
        />
      </div>

      <div class="stage-cta-row">
        <button
          type="button"
          class="btn btn-lg btn-primary"
          data-testid="open-widget-btn"
          @click="emit('open-widget')"
        >
          <AppIcon name="external-link" :size="14" />
          {{ t(locale, 'action.openFloat') }}
        </button>

        <button
          type="button"
          class="btn btn-lg"
          data-testid="open-msclock-btn"
          @click="emit('open-widget', 'msclock')"
        >
          <AppIcon name="clock" :size="14" />
          {{ locale === 'en' ? 'Snipe Ms Clock' : '抢购毫秒悬浮窗' }}
        </button>

        <button
          type="button"
          class="btn btn-lg"
          data-testid="close-widget-btn"
          @click="emit('close-widget')"
        >
          <AppIcon name="x" :size="14" />
          {{ t(locale, 'action.closeFloat') }}
        </button>
      </div>
    </section>

    <!-- Configuration Controls -->
    <section class="card config-card">
      <div class="config-grid">
        <div class="cfg-group">
          <label class="cfg-label">{{ t(locale, 'widget.style') }}</label>
          <div class="seg-group">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: config.style === 'standard' }"
              @click="setStyle('standard')"
            >
              {{ t(locale, 'widget.styleStandard') }}
            </button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: config.style === 'compact' }"
              @click="setStyle('compact')"
            >
              {{ t(locale, 'widget.styleCompact') }}
            </button>
          </div>
        </div>

        <div class="cfg-group">
          <label class="cfg-label">{{ t(locale, 'widget.theme') }}</label>
          <div class="seg-group">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: config.theme === 'dark' }"
              @click="setTheme('dark')"
            >
              {{ t(locale, 'widget.themeDark') }}
            </button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: config.theme === 'light' }"
              @click="setTheme('light')"
            >
              {{ t(locale, 'widget.themeLight') }}
            </button>
          </div>
        </div>

        <div class="cfg-group full">
          <label class="cfg-label">{{ t(locale, 'widget.mode') }}</label>
          <div class="mode-pills">
            <button
              v-for="m in modes"
              :key="m.id"
              type="button"
              class="btn btn-sm"
              :class="config.mode === m.id ? 'btn-primary' : ''"
              :data-testid="`widget-mode-${m.id}`"
              @click="setMode(m.id)"
            >
              {{ t(locale, m.key) }}
            </button>
          </div>
        </div>

        <div class="cfg-group">
          <div class="opacity-head">
            <label class="cfg-label">{{ t(locale, 'widget.opacity') }}</label>
            <span class="mono opacity-val">{{ Math.round(config.opacity * 100) }}%</span>
          </div>
          <input
            type="range"
            min="65"
            max="100"
            step="1"
            :value="Math.round(config.opacity * 100)"
            @input="handleOpacity"
          />
        </div>

        <div class="cfg-group">
          <label class="cfg-label">{{ locale === 'en' ? 'Window Pin' : '窗口置顶' }}</label>
          <label class="checkbox-row">
            <input
              type="checkbox"
              :checked="config.alwaysOnTop"
              @change="emit('update:config', { alwaysOnTop: ($event.target as HTMLInputElement).checked })"
            />
            <span>{{ t(locale, 'widget.alwaysOnTop') }}</span>
          </label>
        </div>

        <div v-if="config.mode === 'msclock'" class="cfg-group full snipe-panel" data-testid="msclock-snipe-panel">
          <div class="snipe-row">
            <span class="cfg-label">{{ locale === 'en' ? 'Target Time (Optional)' : '抢购准点提醒（可选）' }}</span>
            <div class="snipe-controls">
              <input
                type="text"
                class="input mono snipe-input"
                :value="config.snipeTarget"
                placeholder="20:00:00"
                @input="emit('update:config', { snipeTarget: ($event.target as HTMLInputElement).value.trim() })"
              />
              <button type="button" class="btn btn-sm" @click="setNextHourTarget">
                {{ locale === 'en' ? 'Next Hour' : '下一整点' }}
              </button>
              <button type="button" class="btn btn-sm mono" @click="emit('update:config', { snipeTarget: '10:00:00' })">10:00</button>
              <button type="button" class="btn btn-sm mono" @click="emit('update:config', { snipeTarget: '20:00:00' })">20:00</button>
              <button
                v-if="config.snipeTarget"
                type="button"
                class="btn btn-sm btn-ghost"
                @click="emit('update:config', { snipeTarget: '' })"
              >
                {{ locale === 'en' ? 'Clear' : '清除' }}
              </button>
            </div>
          </div>

          <div class="snipe-row">
            <span class="cfg-label">
              {{ locale === 'en' ? 'Clock Offset (Network Latency)' : '时间偏差微调（补偿网络延迟）' }}
            </span>
            <div class="snipe-controls">
              <button type="button" class="btn btn-sm mono" @click="adjustOffset(-100)">-100ms</button>
              <button type="button" class="btn btn-sm mono" @click="adjustOffset(-50)">-50ms</button>
              <span class="offset-readout mono">
                {{ (config.msOffsetMs ?? 0) > 0 ? `+${config.msOffsetMs}ms` : `${config.msOffsetMs ?? 0}ms` }}
              </span>
              <button type="button" class="btn btn-sm mono" @click="adjustOffset(50)">+50ms</button>
              <button type="button" class="btn btn-sm mono" @click="adjustOffset(100)">+100ms</button>
              <button
                v-if="config.msOffsetMs"
                type="button"
                class="btn btn-sm btn-ghost"
                @click="emit('update:config', { msOffsetMs: 0 })"
              >
                0ms
              </button>
            </div>
          </div>
        </div>

        <div v-if="config.mode === 'dual'" class="cfg-group full dual-selects">
          <select
            class="select"
            :value="config.dualZoneA"
            @change="emit('update:config', { dualZoneA: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="c in WORLD_CITIES" :key="c.timeZone" :value="c.timeZone">
              {{ locale === 'en' ? c.nameEn : c.nameZh }} ({{ c.code }})
            </option>
          </select>
          <span class="dual-vs">↔</span>
          <select
            class="select"
            :value="config.dualZoneB"
            @change="emit('update:config', { dualZoneB: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="c in WORLD_CITIES" :key="c.timeZone" :value="c.timeZone">
              {{ locale === 'en' ? c.nameEn : c.nameZh }} ({{ c.code }})
            </option>
          </select>
        </div>
      </div>

      <p class="sync-note">
        {{
          locale === 'en'
            ? 'Synced in real time with the main window via BroadcastChannel. Drag anywhere on the floating window to reposition.'
            : '通过 BroadcastChannel 与主窗口毫秒级实时同步；打开后可在桌面任意拖拽位置，直接控制开始 / 暂停与模式切换。'
        }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.widget-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.preview-stage {
  padding: 13px 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.stage-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stage-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.desktop-canvas {
  position: relative;
  height: 178px;
  border-radius: 12px;
  background: radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.22), transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(15, 118, 110, 0.24), transparent 55%),
    linear-gradient(135deg, #0f172a 0%, #13252c 50%, #1e293b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border);
}

.desktop-grid-overlay {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

.stage-cta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.config-card {
  flex: 1;
  min-height: 0;
  padding: 13px 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  overflow-y: auto;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.cfg-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cfg-group .seg-group {
  width: 100%;
}

.cfg-group .seg-btn {
  flex: 1;
}

.cfg-group.full {
  grid-column: 1 / -1;
}

.cfg-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.mode-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.opacity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.opacity-val {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
}

.dual-selects {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.dual-selects .select {
  flex: 1;
  min-width: 0;
}

.dual-vs {
  color: var(--text-muted);
  font-weight: 700;
}

.snipe-panel {
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  gap: 8px;
}

.snipe-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.snipe-controls {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.snipe-input {
  width: 88px;
  height: 26px;
  padding: 0 7px;
  font-size: 12px;
}

.offset-readout {
  min-width: 54px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.sync-note {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-muted);
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

@media (max-width: 640px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
  .stage-cta-row {
    flex-wrap: wrap;
  }
}
</style>
