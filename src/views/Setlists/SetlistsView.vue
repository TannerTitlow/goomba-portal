<template>
  <div class="min-h-screen bg-gradient-to-b from-[#000000] to-[#0a0a0a] text-white flex flex-col">
    <header class="sticky top-0 z-20 backdrop-blur-xl bg-black/70 border-b border-white/5">
      <div class="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-3">
        <!-- Top Row: Title & Button -->
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-3">
            <div class="w-1 h-12 bg-gradient-to-b from-[#1db954] to-[#00ff88] rounded-full"></div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Setlists</h1>
          </div>
          <button
            @click="showCreateDialog = true"
            class="btn btn-primary gap-2"
          >
            <Plus :size="20" :stroke-width="2.5" />
            <span class="font-semibold">Create List</span>
          </button>
        </div>

        <!-- Pagination Dots (Mobile/Tablet only) -->
        <div
          v-if="isMobile && lists.length > 1 && !isMobileDragging"
          class="flex items-center justify-center gap-2 py-2"
        >
          <button
            v-for="(list, index) in lists"
            :key="list.id"
            @click="scrollToList(index)"
            class="transition-all duration-200"
            :class="[
              activeListIndex === index
                ? 'w-2 h-2 bg-primary rounded-full'
                : 'w-1.5 h-1.5 bg-base-content/30 rounded-full hover:bg-base-content/50'
            ]"
            :aria-label="`Go to ${list.name}`"
          />
        </div>
      </div>
    </header>

    <div v-if="loading && lists.length === 0" class="flex-1 flex flex-col items-center justify-center p-8">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-base-content/60">Loading setlists...</p>
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div class="alert alert-error max-w-md rounded-2xl shadow-xl">
        <AlertCircle :size="24" />
        <span>{{ error }}</span>
      </div>
      <button @click="fetchLists" class="btn btn-primary mt-6 rounded-xl min-h-[44px]">
        <RefreshCw :size="18" />
        Retry
      </button>
    </div>

    <div v-else-if="lists.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div class="max-w-md space-y-6">
        <div class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-primary/20">
          <ListMusic :size="40" :stroke-width="1.5" class="text-primary" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl sm:text-3xl font-bold">No setlists yet</h2>
          <p class="text-base-content/60 text-sm sm:text-base">Create your first setlist to start organizing your songs</p>
        </div>
        <button @click="showCreateDialog = true" class="btn btn-primary btn-lg gap-2 rounded-xl shadow-lg min-h-[44px]">
          <Plus :size="20" :stroke-width="2.5" />
          Create Setlist
        </button>
      </div>
    </div>

    <draggable
      v-else
      ref="listsContainerRef"
      v-model="lists"
      item-key="id"
      :class="[
        'flex-1 min-h-[calc(100vh-200px)] transition-all duration-300',
        isMobileDragging
          ? 'flex flex-col gap-3 overflow-y-auto p-3'
          : 'flex gap-4 sm:gap-5 lg:gap-6 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 overflow-x-auto overflow-y-hidden items-start',
        !isMobileDragging && isMobile ? 'snap-x snap-mandatory scroll-px-4 sm:scroll-px-6' : ''
      ]"
      :animation="200"
      :delay="100"
      :delayOnTouchOnly="true"
      :disabled="processing"
      handle=".drag-handle"
      ghost-class="opacity-50"
      @end="handleColumnsReordered"
    >
      <template #item="{ element: list }">
        <SetlistColumn
          :list="list"
          :songs="songs[list.id] || []"
          :loading="loadingSongs[list.id]"
          :processing="processing"
          :isDraggingOver="dragOverData[list.id]"
          :isMobileDragging="isMobileDragging"
          @add-song="openSearchModal(list.id)"
          @delete="deleteList(list.id)"
          @update="updateList(list.id, $event)"
          @reorder-songs="handleReorderSongs"
          @copy-song="handleCopySong"
          @remove-song="removeSong(list.id, $event)"
          @manage-song-assignments="(song) => openAssignmentsModal(song)"
          @dragging-to="(payload) => setDragOverData(payload)"
          @drag-start="handleGlobalDragStart"
          @drag-end="handleGlobalDragEnd"
          @show-toast="showToast"
        />
      </template>
    </draggable>

    <!-- Create List Dialog -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showCreateDialog"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          @click.self="showCreateDialog = false"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            leave-active-class="transition-all duration-150"
            enter-from-class="opacity-0 scale-95"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showCreateDialog" class="card bg-base-200 w-full max-w-md shadow-2xl border border-white/10 rounded-2xl">
              <div class="card-body gap-6">
                <div class="flex items-start justify-between">
                  <h2 class="card-title text-2xl font-bold">Create New Setlist</h2>
                  <button @click="showCreateDialog = false" class="btn btn-ghost btn-sm btn-circle">
                    <X :size="20" />
                  </button>
                </div>

                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text font-medium">Setlist Name</span>
                  </label>
                  <input
                    ref="listNameInput"
                    v-model="newListName"
                    @keydown.enter="createNewList"
                    type="text"
                    placeholder="e.g., Summer Tour 2026"
                    class="input input-bordered input-primary w-full text-base focus:outline-offset-0"
                  />
                </div>

                <div class="card-actions justify-end gap-2">
                  <button @click="showCreateDialog = false" class="btn btn-ghost btn-error">
                    Cancel
                  </button>
                  <button
                    @click="createNewList"
                    :disabled="!newListName.trim()"
                    class="btn btn-primary gap-2"
                  >
                    <Plus :size="18" />
                    Create
                  </button>
                </div>
              </div>
            </div>
          </Transition>
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

    <!-- Song Assignments Modal -->
    <SongAssignmentsModal v-if="selectedSongForAssignments"
      :is-open="assignmentsModalOpen"
      :song="selectedSongForAssignments"
      @close="closeAssignmentsModal"
    />

    <!-- Toast notifications -->
    <Transition
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-y-4"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="toast.visible" class="toast toast-end toast-bottom z-50">
        <div
          class="alert rounded-2xl shadow-2xl border min-w-[280px]"
          :class="{
            'alert-success border-success/30': toast.type === 'success',
            'alert-error border-error/30': toast.type === 'error',
            'alert-warning border-warning/30': toast.type === 'warning'
          }"
        >
          <CheckCircle v-if="toast.type === 'success'" :size="20" />
          <AlertCircle v-else-if="toast.type === 'error'" :size="20" />
          <AlertTriangle v-else-if="toast.type === 'warning'" :size="20" />
          <span class="font-medium">{{ toast.message }}</span>
        </div>
      </div>
    </Transition>

    <!-- Drag tooltip -->
    <DragTooltip />

    <!-- Music Player -->
    <MusicPlayer />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSetlists } from '@/composables/useSetlists'
import { useListSongs } from '@/composables/useListSongs'
import SetlistColumn from '@/components/Setlists/SetlistColumn.vue'
import SpotifySearchModal from '@/components/Setlists/SpotifySearchModal.vue'
import SongAssignmentsModal from '../../components/Setlists/SongAssignmentsModal.vue'
import DragTooltip from '@/components/Setlists/DragTooltip.vue'
import MusicPlayer from '@/components/Setlists/MusicPlayer.vue'
import draggable from 'vuedraggable'
import { Plus, ListMusic, AlertCircle, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-vue-next'

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
  subscribeToLists,
  reorderLists
} = useSetlists()

const {
  songs,
  fetchListSongs,
  addSongToList,
  removeSongFromList,
  reorderSongsInList,
  copySongToList
} = useListSongs()

// Local state
const showCreateDialog = ref(false)
const newListName = ref('')
const listNameInput = ref(null)
const searchModalOpen = ref(false)
const selectedListId = ref(null)
const assignmentsModalOpen = ref(false)
const selectedSongForAssignments = ref(null)
const loadingSongs = ref({})
const processing = ref(false)
const dragOverData = ref([])
const isMobileDragging = ref(false)
const isMobile = ref(false)
const activeListIndex = ref(0)
const listsContainerRef = ref(null)
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

function openAssignmentsModal(song) {
  selectedSongForAssignments.value = song
  assignmentsModalOpen.value = true
}

function closeAssignmentsModal() {
  assignmentsModalOpen.value = false
  selectedSongForAssignments.value = null
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

async function handleReorderSongs(listId, reorderedSongs) {
  if (processing.value) return

  processing.value = true
  try {
    await reorderSongsInList(listId, reorderedSongs)
    // No toast for reordering (too noisy)
  } catch (err) {
    showToast(err.message, 'error')
    // Reload songs to revert
    await fetchListSongs(listId)
  } finally {
    processing.value = false
  }
}

async function handleCopySong(targetListId, song) {
  console.log('[SetlistsView] handleCopySong:', { targetListId, song })
  if (processing.value) return

  processing.value = true
  try {
    await copySongToList(targetListId, song)
    const targetList = lists.value.find(l => l.id === targetListId)
    showToast(`Added "${song.title}" to ${targetList?.name || 'list'}`)
  } catch (err) {
    if (err.message.includes('already in the list')) {
      showToast('Song already in this list', 'warning')
    } else {
      showToast(err.message, 'error')
    }
    // Reload songs to ensure consistency
    await fetchListSongs(targetListId)
  } finally {
    processing.value = false
  }
}

async function handleColumnsReordered() {
  if (processing.value) return

  processing.value = true
  try {
    await reorderLists(lists.value)
    showToast('List order updated')
  } catch (err) {
    showToast(err.message, 'error')
    // Reload lists to revert
    await fetchLists()
  } finally {
    processing.value = false
  }
}

function setDragOverData(dragToData) {
  console.log('[SetlistsView] setDragOverData:', dragToData)
  for (const listId of lists.value.map(l => l.id)) {
    if (!dragToData || !dragToData.fromListId) {
      dragOverData.value[listId] = false
    } else if (dragToData.fromListId !== listId) {
      // We're dragging from another list
      dragOverData.value[listId] = dragToData.toListId === listId // isOver
    } else {
      dragOverData.value[listId] = false
    }
  }
}

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

function handleGlobalDragStart() {
  console.log('[SetlistsView] handleGlobalDragStart, isMobile:', isMobile.value)
  if (isMobile.value) {
    isMobileDragging.value = true
  }
}

function handleGlobalDragEnd() {
  console.log('[SetlistsView] handleGlobalDragEnd')
  isMobileDragging.value = false
}

function scrollToList(index) {
  if (!listsContainerRef.value) return

  const container = listsContainerRef.value.$el || listsContainerRef.value
  const listElements = container.children

  if (listElements[index]) {
    listElements[index].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }
}

function handleScroll() {
  if (!isMobile.value || !listsContainerRef.value) return

  const container = listsContainerRef.value.$el || listsContainerRef.value
  const scrollLeft = container.scrollLeft
  const listWidth = container.children[0]?.offsetWidth || 0
  const gap = 16 // gap-4 = 1rem = 16px

  // Calculate which list is most visible
  const index = Math.round(scrollLeft / (listWidth + gap))
  activeListIndex.value = Math.max(0, Math.min(index, lists.value.length - 1))
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

  // Check if mobile and listen for resize
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Add scroll listener for pagination dots
  nextTick(() => {
    if (listsContainerRef.value) {
      const container = listsContainerRef.value.$el || listsContainerRef.value
      container.addEventListener('scroll', handleScroll)
    }
  })
})

onUnmounted(() => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
  }
  window.removeEventListener('resize', checkMobile)

  if (listsContainerRef.value) {
    const container = listsContainerRef.value.$el || listsContainerRef.value
    container.removeEventListener('scroll', handleScroll)
  }
})
</script>
