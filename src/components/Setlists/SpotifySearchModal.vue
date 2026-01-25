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
          <div v-if="isOpen" class="card bg-base-200 w-full max-w-2xl max-h-[90vh] shadow-2xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="card-body p-4 sm:p-6 pb-4 border-b border-white/5">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Music :size="20" class="text-primary" />
                  </div>
                  <h2 class="card-title text-xl sm:text-2xl font-bold">Add Song from Spotify</h2>
                </div>
                <button @click="closeModal" class="btn btn-ghost btn-sm btn-circle">
                  <X :size="20" />
                </button>
              </div>

              <!-- Search Input -->
              <div class="form-control w-full">
                <div class="relative">
                  <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 z-10" :size="20" />
                  <input
                    ref="searchInput"
                    v-model="searchQuery"
                    @input="handleSearch"
                    type="text"
                    placeholder="Search for songs, artists, or albums..."
                    class="input input-bordered input-primary w-full pl-12 text-base focus:outline-offset-0"
                  />
                </div>
              </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto">
              <!-- Loading State -->
              <div v-if="loading" class="flex flex-col items-center justify-center py-16 px-6">
                <span class="loading loading-spinner loading-lg text-primary"></span>
                <p class="mt-4 text-base-content/60">Searching Spotify...</p>
              </div>

              <!-- Error State -->
              <div v-else-if="error" class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div class="w-16 h-16 rounded-2xl bg-error/20 flex items-center justify-center mb-4">
                  <AlertCircle :size="32" class="text-error" />
                </div>
                <p class="text-error font-medium mb-4">{{ error }}</p>
                <button @click="handleSearch" class="btn btn-primary btn-sm rounded-xl gap-2 min-h-[44px]">
                  <RefreshCw :size="18" />
                  Retry
                </button>
              </div>

              <!-- Results List -->
              <div v-else-if="results.length" class="p-3 sm:p-4 space-y-2">
                <div
                  v-for="track in results"
                  :key="track.id"
                  @click="selectTrack(track)"
                  class="group card card-side bg-base-300/40 backdrop-blur-sm border border-white/5 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:bg-base-300/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:translate-x-1"
                >
                  <!-- Album Art -->
                  <figure class="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shadow-md ring-1 ring-white/10">
                    <img
                      v-if="track.album?.images?.[2]?.url"
                      :src="track.album.images[2].url"
                      :alt="track.album.name"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full bg-gradient-to-br from-base-content/10 to-base-content/5 flex items-center justify-center">
                      <Music :size="24" :stroke-width="1.5" class="text-base-content/30" />
                    </div>
                  </figure>

                  <!-- Track Info -->
                  <div class="flex-1 min-w-0 flex flex-col justify-center px-3">
                    <h3 class="font-semibold text-sm sm:text-base truncate text-white/95 group-hover:text-primary transition-colors">
                      {{ track.name }}
                    </h3>
                    <p class="text-xs sm:text-sm text-base-content/50 truncate">
                      {{ track.artists.map(a => a.name).join(', ') }}
                    </p>
                    <p class="text-xs text-base-content/30 truncate mt-0.5">
                      {{ track.album.name }} • {{ formatDuration(track.duration_ms) }}
                    </p>
                  </div>

                  <!-- Add Button -->
                  <div class="shrink-0 flex items-center">
                    <button class="btn btn-primary gap-2 transition-all">
                      <Plus :size="16" :stroke-width="2.5" />
                      <span class="hidden sm:inline font-semibold">Add</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- No Results -->
              <div v-else-if="searchQuery" class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div class="w-16 h-16 rounded-2xl bg-base-300/50 flex items-center justify-center mb-4">
                  <SearchX :size="32" :stroke-width="1.5" class="text-base-content/30" />
                </div>
                <p class="text-base-content/60">No results for <span class="font-semibold">"{{ searchQuery }}"</span></p>
                <p class="text-sm text-base-content/40 mt-2">Try different keywords or check your spelling</p>
              </div>

              <!-- Empty State -->
              <div v-else class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mb-4 border border-primary/20">
                  <Search :size="40" :stroke-width="1.5" class="text-primary" />
                </div>
                <p class="text-base-content/60 text-sm sm:text-base">Search for songs to add to your setlist</p>
                <p class="text-xs text-base-content/40 mt-2">Start typing to find tracks on Spotify</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useSpotify } from '@/composables/useSpotify'
import { Music, X, Search, Plus, AlertCircle, RefreshCw, SearchX } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  listId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'select'])

const { searchTracks, loading, error: spotifyError } = useSpotify()

const searchQuery = ref('')
const results = ref([])
const error = ref(null)
const searchInput = ref(null)

const handleSearch = useDebounceFn(async () => {
  error.value = null

  if (searchQuery.value.length < 2) {
    results.value = []
    return
  }

  try {
    results.value = await searchTracks(searchQuery.value)
  } catch (err) {
    error.value = err.message
    results.value = []
  }
}, 300)

function selectTrack(track) {
  emit('select', track)
  closeModal()
}

function closeModal() {
  emit('close')
  // Reset state
  searchQuery.value = ''
  results.value = []
  error.value = null
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Focus input when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})
</script>
