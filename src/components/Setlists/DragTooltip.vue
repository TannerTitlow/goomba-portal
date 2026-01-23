<template>
  <Transition name="tooltip">
    <div v-if="visible" class="drag-tooltip">
      <div class="tooltip-content">
        <p>💡 Drag songs between lists to copy them</p>
        <button @click="dismiss" class="tooltip-dismiss">Got it</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const visible = ref(false)

const emit = defineEmits(['dismiss'])

onMounted(() => {
  // Check if user has seen the tooltip
  const hasSeenTooltip = localStorage.getItem('hasSeenDragCopyHint')
  if (!hasSeenTooltip) {
    // Show after 2 seconds
    setTimeout(() => {
      visible.value = true
    }, 2000)
  }
})

function dismiss() {
  visible.value = false
  localStorage.setItem('hasSeenDragCopyHint', 'true')
  emit('dismiss')
}

// Auto-dismiss after 6 seconds
setTimeout(() => {
  if (visible.value) {
    dismiss()
  }
}, 8000)
</script>

<style scoped>
.drag-tooltip {
  position: fixed;
  bottom: 5rem;
  right: 2rem;
  z-index: 90;
}

.tooltip-content {
  background: #1a1a1a;
  border: 2px solid #1db954;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(29, 185, 84, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 320px;
}

.tooltip-content p {
  margin: 0;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  flex: 1;
}

.tooltip-dismiss {
  padding: 0.5rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tooltip-dismiss:hover {
  background: #1ed760;
  transform: translateY(-1px);
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.3s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

/* Mobile */
@media (max-width: 768px) {
  .drag-tooltip {
    bottom: 4rem;
    right: 1rem;
    left: 1rem;
  }

  .tooltip-content {
    max-width: none;
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .tooltip-dismiss {
    width: 100%;
  }
}
</style>
