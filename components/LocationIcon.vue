<template>
  <!-- 自绘位置图标集：24 viewBox / stroke 1.8 / currentColor，随文字颜色着色 -->
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round" :width="size" :height="size"
       aria-hidden="true" v-html="body" />
</template>

<script setup lang="ts">
// 图标源：物归界面改版/icons（manifest：房间 room 17 / 家具 furniture 10 / 格位 cell 6）
const ICONS: Record<string, string> = {
  // ---- 通用 / 房间 ----
  home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 9.8V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8"/><path d="M9.5 20v-5.5h5V20"/>',
  building: '<rect x="5" y="3.5" width="14" height="16.5" rx="1.5"/><path d="M3.5 20h17"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2"/><path d="M10.5 20v-3.5h3V20"/>',
  'bedroom-master': '<path d="M3.5 18.5V13a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5.5"/><path d="M3.5 15.5h17"/><path d="M5.5 11V6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2V11"/><path d="M6.5 13.5h4M13.5 13.5h4"/>',
  bedroom: '<path d="M3.5 18.5V12a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v6.5"/><path d="M3.5 15h17"/><path d="M6 10V8a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 13 8v2"/>',
  'kids-room': '<circle cx="12" cy="8" r="3.6"/><circle cx="8.8" cy="5.2" r="1.4"/><circle cx="15.2" cy="5.2" r="1.4"/><path d="M7.5 19.5c0-3.3 2-5.4 4.5-5.4s4.5 2.1 4.5 5.4z"/><path d="M10.6 7.8h.01M13.4 7.8h.01"/>',
  'living-room': '<path d="M6 10.5V8.2A2.7 2.7 0 0 1 8.7 5.5h6.6A2.7 2.7 0 0 1 18 8.2v2.3"/><path d="M3.5 12.6a2 2 0 0 1 4 0v.9h9v-.9a2 2 0 0 1 4 0v3.9a1.5 1.5 0 0 1-1.5 1.5h-14a1.5 1.5 0 0 1-1.5-1.5v-3.9z"/><path d="M6 18.5V20M18 18.5V20"/>',
  dining: '<path d="M7 3.5v6M4.8 3.5v3.2a2.2 2.2 0 0 0 4.4 0V3.5M7 9.5V20.5"/><path d="M17 20.5V3.5c-1.9 1.2-2.9 3.3-2.9 5.5 0 1.6.9 2.5 2.9 2.5"/>',
  kitchen: '<path d="M5.5 10.5h13v3a5.5 5.5 0 0 1-5.5 5.5h-2a5.5 5.5 0 0 1-5.5-5.5v-3z"/><path d="M3.5 10.5h17"/><path d="M9 7.5c0-2.2 1.2-3.5 3-3.5s3 1.3 3 3.5"/>',
  bathroom: '<path d="M3.5 12.5h17v1.8a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5v-1.8z"/><path d="M5.5 12.5V6.3a2 2 0 0 1 4 0"/><path d="M6.5 19.3V21M17.5 19.3V21"/><path d="M13.5 8.5h4"/>',
  balcony: '<path d="M4 20.5V9M8 20.5V9M12 20.5V9M16 20.5V9M20 20.5V9"/><path d="M4 12.8h16M4 16.6h16"/><path d="M12 8.5c0-3.2 2.1-5 5.2-5 0 3.2-2.1 5-5.2 5z"/><path d="M12 8.5c0-3.2-2.1-5-5.2-5 0 3.2 2.1 5 5.2 5z"/>',
  study: '<path d="M12 6.3C10 4.9 7.6 4.4 4.2 4.4v13.4c3.4 0 5.8.5 7.8 1.9 2-1.4 4.4-1.9 7.8-1.9V4.4c-3.4 0-5.8.5-7.8 1.9z"/><path d="M12 6.3v13.4"/>',
  entryway: '<path d="M4 18.5v-2.2c0-.9.6-1.6 1.5-1.8 2.2-.5 5.4-1.2 7-2.8l1.1-1.1c.7-.7 1.8-.6 2.4.1l1.9 2.3c.5.7.4 1.7-.3 2.2-1.7 1.3-3.9 1.9-5.6 2.3z"/><path d="M4 21h16.5"/>',
  closet: '<path d="M12 6.5a2 2 0 1 1 2-2"/><path d="M12 6.5 3.9 12.4a1.1 1.1 0 0 0 .7 2h14.8a1.1 1.1 0 0 0 .7-2L12 6.5z"/>',
  'storage-room': '<path d="M4 13.5h6.8v6H4z"/><path d="M13.2 13.5H20v6h-6.8z"/><path d="M8.2 5h7.6v8.5H8.2z"/><path d="M12 5v8.5"/>',
  laundry: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 7.5h16"/><circle cx="12" cy="13.5" r="4"/><path d="M6.8 5.5h.01M9 5.5h.01"/>',
  garage: '<path d="M5.2 15.5l1.3-4A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5l1.3 4"/><path d="M3.5 15.5h17v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2z"/><path d="M9.2 13.2h5.6"/>',
  workshop: '<rect x="3.5" y="9.5" width="17" height="10" rx="1.8"/><path d="M9 9.5V7.7A2.2 2.2 0 0 1 11.2 5.5h1.6A2.2 2.2 0 0 1 15 7.7v1.8"/><path d="M10.5 13.5h3"/>',
  // ---- 家具 ----
  wardrobe: '<rect x="4.5" y="3.5" width="15" height="17" rx="1.5"/><path d="M12 3.5v17"/><path d="M9.7 10.5v2.5M14.3 10.5v2.5"/><path d="M6.5 20.5v1.3M17.5 20.5v1.3"/>',
  desk: '<path d="M3 8.5h18"/><path d="M4.5 8.5V20M19.5 8.5V20"/><path d="M8 8.5v4.2a1.2 1.2 0 0 0 1.2 1.2h5.6a1.2 1.2 0 0 0 1.2-1.2V8.5"/>',
  nightstand: '<rect x="5" y="4" width="14" height="14.5" rx="1.5"/><path d="M5 11.2h14"/><path d="M10.3 7.6h3.4M10.3 15h3.4"/><path d="M6.8 18.5v1.7M17.2 18.5v1.7"/>',
  bookshelf: '<rect x="4.5" y="3" width="15" height="18" rx="1.5"/><path d="M4.5 12h15"/><path d="M8 6.5v4M11 7v3.5M14 6.5v4"/><path d="M8 15v4M11.5 15.5v3.5M15 15v4"/>',
  'shoe-cabinet': '<rect x="4" y="4.5" width="16" height="15" rx="1.5"/><path d="M4 12h16"/><path d="M10 8.2h4M10 15.8h4"/>',
  'tv-stand': '<rect x="4" y="4.5" width="16" height="10" rx="1.8"/><path d="M12 14.5v2.7"/><path d="M12 17.2 8.2 19.7M12 17.2l3.8 2.5"/>',
  dresser: '<rect x="4.5" y="3.5" width="15" height="17" rx="1.5"/><path d="M4.5 9.2h15M4.5 14.9h15"/><path d="M10.7 6.3h2.6M10.7 12h2.6M10.7 17.7h2.6"/>',
  shelf: '<path d="M4.5 3.5v17M19.5 3.5v17"/><path d="M4.5 9.7h15M4.5 15.9h15"/><path d="M7.5 6.6v3.1M10.5 7.5v2.2M13.5 6.6v3.1"/><rect x="7" y="12.7" width="4.5" height="3.2"/>',
  'storage-box': '<path d="M4 8.5h16"/><path d="M4.6 8.5 5.7 19a1.8 1.8 0 0 0 1.8 1.6h9a1.8 1.8 0 0 0 1.8-1.6L19.4 8.5"/><path d="M9.5 8.5V6.8a2.5 2.5 0 0 1 5 0v1.7"/>',
  suitcase: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7"/><path d="M9 10.5v6M15 10.5v6"/>',
  fridge: '<rect x="5.5" y="3" width="13" height="18" rx="2"/><path d="M5.5 10.2h13"/><path d="M8.2 6.2v1.6M8.2 12.8v2.6"/>',
  // ---- 格位 ----
  drawer: '<rect x="4.5" y="7.5" width="15" height="11" rx="1.6"/><path d="M4.5 13h15"/><path d="M10.3 10.2h3.4M10.3 15.8h3.4"/>',
  'shelf-layer': '<path d="M3.5 7h17M3.5 17h17"/><path d="M7 7v10M17 7v10"/>',
  'hanging-rod': '<path d="M3 5.5h18"/><path d="M8 5.5V8M16 5.5V8"/><path d="M5.6 12.6 8 8.3l2.4 4.3a1 1 0 0 1-.9 1.5H6.5a1 1 0 0 1-.9-1.5z"/><path d="M13.6 12.6 16 8.3l2.4 4.3a1 1 0 0 1-.9 1.5h-3a1 1 0 0 1-.9-1.5z"/>',
  'grid-cell': '<rect x="4" y="4" width="16" height="16" rx="1.8"/><path d="M12 4v16M4 12h16"/>',
  basket: '<path d="M5 9h14l-1.2 8.9a1.9 1.9 0 0 1-1.9 1.6H8.1a1.9 1.9 0 0 1-1.9-1.6L5 9z"/><path d="M9 9V7.2A3 3 0 0 1 15 7.2V9"/><path d="M8.4 12.7h7.2M9 15.8h6"/>',
  'file-box': '<path d="M7.5 4h9v3h-9z"/><path d="M5 7h14v11.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5V7z"/><path d="M9 12.5h6"/>',
  // ---- 底部导航专用（原型 tabbar 图标） ----
  'tab-home': '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  'tab-box': '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/>',
  'tab-shelf': '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16"/><path d="M12 12v8"/>',
  'tab-user': '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.6 4.3-5.2 7.5-5.2s6.1 1.6 7.5 5.2"/>',
}

const props = withDefaults(defineProps<{ slug: string; size?: number }>(), { size: 16 })
const body = computed(() => ICONS[props.slug] ?? ICONS.home)
</script>
