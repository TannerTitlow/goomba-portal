<template>
  <div class="rounded-xl border border-white/5 bg-base-300/40 backdrop-blur-sm overflow-hidden transition-all duration-200">
    <!-- Collapsed View (always visible) -->
    <div
      @click="!isEditing && $emit('edit-click')"
      class="flex items-center gap-3 p-3 sm:p-4 transition-colors"
      :class="[
        isEditing ? 'cursor-default' : 'cursor-pointer hover:bg-base-300/60'
      ]"
    >
      <!-- Avatar with progress ring -->
      <div class="relative shrink-0">
        <div class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full">
          <!-- Progress border -->
          <div
            class="absolute inset-0 rounded-full p-[2px]"
            :style="{
              background: `conic-gradient(from 0deg, ${progressColor} ${progress}%, rgb(34 197 94 / 0.3) ${progress}%)`
            }"
          >
            <!-- Inner circle to create border effect -->
            <div class="w-full h-full rounded-full bg-base-100"></div>
          </div>

          <!-- Avatar on top -->
          <div class="absolute inset-[2px] rounded-full overflow-hidden">
            <ProfileAvatar :profile="assignment.user" size="md" />
          </div>
        </div>
      </div>

      <!-- Info section -->
      <div class="flex-1 min-w-0">
        <p class="text-sm sm:text-base font-medium text-white/95 truncate">{{ displayName }}</p>
        <p class="text-xs sm:text-sm text-base-content/60">{{ instrument }}</p>
        <p class="text-xs text-base-content/50">{{ getStatusLabel(assignment.status) }}</p>
      </div>

      <!-- Edit indicator -->
      <div v-if="!isEditing" class="shrink-0">
        <Edit2 :size="16" class="text-base-content/40" />
      </div>
    </div>

    <!-- Expanded Edit Form (shown when editing) -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-150"
      enter-from-class="opacity-0 max-h-0"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="isEditing" class="border-t border-white/5 bg-base-300/20 p-3 sm:p-4">
        <div class="space-y-3 sm:space-y-4">
          <!-- Status Dropdown -->
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text text-xs font-medium">Status</span>
            </label>
            <select
              v-model="editForm.status"
              class="select select-bordered select-sm w-full bg-base-100"
            >
              <option value="not_started">Not Started</option>
              <option value="barely_started">Barely Started</option>
              <option value="in_progress">In Progress</option>
              <option value="mostly_learned">Mostly Learned</option>
              <option value="almost_ready">Almost Ready</option>
              <option value="performance_ready">Performance Ready</option>
            </select>
          </div>

          <!-- Instrument Dropdown -->
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text text-xs font-medium">Instrument</span>
            </label>
            <select
              v-model="editForm.instrument_id"
              class="select select-bordered select-sm w-full bg-base-100"
            >
              <option
                v-for="instr in instruments"
                :key="instr.id"
                :value="instr.id"
              >
                {{ instr.name }}
              </option>
            </select>
          </div>

          <!-- Difficulty Rating -->
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text text-xs font-medium">Difficulty</span>
            </label>
            <DifficultyRating v-model="editForm.difficulty_rating" />
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              @click="handleSave"
              :disabled="!hasChanges"
              class="btn btn-primary btn-sm gap-2 flex-1 min-h-[44px]"
            >
              <Save :size="16" />
              Save
            </button>
            <button
              @click="handleCancel"
              class="btn btn-ghost btn-sm gap-2 flex-1 min-h-[44px]"
            >
              <X :size="16" />
              Cancel
            </button>
            <button
              @click="handleDelete"
              class="btn btn-error btn-sm gap-2 sm:w-auto min-h-[44px]"
            >
              <Trash2 :size="16" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ProfileAvatar from '../Profiles/ProfileAvatar.vue'
import DifficultyRating from './DifficultyRating.vue'
import { getAssignmentProgress, getStatusLabel, getProgressColor } from '../../utils/progressHelper'
import { Edit2, Save, X, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  assignment: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  instruments: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['edit-click', 'save', 'cancel', 'delete'])

// Edit form state
const editForm = ref({
  status: props.assignment.status || 'not_started',
  instrument_id: props.assignment.instrument?.id || null,
  difficulty_rating: props.assignment.difficulty_rating
})

// Reset form when assignment changes or editing state changes
watch(() => [props.assignment, props.isEditing], () => {
  if (props.isEditing) {
    editForm.value = {
      status: props.assignment.status || 'not_started',
      instrument_id: props.assignment.instrument?.id || null,
      difficulty_rating: props.assignment.difficulty_rating
    }
  }
}, { deep: true })

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

const hasChanges = computed(() => {
  return (
    editForm.value.status !== props.assignment.status ||
    editForm.value.instrument_id !== props.assignment.instrument?.id ||
    editForm.value.difficulty_rating !== props.assignment.difficulty_rating
  )
})

function handleSave() {
  const updates = {
    status: editForm.value.status,
    instrument_id: editForm.value.instrument_id,
    difficulty_rating: editForm.value.difficulty_rating
  }
  emit('save', updates)
}

function handleCancel() {
  emit('cancel')
}

function handleDelete() {
  const confirmed = window.confirm(
    `Remove ${displayName.value}'s assignment from this song?`
  )
  if (confirmed) {
    emit('delete')
  }
}
</script>