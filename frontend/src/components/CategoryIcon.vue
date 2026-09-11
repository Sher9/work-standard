<template>
  <el-icon v-if="comp" class="category-icon"><component :is="comp" /></el-icon>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { isCategoryIcon } from '../constants/categoryIcons';

const props = defineProps<{ name?: string | null }>();

const icons = ElementPlusIconsVue as unknown as Record<string, Component>;

const comp = computed<Component | null>(() =>
  isCategoryIcon(props.name) ? (icons[props.name] ?? null) : null,
);
</script>

<style scoped>
.category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}
</style>
