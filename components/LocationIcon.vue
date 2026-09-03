<template>
  <component :is="iconComp" :size="size" class="shrink-0 text-text-secondary" aria-hidden="true" />
</template>

<script setup lang="ts">
import {
  Sofa, Utensils, BedDouble, BookOpen, Footprints, Sprout,
  Tv, Coffee, Refrigerator, DoorClosed, Library, Package, Inbox, Archive,
} from 'lucide-vue-next'
import type { Component } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })

const icons: Record<string, Component> = {
  sofa: Sofa,
  utensils: Utensils,
  'bed-double': BedDouble,
  'book-open': BookOpen,
  footprints: Footprints,
  sprout: Sprout,
  tv: Tv,
  coffee: Coffee,
  refrigerator: Refrigerator,
  'door-closed': DoorClosed,
  library: Library,
  package: Package,
  inbox: Inbox,
  archive: Archive,
}

const iconComp = computed(() => icons[props.name] ?? Package)
</script>
