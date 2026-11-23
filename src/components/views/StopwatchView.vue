<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import { t } from '../../lib/i18n'
import type { Locale } from '../../lib/storage'
import { computeLapStats, formatStopwatch, lapsToCsv, type StopwatchLap } from '../../lib/time'

const props = defineProps<{
  elapsedMs: number
  running: boolean
  laps: StopwatchLap[]
  locale: Locale
}>()

const emit = defineEmits<{
  toggle: []
  lap: []
  reset: []
  'open-float': []
  copy: [text: string, label?: string]
  'export-csv': [filename: string, content: string]
}>()

const formatted = computed(() => formatStopwatch(props.elapsedMs))
const stats = computed(() => computeLapStats(props.laps))
const reversedLaps = computed(() => [...props.laps].reverse())

function handleCopyAll() {
  const csv = lapsToCsv(props.laps)
  emit('copy', csv, 'CSV')
}

function handleExportCsv() {
  emit('export-csv', 'funtime-stopwatch-laps.csv', lapsToCsv(props.laps))
}
</script>

<template>
  <div class="stopwatch-layout">
    <!-- Top Digital Chronometer Readout -->
    <section class="card display-card">
      <div class="display-top">
        <span class="pill" :class="running ? 'pill-ok' : elapsedMs > 0 ? 'pill-warn' : 'pill-neutral'">
          {{
            running
              ? t(locale, 'countdown.running')
              : elapsedMs > 0
                ? t(locale, 'countdown.paused')
                : t(locale, 'countdown.ready')
          }}
        </span>
        <button type="button" class="btn btn-sm btn-soft" @click="emit('open-float')">
          <AppIcon name="pip" :size="13" />
          {{ t(locale, 'action.floatWindow') }}
        </button>
      </div>

      <div class="stopwatch-readout mono" data-testid="stopwatch-display">
        <span>{{ formatted.main }}</span>
        <span class="centis">.{{ formatted.centis }}</span>
      </div>

      <div class="sw-controls">
        <button
          type="button"
          class="btn btn-lg btn-primary sw-main-btn"
          data-testid="stopwatch-toggle"
          @click="emit('toggle')"
        >
          <AppIcon :name="running ? 'pause' : 'play'" :size="14" />
          {{ running ? t(locale, 'action.pause') : elapsedMs > 0 ? t(locale, 'action.resume') : t(locale, 'action.start') }}
        </button>

        <button
          type="button"
          class="btn btn-lg"
          data-testid="stopwatch-lap-btn"
          :disabled="elapsedMs === 0 && !running"
          @click="emit('lap')"
        >
          <AppIcon name="flag" :size="14" />
          {{ t(locale, 'action.lap') }}
        </button>

        <button
          type="button"
          class="btn btn-lg"
          data-testid="stopwatch-reset-btn"
          :disabled="elapsedMs === 0 && laps.length === 0"
          @click="emit('reset')"
        >
          <AppIcon name="rotate-ccw" :size="14" />
          {{ t(locale, 'action.reset') }}
        </button>
      </div>

      <div class="stats-bar">
        <div class="stat-chip">
          <span class="stat-k">{{ t(locale, 'stopwatch.laps') }}</span>
          <span class="stat-v mono">{{ laps.length }}</span>
        </div>
        <div class="stat-chip">
          <span class="stat-k">{{ t(locale, 'stopwatch.avg') }}</span>
          <span class="stat-v mono">{{ stats.averageSplitMs ? formatStopwatch(stats.averageSplitMs).full : '--:--:--.--' }}</span>
        </div>
        <div class="stat-chip">
          <span class="stat-k">{{ t(locale, 'stopwatch.fastest') }}</span>
          <span class="stat-v mono ok">{{ stats.fastestMs !== null ? formatStopwatch(stats.fastestMs).full : '--:--:--.--' }}</span>
        </div>
      </div>
    </section>

    <!-- Lap/Split Table -->
    <section class="card laps-card">
      <div class="laps-head">
        <h3 class="section-title">{{ t(locale, 'stopwatch.laps') }}</h3>
        <div class="laps-actions">
          <button
            type="button"
            class="btn btn-sm"
            :disabled="laps.length === 0"
            @click="handleCopyAll"
          >
            <AppIcon name="copy" :size="12" />
            {{ t(locale, 'action.copy') }}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="laps.length === 0"
            @click="handleExportCsv"
          >
            <AppIcon name="download" :size="12" />
            {{ t(locale, 'action.exportCsv') }}
          </button>
        </div>
      </div>

      <div v-if="laps.length === 0" class="empty-laps">
        <AppIcon name="flag" :size="20" />
        <span>{{ t(locale, 'stopwatch.empty') }}</span>
      </div>

      <div v-else class="laps-table-wrap">
        <table class="laps-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ locale === 'en' ? 'Split Delta' : '单圈耗时' }}</th>
              <th>{{ locale === 'en' ? 'Cumulative' : '累计总时长' }}</th>
              <th>{{ locale === 'en' ? 'Tag' : '标记' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lap in reversedLaps"
              :key="lap.id"
              :class="{
                fastest: lap.id === stats.fastestId,
                slowest: lap.id === stats.slowestId,
              }"
            >
              <td class="mono idx-cell">Lap {{ String(lap.index).padStart(2, '0') }}</td>
              <td class="mono split-cell">+{{ formatStopwatch(lap.splitMs).full }}</td>
              <td class="mono total-cell">{{ formatStopwatch(lap.totalMs).full }}</td>
              <td>
                <span v-if="lap.id === stats.fastestId" class="pill pill-ok">
                  {{ t(locale, 'stopwatch.fastest') }}
                </span>
                <span v-else-if="lap.id === stats.slowestId" class="pill pill-warn">
                  {{ t(locale, 'stopwatch.slowest') }}
                </span>
                <span v-else class="muted-dash">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stopwatch-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.display-card {
  padding: 14px 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.display-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stopwatch-readout {
  font-size: 52px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.stopwatch-readout .centis {
  font-size: 32px;
  color: var(--accent);
}

.sw-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sw-main-btn {
  min-width: 112px;
}

.stats-bar {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 7px;
  background: var(--bg-subtle);
}

.stat-k {
  font-size: 11px;
  color: var(--text-muted);
}

.stat-v {
  font-size: 13px;
  font-weight: 700;
}

.stat-v.ok {
  color: var(--ok-text);
}

.laps-card {
  flex: 1;
  min-height: 0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.laps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.laps-actions {
  display: inline-flex;
  gap: 6px;
}

.empty-laps {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12.5px;
}

.laps-table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.laps-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.laps-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg-panel);
}

.laps-table td {
  padding: 8px 8px;
  border-bottom: 1px solid var(--border);
}

.laps-table tr.fastest td {
  background: rgba(16, 185, 129, 0.06);
}

.laps-table tr.slowest td {
  background: rgba(245, 158, 11, 0.07);
}

.idx-cell {
  font-weight: 600;
  color: var(--text-secondary);
}

.split-cell {
  font-weight: 700;
  color: var(--text-primary);
}

.total-cell {
  color: var(--text-secondary);
}

.muted-dash {
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .stopwatch-readout {
    font-size: 34px;
  }
  .stopwatch-readout .centis {
    font-size: 20px;
  }
  .stats-bar {
    grid-template-columns: 1fr;
  }
}
</style>
