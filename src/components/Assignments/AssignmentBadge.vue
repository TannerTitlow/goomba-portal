<template>
  <!-- User Info -->
  <div class="flex flex-col items-center gap-1">
    <div class="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full">
      <!-- Progress border -->
      <div 
        class="absolute inset-0 rounded-full p-[3px]"
        :style="{
          background: `conic-gradient(from 0deg, ${progressColor} ${progress}%, rgb(34 197 94 / 0.3) ${progress}%)`
        }"
      >
        <!-- Inner circle to create border effect -->
        <div class="w-full h-full rounded-full bg-base-100"></div>
      </div>
      
      <!-- Avatar on top -->
      <div class="absolute inset-[3px] rounded-full overflow-hidden">
        <ProfileAvatar :profile="assignment.user" size="xs" />
      </div>
    </div>
    
    <div class="text-center">
    <span class="text-xs sm:text-sm text-gray-300 truncate sm:max-w-none">{{ displayName }}</span>
      <p class="text-[10px] sm:text-xs text-gray-500">{{ instrument }}</p>
      <p class="text-[10px] sm:text-xs text-gray-500">{{ getStatusLabel(assignment.status) }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ProfileAvatar from '../Profiles/ProfileAvatar.vue'
import { getAssignmentProgress, getStatusLabel, getProgressColor } from '../../utils/progressHelper'
import { Music, X } from 'lucide-vue-next'

const props = defineProps({
  assignment: {
    type: Object,
    required: true
  }
})

const displayName = computed(() => {
  if (props.assignment.user?.display_name) {
    return props.assignment.user.display_name
  }
  if (props.assignment.user?.name) {
    return props.assignment.user.name
  }
  return props.assignment.user?.email || 'Band Member'
})

const instrument = computed(() => {
  return props.assignment.instrument?.name || 'Instrument'
})

const progress = computed(() => {
  return getAssignmentProgress(props.assignment)
})

const progressColor = computed(() => {
  return getProgressColor(progress.value)
})
</script>