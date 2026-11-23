<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import { t } from '../../lib/i18n'
import type { Locale } from '../../lib/storage'
import {
  calculateTimeDiff,
  offsetDateTime,
  toLocalDateTimeInputValue,
} from '../../lib/calc'

defineProps<{
  locale: Locale
}>()

const emit = defineEmits<{
  copy: [text: string, label?: string]
}>()

const now = new Date()
const plus3Days = new Date(now.getTime() + (3 * 86_400 + 4 * 3600 + 30 * 60) * 1000)

const startInput = ref(toLocalDateTimeInputValue(now))
const endInput = ref(toLocalDateTimeInputValue(plus3Days))

const baseInput = ref(toLocalDateTimeInputValue(now))
const operation = ref<'add' | 'subtract'>('add')
const deltaDays = ref(7)
const deltaHours = ref(3)
const deltaMinutes = ref(30)

const diffResult = computed(() => calculateTimeDiff(startInput.value, endInput.value))
const offsetResult = computed(() =>
  offsetDateTime(
    baseInput.value,
    {
      days: deltaDays.value,
      hours: deltaHours.value,
      minutes: deltaMinutes.value,
    },
    operation.value,
  ),
)

function swapDiff() {
  const tmp = startInput.value
  startInput.value = endInput.value
  endInput.value = tmp
}

function setNowStart() {
  startInput.value = toLocalDateTimeInputValue(new Date())
}

function setNowBase() {
  baseInput.value = toLocalDateTimeInputValue(new Date())
}
</script>

<template>
  <div class="calc-layout">
    <!-- Card 1: Duration Between Two Dates -->
    <section class="card calc-card">
      <div class="calc-head">
        <h3 class="section-title">{{ t(locale, 'calc.diffTitle') }}</h3>
        <div class="head-actions">
          <button type="button" class="btn btn-sm" @click="setNowStart">{{ t(locale, 'calc.now') }}</button>
          <button type="button" class="btn btn-sm" @click="swapDiff">
            <AppIcon name="swap" :size="12" />
            {{ t(locale, 'calc.swap') }}
          </button>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">{{ t(locale, 'calc.start') }}</label>
        <input v-model="startInput" type="datetime-local" class="input mono full-input" />
      </div>

      <div class="field-group">
        <label class="field-label">{{ t(locale, 'calc.end') }}</label>
        <input v-model="endInput" type="datetime-local" class="input mono full-input" />
      </div>

      <div v-if="diffResult" class="diff-output" data-testid="calc-diff-output">
        <div class="breakdown-grid">
          <div class="unit-box">
            <span class="unit-num mono">{{ diffResult.days }}</span>
            <span class="unit-label">{{ t(locale, 'calc.days') }}</span>
          </div>
          <div class="unit-box">
            <span class="unit-num mono">{{ diffResult.hours }}</span>
            <span class="unit-label">{{ t(locale, 'calc.hours') }}</span>
          </div>
          <div class="unit-box">
            <span class="unit-num mono">{{ diffResult.minutes }}</span>
            <span class="unit-label">{{ t(locale, 'calc.minutes') }}</span>
          </div>
          <div class="unit-box">
            <span class="unit-num mono">{{ diffResult.seconds }}</span>
            <span class="unit-label">{{ t(locale, 'calc.seconds') }}</span>
          </div>
        </div>

        <div class="summary-rows">
          <div class="sum-row">
            <span class="sum-k">{{ locale === 'en' ? 'Total Hours' : '折合总小时' }}</span>
            <span class="sum-v mono">{{ diffResult.totalHours }} h</span>
          </div>
          <div class="sum-row">
            <span class="sum-k">{{ locale === 'en' ? 'Total Minutes' : '折合总分钟' }}</span>
            <span class="sum-v mono">{{ diffResult.totalMinutes }} min</span>
          </div>
          <div class="sum-row">
            <span class="sum-k">{{ locale === 'en' ? 'Total Seconds' : '折合总秒数' }}</span>
            <span class="sum-v mono">{{ diffResult.totalSeconds }} s</span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-soft copy-full-btn"
          @click="emit('copy', locale === 'en' ? diffResult.formattedEn : diffResult.formattedZh)"
        >
          <AppIcon name="copy" :size="13" />
          {{ locale === 'en' ? `Copy "${diffResult.formattedEn}"` : `复制「${diffResult.formattedZh}」` }}
        </button>
      </div>
    </section>

    <!-- Card 2: Date Offset Calculator -->
    <section class="card calc-card">
      <div class="calc-head">
        <h3 class="section-title">{{ t(locale, 'calc.offsetTitle') }}</h3>
        <button type="button" class="btn btn-sm" @click="setNowBase">{{ t(locale, 'calc.now') }}</button>
      </div>

      <div class="field-group">
        <label class="field-label">{{ t(locale, 'calc.base') }}</label>
        <input v-model="baseInput" type="datetime-local" class="input mono full-input" />
      </div>

      <div class="seg-group op-seg">
        <button
          type="button"
          class="seg-btn"
          :class="{ active: operation === 'add' }"
          @click="operation = 'add'"
        >
          {{ t(locale, 'calc.add') }}
        </button>
        <button
          type="button"
          class="seg-btn"
          :class="{ active: operation === 'subtract' }"
          @click="operation = 'subtract'"
        >
          {{ t(locale, 'calc.subtract') }}
        </button>
      </div>

      <div class="delta-inputs">
        <div class="delta-col">
          <label class="field-label">{{ t(locale, 'calc.days') }}</label>
          <input v-model.number="deltaDays" type="number" min="0" class="input mono" />
        </div>
        <div class="delta-col">
          <label class="field-label">{{ t(locale, 'calc.hours') }}</label>
          <input v-model.number="deltaHours" type="number" min="0" class="input mono" />
        </div>
        <div class="delta-col">
          <label class="field-label">{{ t(locale, 'calc.minutes') }}</label>
          <input v-model.number="deltaMinutes" type="number" min="0" class="input mono" />
        </div>
      </div>

      <div v-if="offsetResult" class="offset-output" data-testid="calc-offset-output">
        <div class="target-banner">
          <span class="target-label">{{ locale === 'en' ? 'Target Local Time' : '推算目标时间' }}</span>
          <div class="target-val mono">{{ offsetResult.targetLocal }}</div>
        </div>

        <div class="code-rows">
          <div class="code-row">
            <span class="code-k">ISO 8601</span>
            <span class="code-v mono">{{ offsetResult.isoUtc }}</span>
            <button type="button" class="btn btn-ghost btn-icon" @click="emit('copy', offsetResult.isoUtc, 'ISO')">
              <AppIcon name="copy" :size="12" />
            </button>
          </div>
          <div class="code-row">
            <span class="code-k">Unix (s)</span>
            <span class="code-v mono">{{ offsetResult.unixSeconds }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              @click="emit('copy', String(offsetResult.unixSeconds), 'Unix(s)')"
            >
              <AppIcon name="copy" :size="12" />
            </button>
          </div>
          <div class="code-row">
            <span class="code-k">Unix (ms)</span>
            <span class="code-v mono">{{ offsetResult.unixMilliseconds }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              @click="emit('copy', String(offsetResult.unixMilliseconds), 'Unix(ms)')"
            >
              <AppIcon name="copy" :size="12" />
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.calc-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.calc-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-height: 0;
  overflow-y: auto;
}

.calc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.head-actions {
  display: inline-flex;
  gap: 6px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.full-input {
  width: 100%;
}

.diff-output,
.offset-output {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  flex: 1;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.unit-box {
  padding: 10px 6px;
  border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.unit-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.unit-label {
  font-size: 10.5px;
  color: var(--text-muted);
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-subtle);
}

.sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.sum-k {
  color: var(--text-secondary);
}

.sum-v {
  font-weight: 600;
}

.copy-full-btn {
  margin-top: auto;
  width: 100%;
}

.op-seg {
  width: 100%;
}

.op-seg .seg-btn {
  flex: 1;
}

.delta-inputs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.delta-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.delta-col .input {
  width: 100%;
}

.target-banner {
  padding: 12px;
  border-radius: 9px;
  background: var(--accent-soft);
  border: 1px solid rgba(13, 148, 136, 0.28);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.target-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}

.target-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.code-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 7px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.code-k {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 58px;
}

.code-v {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .calc-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}
</style>
