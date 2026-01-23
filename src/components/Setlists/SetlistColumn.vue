<template>
  <div class="setlist-column">
    <div class="column-header" role="button" aria-label="Drag to reorder list" tabindex="-1">
      <input
        v-if="editingTitle"
        ref="titleInput"
        v-model="editedName"
        @blur="saveTitle"
        @keydown.enter="saveTitle"
        @keydown.esc="cancelEdit"
        class="title-input"
        type="text"
        aria-label="Edit list name"
        :placeholder="list.name"
      />
      <h2 v-else @click="startEdit" class="title" :title="list.name">
        {{ list.name }}
      </h2>

      <div class="header-actions">
        <button @click="$emit('add-song')" class="btn-add-song">
          + Add Song
        </button>
        <button
          @click="confirmDelete"
          class="btn-delete"
          :aria-label="`Delete ${list.name} list`"
        >
          <span class="delete-icon" aria-hidden="true">🗑</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-area">
      <div class="spinner-small"></div>
      <p>Loading songs...</p>
    </div>

    <div v-else-if="localSongs.length === 0" class="empty-state">
      <p>No songs yet</p>
      <button @click="$emit('add-song')" class="btn-add-first">
        Add your first song
      </button>
    </div>

    <draggable
      v-else
      v-model="localSongs"
      :group="{ name: 'songs', pull: 'clone', put: true }"
      item-key="list_song_id"
      class="songs-list"
      :data-list-id="list.id"
      :animation="200"
      handle=".drag-handle"
      ghost-class="drag-ghost"
      drag-class="dragging"
      @start="handleDragStart"
      @end="handleDragEnd"
      @add="handleSongAdded"
    >
      <template #item="{ element: song, index }">
        <SongCard
          :song="song"
          @remove="handleRemove(song)"
        />
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import draggable from 'vuedraggable'
import SongCard from './SongCard.vue'

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
  }
})

const emit = defineEmits(['add-song', 'delete', 'update', 'reorder-songs', 'copy-song', 'remove-song'])

const editingTitle = ref(false)
const editedName = ref('')
const titleInput = ref(null)
const localSongs = ref([...props.songs])
const isDraggingOver = ref(false)
const isDraggingFromThis = ref(false)

// Watch for external changes to songs prop
watch(() => props.songs, (newSongs) => {
  localSongs.value = [...newSongs]
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
  isDraggingFromThis.value = true
  // Set copy cursor for cross-list drags
  evt.item.style.cursor = 'copy'
}

function handleDragEnd(evt) {
  isDraggingFromThis.value = false
  isDraggingOver.value = false
  evt.item.style.cursor = ''

  // Only handle reorder within same list
  if (evt.from === evt.to) {
    console.log('[SetlistColumn] Reorder within list:', props.list.id)
    emit('reorder-songs', props.list.id, localSongs.value)
  }
}

function handleSongAdded(evt) {
  // Handle song added from another list (copy behavior)
  const song = evt.item._underlying_vm_
  const fromListId = evt.from.dataset.listId
  const toListId = props.list.id

  console.log('[SetlistColumn] Song copied:', { song, fromListId, toListId })

  if (fromListId !== toListId) {
    // Remove the cloned element (we'll add it via composable)
    localSongs.value.splice(evt.newIndex, 1)
    emit('copy-song', props.list.id, song)
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

<style scoped>
.setlist-column {
  width: 320px;
  min-width: 320px;
  background: #0d0d0d;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 140px);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.2s ease;
}

.setlist-column:hover {
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.6),
    0 6px 16px rgba(0, 0, 0, 0.4);
}

.column-header {
  padding: 1.25rem;
  border-bottom: 1px solid #1a1a1a;
  position: sticky;
  top: 0;
  background: #0d0d0d;
  z-index: 10;
  border-radius: 12px 12px 0 0;
  cursor: grab;
  transition: background 0.2s ease;
}

.column-header:hover {
  background: #111;
}

.column-header:active {
  cursor: grabbing;
}

.title {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: background 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title:hover {
  background: #1a1a1a;
  background: linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, transparent 100%);
}

.title-input {
  width: 100%;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: #000;
  border: 2px solid #1db954;
  border-radius: 6px;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.1);
}

.title-input:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.2);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-add-song {
  flex: 1;
  padding: 0.625rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 4px rgba(29, 185, 84, 0.2);
}

.btn-add-song:hover {
  background: #1ed760;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(29, 185, 84, 0.3);
}

.btn-delete {
  padding: 0.625rem;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
}

.btn-delete:hover {
  background: #f44336;
  border-color: #f44336;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.delete-icon {
  font-size: 1.25rem;
}

.setlist-column:focus-within {
  outline: 2px solid #1db954;
  outline-offset: 2px;
}

.btn-add-song:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.btn-delete:focus-visible {
  outline: 2px solid #1db954;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.2);
}

.btn-add-first:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.songs-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #0a0a0a;
  border-radius: 0 0 12px 12px;
}

.songs-list::-webkit-scrollbar {
  width: 8px;
}

.songs-list::-webkit-scrollbar-track {
  background: transparent;
}

.songs-list::-webkit-scrollbar-thumb {
  background: #1a1a1a;
  border-radius: 4px;
}

.songs-list::-webkit-scrollbar-thumb:hover {
  background: #1db954;
}

.loading-area,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #666;
  text-align: center;
  background: #0a0a0a;
  border-radius: 0 0 12px 12px;
}

.empty-state p {
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.spinner-small {
  width: 32px;
  height: 32px;
  border: 3px solid #1a1a1a;
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.75rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-add-first {
  padding: 0.625rem 1.25rem;
  background: #1db954;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 4px rgba(29, 185, 84, 0.2);
}

.btn-add-first:hover {
  background: #1ed760;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(29, 185, 84, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .setlist-column {
    min-width: 85vw;
    scroll-snap-align: start;
  }

  .column-header {
    padding: 1rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .btn-add-song,
  .btn-delete,
  .btn-add-first {
    min-height: 44px;
  }
}
</style>
