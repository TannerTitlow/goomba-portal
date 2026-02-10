<template>
  <div class="flex items-center gap-2">
    <div class="flex gap-1.5 sm:gap-2">
      <button
        v-for="level in 5"
        :key="level"
        type="button"
        @click="handleClick(level)"
        class="rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-base-100"
        :class="[
          level <= (hoveredLevel || currentValue) ? getFilledClass(level) : 'bg-base-300 hover:bg-base-content/20',
          'w-8 h-8 sm:w-6 sm:h-6'
        ]"
        :aria-label="`Difficulty ${level} out of 5`"
        @mouseenter="hoveredLevel = level"
        @mouseleave="hoveredLevel = null"
      />
    </div>
    <button
      v-if="modelValue !== null"
      type="button"
      @click="handleClear"
      class="text-xs text-base-content/50 hover:text-base-content/80 transition-colors underline"
      aria-label="Clear difficulty rating"
    >
      Clear
    </button>
    <span v-else class="text-xs text-base-content/40">Not rated</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: null,
    validator: (value) => value === null || (value >= 1 && value <= 5)
  }
})

const emit = defineEmits(['update:modelValue'])

const hoveredLevel = ref(null)

const currentValue = computed(() => props.modelValue)

function handleClick(level) {
  // If clicking the current value, clear it (set to null)
  if (level === props.modelValue) {
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', level)
  }
}

function handleClear() {
  emit('update:modelValue', null)
}

function getFilledClass(level) {
  // Color scaling based on difficulty level
  if (level <= 2) {
    return 'bg-success hover:bg-success/80' // Green (1-2)
  } else if (level === 3) {
    return 'bg-warning hover:bg-warning/80' // Yellow (3)
  } else {
    return 'bg-error hover:bg-error/80' // Red/Orange (4-5)
  }
}
</script>
