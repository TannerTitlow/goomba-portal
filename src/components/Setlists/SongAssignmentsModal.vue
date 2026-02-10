<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSongAssignments } from '@/composables/useSongAssignments'
import { useInstruments } from '../../composables/useInstruments'
import { useProfiles } from '../../composables/useProfiles'
import AssignmentCard from '../Assignments/AssignmentCard.vue'
import { Music, X, ClipboardList, Plus, AlertCircle, RefreshCw } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  song: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const {
  fetchSongAssignments,
  songAssignments,
  addSongAssignment,
  updateSongAssignment,
  deleteSongAssignment,
  subscribeToSongAssignments,
  loading,
  error
} = useSongAssignments()
const { instruments, subscribeToInstruments } = useInstruments()
const { fetchProfiles, profiles } = useProfiles()

// Local State
const addForm = ref({
  user_id: null,
  instrument_id: null
})
const editingAssignmentId = ref(null)
const submitting = ref(false)

let realtimeAssignmentsChannel = null
let realtimeInstrumentsChannel = null

async function handleAddAssignment() {
  if (!addForm.value.user_id || !addForm.value.instrument_id || submitting.value) return

  submitting.value = true
  try {
    await addSongAssignment({
      song_id: props.song.id,
      user_id: addForm.value.user_id,
      instrument_id: addForm.value.instrument_id
    })
    // Reset form
    addForm.value = {
      user_id: null,
      instrument_id: null
    }
  } catch (err) {
    // Check for duplicate assignment error
    if (err.message.includes('duplicate') || err.code === '23505') {
      alert('This person is already assigned to this instrument for this song.')
    } else {
      alert(`Error adding assignment: ${err.message}`)
    }
  } finally {
    submitting.value = false
  }
}

function handleEditClick(assignment) {
  editingAssignmentId.value = assignment.id
}

async function handleSaveEdit(assignmentId, updates) {
  if (submitting.value) return

  submitting.value = true
  try {
    await updateSongAssignment(assignmentId, updates)
    editingAssignmentId.value = null
  } catch (err) {
    alert(`Error updating assignment: ${err.message}`)
  } finally {
    submitting.value = false
  }
}

function handleCancelEdit() {
  editingAssignmentId.value = null
}

async function handleDeleteAssignment(assignmentId) {
  if (submitting.value) return

  submitting.value = true
  try {
    await deleteSongAssignment(assignmentId)
    editingAssignmentId.value = null
  } catch (err) {
    alert(`Error deleting assignment: ${err.message}`)
  } finally {
    submitting.value = false
  }
}

function closeModal() {
  emit('close')
  // Reset state
  addForm.value = {
    user_id: null,
    instrument_id: null
  }
  editingAssignmentId.value = null
  error.value = null
}

// Lifecycle
onMounted(async () => {
  await fetchProfiles()
  await fetchSongAssignments(props.song.id)

  // Subscribe to real-time updates
  realtimeAssignmentsChannel = subscribeToSongAssignments()
  realtimeInstrumentsChannel = subscribeToInstruments()
})

onUnmounted(() => {
  if (realtimeAssignmentsChannel) {
    realtimeAssignmentsChannel.unsubscribe()
  }
  if (realtimeInstrumentsChannel) {
    realtimeInstrumentsChannel.unsubscribe()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-150"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="isOpen" class="card bg-base-200 w-full max-w-2xl sm:max-w-3xl max-h-[90vh] shadow-2xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="card-body p-3 sm:p-4 pb-3 border-b border-white/5">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Music :size="18" class="text-primary sm:w-5 sm:h-5" />
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-sm sm:text-base font-medium text-base-content/60">Assignments for</h2>
                    <p class="text-base sm:text-lg font-bold text-primary truncate">{{ props.song.title }}</p>
                  </div>
                </div>
                <button @click="closeModal" class="btn btn-ghost btn-sm btn-circle shrink-0 min-h-[44px] w-11 h-11">
                  <X :size="20" />
                </button>
              </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto min-h-0">
              <!-- Loading State -->
              <div v-if="loading" class="flex flex-col items-center justify-center py-16 px-6">
                <span class="loading loading-spinner loading-lg text-primary"></span>
                <p class="mt-4 text-base-content/60">Loading assignments...</p>
              </div>

              <!-- Error State -->
              <div v-else-if="error" class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div class="w-16 h-16 rounded-2xl bg-error/20 flex items-center justify-center mb-4">
                  <AlertCircle :size="32" class="text-error" />
                </div>
                <p class="text-error font-medium mb-4 break-words">{{ error }}</p>
                <button @click="fetchSongAssignments(song.id)" class="btn btn-primary btn-sm gap-2 min-h-[44px]">
                  <RefreshCw :size="18" />
                  Retry
                </button>
              </div>

              <!-- Song Assignments -->
              <div v-else-if="songAssignments.length" class="p-3 sm:p-4 space-y-3">
                <AssignmentCard
                  v-for="assignment in songAssignments"
                  :key="assignment.id"
                  :assignment="assignment"
                  :is-editing="editingAssignmentId === assignment.id"
                  :instruments="instruments"
                  @edit-click="handleEditClick(assignment)"
                  @save="handleSaveEdit(assignment.id, $event)"
                  @cancel="handleCancelEdit"
                  @delete="handleDeleteAssignment(assignment.id)"
                />
              </div>

              <!-- Empty State -->
              <div v-else class="flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mb-4 border border-primary/20">
                  <ClipboardList :size="32" :stroke-width="1.5" class="text-primary sm:w-10 sm:h-10" />
                </div>
                <p class="text-base-content/60 text-sm sm:text-base">No assignments yet</p>
                <p class="text-base-content/40 text-xs sm:text-sm mt-1">Add band members below to get started</p>
              </div>
            </div>

            <!-- Add Assignment Form (Footer) -->
            <div class="border-t border-white/5 bg-base-300/20 p-3 sm:p-4">
              <div class="space-y-3">
                <h3 class="text-sm font-semibold text-base-content/80 flex items-center gap-2">
                  <Plus :size="16" class="text-primary" />
                  Add Assignment
                </h3>

                <div class="flex flex-col sm:flex-row gap-3">
                  <!-- User Dropdown -->
                  <div class="form-control flex-1">
                    <label class="label py-1">
                      <span class="label-text text-xs">Band Member</span>
                    </label>
                    <select
                      v-model="addForm.user_id"
                      class="select select-bordered select-sm w-full bg-base-100"
                      :disabled="submitting"
                    >
                      <option :value="null">Select member...</option>
                      <option
                        v-for="profile in profiles"
                        :key="profile.id"
                        :value="profile.id"
                      >
                        {{ profile.display_name || profile.full_name || profile.email }}
                      </option>
                    </select>
                  </div>

                  <!-- Instrument Dropdown -->
                  <div class="form-control flex-1">
                    <label class="label py-1">
                      <span class="label-text text-xs">Instrument</span>
                    </label>
                    <select
                      v-model="addForm.instrument_id"
                      class="select select-bordered select-sm w-full bg-base-100"
                      :disabled="submitting"
                    >
                      <option :value="null">Select instrument...</option>
                      <option
                        v-for="instrument in instruments"
                        :key="instrument.id"
                        :value="instrument.id"
                      >
                        {{ instrument.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Add Button -->
                  <div class="form-control sm:self-end">
                    <label class="label py-1 sm:hidden">
                      <span class="label-text text-xs opacity-0">Action</span>
                    </label>
                    <button
                      @click="handleAddAssignment"
                      :disabled="!addForm.user_id || !addForm.instrument_id || submitting"
                      class="btn btn-primary btn-sm gap-2 w-full sm:w-auto min-h-[44px]"
                    >
                      <Plus :size="16" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
