<template>
  <div class="card bg-base-200/60 backdrop-blur-xl min-w-80 sm:min-w-96 shrink-0 shadow-xl border border-white/10 rounded-2xl overflow-hidden snap-start transition-all duration-300 [&:has(.drag-handle:hover)]:shadow-2xl [&:has(.drag-handle:hover)]:shadow-primary/10 [&:has(.drag-handle:hover)]:-translate-y-1 [&:has(.drag-handle:hover)]:border-primary/30">
    <!-- Header -->
    <div class="drag-handle card-body p-4 sm:p-5 pb-3 sm:pb-4 border-b border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors" role="button" aria-label="Drag to reorder list" tabindex="-1">
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

        <button tabindex="0" @click="confirmDelete" class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/20 transition-colors">
          <Trash2 :size="18" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16 px-6">
      <span class="loading loading-spinner loading-md text-primary"></span>
      <p class="mt-3 text-sm text-base-content/60">Loading songs...</p>
    </div>

    <!-- Songs List -->
    <div v-else class="relative flex-1 overflow-hidden">
      <draggable
        v-model="localSongs"
        :group="{ name: 'songs', pull: 'clone', put: true }"
        item-key="list_song_id"
        :class="[
          'overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)]',
          {
            'opacity-50 pointer-events-none': processing,
            'drop-zone-active': isDraggingOver
          }
        ]"
        :data-list-id="list.id"
        :animation="200"
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
        <template #item="{ element: song }">
          <SongCard
            :song="song"
            @remove="handleRemove(song)"
          />
        </template>
      </draggable>

      <!-- Empty State -->
      <div v-if="localSongs.length === 0 && !isDraggingOver" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
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
    <button @click="$emit('add-song')" class="btn btn-block gap-2 rounded-none hover:btn-primary">
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
  }
})

const emit = defineEmits(['add-song', 'delete', 'update', 'reorder-songs', 'copy-song', 'remove-song', 'dragging-to'])

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
}

function handleDragMove(evt) {
  lastDragTo.value = evt.to

  emit('dragging-to', {
    fromListId: props.list.id,
    toListId: lastDragTo.value?.dataset.listId,
  })
}

function handleDragEnd(evt) {
  isDragging.value = false
  evt.item.style.cursor = ''
  evt.item.classList.remove('dragging')
  if (lastDragTo.value) {
    lastDragTo.value = null
  }

  // Only handle reorder within same list
  if (evt.from === evt.to) {
    emit('reorder-songs', props.list.id, localSongs.value)
  }
}

async function handleSongAdded(evt) {
  // Handle song added from another list (copy behavior)
  const fromListId = evt.from.dataset.listId
  const toListId = props.list.id

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
