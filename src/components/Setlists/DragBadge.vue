<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="drag-badge"
      :style="{ top: position.y + 'px', left: position.x + 'px' }"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1db954"/>
        <path
          d="M12 7v10M7 12h10"
          stroke="white"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})
</script>

<style scoped>
.drag-badge {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
  transition: opacity 0.15s ease, transform 0.15s ease;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

.drag-badge svg {
  display: block;
}

/* Show when visible */
.drag-badge {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
</style>
