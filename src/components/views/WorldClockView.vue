<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import { t } from '../../lib/i18n'
import type { Locale } from '../../lib/storage'
import {
  buildMeetingPlannerRows,
  formatMeetingScheduleText,
  getCityClockSnapshot,
  WORLD_CITIES,
} from '../../lib/worldclock'
import { pad2 } from '../../lib/time'

const props = defineProps<{
  pinnedZones: string[]
  nowMs: number
  locale: Locale
}>()

const emit = defineEmits<{
  'add-zone': [timeZone: string]
  'remove-zone': [timeZone: string]
  copy: [text: string, label?: string]
}>()

const searchQuery = ref('')
const sliderMinutes = ref(10 * 60) // 10:00 reference meeting slot
const refZone = ref(props.pinnedZones[0] || 'Asia/Shanghai')

const nowDate = computed(() => new Date(props.nowMs))

const effectiveRefZone = computed(() =>
  props.pinnedZones.includes(refZone.value) ? refZone.value : (props.pinnedZones[0] ?? 'Asia/Shanghai'),
)

const citySnapshots = computed(() =>
  props.pinnedZones.map((tz) => getCityClockSnapshot(tz, nowDate.value, props.locale)),
)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return WORLD_CITIES.filter(
    (c) =>
      !props.pinnedZones.includes(c.timeZone) &&
      (c.nameZh.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.timeZone.toLowerCase().includes(q) ||
        c.regionZh.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q))),
  ).slice(0, 6)
})

const plannerRows = computed(() =>
  buildMeetingPlannerRows(
    props.pinnedZones,
    nowDate.value,
    effectiveRefZone.value,
    sliderMinutes.value,
    props.locale,
  ),
)

const sliderLabel = computed(() => {
  const h = Math.floor(sliderMinutes.value / 60)
  const m = sliderMinutes.value % 60
  return `${pad2(h)}:${pad2(m)}`
})

function handleSelectCity(tz: string) {
  emit('add-zone', tz)
  searchQuery.value = ''
}

function handleCopySchedule() {
  const text = formatMeetingScheduleText(plannerRows.value, props.locale)
  emit('copy', text, props.locale === 'en' ? 'Schedule' : '跨时区日程')
}
</script>

<template>
  <div class="world-layout">
    <!-- Top Search & Add City Bar -->
    <div class="search-bar-wrap">
      <div class="search-box">
        <AppIcon name="search" :size="14" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="input search-input"
          data-testid="world-search-input"
          :placeholder="t(locale, 'world.searchPlaceholder')"
        />
        <button v-if="searchQuery" type="button" class="clear-btn" @click="searchQuery = ''">
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <div v-if="searchResults.length > 0" class="search-dropdown card">
        <button
          v-for="city in searchResults"
          :key="city.timeZone"
          type="button"
          class="dropdown-item"
          @click="handleSelectCity(city.timeZone)"
        >
          <div>
            <span class="drop-name">{{ locale === 'en' ? city.nameEn : city.nameZh }}</span>
            <span class="drop-region">· {{ locale === 'en' ? city.regionEn : city.regionZh }}</span>
          </div>
          <span class="drop-tz mono">{{ city.timeZone }}</span>
        </button>
      </div>
    </div>

    <!-- Pinned Live World Clock Cards -->
    <section class="clock-grid">
      <article
        v-for="snap in citySnapshots"
        :key="snap.timeZone"
        class="card clock-card"
      >
        <div class="clock-head">
          <div class="city-info">
            <span class="day-icon" :title="snap.parts.isDaytime ? 'Daytime' : 'Night'">
              {{ snap.parts.isDaytime ? '☀️' : '🌙' }}
            </span>
            <div class="city-titles">
              <div class="city-name">{{ locale === 'en' ? snap.nameEn : snap.nameZh }}</div>
              <div class="city-zone mono">{{ snap.utcOffsetStr }}</div>
            </div>
          </div>

          <div class="card-badges">
            <span class="pill pill-accent mono">{{ snap.relativeOffsetStr }}</span>
            <button
              v-if="pinnedZones.length > 1"
              type="button"
              class="remove-zone-btn"
              :title="locale === 'en' ? 'Unpin' : '移除'"
              @click="emit('remove-zone', snap.timeZone)"
            >
              <AppIcon name="x" :size="12" />
            </button>
          </div>
        </div>

        <div class="clock-time mono">{{ snap.parts.timeStr }}</div>

        <div class="clock-foot">
          <span class="mono">{{ snap.parts.dateStr }} · {{ snap.parts.weekday }}</span>
          <span
            class="pill"
            :class="
              snap.parts.workStatus === 'work'
                ? 'pill-ok'
                : snap.parts.workStatus === 'edge'
                  ? 'pill-warn'
                  : 'pill-neutral'
            "
          >
            {{
              snap.parts.workStatus === 'work'
                ? locale === 'en' ? 'Work' : '工作'
                : snap.parts.workStatus === 'edge'
                  ? locale === 'en' ? 'Flex' : '弹性'
                  : locale === 'en' ? 'Night' : '夜间'
            }}
          </span>
        </div>
      </article>
    </section>

    <!-- Cross-Timezone Interactive Meeting Planner Slider -->
    <section class="card planner-card">
      <div class="planner-head">
        <div class="planner-title-wrap">
          <h3 class="section-title">{{ t(locale, 'world.meetingPlanner') }}</h3>
          <div class="legend-pills">
            <span class="legend-item"><i class="lg-dot ok" />{{ t(locale, 'world.workHours') }}</span>
            <span class="legend-item"><i class="lg-dot warn" />{{ t(locale, 'world.edgeHours') }}</span>
            <span class="legend-item"><i class="lg-dot night" />{{ t(locale, 'world.nightHours') }}</span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-primary"
          data-testid="copy-schedule-btn"
          @click="handleCopySchedule"
        >
          <AppIcon name="copy" :size="12" />
          {{ t(locale, 'world.copySchedule') }}
        </button>
      </div>

      <div class="slider-bar">
        <select v-model="refZone" class="select ref-select">
          <option v-for="snap in citySnapshots" :key="snap.timeZone" :value="snap.timeZone">
            {{ locale === 'en' ? snap.nameEn : snap.nameZh }}
          </option>
        </select>

        <input
          v-model.number="sliderMinutes"
          type="range"
          min="0"
          max="1410"
          step="30"
          class="meeting-slider"
          data-testid="meeting-slider"
        />

        <span class="slider-time mono">{{ sliderLabel }}</span>
      </div>

      <div class="planner-rows">
        <div
          v-for="row in plannerRows"
          :key="row.timeZone"
          class="planner-row"
        >
          <div class="planner-city">
            <span class="p-name">{{ locale === 'en' ? row.nameEn : row.nameZh }}</span>
            <span class="p-tz mono">{{ row.utcOffsetStr }}</span>
          </div>

          <div class="hour-track">
            <div
              class="hour-marker"
              :class="`status-${row.workStatus}`"
              :style="{ left: `${((row.hour * 60 + row.minute) / 1440) * 100}%` }"
            />
          </div>

          <div class="planner-result">
            <span
              class="pill mono"
              :class="
                row.workStatus === 'work'
                  ? 'pill-ok'
                  : row.workStatus === 'edge'
                    ? 'pill-warn'
                    : 'pill-neutral'
              "
            >
              {{ row.hmStr }}
              <template v-if="row.dayDelta > 0"> +1d</template>
              <template v-else-if="row.dayDelta < 0"> -1d</template>
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.world-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.search-bar-wrap {
  position: relative;
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 32px;
  padding-right: 30px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  color: var(--text-muted);
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.search-dropdown {
  position: absolute;
  top: 34px;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 4px;
  box-shadow: var(--shadow-md);
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 12px;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--bg-hover);
}

.drop-name {
  font-weight: 600;
}

.drop-region {
  color: var(--text-muted);
  margin-left: 4px;
}

.drop-tz {
  font-size: 11px;
  color: var(--text-muted);
}

.clock-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  flex-shrink: 0;
}

.clock-card {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.clock-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.city-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.day-icon {
  font-size: 14px;
  line-height: 1;
}

.city-titles {
  min-width: 0;
}

.city-name {
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.city-zone {
  font-size: 10.5px;
  color: var(--text-muted);
}

.card-badges {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.remove-zone-btn {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.remove-zone-btn:hover {
  background: var(--bg-hover);
  color: var(--err-text);
}

.clock-time {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.clock-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  font-size: 10.5px;
  color: var(--text-muted);
}

.planner-card {
  flex: 1;
  min-height: 0;
  padding: 10px 13px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.planner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.planner-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-pills {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  color: var(--text-muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.lg-dot.ok {
  background: #10b981;
}

.lg-dot.warn {
  background: #f59e0b;
}

.lg-dot.night {
  background: #64748b;
}

.slider-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.ref-select {
  height: 26px;
  font-size: 12px;
  max-width: 140px;
}

.meeting-slider {
  flex: 1;
  min-width: 0;
}

.slider-time {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  min-width: 46px;
  text-align: right;
}

.planner-rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.planner-row {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) 82px;
  align-items: center;
  gap: 10px;
  padding: 2px 2px;
}

.planner-city {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.p-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-tz {
  font-size: 10px;
  color: var(--text-muted);
}

.hour-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(100, 116, 139, 0.25) 0%,
    rgba(100, 116, 139, 0.25) 29%,
    rgba(245, 158, 11, 0.35) 29%,
    rgba(245, 158, 11, 0.35) 37.5%,
    rgba(16, 185, 129, 0.4) 37.5%,
    rgba(16, 185, 129, 0.4) 75%,
    rgba(245, 158, 11, 0.35) 75%,
    rgba(245, 158, 11, 0.35) 91.5%,
    rgba(100, 116, 139, 0.25) 91.5%,
    rgba(100, 116, 139, 0.25) 100%
  );
}

.hour-marker {
  position: absolute;
  top: 50%;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid var(--bg-panel);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.hour-marker.status-work {
  background: #10b981;
}

.hour-marker.status-edge {
  background: #f59e0b;
}

.hour-marker.status-night {
  background: #64748b;
}

.planner-result {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .clock-grid {
    grid-template-columns: 1fr;
  }
  .world-layout {
    overflow-y: auto;
  }
  .planner-row {
    grid-template-columns: 105px minmax(0, 1fr) 74px;
    gap: 6px;
  }
  .legend-pills {
    display: none;
  }
}
</style>
