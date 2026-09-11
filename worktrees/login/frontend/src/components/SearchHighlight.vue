<template>
  <span
    class="search-highlight"
    v-html="renderHighlight"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  content: string;
}>();

// 将 highlight 字符串中的 <em>…</em> 替换为 <mark class="highlight">…</mark>
const renderHighlight = computed(() =>
  props.content.replace(/<em>([\s\S]*?)<\/em>/g, '<mark class="highlight">$1</mark>'),
);
</script>

<style scoped>
.highlight {
  background: #ffe082;
  padding: 0 2px;
  border-radius: 2px;
}
</style>