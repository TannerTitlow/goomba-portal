<template>
  <div class="setlist-column">
    <div class="column-header">
      <input
        v-if="editingTitle"
        ref="titleInput"
        v-model="editedName"
        @blur="saveTitle"
        @keydown.enter="saveTitle"
        @keydown.esc="cancelEdit"
        class="title-input"
      />
      <h2 v-else @click="startEdit" class="title" :title="list.name">
        {{ list.name }}
      </h2>

      <div class="header-actions">
        <button @click="$emit('add-song')" class="btn-add-song">
          + Add Song
        </button>
        <button @click="confirmDelete" class="btn-delete" title="Delete list">
          <span class="delete-icon">🗑</span>
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

    <div v-else class="songs-list">
      <SongCard
        v-for="(song, index) in localSongs"
        :key="song.list_song_id"
        :song="song"
        :is-first="index === 0"
        :is-last="index === localSongs.length - 1"
        @reorder="handleReorder(song, $event)"
        @remove="handleRemove(song)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
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

const emit = defineEmits(['add-song', 'delete', 'update', 'reorder-song', 'remove-song'])

const editingTitle = ref(false)
const editedName = ref('')
const titleInput = ref(null)

const localSongs = computed(() => props.songs)

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

function handleReorder(song, direction) {
  emit('reorder-song', song, direction)
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
  background: #111111;
  border: 1px solid #333333;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
}

.column-header {
  padding: 1rem;
  border-bottom: 1px solid #333333;
  position: sticky;
  top: 0;
  background: #111111;
  z-index: 10;
}

.title {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title:hover {
  background: #222;
}

.title-input {
  width: 100%;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: #000;
  border: 2px solid #1db954;
  border-radius: 4px;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
}

.title-input:focus {
  outline: none;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-add-song {
  flex: 1;
  padding: 0.5rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-song:hover {
  background: #1ed760;
  transform: translateY(-1px);
}

.btn-delete {
  padding: 0.5rem;
  background: #333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  background: #f44336;
  transform: scale(1.1);
}

.delete-icon {
  font-size: 1.25rem;
}

.songs-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.songs-list::-webkit-scrollbar {
  width: 8px;
}

.songs-list::-webkit-scrollbar-thumb {
  background: #333333;
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
  padding: 2rem 1rem;
  color: #666;
  text-align: center;
}

.spinner-small {
  width: 32px;
  height: 32px;
  border: 3px solid #333;
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-add-first {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-first:hover {
  background: #1ed760;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .setlist-column {
    min-width: 85vw;
    scroll-snap-align: start;
  }

  .btn-add-song,
  .btn-delete,
  .btn-add-first {
    min-height: 44px;
  }
}
</style>
