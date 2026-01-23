<template>
  <div class="setlists-board">
    <header class="board-header">
      <h1 class="board-title">Setlists</h1>
      <button @click="showCreateDialog = true" class="btn-create">
        + Create List
      </button>
    </header>

    <div v-if="loading && lists.length === 0" class="loading-board">
      <div class="spinner-large"></div>
      <p>Loading setlists...</p>
    </div>

    <div v-else-if="error" class="error-board">
      <p>{{ error }}</p>
      <button @click="fetchLists" class="btn-retry">Retry</button>
    </div>

    <div v-else-if="lists.length === 0" class="empty-board">
      <h2>No setlists yet</h2>
      <p>Create your first setlist to start organizing your songs</p>
      <button @click="showCreateDialog = true" class="btn-create-large">
        + Create Setlist
      </button>
    </div>

    <div v-else class="columns-container">
      <SetlistColumn
        v-for="list in lists"
        :key="list.id"
        :list="list"
        :songs="songs[list.id] || []"
        :loading="loadingSongs[list.id]"
        @add-song="openSearchModal(list.id)"
        @delete="deleteList(list.id)"
        @update="updateList(list.id, $event)"
        @reorder-song="reorderSong(list.id, $event, $event)"
        @remove-song="removeSong(list.id, $event)"
      />
    </div>

    <!-- Create List Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateDialog"
          class="modal-overlay"
          @click.self="showCreateDialog = false"
        >
          <div class="dialog-content">
            <h2>Create New Setlist</h2>
            <input
              ref="listNameInput"
              v-model="newListName"
              @keydown.enter="createNewList"
              placeholder="Setlist name..."
              class="dialog-input"
            />
            <div class="dialog-actions">
              <button @click="showCreateDialog = false" class="btn-cancel">
                Cancel
              </button>
              <button
                @click="createNewList"
                :disabled="!newListName.trim()"
                class="btn-confirm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Spotify Search Modal -->
    <SpotifySearchModal
      :is-open="searchModalOpen"
      :list-id="selectedListId"
      @close="closeSearchModal"
      @select="handleSongSelect"
    />

    <!-- Toast notifications -->
    <Transition name="toast">
      <div v-if="toast.visible" class="toast" :class="`toast-${toast.type}`">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSetlists } from '@/composables/useSetlists'
import { useListSongs } from '@/composables/useListSongs'
import SetlistColumn from '@/components/Setlists/SetlistColumn.vue'
import SpotifySearchModal from '@/components/Setlists/SpotifySearchModal.vue'

const router = useRouter()

// Composables
const {
  lists,
  loading,
  error,
  fetchLists,
  createList,
  updateList: updateListData,
  deleteList: deleteListData,
  subscribeToLists
} = useSetlists()

const {
  songs,
  fetchListSongs,
  addSongToList,
  removeSongFromList,
  reorderSong: reorderSongData
} = useListSongs()

// Local state
const showCreateDialog = ref(false)
const newListName = ref('')
const listNameInput = ref(null)
const searchModalOpen = ref(false)
const selectedListId = ref(null)
const loadingSongs = ref({})
const toast = ref({
  visible: false,
  message: '',
  type: 'success'
})

let realtimeChannel = null

// Toast notification helper
function showToast(message, type = 'success') {
  toast.value = { visible: true, message, type }
  setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}

// List operations
async function createNewList() {
  if (!newListName.value.trim()) return

  try {
    await createList(newListName.value.trim())
    showToast('Setlist created!')
    newListName.value = ''
    showCreateDialog.value = false
  } catch (err) {
    showToast(err.message, 'error')
  }
}

async function updateList(listId, updates) {
  try {
    await updateListData(listId, updates)
    showToast('List updated!')
  } catch (err) {
    showToast(err.message, 'error')
  }
}

async function deleteList(listId) {
  try {
    await deleteListData(listId)
    showToast('List deleted')
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// Song operations
function openSearchModal(listId) {
  selectedListId.value = listId
  searchModalOpen.value = true
}

function closeSearchModal() {
  searchModalOpen.value = false
  selectedListId.value = null
}

async function handleSongSelect(track) {
  if (!selectedListId.value) return

  try {
    await addSongToList(selectedListId.value, track)
    showToast(`Added "${track.name}"`)
  } catch (err) {
    if (err.message.includes('already in the list')) {
      showToast('Song already in this list', 'warning')
    } else if (err.message.includes('expired')) {
      showToast('Spotify session expired. Please log in again.', 'error')
      setTimeout(() => router.push('/login'), 2000)
    } else {
      showToast(err.message, 'error')
    }
  }
}

async function removeSong(listId, song) {
  try {
    await removeSongFromList(listId, song.list_song_id)
    showToast(`Removed "${song.title}"`)
  } catch (err) {
    showToast(err.message, 'error')
  }
}

async function reorderSong(listId, song, direction) {
  try {
    await reorderSongData(listId, song.list_song_id, direction)
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// Focus input when create dialog opens
watch(showCreateDialog, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      listNameInput.value?.focus()
    })
  }
})

// Lifecycle
onMounted(async () => {
  await fetchLists()

  // Load songs for each list
  for (const list of lists.value) {
    loadingSongs.value[list.id] = true
    try {
      await fetchListSongs(list.id)
    } catch (err) {
      console.error(`Failed to load songs for list ${list.id}:`, err)
    } finally {
      loadingSongs.value[list.id] = false
    }
  }

  // Subscribe to real-time updates
  realtimeChannel = subscribeToLists()
})

onUnmounted(() => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
  }
})
</script>

<style scoped>
.setlists-board {
  min-height: 100vh;
  background: #000000;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #333;
}

.board-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1db954 0%, #1ed760 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-create {
  padding: 0.75rem 1.5rem;
  background: #1db954;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create:hover {
  background: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
}

.columns-container {
  flex: 1;
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.columns-container::-webkit-scrollbar {
  height: 12px;
}

.columns-container::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 6px;
}

.columns-container::-webkit-scrollbar-thumb:hover {
  background: #1db954;
}

.loading-board,
.error-board,
.empty-board {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner-large {
  width: 60px;
  height: 60px;
  border: 4px solid #333;
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-board {
  color: #f44336;
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #1db954;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.empty-board h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #fff;
}

.empty-board p {
  margin: 0 0 2rem 0;
  color: #666;
  font-size: 1.125rem;
}

.btn-create-large {
  padding: 1rem 2rem;
  background: #1db954;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-large:hover {
  background: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
}

/* Create Dialog */
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

.dialog-content {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.dialog-content h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #fff;
}

.dialog-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #000;
  border: 2px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.dialog-input:focus {
  outline: none;
  border-color: #1db954;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #333;
  color: #fff;
}

.btn-cancel:hover {
  background: #444;
}

.btn-confirm {
  background: #1db954;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #1ed760;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Toast notifications */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.toast-success {
  background: #1db954;
}

.toast-error {
  background: #f44336;
}

.toast-warning {
  background: #ff9800;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(1rem);
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

/* Mobile responsiveness */
@media (max-width: 768px) {
  .board-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .board-title {
    font-size: 1.5rem;
  }

  .btn-create {
    width: 100%;
  }

  .columns-container {
    padding: 1rem;
  }

  .toast {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
}
</style>
