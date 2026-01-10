<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Song from Spotify</h2>
            <button @click="closeModal" class="btn-close">×</button>
          </div>

          <input
            ref="searchInput"
            v-model="searchQuery"
            @input="handleSearch"
            placeholder="Search for songs..."
            class="search-input"
            autofocus
          />

          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Searching Spotify...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button @click="handleSearch" class="btn-retry">Retry</button>
          </div>

          <div v-else-if="results.length" class="results-list">
            <div
              v-for="track in results"
              :key="track.id"
              @click="selectTrack(track)"
              class="result-item"
            >
              <img
                v-if="track.album?.images?.[2]?.url"
                :src="track.album.images[2].url"
                :alt="track.album.name"
                class="album-thumb"
              />
              <div class="album-thumb-placeholder" v-else>♪</div>

              <div class="track-info">
                <div class="track-name">{{ track.name }}</div>
                <div class="track-artist">
                  {{ track.artists.map(a => a.name).join(', ') }}
                </div>
                <div class="track-meta">
                  {{ track.album.name }} • {{ formatDuration(track.duration_ms) }}
                </div>
              </div>

              <button class="btn-add">Add</button>
            </div>
          </div>

          <div v-else-if="searchQuery" class="empty-state">
            <p>No results for "{{ searchQuery }}"</p>
          </div>

          <div v-else class="empty-state">
            <p>Search for songs to add to your setlist</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useSpotify } from '@/composables/useSpotify'

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

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.btn-close {
  background: none;
  border: none;
  color: #b3b3b3;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #333;
  color: #fff;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #000000;
  border: 2px solid #333333;
  border-radius: 8px;
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1db954;
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.1);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #b3b3b3;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #f44336;
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #1ed760;
  transform: scale(1.05);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 50vh;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.result-item:hover {
  background: #222222;
}

.album-thumb {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.album-thumb-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-name {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.875rem;
  color: #b3b3b3;
  margin-bottom: 0.125rem;
}

.track-meta {
  font-size: 0.75rem;
  color: #666;
}

.btn-add {
  padding: 0.5rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-add:hover {
  background: #1ed760;
  transform: scale(1.05);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .modal-content {
    max-width: none;
    max-height: 100%;
    height: 100%;
    border-radius: 0;
    padding: 1rem;
  }

  .btn-add {
    min-height: 44px;
  }
}
</style>
