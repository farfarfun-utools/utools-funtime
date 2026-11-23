<script setup lang="ts">
export type IconName =
  | 'timer'
  | 'stopwatch'
  | 'globe'
  | 'pip'
  | 'calculator'
  | 'play'
  | 'pause'
  | 'rotate-ccw'
  | 'flag'
  | 'plus'
  | 'trash'
  | 'copy'
  | 'download'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'panel-left'
  | 'check'
  | 'bell'
  | 'bell-off'
  | 'search'
  | 'x'
  | 'pin'
  | 'clock'
  | 'swap'
  | 'external-link'

withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 16 },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'timer'">
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </template>
    <template v-else-if="name === 'stopwatch'">
      <path d="M10 2h4" />
      <path d="M12 2v3" />
      <path d="M19 7l-1.5 1.5" />
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </template>
    <template v-else-if="name === 'pip'">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
    </template>
    <template v-else-if="name === 'calculator'">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="8" x2="8.01" y1="11" y2="11" />
      <line x1="12" x2="12.01" y1="11" y2="11" />
      <line x1="16" x2="16.01" y1="11" y2="11" />
      <line x1="8" x2="8.01" y1="15" y2="15" />
      <line x1="12" x2="12.01" y1="15" y2="15" />
      <line x1="16" x2="16.01" y1="15" y2="15" />
      <line x1="8" x2="8.01" y1="19" y2="19" />
      <line x1="12" x2="16" y1="19" y2="19" />
    </template>
    <template v-else-if="name === 'play'">
      <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'pause'">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'rotate-ccw'">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </template>
    <template v-else-if="name === 'flag'">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </template>
    <template v-else-if="name === 'plus'">
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </template>
    <template v-else-if="name === 'monitor'">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </template>
    <template v-else-if="name === 'panel-left'">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" x2="9" y1="3" y2="21" />
    </template>
    <template v-else-if="name === 'check'">
      <polyline points="20 6 9 17 4 12" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </template>
    <template v-else-if="name === 'bell-off'">
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </template>
    <template v-else-if="name === 'x'">
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </template>
    <template v-else-if="name === 'swap'">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </template>
    <template v-else-if="name === 'external-link'">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </template>
  </svg>
</template>
