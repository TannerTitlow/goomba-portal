# Music Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 30-second Spotify preview playback to setlist view with bottom overlay player and context-aware navigation.

**Architecture:** Extend useSpotify composable with HTML5 Audio management and playback state. Create MusicPlayer bottom overlay component. Make album art clickable in SongCard and SpotifySearchModal with visual feedback for active track.

**Tech Stack:** Vue 3 Composition API, HTML5 Audio API, Tailwind CSS, Lucide Icons

---

## Task 1: Extend useSpotify Composable with Playback State

**Goal:** Add playback state management and audio control methods to useSpotify composable.

**Files:**
- Modify: `src/composables/useSpotify.js`

**Step 1: Add playback state refs and audio instance**

Add after line 7 (after existing refs):

```javascript
// Playback state
const currentTrack = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackContext = ref([])
const currentIndex = ref(-1)

// Create audio instance (singleton)
let audio = null
if (typeof window !== 'undefined') {
  audio = new Audio()
  audio.preload = 'auto'
}
```

**Step 2: Add playTrack method**

Add before the return statement:

```javascript
async function playTrack(track, context = [], index = 0) {
  if (!audio) return

  // Check if track has preview URL
  if (!track.preview_url) {
    console.warn('[useSpotify] No preview URL for track:', track)
    // Caller should show toast
    return false
  }

  // If clicking the same track, toggle play/pause
  if (currentTrack.value?.spotify_id === track.spotify_id) {
    togglePlayPause()
    return true
  }

  // Stop current playback
  if (currentTrack.value) {
    audio.pause()
  }

  // Update state
  currentTrack.value = track
  playbackContext.value = context
  currentIndex.value = index
  isPlaying.value = true

  // Set audio source and play
  try {
    audio.src = track.preview_url
    await audio.play()
    return true
  } catch (err) {
    console.error('[useSpotify] playTrack error:', err)
    error.value = 'Failed to load audio preview'
    stopPlayback()
    return false
  }
}
```

**Step 3: Add togglePlayPause method**

```javascript
function togglePlayPause() {
  if (!audio || !currentTrack.value) return

  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
  } else {
    audio.play()
    isPlaying.value = true
  }
}
```

**Step 4: Add stopPlayback method**

```javascript
function stopPlayback() {
  if (!audio) return

  audio.pause()
  audio.currentTime = 0
  currentTrack.value = null
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
  playbackContext.value = []
  currentIndex.value = -1
}
```

**Step 5: Add playNext and playPrevious methods**

```javascript
function playNext() {
  if (currentIndex.value >= playbackContext.value.length - 1) return

  const nextIndex = currentIndex.value + 1
  const nextTrack = playbackContext.value[nextIndex]

  if (nextTrack) {
    playTrack(nextTrack, playbackContext.value, nextIndex)
  }
}

function playPrevious() {
  if (currentIndex.value <= 0) return

  const prevIndex = currentIndex.value - 1
  const prevTrack = playbackContext.value[prevIndex]

  if (prevTrack) {
    playTrack(prevTrack, playbackContext.value, prevIndex)
  }
}
```

**Step 6: Add audio event listeners**

Add after audio initialization (after line where audio is created):

```javascript
if (audio) {
  // Update current time during playback
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    duration.value = audio.duration || 30 // Default to 30s for previews
  })

  // Handle track end
  audio.addEventListener('ended', () => {
    isPlaying.value = false
    currentTime.value = 0
  })

  // Handle errors
  audio.addEventListener('error', (e) => {
    console.error('[useSpotify] Audio error:', e)
    error.value = 'Failed to load audio preview'
    stopPlayback()
  })
}
```

**Step 7: Update return statement**

Add new exports to the return object:

```javascript
return {
  loading,
  error,
  searchTracks,
  getAlbumArtUrl,
  // Playback state
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  playbackContext,
  currentIndex,
  // Playback controls
  playTrack,
  togglePlayPause,
  stopPlayback,
  playNext,
  playPrevious,
}
```

**Step 8: Commit**

```bash
git add src/composables/useSpotify.js
git commit -m "feat: add audio playback state and controls to useSpotify"
```

---

## Task 2: Create MusicPlayer Component

**Goal:** Create bottom overlay music player with controls and progress bar.

**Files:**
- Create: `src/components/Setlists/MusicPlayer.vue`

**Step 1: Create MusicPlayer.vue with template**

```vue
<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-y-full"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="currentTrack"
      class="fixed bottom-0 left-0 right-0 bg-base-200/95 backdrop-blur-md border-t border-white/10 shadow-2xl z-40"
    >
      <!-- Progress Bar -->
      <div class="w-full h-1 bg-base-300">
        <div
          class="h-full bg-primary transition-all duration-100"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>

      <!-- Player Content -->
      <div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
        <!-- Album Art -->
        <figure class="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
          <img
            v-if="albumArtUrl"
            :src="albumArtUrl"
            :alt="currentTrack.album?.name || 'Album art'"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gradient-to-br from-base-content/10 to-base-content/5 flex items-center justify-center">
            <Music :size="20" class="text-base-content/30" />
          </div>
        </figure>

        <!-- Track Info -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-sm sm:text-base truncate text-white/95">
            {{ currentTrack.name || currentTrack.title }}
          </h3>
          <p class="text-xs sm:text-sm text-base-content/50 truncate">
            {{ artistName }}
          </p>
          <!-- Time display (desktop only) -->
          <p class="hidden sm:block text-xs text-base-content/40 mt-0.5">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </p>
        </div>

        <!-- Controls -->
        <div class="shrink-0 flex items-center gap-1 sm:gap-2">
          <!-- Stop -->
          <button
            @click="stopPlayback"
            class="btn btn-ghost btn-sm btn-circle hover:bg-error/20 hover:text-error transition-colors"
            :aria-label="'Stop playback'"
          >
            <Square :size="16" :stroke-width="2.5" />
          </button>

          <!-- Previous -->
          <button
            @click="playPrevious"
            :disabled="!canGoPrevious"
            class="btn btn-ghost btn-sm btn-circle hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :aria-label="'Previous track'"
          >
            <SkipBack :size="18" :stroke-width="2.5" />
          </button>

          <!-- Play/Pause -->
          <button
            @click="togglePlayPause"
            class="btn btn-primary btn-sm btn-circle min-h-[44px] w-11 h-11"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
          >
            <Pause v-if="isPlaying" :size="20" :stroke-width="2.5" />
            <Play v-else :size="20" :stroke-width="2.5" />
          </button>

          <!-- Next -->
          <button
            @click="playNext"
            :disabled="!canGoNext"
            class="btn btn-ghost btn-sm btn-circle hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :aria-label="'Next track'"
          >
            <SkipForward :size="18" :stroke-width="2.5" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useSpotify } from '@/composables/useSpotify'
import { Music, Play, Pause, SkipBack, SkipForward, Square } from 'lucide-vue-next'

const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  currentIndex,
  playbackContext,
  togglePlayPause,
  stopPlayback,
  playNext,
  playPrevious,
  getAlbumArtUrl,
} = useSpotify()

const albumArtUrl = computed(() => {
  if (!currentTrack.value) return null

  // Handle both song objects (from DB) and Spotify track objects
  if (currentTrack.value.album_art_url) {
    return currentTrack.value.album_art_url
  }

  return getAlbumArtUrl(currentTrack.value, 'small')
})

const artistName = computed(() => {
  if (!currentTrack.value) return ''

  // Handle both song objects (from DB) and Spotify track objects
  if (currentTrack.value.artist) {
    return currentTrack.value.artist
  }

  if (currentTrack.value.artists) {
    return currentTrack.value.artists.map(a => a.name).join(', ')
  }

  return 'Unknown Artist'
})

const progressPercentage = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const canGoPrevious = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < playbackContext.value.length - 1)

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
```

**Step 2: Commit**

```bash
git add src/components/Setlists/MusicPlayer.vue
git commit -m "feat: create MusicPlayer bottom overlay component"
```

---

## Task 3: Make SongCard Album Art Clickable

**Goal:** Add click handler to album art and visual feedback for playing track.

**Files:**
- Modify: `src/components/Setlists/SongCard.vue`

**Step 1: Update template - wrap album art in clickable div**

Replace the `<figure>` element (lines 6-16) with:

```vue
<!-- Album Art (Clickable) -->
<div
  @click.stop="handleAlbumArtClick"
  class="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shadow-md ring-1 ring-white/10 cursor-pointer group/art transition-all hover:ring-primary/50"
  :class="{ 'ring-2 ring-primary': isCurrentTrack }"
>
  <figure class="w-full h-full">
    <img
      v-if="albumArtUrl"
      :src="albumArtUrl"
      :alt="song.album"
      class="w-full h-full object-cover transition-all"
      :class="{ 'brightness-75': isCurrentTrack }"
    />
    <div v-else class="w-full h-full bg-gradient-to-br from-base-content/10 to-base-content/5 flex items-center justify-center">
      <Music :size="24" :stroke-width="1.5" class="text-base-content/30" />
    </div>
  </figure>

  <!-- Play/Pause Overlay (when track is active) -->
  <div
    v-if="isCurrentTrack"
    class="absolute inset-0 bg-black/40 flex items-center justify-center"
  >
    <div class="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center animate-pulse">
      <Pause v-if="isPlaying" :size="16" :stroke-width="2.5" class="text-primary-content" />
      <Play v-else :size="16" :stroke-width="2.5" class="text-primary-content ml-0.5" />
    </div>
  </div>
</div>
```

**Step 2: Update script - import icons and useSpotify**

Update the imports section (around line 71):

```vue
<script setup>
import { ref, computed } from 'vue'
import SongCardAssignments from './SongCardAssignments.vue'
import { Music, X, ClipboardPen, Users, Play, Pause } from 'lucide-vue-next'
import { useSpotify } from '@/composables/useSpotify'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['remove', 'manage-assignments', 'play'])

const { currentTrack, isPlaying } = useSpotify()

const albumArtUrl = computed(() => {
  if (props.song.album_art_url) {
    return props.song.album_art_url
  }
  return null
})

const isCurrentTrack = computed(() => {
  if (!currentTrack.value) return false

  // Check by spotify_id for both DB songs and Spotify track objects
  const currentId = currentTrack.value.spotify_id || currentTrack.value.id
  const songId = props.song.spotify_id || props.song.id

  return currentId === songId
})

function handleAlbumArtClick() {
  emit('play', props.song)
}
</script>
```

**Step 3: Commit**

```bash
git add src/components/Setlists/SongCard.vue
git commit -m "feat: make SongCard album art clickable with play/pause overlay"
```

---

## Task 4: Update SetlistColumn to Handle Playback

**Goal:** Pass songs array as context when album art is clicked.

**Files:**
- Modify: `src/components/Setlists/SetlistColumn.vue`

**Step 1: Read the file to understand structure**

Read: `src/components/Setlists/SetlistColumn.vue`

**Step 2: Add play event handler to SongCard**

Find where `<SongCard>` is rendered (should be in a `v-for` loop) and add the `@play` handler:

```vue
<SongCard
  :song="song"
  @remove="$emit('remove-song', song)"
  @manage-assignments="$emit('manage-song-assignments', song)"
  @play="handleSongPlay(song, index)"
/>
```

**Step 3: Add handleSongPlay method in script**

Add this method in the script section:

```javascript
import { useSpotify } from '@/composables/useSpotify'

const { playTrack } = useSpotify()

function handleSongPlay(song, index) {
  // Convert song object to have preview_url if needed
  const trackToPlay = {
    ...song,
    preview_url: song.preview_url || null,
    spotify_id: song.spotify_id,
    name: song.title,
    artists: [{ name: song.artist }],
  }

  playTrack(trackToPlay, props.songs, index)
}
```

**Step 4: Commit**

```bash
git add src/components/Setlists/SetlistColumn.vue
git commit -m "feat: handle playback in SetlistColumn with context"
```

---

## Task 5: Make SpotifySearchModal Album Art Clickable

**Goal:** Add click handler to search result album art and stop playback on song selection.

**Files:**
- Modify: `src/components/Setlists/SpotifySearchModal.vue`

**Step 1: Update template - wrap album art in clickable div**

Find the album art `<figure>` in the results list (around line 81) and replace with:

```vue
<!-- Album Art (Clickable) -->
<div
  @click.stop="handleAlbumArtClick(track, index)"
  class="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shadow-md ring-1 ring-white/10 cursor-pointer transition-all hover:ring-primary/50"
  :class="{ 'ring-2 ring-primary': isCurrentTrack(track) }"
>
  <figure class="w-full h-full">
    <img
      v-if="track.album?.images?.[2]?.url"
      :src="track.album.images[2].url"
      :alt="track.album.name"
      class="w-full h-full object-cover transition-all"
      :class="{ 'brightness-75': isCurrentTrack(track) }"
    />
    <div v-else class="w-full h-full bg-gradient-to-br from-base-content/10 to-base-content/5 flex items-center justify-center">
      <Music :size="24" :stroke-width="1.5" class="text-base-content/30" />
    </div>
  </figure>

  <!-- Play/Pause Overlay -->
  <div
    v-if="isCurrentTrack(track)"
    class="absolute inset-0 bg-black/40 flex items-center justify-center"
  >
    <div class="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center animate-pulse">
      <Pause v-if="isPlaying" :size="18" :stroke-width="2.5" class="text-primary-content" />
      <Play v-else :size="18" :stroke-width="2.5" class="text-primary-content ml-0.5" />
    </div>
  </div>
</div>
```

**Step 2: Update script - import and add methods**

Update imports and add playback logic:

```javascript
import { ref, watch, nextTick, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useSpotify } from '@/composables/useSpotify'
import { Music, X, Search, Plus, AlertCircle, RefreshCw, SearchX, Play, Pause } from 'lucide-vue-next'

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

const { searchTracks, loading, error: spotifyError, currentTrack, isPlaying, playTrack, stopPlayback } = useSpotify()

// ... existing code ...

function isCurrentTrack(track) {
  if (!currentTrack.value) return false
  return currentTrack.value.id === track.id
}

function handleAlbumArtClick(track, index) {
  playTrack(track, results.value, index)
}

function selectTrack(track) {
  // Stop playback when adding song from search
  stopPlayback()

  emit('select', track)
  closeModal()
}
```

**Step 3: Update selectTrack to stop playback**

The selectTrack function should already be updated in step 2. Ensure it calls `stopPlayback()` before emitting.

**Step 4: Commit**

```bash
git add src/components/Setlists/SpotifySearchModal.vue
git commit -m "feat: make search result album art clickable and stop playback on selection"
```

---

## Task 6: Integrate MusicPlayer into SetlistsView

**Goal:** Add MusicPlayer component to main setlists view.

**Files:**
- Modify: `src/views/Setlists/SetlistsView.vue`

**Step 1: Import MusicPlayer component**

Add to imports section (around line 226):

```javascript
import MusicPlayer from '@/components/Setlists/MusicPlayer.vue'
```

**Step 2: Add MusicPlayer to template**

Add before the closing `</div>` of the root element (before line 218, after DragTooltip):

```vue
<!-- Music Player -->
<MusicPlayer />
```

**Step 3: Commit**

```bash
git add src/views/Setlists/SetlistsView.vue
git commit -m "feat: integrate MusicPlayer into SetlistsView"
```

---

## Task 7: Add Toast Notification for Missing Previews

**Goal:** Show toast when user tries to play track without preview URL.

**Files:**
- Modify: `src/components/Setlists/SetlistColumn.vue`
- Modify: `src/components/Setlists/SpotifySearchModal.vue`
- Modify: `src/views/Setlists/SetlistsView.vue` (if toast helper needed)

**Step 1: Update SetlistColumn handleSongPlay to check result**

```javascript
async function handleSongPlay(song, index) {
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
```

**Step 2: Update SetlistsView to handle show-toast event**

Add event handler to SetlistColumn:

```vue
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
```

**Step 3: Update SpotifySearchModal to show toast for missing preview**

```javascript
async function handleAlbumArtClick(track, index) {
  const success = await playTrack(track, results.value, index)

  if (!success) {
    error.value = 'Preview not available for this track'
    setTimeout(() => {
      error.value = null
    }, 3000)
  }
}
```

**Step 4: Commit**

```bash
git add src/components/Setlists/SetlistColumn.vue src/views/Setlists/SetlistsView.vue src/components/Setlists/SpotifySearchModal.vue
git commit -m "feat: add toast notifications for missing preview URLs"
```

---

## Task 8: Manual Testing and Polish

**Goal:** Test all playback scenarios and fix any issues.

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test playback flow**

Manual test checklist:
- [ ] Click album art on song card → player appears and plays
- [ ] Click same album art → pauses/resumes
- [ ] Click different song → switches to new track
- [ ] Stop button → player disappears
- [ ] Next button → plays next song (disabled at end)
- [ ] Previous button → plays previous song (disabled at start)
- [ ] Progress bar updates during playback
- [ ] Preview ends after 30s → player shows paused state
- [ ] Click album art in search results → plays preview
- [ ] Add song from search while playing → stops playback

**Step 3: Test error cases**

- [ ] Track without preview_url → shows toast notification
- [ ] Network error during playback → shows error toast

**Step 4: Test mobile responsiveness**

- [ ] Player fits on mobile screen
- [ ] Controls are touch-friendly (44px min)
- [ ] Progress bar visible and functional
- [ ] Time labels hidden on mobile

**Step 5: Fix any issues found**

Make necessary adjustments based on testing.

**Step 6: Final commit**

```bash
git add .
git commit -m "fix: polish music player based on manual testing"
```

---

## Completion

Once all tasks are complete:

1. Create pull request to `master`
2. Test in staging/preview environment
3. Merge when approved

**Success Criteria:**
- ✅ Album art clickable on song cards and search results
- ✅ Player appears at bottom when playing
- ✅ Play/pause, stop, prev, next controls work
- ✅ Progress bar updates during playback
- ✅ Visual feedback on active track
- ✅ Context-aware navigation (list or search)
- ✅ Toast for missing previews
- ✅ Mobile responsive
