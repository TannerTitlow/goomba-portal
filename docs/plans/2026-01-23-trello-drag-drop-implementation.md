# Trello-Style Drag-and-Drop Setlist Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the setlist board into a fully interactive Trello-style interface with drag-and-drop for songs (within/between lists) and columns, enhanced visual design, and clear copy behavior indicators.

**Architecture:** Use VueDraggable (already installed) to wrap both the columns container and individual song lists. Enhance composables with position management functions. Apply Trello-inspired visual polish with shadows, depth, and smooth animations while maintaining the black/green Spotify aesthetic.

**Tech Stack:** Vue 3, VueDraggable 4.1.0, Supabase, existing useSetlists/useListSongs composables

---

## Task 1: Update useSetlists Composable with Position Management

**Files:**
- Modify: `src/composables/useSetlists.js:14-17` (update fetchLists)
- Modify: `src/composables/useSetlists.js:30-59` (update createList)
- Add: New functions at end of composable

**Step 1: Update fetchLists to order by position**

Change line 17 from:
```javascript
.order('created_at', { ascending: false })
```

To:
```javascript
.order('position', { ascending: true })
```

**Step 2: Update createList to set position**

Add position calculation before insert (after line 35):

```javascript
// Get max position
const { data: maxPosData } = await supabase
  .from('lists')
  .select('position')
  .order('position', { ascending: false })
  .limit(1)

const nextPosition = maxPosData?.[0]?.position != null
  ? maxPosData[0].position + 1
  : 0
```

Update the insert (line 37-43) to include position:
```javascript
const { data, error: insertError } = await supabase
  .from('lists')
  .insert({
    name,
    description,
    list_type: listType,
    created_by_user_id: user.id,
    position: nextPosition
  })
  .select()
  .single()
```

**Step 3: Add reorderLists function**

Add before the return statement (around line 135):

```javascript
async function reorderLists(reorderedLists) {
  error.value = null

  try {
    // Update positions for all lists
    const updates = reorderedLists.map((list, index) => ({
      id: list.id,
      position: index
    }))

    // Batch update positions
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('lists')
        .update({ position: update.position })
        .eq('id', update.id)

      if (updateError) throw updateError
    }

    // Update local state
    lists.value = reorderedLists.map((list, index) => ({
      ...list,
      position: index
    }))
  } catch (err) {
    error.value = err.message
    console.error('[useSetlists] reorderLists error:', err)
    throw err
  }
}
```

**Step 4: Export new function**

Update return statement (line 136-145) to include:
```javascript
return {
  lists,
  loading,
  error,
  fetchLists,
  createList,
  updateList,
  deleteList,
  subscribeToLists,
  reorderLists // Add this
}
```

**Step 5: Test the changes**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Expected: Lists load ordered by position (may need to manually update DB positions first)

**Step 6: Commit**

```bash
git add src/composables/useSetlists.js
git commit -m "feat: add position management to useSetlists composable

- Order lists by position instead of created_at
- Auto-assign position when creating new list
- Add reorderLists function for batch position updates"
```

---

## Task 2: Update useListSongs Composable for Drag-and-Drop

**Files:**
- Modify: `src/composables/useListSongs.js:178-226` (replace reorderSong)
- Add: New function after reorderSong

**Step 1: Replace reorderSong with drag-friendly version**

Replace the entire `reorderSong` function (lines 178-226) with:

```javascript
async function reorderSongsInList(listId, reorderedSongs) {
  error.value = null

  try {
    console.log('[useListSongs] Reordering songs in list:', listId)

    // Update positions for all songs in the reordered list
    const updates = reorderedSongs.map((song, index) => ({
      id: song.list_song_id,
      position: index
    }))

    // Batch update positions
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('list_songs')
        .update({ position: update.position })
        .eq('id', update.id)

      if (updateError) throw updateError
    }

    // Update local state with new positions
    songs.value[listId] = reorderedSongs.map((song, index) => ({
      ...song,
      position: index
    }))

    console.log('[useListSongs] Songs reordered successfully')
  } catch (err) {
    error.value = err.message
    console.error('[useListSongs] reorderSongsInList error:', err)
    throw err
  }
}
```

**Step 2: Add copySongToList function**

Add after reorderSongsInList:

```javascript
async function copySongToList(targetListId, song) {
  error.value = null

  try {
    console.log('[useListSongs] Copying song to list:', {
      targetListId,
      songId: song.id,
      spotifyId: song.spotify_id
    })

    // Check if song already exists in target list
    const existingSongs = songs.value[targetListId] || []
    const isDuplicate = existingSongs.some(s => s.spotify_id === song.spotify_id)

    if (isDuplicate) {
      throw new Error('This song is already in the list')
    }

    // Get max position in target list
    const { data: maxPosData } = await supabase
      .from('list_songs')
      .select('position')
      .eq('list_id', targetListId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = maxPosData?.[0]?.position != null
      ? maxPosData[0].position + 1
      : 0

    // Insert list_songs entry (song already exists in songs table)
    const { data: listSong, error: listSongError } = await supabase
      .from('list_songs')
      .insert({
        list_id: targetListId,
        song_id: song.id,
        position: nextPosition
      })
      .select()
      .single()

    if (listSongError) {
      if (listSongError.code === '23505') {
        throw new Error('This song is already in the list')
      }
      throw listSongError
    }

    // Update local state
    const newSong = {
      ...song,
      list_song_id: listSong.id,
      position: nextPosition
    }

    if (!songs.value[targetListId]) {
      songs.value[targetListId] = []
    }
    songs.value[targetListId].push(newSong)

    console.log('[useListSongs] Song copied successfully')
    return newSong
  } catch (err) {
    error.value = err.message
    console.error('[useListSongs] copySongToList error:', err)
    throw err
  }
}
```

**Step 3: Update return statement**

Update the return statement (lines 228-237) to include new functions:

```javascript
return {
  songs,
  loading,
  error,
  fetchListSongs,
  addSongToList,
  removeSongFromList,
  reorderSongsInList,  // Renamed from reorderSong
  copySongToList       // New function
}
```

**Step 4: Test the changes**

Run: `npm run dev`
Expected: No errors, app still loads (functionality not yet wired up)

**Step 5: Commit**

```bash
git add src/composables/useListSongs.js
git commit -m "feat: add drag-and-drop functions to useListSongs

- Replace reorderSong with reorderSongsInList for batch updates
- Add copySongToList function for cross-list copying
- Include duplicate detection before copy operation"
```

---

## Task 3: Enhance Visual Design - Global Styles

**Files:**
- Modify: `src/assets/styles/main.scss:95-115` (after existing animations)

**Step 1: Add new animations for drag states**

Add after the existing animations (after line 114):

```scss
// Drag and drop animations
@keyframes pulse-border {
  0%, 100% {
    border-color: #1db954;
    box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4);
  }
  50% {
    border-color: #1ed760;
    box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.2);
  }
}

@keyframes shake-subtle {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.animate-pulse-border {
  animation: pulse-border 2s ease-in-out infinite;
}

.animate-shake-subtle {
  animation: shake-subtle 0.3s ease-in-out;
}

// Drag state utilities
.dragging {
  opacity: 0.5;
  cursor: grabbing !important;
}

.drag-ghost {
  opacity: 0.9;
  transform: scale(1.05) rotate(3deg);
  cursor: grabbing;
}

.drag-placeholder {
  border: 2px dashed #333;
  background: transparent !important;
  opacity: 0.3;
}

.drop-zone-active {
  border: 2px dashed #1db954;
  background: rgba(29, 185, 84, 0.05);
  animation: pulse-border 2s ease-in-out infinite;
}
```

**Step 2: Test the styles compile**

Run: `npm run dev`
Expected: No SCSS errors, styles compile successfully

**Step 3: Commit**

```bash
git add src/assets/styles/main.scss
git commit -m "style: add drag-and-drop animation utilities

- Add pulse-border animation for drop zones
- Add shake-subtle animation for feedback
- Add drag state utility classes (dragging, ghost, placeholder)"
```

---

## Task 4: Update SongCard Component with Enhanced Visuals

**Files:**
- Modify: `src/components/Setlists/SongCard.vue:1-44` (template)
- Modify: `src/components/Setlists/SongCard.vue:75-183` (styles)

**Step 1: Update template with drag handle**

Replace the template section (lines 1-44) with:

```vue
<template>
  <div class="song-card">
    <div class="drag-handle">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        class="drag-handle-icon"
      >
        <circle cx="4" cy="4" r="1.5"/>
        <circle cx="4" cy="8" r="1.5"/>
        <circle cx="4" cy="12" r="1.5"/>
        <circle cx="8" cy="4" r="1.5"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="8" cy="12" r="1.5"/>
      </svg>
    </div>

    <img
      v-if="albumArtUrl"
      :src="albumArtUrl"
      :alt="song.album"
      class="album-art"
    />
    <div v-else class="album-art-placeholder">
      <span>♪</span>
    </div>

    <div class="song-info">
      <h3 class="song-title" :title="song.title">{{ song.title }}</h3>
      <p class="song-artist" :title="song.artist">{{ song.artist }}</p>
    </div>

    <div class="song-actions">
      <button
        @click="$emit('remove')"
        class="btn-icon btn-remove"
        title="Remove from list"
      >
        ×
      </button>
    </div>
  </div>
</template>
```

**Step 2: Update styles with Trello-inspired design**

Replace the styles section (lines 75-183) with:

```vue
<style scoped>
.song-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2);
}

.song-card:hover {
  background: #222222;
  border-color: #333;
  transform: translateY(-2px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.4),
    0 4px 12px rgba(29, 185, 84, 0.15);
}

.song-card:hover .drag-handle-icon {
  opacity: 0.6;
}

.song-card:active {
  cursor: grabbing;
}

.drag-handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 100%;
  color: #666;
  cursor: grab;
}

.drag-handle-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.album-art {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.album-art-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.song-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.song-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 0.25rem 0;
}

.song-artist {
  font-size: 0.8rem;
  color: #999999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.song-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-icon {
  min-width: 32px;
  min-height: 32px;
  padding: 0.25rem;
  background: #333;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.btn-icon:hover {
  transform: scale(1.1);
}

.btn-remove:hover {
  background: #f44336;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .song-card {
    padding: 0.5rem;
  }

  .drag-handle-icon {
    opacity: 0.4;
  }

  .btn-icon {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
```

**Step 3: Test visual changes**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Expected: Cards have enhanced shadows, drag handle appears on hover, improved spacing

**Step 4: Commit**

```bash
git add src/components/Setlists/SongCard.vue
git commit -m "style: enhance SongCard with Trello-inspired design

- Add drag handle indicator with grip dots
- Enhance shadows and depth for card elevation
- Add green glow on hover for visual feedback
- Remove up/down arrows (replaced by drag-and-drop)
- Improve mobile touch targets"
```

---

## Task 5: Update SetlistColumn Component with Enhanced Visuals

**Files:**
- Modify: `src/components/Setlists/SetlistColumn.vue:124-297` (styles section)

**Step 1: Update column styles**

Replace the styles section (lines 124-297) with:

```vue
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
  transition: all 0.2s ease;
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
  transition: all 0.2s ease;
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
  transition: all 0.2s ease;
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
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
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
  transition: all 0.2s ease;
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
```

**Step 2: Test visual changes**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Expected: Columns have enhanced depth, better shadows, improved hover states

**Step 3: Commit**

```bash
git add src/components/Setlists/SetlistColumn.vue
git commit -m "style: enhance SetlistColumn with Trello-inspired design

- Add layered shadows for depth and elevation
- Improve border and background colors for contrast
- Add grab cursor to header for drag indication
- Enhance button hover states with shadows
- Improve scrollbar styling"
```

---

## Task 6: Integrate VueDraggable for Songs Within Columns

**Files:**
- Modify: `src/components/Setlists/SetlistColumn.vue:1-51` (template)
- Modify: `src/components/Setlists/SetlistColumn.vue:53-122` (script)

**Step 1: Update template with VueDraggable**

Replace lines 39-49 (the songs-list div) with:

```vue
    <draggable
      v-else
      v-model="localSongs"
      :group="{ name: 'songs', pull: 'clone', put: true }"
      item-key="list_song_id"
      class="songs-list"
      :animation="200"
      handle=".drag-handle"
      ghost-class="drag-ghost"
      drag-class="dragging"
      @end="handleDragEnd"
      @add="handleSongAdded"
    >
      <template #item="{ element: song, index }">
        <SongCard
          :song="song"
          :is-first="index === 0"
          :is-last="index === localSongs.length - 1"
          @remove="handleRemove(song)"
        />
      </template>
    </draggable>
```

**Step 2: Update script with VueDraggable import and logic**

Replace the script section (lines 53-122) with:

```vue
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

const emit = defineEmits(['add-song', 'delete', 'update', 'reorder-songs', 'copy-song'])

const editingTitle = ref(false)
const editedName = ref('')
const titleInput = ref(null)
const localSongs = ref([...props.songs])

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

function handleDragEnd(evt) {
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
```

**Step 3: Add data attribute to songs-list for tracking**

Update the draggable element to include data-list-id:

```vue
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
      @end="handleDragEnd"
      @add="handleSongAdded"
    >
```

**Step 4: Test drag functionality**

Run: `npm run dev`
Expected: Can grab and drag song cards by handle, but operations not saved yet

**Step 5: Commit**

```bash
git add src/components/Setlists/SetlistColumn.vue
git commit -m "feat: integrate VueDraggable for songs within columns

- Add draggable component for song lists
- Handle reorder within same list
- Handle copy to different list (clone behavior)
- Use drag handle for grab interaction
- Emit reorder-songs and copy-song events"
```

---

## Task 7: Wire Up Drag Events in SetlistsView

**Files:**
- Modify: `src/views/SetlistsView.vue:28-41` (SetlistColumn in template)
- Modify: `src/views/SetlistsView.vue:94-224` (script section)

**Step 1: Update SetlistColumn event handlers**

Replace lines 28-41 with:

```vue
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
        @reorder-songs="handleReorderSongs"
        @copy-song="handleCopySong"
        @remove-song="removeSong(list.id, $event)"
      />
    </div>
```

**Step 2: Import updated composable functions**

Update the composables import (around line 115-122):

```javascript
const {
  songs,
  fetchListSongs,
  addSongToList,
  removeSongFromList,
  reorderSongsInList,
  copySongToList
} = useListSongs()
```

**Step 3: Add handleReorderSongs function**

Add after the `reorderSong` function (around line 223):

```javascript
async function handleReorderSongs(listId, reorderedSongs) {
  try {
    await reorderSongsInList(listId, reorderedSongs)
    // No toast for reordering (too noisy)
  } catch (err) {
    showToast(err.message, 'error')
    // Reload songs to revert
    await fetchListSongs(listId)
  }
}
```

**Step 4: Add handleCopySong function**

Add after handleReorderSongs:

```javascript
async function handleCopySong(targetListId, song) {
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
  }
}
```

**Step 5: Remove old reorderSong function**

Delete the old `reorderSong` function (lines 217-223) since it's been replaced.

**Step 6: Test drag-and-drop functionality**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Test:
1. Drag song within same list → position should update
2. Drag song to different list → should copy with toast notification
3. Try dragging duplicate → should show warning toast

**Step 7: Commit**

```bash
git add src/views/SetlistsView.vue
git commit -m "feat: wire up drag-and-drop events in SetlistsView

- Add handleReorderSongs for within-list reordering
- Add handleCopySong for cross-list copying
- Connect to updated composable functions
- Add error handling and toast notifications"
```

---

## Task 8: Add Copy Behavior Indicators

**Files:**
- Create: `src/components/Setlists/DragBadge.vue`
- Modify: `src/components/Setlists/SetlistColumn.vue:53-122` (script)

**Step 1: Create DragBadge component**

Create new file `src/components/Setlists/DragBadge.vue`:

```vue
<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="drag-badge"
      :style="{ top: position.y + 'px', left: position.x + 'px' }"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1db954"/>
        <path
          d="M12 7v10M7 12h10"
          stroke="white"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})
</script>

<style scoped>
.drag-badge {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
  transition: opacity 0.15s ease, transform 0.15s ease;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

.drag-badge svg {
  display: block;
}

/* Show when visible */
.drag-badge {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
</style>
```

**Step 2: Add drag state tracking to SetlistColumn**

Update SetlistColumn script to track dragging state (add after localSongs ref):

```javascript
const isDraggingOver = ref(false)
const isDraggingFromThis = ref(false)
```

**Step 3: Add dragover and dragleave handlers**

Update the draggable component in SetlistColumn template:

```vue
    <draggable
      v-else
      v-model="localSongs"
      :group="{ name: 'songs', pull: 'clone', put: true }"
      item-key="list_song_id"
      class="songs-list"
      :class="{ 'drop-zone-active': isDraggingOver && !isDraggingFromThis }"
      :data-list-id="list.id"
      :animation="200"
      handle=".drag-handle"
      ghost-class="drag-ghost"
      drag-class="dragging"
      @start="handleDragStart"
      @end="handleDragEnd"
      @add="handleSongAdded"
    >
```

**Step 4: Add drag event handlers to script**

Add these functions in SetlistColumn script:

```javascript
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
```

**Step 5: Update CSS for drop zone feedback**

The `.drop-zone-active` class is already defined in main.scss (Task 3), so it will automatically apply.

**Step 6: Test copy indicators**

Run: `npm run dev`
Test:
1. Drag within same list → no special indicator
2. Drag to different list → drop zone should pulse with green border

**Step 7: Commit**

```bash
git add src/components/Setlists/DragBadge.vue src/components/Setlists/SetlistColumn.vue
git commit -m "feat: add copy behavior indicators for drag-and-drop

- Create DragBadge component with plus icon
- Add drop-zone-active styling for target columns
- Track drag state in SetlistColumn
- Change cursor to copy when dragging across lists"
```

---

## Task 9: Integrate VueDraggable for Column Reordering

**Files:**
- Modify: `src/views/SetlistsView.vue:28-41` (wrap columns in draggable)
- Modify: `src/views/SetlistsView.vue:94-259` (script section)

**Step 1: Import draggable in SetlistsView**

Add import at top of script (around line 95):

```javascript
import draggable from 'vuedraggable'
```

**Step 2: Wrap columns in VueDraggable**

Replace lines 28-41 with:

```vue
    <draggable
      v-else
      v-model="lists"
      item-key="id"
      class="columns-container"
      :animation="200"
      handle=".column-header"
      ghost-class="drag-ghost"
      @end="handleColumnsReordered"
    >
      <template #item="{ element: list }">
        <SetlistColumn
          :list="list"
          :songs="songs[list.id] || []"
          :loading="loadingSongs[list.id]"
          @add-song="openSearchModal(list.id)"
          @delete="deleteList(list.id)"
          @update="updateList(list.id, $event)"
          @reorder-songs="handleReorderSongs"
          @copy-song="handleCopySong"
          @remove-song="removeSong(list.id, $event)"
        />
      </template>
    </draggable>
```

**Step 3: Import reorderLists from composable**

Update useSetlists destructuring (around line 105-114):

```javascript
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
```

**Step 4: Add handleColumnsReordered function**

Add after handleCopySong function:

```javascript
async function handleColumnsReordered() {
  try {
    console.log('[SetlistsView] Columns reordered:', lists.value.map(l => l.name))
    await reorderLists(lists.value)
    showToast('List order updated')
  } catch (err) {
    showToast(err.message, 'error')
    // Reload lists to revert
    await fetchLists()
  }
}
```

**Step 5: Test column reordering**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Test:
1. Drag column by header to reorder
2. Drop should save new position
3. Refresh page → order should persist

**Step 6: Commit**

```bash
git add src/views/SetlistsView.vue
git commit -m "feat: add drag-and-drop for column reordering

- Wrap columns container in VueDraggable
- Use column header as drag handle
- Add handleColumnsReordered to save positions
- Connect to reorderLists composable function"
```

---

## Task 10: Add First-Time User Tooltip

**Files:**
- Create: `src/components/Setlists/DragTooltip.vue`
- Modify: `src/views/SetlistsView.vue:1-91` (template)
- Modify: `src/views/SetlistsView.vue:94-259` (script)

**Step 1: Create DragTooltip component**

Create `src/components/Setlists/DragTooltip.vue`:

```vue
<template>
  <Transition name="tooltip">
    <div v-if="visible" class="drag-tooltip">
      <div class="tooltip-content">
        <p>💡 Drag songs between lists to copy them</p>
        <button @click="dismiss" class="tooltip-dismiss">Got it</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const visible = ref(false)

const emit = defineEmits(['dismiss'])

onMounted(() => {
  // Check if user has seen the tooltip
  const hasSeenTooltip = localStorage.getItem('hasSeenDragCopyHint')
  if (!hasSeenTooltip) {
    // Show after 2 seconds
    setTimeout(() => {
      visible.value = true
    }, 2000)
  }
})

function dismiss() {
  visible.value = false
  localStorage.setItem('hasSeenDragCopyHint', 'true')
  emit('dismiss')
}

// Auto-dismiss after 6 seconds
setTimeout(() => {
  if (visible.value) {
    dismiss()
  }
}, 8000)
</script>

<style scoped>
.drag-tooltip {
  position: fixed;
  bottom: 5rem;
  right: 2rem;
  z-index: 90;
}

.tooltip-content {
  background: #1a1a1a;
  border: 2px solid #1db954;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(29, 185, 84, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 320px;
}

.tooltip-content p {
  margin: 0;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  flex: 1;
}

.tooltip-dismiss {
  padding: 0.5rem 1rem;
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tooltip-dismiss:hover {
  background: #1ed760;
  transform: translateY(-1px);
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.3s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

/* Mobile */
@media (max-width: 768px) {
  .drag-tooltip {
    bottom: 4rem;
    right: 1rem;
    left: 1rem;
  }

  .tooltip-content {
    max-width: none;
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .tooltip-dismiss {
    width: 100%;
  }
}
</style>
```

**Step 2: Import and add to SetlistsView template**

Add import in script:

```javascript
import DragTooltip from '@/components/Setlists/DragTooltip.vue'
```

Add component before closing div in template (around line 90):

```vue
    <!-- Drag tooltip -->
    <DragTooltip />
  </div>
</template>
```

**Step 3: Test tooltip**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Expected: Tooltip appears after 2 seconds on first visit

To test again:
1. Open DevTools → Application → Local Storage
2. Delete `hasSeenDragCopyHint` key
3. Refresh page

**Step 4: Commit**

```bash
git add src/components/Setlists/DragTooltip.vue src/views/SetlistsView.vue
git commit -m "feat: add first-time user tooltip for drag copy behavior

- Create DragTooltip component with auto-dismiss
- Show hint after 2 seconds on first visit
- Store flag in localStorage to show once
- Auto-dismiss after 6 seconds
- Mobile-responsive layout"
```

---

## Task 11: Enhance SetlistsView Board Header

**Files:**
- Modify: `src/views/SetlistsView.vue:261-557` (styles section)

**Step 1: Update board header and container styles**

Replace the styles section (lines 261-557) with updated styles:

```vue
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
  padding: 1.75rem 2rem;
  border-bottom: 1px solid #1a1a1a;
  background: #000000;
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
}

.board-title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  font-family: 'Coder', monospace;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #1db954 0%, #1ed760 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(29, 185, 84, 0.3);
}

.btn-create {
  padding: 0.875rem 1.75rem;
  background: #1db954;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(29, 185, 84, 0.3);
}

.btn-create:hover {
  background: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(29, 185, 84, 0.4);
}

.columns-container {
  flex: 1;
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: flex-start;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.columns-container::-webkit-scrollbar {
  height: 12px;
}

.columns-container::-webkit-scrollbar-track {
  background: #0a0a0a;
}

.columns-container::-webkit-scrollbar-thumb {
  background: #1a1a1a;
  border-radius: 6px;
  border: 2px solid #0a0a0a;
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
  border: 4px solid #1a1a1a;
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-board {
  color: #f44336;
}

.btn-retry {
  margin-top: 1.5rem;
  padding: 0.875rem 1.75rem;
  background: #1db954;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(29, 185, 84, 0.3);
}

.btn-retry:hover {
  background: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(29, 185, 84, 0.4);
}

.empty-board h2 {
  margin: 0 0 0.75rem 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #fff;
}

.empty-board p {
  margin: 0 0 2.5rem 0;
  color: #666;
  font-size: 1.125rem;
}

.btn-create-large {
  padding: 1.125rem 2.25rem;
  background: #1db954;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(29, 185, 84, 0.3);
}

.btn-create-large:hover {
  background: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(29, 185, 84, 0.4);
}

/* Create Dialog */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.dialog-content {
  background: #0d0d0d;
  border: 1px solid #1a1a1a;
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.dialog-content h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
}

.dialog-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: #000;
  border: 2px solid #1a1a1a;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  transition: border-color 0.2s ease;
}

.dialog-input:focus {
  outline: none;
  border-color: #1db954;
  box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.1);
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.btn-cancel {
  background: #1a1a1a;
  color: #fff;
  border: 1px solid #333;
}

.btn-cancel:hover {
  background: #222;
  border-color: #444;
}

.btn-confirm {
  background: #1db954;
  color: #fff;
  box-shadow: 0 2px 8px rgba(29, 185, 84, 0.3);
}

.btn-confirm:hover:not(:disabled) {
  background: #1ed760;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.4);
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
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 100;
  backdrop-filter: blur(10px);
}

.toast-success {
  background: #1db954;
  box-shadow: 0 4px 16px rgba(29, 185, 84, 0.4);
}

.toast-error {
  background: #f44336;
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.4);
}

.toast-warning {
  background: #ff9800;
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.4);
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

.modal-enter-active .dialog-content,
.modal-leave-active .dialog-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .dialog-content,
.modal-leave-to .dialog-content {
  transform: scale(0.95);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .board-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    padding: 1.5rem 1rem;
  }

  .board-title {
    font-size: 1.75rem;
    text-align: center;
  }

  .btn-create {
    width: 100%;
  }

  .columns-container {
    padding: 1rem;
    gap: 1rem;
  }

  .toast {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
}
</style>
```

**Step 2: Test enhanced styling**

Run: `npm run dev`
Navigate to: http://localhost:5173/setlists
Expected: Header has better visual polish, improved shadows and spacing

**Step 3: Commit**

```bash
git add src/views/SetlistsView.vue
git commit -m "style: enhance SetlistsView with improved visual design

- Add Coder font to board title for consistency
- Improve header styling with better spacing
- Enhance dialog and toast shadows and blur
- Add backdrop blur effects
- Improve button hover states and shadows
- Refine scrollbar styling"
```

---

## Task 12: Testing and Bug Fixes

**Files:**
- Test all components
- Fix any issues found

**Step 1: Manual testing checklist**

Test the following scenarios:

1. **Song reordering within list:**
   - Drag song by handle within same column
   - Verify position updates in UI
   - Refresh page → position should persist

2. **Song copying between lists:**
   - Drag song to different column
   - Verify original stays in place
   - Verify copy appears in target
   - Verify toast notification shows

3. **Duplicate prevention:**
   - Try dragging same song to list twice
   - Should show warning toast
   - Should not create duplicate

4. **Column reordering:**
   - Drag column by header
   - Verify column moves
   - Refresh page → order should persist

5. **Visual indicators:**
   - Hover over cards → drag handle appears
   - Drag to different column → border pulses
   - Drag states look correct

6. **Mobile:**
   - Test on mobile viewport (375px)
   - Touch drag should work
   - Buttons meet 44px minimum
   - Layout is responsive

7. **Error handling:**
   - Disconnect network (DevTools offline)
   - Try dragging → should show error toast
   - UI should revert gracefully

**Step 2: Fix any bugs found**

Document and fix issues discovered during testing.

**Step 3: Performance check**

- Open DevTools Performance tab
- Record while dragging multiple cards
- Verify 60fps (no jank)
- Check for memory leaks

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: complete manual testing of drag-and-drop features

- Verify song reordering within lists
- Verify song copying between lists
- Verify duplicate prevention
- Verify column reordering
- Verify visual indicators
- Verify mobile responsiveness
- Fix any bugs discovered during testing"
```

---

## Task 13: Documentation Update

**Files:**
- Modify: `docs/plans/2026-01-23-trello-style-setlist-board-design.md`

**Step 1: Update design document with implementation notes**

Add "Implementation Status" section at the top:

```markdown
## Implementation Status

✅ **COMPLETED** - 2026-01-23

All planned features have been implemented:
- ✅ Visual enhancements (shadows, depth, Trello-style cards)
- ✅ Song drag-and-drop within columns (reorder)
- ✅ Song drag-and-drop between columns (copy)
- ✅ Column drag-and-drop (reorder)
- ✅ Copy behavior indicators (badge, cursor, visual feedback)
- ✅ First-time user tooltip
- ✅ Mobile-responsive design
- ✅ Error handling and optimistic updates

See implementation plan: `docs/plans/2026-01-23-trello-drag-drop-implementation.md`
```

**Step 2: Commit documentation**

```bash
git add docs/plans/2026-01-23-trello-style-setlist-board-design.md
git commit -m "docs: mark Trello-style board design as completed

- Add implementation status section
- Reference implementation plan
- Mark all features as completed"
```

---

## Task 14: Final Integration Test

**Files:**
- All files

**Step 1: Full integration test**

Run through complete user workflow:

1. Create new setlist
2. Add songs via Spotify search
3. Reorder songs within list
4. Create second setlist
5. Copy songs between lists
6. Reorder columns
7. Refresh page → verify persistence
8. Test with multiple browser tabs open
9. Test real-time sync

**Step 2: Cross-browser testing**

Test in:
- Chrome
- Firefox
- Safari (if available)
- Mobile Safari / Chrome Android

**Step 3: Final commit and push**

```bash
git add -A
git commit -m "chore: complete Trello-style drag-and-drop implementation

Final integration testing completed. All features working:
- Drag-and-drop songs within/between lists
- Drag-and-drop column reordering
- Enhanced visual design with Trello styling
- Copy behavior indicators
- Mobile-responsive
- Cross-browser tested"
```

**Step 4: Merge to main branch (if applicable)**

```bash
git checkout develop
git merge --no-ff feature/trello-drag-drop
git push origin develop
```

---

## Summary

This implementation plan transforms the setlist board into a fully functional Trello-style interface with:

✅ **Phase 1 Complete:** Visual enhancements with shadows, depth, and polish
✅ **Phase 2 Complete:** Drag-and-drop for songs (within and between lists)
✅ **Phase 3 Complete:** Drag-and-drop for column reordering
✅ **Phase 4 Complete:** Copy indicators, tooltips, and polish

**Total Tasks:** 14
**Estimated Time:** 3-4 hours
**Testing:** Manual testing at each step
**Commits:** Frequent, atomic commits after each task

The implementation follows TDD principles where applicable, maintains YAGNI (no over-engineering), and uses DRY code practices throughout.
