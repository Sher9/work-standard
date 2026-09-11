<template>
  <div v-if="src" class="pdf-preview">
    <iframe :src="src" class="pdf-frame" />
  </div>
  <div v-else class="pdf-unavailable">预览不可用</div>
</template>

<script setup lang="ts">
defineProps<{
  src: string | null;
}>();
</script>

<style scoped>
.pdf-frame {
  width: 100%;
  height: 70vh;
  border: 1px solid #dfe1e5;
  border-radius: 6px;
}
.pdf-unavailable {
  padding: 40px;
  text-align: center;
  color: #5f6368;
  border: 1px solid #dfe1e5;
  border-radius: 6px;
}
</style>