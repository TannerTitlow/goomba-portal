<template>
  <div
    :class="[
      'card bg-base-200/60 backdrop-blur-xl shadow-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 relative',
      isMobileDragging
        ? 'w-full min-h-[80px] flex-row items-center'
        : 'w-[calc(100vw-2rem)] sm:w-[calc(100vw-3rem)] lg:min-w-80 lg:w-auto shrink-0 snap-start snap-center [&:has(.drag-handle:hover)]:shadow-2xl [&:has(.drag-handle:hover)]:shadow-primary/10 [&:has(.drag-handle:hover)]:-translate-y-1 [&:has(.drag-handle:hover)]:border-primary/30',
      isDraggingOver && isMobileDragging ? 'border-primary bg-primary/20 shadow-primary/30' : ''
    ]"
  >
    <!-- Compact Mobile Drag View - Display Only -->
    <div v-if="isMobileDragging" class="flex-1 flex items-center gap-3 p-3 pointer-events-none">
      <div class="flex-1 min-w-0">
        <h2 class="text-base font-bold truncate" :title="list.name">
          {{ list.name }}
        </h2>
        <p class="text-xs text-base-content/50">
          {{ localSongs.length }} {{ localSongs.length === 1 ? 'song' : 'songs' }}
        </p>
      </div>
      <div class="shrink-0 text-base-content/40">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
        </svg>
      </div>
    </div>

    <!-- Header - Normal View -->
    <div v-else class="drag-handle card-body p-4 sm:p-5 pb-3 sm:pb-4 border-b border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors" role="button" aria-label="Drag to reorder list" tabindex="-1">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <input
            v-if="editingTitle"
            ref="titleInput"
            v-model="editedName"
            @blur="saveTitle"
            @keydown.enter="saveTitle"
            @keydown.esc="cancelEdit"
            type="text"
            :placeholder="list.name"
            class="input input-primary input-sm w-full rounded-lg font-bold text-lg focus:outline-offset-0"
            aria-label="Edit list name"
          />
          <h2
            v-else
            @click="startEdit"
            class="text-lg sm:text-xl font-bold truncate px-2 py-1 -mx-2 rounded-lg hover:bg-white/10 transition-colors"
            :title="list.name"
          >
            {{ list.name }}
          </h2>
        </div>

        <button tabindex="0" @click="confirmDelete" class="btn btn-ghost btn-sm btn-circle text-error/50 hover:text-error hover:bg-error/20 transition-colors">
          <Trash2 :size="18" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="!isMobileDragging && loading" class="flex flex-col items-center justify-center py-16 px-6">
      <span class="loading loading-spinner loading-md text-primary"></span>
      <p class="mt-3 text-sm text-base-content/60">Loading songs...</p>
    </div>

    <!-- Songs List / Drop Zone -->
    <div class="relative flex-1 overflow-hidden" :class="{ 'absolute inset-0 z-10': isMobileDragging }">
      <draggable
        v-model="localSongs"
        :group="{ name: 'songs', pull: 'clone', put: true }"
        item-key="list_song_id"
        :class="[
          isMobileDragging
            ? 'absolute inset-0'
            : 'overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)]',
          {
            'pointer-events-none': processing,
            'drop-zone-active': isDraggingOver
          }
        ]"
        :data-list-id="list.id"
        :animation="isMobileDragging ? 0 : 200"
        :delay="100"
        :delayOnTouchOnly="true"
        :disabled="processing"
        ghost-class="opacity-50"
        drag-class="dragging-song"
        @start="handleDragStart"
        @move="handleDragMove"
        @end="handleDragEnd"
        @add="handleSongAdded"
      >
        <template #item="{ element: song, index }">
          <SongCard
            v-if="!isMobileDragging"
            :song="song"
            @remove="handleRemove(song)"
            @manage-assignments="$emit('manage-song-assignments', song)"
            @play="handleSongPlay(song, index)"
          />
          <div v-else class="hidden"></div>
        </template>
      </draggable>

      <!-- Empty State -->
      <div v-if="!isMobileDragging && localSongs.length === 0 && !isDraggingOver" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
        <div class="w-16 h-16 rounded-2xl bg-base-300/50 flex items-center justify-center mb-4">
          <Music :size="32" :stroke-width="1.5" class="text-base-content/30" />
        </div>
        <p class="text-sm text-base-content/50 mb-4">No songs yet</p>
        <button @click="$emit('add-song')" class="btn btn-primary gap-2 pointer-events-auto">
          <Plus :size="16" />
          Add your first song
        </button>
      </div>
    </div>
    <!-- Footer -->
    <button v-if="!isMobileDragging" @click="$emit('add-song')" class="btn btn-block gap-2 rounded-none hover:btn-primary">
      <Plus :size="16" :stroke-width="2.5" />
      <span class="font-semibold">Add Song</span>
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import draggable from 'vuedraggable'
import SongCard from './SongCard.vue'
import { Plus, MoreVertical, Edit2, Trash2, Music } from 'lucide-vue-next'
import { useSpotify } from '@/composables/useSpotify'

const props = defineProps({
  list: {
    type: Object,
    required: true
  },
  songs: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  processing: {
    type: Boolean,
    default: false
  },
  isDraggingOver: {
    type: Boolean,
    default: false
  },
  isMobileDragging: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-song', 'delete', 'update', 'reorder-songs', 'copy-song', 'remove-song', 'dragging-to', 'manage-song-assignments', 'drag-start', 'drag-end', 'show-toast'])

const { playTrack } = useSpotify()

const editingTitle = ref(false)
const editedName = ref('')
const titleInput = ref(null)
const localSongs = ref([...props.songs])
const isDragging = ref(false)
const lastDragTo = ref(null)

// Watch for external changes to songs prop
watch(() => props.songs, (newSongs) => {
  if (!isDragging.value) {
    localSongs.value = [...newSongs]
  }
}, { deep: true })

function startEdit() {
  editedName.value = props.list.name
  editingTitle.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function saveTitle() {
  if (editedName.value.trim() && editedName.value !== props.list.name) {
    emit('update', { name: editedName.value.trim() })
  }
  editingTitle.value = false
}

function cancelEdit() {
  editingTitle.value = false
  editedName.value = ''
}

function confirmDelete() {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${props.list.name}"? This will remove all songs from this list.`
  )
  if (confirmed) {
    emit('delete')
  }
}

function handleDragStart(evt) {
  isDragging.value = true
  // add 'dragging' class to evt.item for styling
  evt.item.classList.add('dragging')
  emit('drag-start')
}

function handleDragMove(evt) {
  lastDragTo.value = evt.to

  const fromListId = evt.from?.dataset?.listId
  const toListId = evt.to?.dataset?.listId

  emit('dragging-to', {
    fromListId: fromListId,
    toListId: toListId,
  })
}

function handleDragEnd(evt) {
  isDragging.value = false
  evt.item.style.cursor = ''
  evt.item.classList.remove('dragging')

  const fromListId = evt.from?.dataset?.listId
  const toListId = evt.to?.dataset?.listId

  if (lastDragTo.value) {
    lastDragTo.value = null
  }

  emit('drag-end')

  // Only handle reorder within same list (compare by list ID, not DOM element)
  if (fromListId && toListId && fromListId === toListId && evt.from === evt.to) {
    emit('reorder-songs', props.list.id, localSongs.value)
  }
}

async function handleSongAdded(evt) {
  // Handle song added from another list (copy behavior)
  const fromListId = evt.from?.dataset?.listId
  const toListId = props.list.id

  console.log('[SetlistColumn] Song added:', { fromListId, toListId, isMobileDragging: props.isMobileDragging })

  if (fromListId !== toListId) {
    // Wait for v-model to update
    await nextTick()

    // Find the newly added song by comparing with original props
    const originalIds = new Set(props.songs.map(s => s.list_song_id))
    const newSong = localSongs.value.find(s => !originalIds.has(s.list_song_id))

    if (!newSong) {
      console.error('[SetlistColumn] Could not find newly added song')
      return
    }

    // Remove the cloned element from local state
    const indexToRemove = localSongs.value.findIndex(s => s.list_song_id === newSong.list_song_id)
    if (indexToRemove !== -1) {
      localSongs.value.splice(indexToRemove, 1)
    }

    console.log('[SetlistColumn] Emitting copy-song:', { toListId, songId: newSong.id })
    emit('copy-song', props.list.id, newSong)
  }
}

function handleRemove(song) {
  const confirmed = window.confirm(
    `Remove "${song.title}" from this list?`
  )
  if (confirmed) {
    emit('remove-song', song)
  }
}

async function handleSongPlay(song, index) {
  // Convert song object to have preview_url if needed
  const trackToPlay = {
    ...song,
    preview_url: song.preview_url || null,
    spotify_id: song.spotify_id,
    name: song.title,
    artists: [{ name: song.artist }],
  }

  const success = await playTrack(trackToPlay, props.songs, index)
  if (!success) {
    emit('show-toast', 'Preview not available for this track', 'warning')
  }
}
</script>

<style>
/* Global style needed for Sortable.js drag-class */
.dragging-song {
  transform: scale(1.05) rotate(1deg) !important;
  opacity: 0.9 !important;
  box-shadow: 0 25px 50px -12px rgba(0, 255, 136, 0.25) !important;
  z-index: 9999 !important;
}
</style>
