# Setlist Manager - Phase 1 Design
## List & Song Management (No Drag-and-Drop)

**Date:** 2026-01-10
**Status:** Approved
**Phase:** 1 of 4 (Incremental Build)

---

## Overview

Phase 1 establishes the foundation for a Trello-style collaborative setlist manager. This phase focuses on core list and song CRUD operations with Spotify integration, laying the groundwork for future assignment tracking and drag-and-drop functionality.

**What's Included in Phase 1:**
- Create, edit, and delete setlists
- Add songs via Spotify search
- Display songs with album artwork and metadata
- Manual song reordering (up/down buttons)
- Horizontal scrolling column layout (Trello preview)
- Real-time collaborative updates via Supabase

**What's Deferred:**
- Instrument assignments and progress tracking (Phase 2)
- Drag-and-drop reordering (Phase 3)
- Advanced Spotify features like previews, playlists (Phase 4)

---

## Architecture

### Implementation Strategy

**Approach:** Incremental Build (Option B from brainstorming)
1. ✅ Phase 1: List & song management (this document)
2. Phase 2: Assignment tracking (instruments, progress, difficulty)
3. Phase 3: Trello UI polish (drag-and-drop, animations)
4. Phase 4: Advanced Spotify integration (previews, playlist export)

**Rationale:** Validates each layer with Supabase schema before adding complexity. Delivers usable features faster while building toward full Trello experience.

### Application Structure

**Route Structure:** Hybrid Dashboard + Dedicated Setlists (Option C)
- `/dashboard` - Overview with stats and quick links
- `/setlists` - Full setlist board with horizontal columns

**Why Hybrid:**
- Dashboard provides quick visibility (readiness stats, recent activity)
- Setlists route offers focused full-screen workspace
- Keeps dashboard flexible for future features (rehearsal scheduling, analytics)

---

## Routing & Navigation

### New Routes

```javascript
{
  path: '/setlists',
  name: 'setlists',
  component: () => import('@/views/SetlistsView.vue'),
  meta: {
    title: 'Setlists - Goomba Portal',
    requiresAuth: true
  }
}
```

### Dashboard Content (Minimal for Phase 1)

`/dashboard` displays:
- Welcome message with Spotify profile info
- Quick stats cards:
  - Total lists created
  - Total songs in repertoire
- Primary CTA: "Go to Setlists" button → navigates to `/setlists`
- Placeholder areas for future features

### Setlists Page Structure

`/setlists` layout:
- Full-width board container with horizontal scroll
- Header bar:
  - Page title: "Setlists"
  - "Create List" button (primary action)
- Horizontal flex container for list columns
- Spotify search modal (overlays when active)

### Navigation Enhancement

Consider adding simple nav bar for easy switching:
- Dashboard link
- Setlists link
- User profile menu (logout, settings)

---

## Data Layer

### Composables Architecture

Vue 3 Composition API with dedicated composables for each concern.

#### `src/composables/useSetlists.js`

Manages list-level operations:

```javascript
export function useSetlists() {
  const lists = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchLists() {
    // Load all lists, sorted by created_at
    // SELECT * FROM lists ORDER BY created_at DESC
  }

  async function createList(name, description, listType = 'setlist') {
    // INSERT INTO lists with current user as creator
  }

  async function updateList(id, updates) {
    // UPDATE lists SET name/description/etc
  }

  async function deleteList(id) {
    // DELETE FROM lists (cascades to list_songs via FK)
  }

  // Real-time subscriptions
  function subscribeToLists() {
    // supabase.channel().on('postgres_changes', ...)
  }

  return {
    lists,
    loading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList,
    subscribeToLists
  }
}
```

**Key Features:**
- Reactive state with `ref()`
- Real-time updates for collaborative editing
- Error handling with friendly messages

---

#### `src/composables/useSongs.js`

Manages song-level operations:

```javascript
export function useSongs() {
  async function fetchListSongs(listId) {
    // SELECT songs.*, list_songs.position
    // FROM songs
    // JOIN list_songs ON songs.id = list_songs.song_id
    // WHERE list_songs.list_id = $1
    // ORDER BY list_songs.position
  }

  async function addSongToList(listId, spotifyTrack) {
    // 1. Check if song exists (by spotify_id)
    // 2. If not, INSERT INTO songs with Spotify metadata
    // 3. Calculate next position (MAX(position) + 1)
    // 4. INSERT INTO list_songs
  }

  async function removeSongFromList(listId, songId) {
    // DELETE FROM list_songs WHERE list_id AND song_id
    // Does NOT delete from songs table (may be in other lists)
  }

  async function reorderSong(listId, songId, newPosition) {
    // 1. Get current position
    // 2. If moving up: decrement positions between new and old
    // 3. If moving down: increment positions between old and new
    // 4. UPDATE position for target song
  }

  return {
    fetchListSongs,
    addSongToList,
    removeSongFromList,
    reorderSong
  }
}
```

**Position Handling:**
- When inserting at position N, increment all songs with position >= N
- When reordering, shift affected songs to maintain unique positions
- Positions are list-specific (same song can have different positions in different lists)

---

#### `src/composables/useSpotify.js`

Handles Spotify Web API integration:

```javascript
export function useSpotify() {
  const { session } = useAuth()

  async function searchTracks(query) {
    const token = session.value?.provider_token
    if (!token) throw new Error('No Spotify token')

    // GET https://api.spotify.com/v1/search?type=track&q={query}
    // Transform response to match our schema
  }

  function transformTrack(spotifyTrack) {
    return {
      spotify_id: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists[0].name,
      album: spotifyTrack.album.name,
      duration_ms: spotifyTrack.duration_ms,
      album_art_url: spotifyTrack.album.images[0]?.url,
      // key, tempo from audio features (optional for Phase 1)
    }
  }

  return {
    searchTracks,
    transformTrack
  }
}
```

**Token Management:**
- Use `provider_token` from Supabase auth session
- Handle 401 errors (expired token) → redirect to re-auth
- Consider token refresh logic if needed

---

## Component Structure

### Page Components

#### `src/views/DashboardView.vue`

Minimal overview page:
- Uses `useAuth()` to display user profile
- Uses `useSetlists()` to fetch stats
- CTA button navigates to `/setlists`

```vue
<template>
  <div class="min-h-screen bg-black text-white p-8">
    <h1>Welcome, {{ user?.user_metadata?.name }}</h1>

    <div class="stats-grid">
      <StatCard title="Total Lists" :value="lists.length" />
      <StatCard title="Total Songs" :value="totalSongs" />
    </div>

    <router-link to="/setlists">
      <button class="btn-primary">Go to Setlists</button>
    </router-link>
  </div>
</template>
```

---

#### `src/views/SetlistsView.vue`

Main setlist board:
- Uses `useSetlists()` and `useSongs()`
- Manages modal state for Spotify search
- Renders horizontal scrolling columns

```vue
<template>
  <div class="setlists-board">
    <header class="board-header">
      <h1>Setlists</h1>
      <button @click="showCreateList = true">+ Create List</button>
    </header>

    <div class="columns-container">
      <SetlistColumn
        v-for="list in lists"
        :key="list.id"
        :list="list"
        @add-song="openSearchModal(list.id)"
      />
    </div>

    <SpotifySearchModal
      :is-open="searchModalOpen"
      :list-id="selectedListId"
      @close="closeSearchModal"
      @select="handleSongSelect"
    />
  </div>
</template>
```

---

### Reusable Components

#### `src/components/Setlists/SetlistColumn.vue`

Individual list column:

**Props:**
- `list` (Object) - List data including id, name, description

**Features:**
- Editable title (click to edit, blur to save)
- "Add Song" button → emits `add-song` event
- Scrollable song list area
- Delete list button with confirmation dialog

**Layout:**
- Fixed width (~320px)
- Full height with internal scroll
- Sticky header at top

```vue
<template>
  <div class="setlist-column">
    <div class="column-header">
      <input
        v-if="editing"
        v-model="editedName"
        @blur="saveName"
        class="title-input"
      />
      <h2 v-else @click="editing = true">{{ list.name }}</h2>

      <button @click="$emit('add-song')" class="btn-add-song">
        + Add Song
      </button>
    </div>

    <div class="songs-list">
      <SongCard
        v-for="song in songs"
        :key="song.id"
        :song="song"
        :list-id="list.id"
        @reorder="handleReorder"
        @remove="handleRemove"
      />
    </div>

    <button @click="confirmDelete" class="btn-delete-list">
      Delete List
    </button>
  </div>
</template>
```

---

#### `src/components/Setlists/SongCard.vue`

Individual song display:

**Props:**
- `song` (Object) - Song data with title, artist, album_art_url
- `listId` (String) - Parent list ID for context

**Features:**
- Album artwork (48x48px, rounded)
- Title and artist text
- Up/down reorder buttons
- Remove from list button (X icon)

**Events:**
- `reorder` - Emits direction ('up' or 'down')
- `remove` - Emits to remove song from list

```vue
<template>
  <div class="song-card">
    <img :src="song.album_art_url" :alt="song.album" class="album-art" />

    <div class="song-info">
      <h3 class="song-title">{{ song.title }}</h3>
      <p class="song-artist">{{ song.artist }}</p>
    </div>

    <div class="song-actions">
      <button @click="$emit('reorder', 'up')" class="btn-icon">↑</button>
      <button @click="$emit('reorder', 'down')" class="btn-icon">↓</button>
      <button @click="$emit('remove')" class="btn-icon">×</button>
    </div>
  </div>
</template>
```

---

#### `src/components/Setlists/SpotifySearchModal.vue`

Spotify search interface:

**Props:**
- `isOpen` (Boolean) - Controls visibility
- `listId` (String) - Target list for adding songs

**Features:**
- Search input with 300ms debounce
- Loading spinner during search
- Results list with album art + track info
- Click result → add to list → close modal
- Escape key or backdrop click to close

**Events:**
- `close` - User dismissed modal
- `select` - User selected a track (passes track object)

```vue
<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <input
        v-model="searchQuery"
        @input="debouncedSearch"
        placeholder="Search for songs..."
        class="search-input"
      />

      <div v-if="loading" class="loading-spinner">Searching...</div>

      <div v-else-if="results.length" class="results-list">
        <div
          v-for="track in results"
          :key="track.id"
          @click="$emit('select', track)"
          class="result-item"
        >
          <img :src="track.album.images[0]?.url" class="album-thumb" />
          <div>
            <div class="track-name">{{ track.name }}</div>
            <div class="track-artist">{{ track.artists[0].name }}</div>
          </div>
          <button class="btn-add">Add</button>
        </div>
      </div>

      <div v-else-if="searchQuery" class="empty-state">
        No results for "{{ searchQuery }}"
      </div>

      <div v-else class="empty-state">
        Search for songs to add
      </div>
    </div>
  </div>
</template>
```

---

## UI & Styling

### Design System

**Color Palette:**
- Background: `#000000` (black)
- Card background: `#111111` or `bg-gray-900`
- Primary green: `#1db954` (Spotify green)
- Accent green: `#00ff88` (brighter highlight)
- Text: `#ffffff` (white), `#b3b3b3` (gray text)
- Borders: `#333333` (subtle dividers)

**Typography:**
- Primary font: `Circular` (Spotify's font)
- Headers: `Coder` (monospace, for branding)
- Sizes: Scale from `text-xs` to `text-2xl` responsively

**Spacing:**
- Container padding: `px-4 sm:px-6 lg:px-8`
- Section spacing: `py-6 sm:py-8 lg:py-12`
- Card gaps: `gap-4` between columns

---

### Setlists Board Layout

**Desktop (1024px+):**
```css
.setlists-board {
  height: 100vh;
  background: #000000;
  display: flex;
  flex-direction: column;
}

.columns-container {
  flex: 1;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
}
```

**Mobile (< 768px):**
```css
.columns-container {
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.setlist-column {
  scroll-snap-align: start;
  min-width: 85vw; /* Nearly full width per column */
}
```

---

### List Column Styling

**Structure:**
```css
.setlist-column {
  width: 320px;
  min-width: 320px; /* Prevent shrinking */
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
}

.songs-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}
```

**Scrollbar Styling:**
```css
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
```

---

### Song Card Styling

**Compact Horizontal Layout:**
```css
.song-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #1a1a1a;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.song-card:hover {
  background: #222222;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.2);
}

.album-art {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}

.song-info {
  flex: 1;
  min-width: 0; /* Allow text truncation */
}

.song-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 0.75rem;
  color: #b3b3b3;
}

.song-actions {
  display: flex;
  gap: 0.25rem;
}
```

---

### Spotify Search Modal

**Modal Overlay:**
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
```

**Search Input:**
```css
.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #000000;
  border: 2px solid #333333;
  border-radius: 8px;
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #1db954;
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.1);
}
```

**Results List:**
```css
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

---

### Responsive Strategy

**Desktop (1024px+):**
- Horizontal columns as designed
- Full mouse interactions (hover states, tooltips)
- Wider modal (600px max-width)

**Tablet (768px - 1023px):**
- Slightly narrower columns (280px)
- Reduce gaps to fit more on screen
- Modal remains centered

**Mobile (< 768px):**
- Horizontal scroll with snap points
- Columns nearly full-width (85vw)
- Touch-friendly button sizes (min 44px height)
- Modal goes full-screen with safe area padding
- Stack action buttons vertically if needed

```css
@media (max-width: 768px) {
  .modal-content {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .song-actions button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

---

## Error Handling

### Authentication Errors

**Spotify Token Expired (401):**
```javascript
catch (error) {
  if (error.response?.status === 401) {
    showToast('Spotify session expired. Please log in again.', 'error')
    router.push('/login')
  }
}
```

**No Session:**
- Handled by existing route guard (`requiresAuth: true`)
- Redirects to `/login` automatically

---

### Supabase Errors

**Network Failures:**
```javascript
catch (error) {
  if (error.message.includes('Failed to fetch')) {
    showToast('Connection lost. Check your internet.', 'error')
    // Show retry button
  }
}
```

**RLS Policy Violations:**
- Should not occur for authenticated users
- Log to console for debugging: `console.error('[RLS]', error)`

**Unique Constraint Violations:**
```javascript
// Adding duplicate song to same list
if (error.code === '23505') { // Postgres unique violation
  showToast('This song is already in the list', 'warning')
}
```

---

### User Experience Edge Cases

**Empty States:**

No lists yet:
```vue
<div v-if="lists.length === 0" class="empty-state-large">
  <h2>No setlists yet</h2>
  <p>Create your first setlist to get started</p>
  <button @click="createFirstList">+ Create Setlist</button>
</div>
```

List has no songs:
```vue
<div v-if="songs.length === 0" class="empty-state-column">
  <p>No songs yet</p>
  <button @click="openSearch">Add Song</button>
</div>
```

Search no results:
```vue
<div class="empty-state-search">
  No songs found for "{{ searchQuery }}"
</div>
```

---

**Loading States:**

Initial page load:
```vue
<div v-if="loading" class="skeleton-columns">
  <div v-for="i in 3" :key="i" class="skeleton-column" />
</div>
```

Search loading:
```vue
<div v-if="searching" class="spinner-container">
  <SpinnerIcon class="animate-spin" />
  <p>Searching Spotify...</p>
</div>
```

Button actions:
```vue
<button @click="handleAction" :disabled="processing">
  <SpinnerIcon v-if="processing" />
  <span v-else>{{ buttonText }}</span>
</button>
```

---

**Optimistic Updates:**

Update UI immediately, rollback on failure:

```javascript
async function removeSongFromList(listId, songId) {
  // Optimistically remove from UI
  const songIndex = songs.value.findIndex(s => s.id === songId)
  const removedSong = songs.value.splice(songIndex, 1)[0]

  try {
    await supabase
      .from('list_songs')
      .delete()
      .match({ list_id: listId, song_id: songId })
  } catch (error) {
    // Rollback on failure
    songs.value.splice(songIndex, 0, removedSong)
    showToast('Failed to remove song', 'error')
  }
}
```

---

**Position Conflicts:**

Validate before sending to server:

```javascript
async function reorderSong(listId, songId, direction) {
  const currentIndex = songs.value.findIndex(s => s.id === songId)
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  // Validate bounds
  if (newIndex < 0 || newIndex >= songs.value.length) {
    return // Can't move beyond edges
  }

  const newPosition = songs.value[newIndex].position

  // Update in database
  await updateSongPosition(listId, songId, newPosition)
}
```

---

### Rate Limiting

**Spotify API (429 errors):**
```javascript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'] || 5
  showToast(
    `Too many requests. Try again in ${retryAfter} seconds.`,
    'warning'
  )
}
```

**Search Debouncing:**
```javascript
const debouncedSearch = useDebounceFn(async (query) => {
  if (query.length < 2) return
  await searchTracks(query)
}, 300) // 300ms delay
```

Prevents excessive API calls while user types.

---

## Testing Strategy

### Manual Testing Checklist (Phase 1)

**List Operations:**
- [ ] Create new list with valid name
- [ ] Create list with empty name (should show validation)
- [ ] Edit list name inline
- [ ] Delete empty list
- [ ] Delete list with songs (confirm cascade)
- [ ] Create 5+ lists (test horizontal scroll)

**Song Operations:**
- [ ] Search for song (e.g., "Bohemian Rhapsody")
- [ ] Add song to list
- [ ] Add same song to multiple lists
- [ ] Add 20+ songs to test column scroll
- [ ] Remove song from list (stays in other lists)
- [ ] Reorder song up (first position)
- [ ] Reorder song down (last position)
- [ ] Reorder song in middle

**Search Modal:**
- [ ] Open modal, press Escape (should close)
- [ ] Open modal, click backdrop (should close)
- [ ] Search with 1 character (should not trigger API)
- [ ] Search with 2+ characters (should show results)
- [ ] Search for nonexistent song (show empty state)
- [ ] Select result (should add to list and close)

**Error Scenarios:**
- [ ] Disconnect internet, try to load page (show error + retry)
- [ ] Disconnect during search (show error toast)
- [ ] Try to add duplicate song (show warning)
- [ ] Log out in another tab, try to add song (should redirect to login)

**Responsive Layout:**
- [ ] Desktop (1440px): Multiple columns visible
- [ ] Tablet (768px): Scrollable columns
- [ ] Mobile (375px): Snap scroll, full-width columns
- [ ] Mobile modal: Full-screen overlay
- [ ] Touch targets: All buttons >= 44px

**Real-time Collaboration:**
- [ ] Open app in two browsers, same account
- [ ] Create list in browser A (should appear in browser B)
- [ ] Add song in browser B (should appear in browser A)
- [ ] Delete list in browser A (should disappear in browser B)

---

## Implementation Notes

### Dependencies

**Existing:**
- Vue 3 with Composition API ✅
- Supabase client ✅
- Vue Router ✅
- Tailwind CSS ✅
- Spotify OAuth ✅

**New Packages Needed:**
- `@vueuse/core` - For `useDebounceFn` and other composables

Install:
```bash
npm install @vueuse/core
```

---

### Database Queries

**Fetch Lists:**
```javascript
const { data, error } = await supabase
  .from('lists')
  .select('*')
  .order('created_at', { ascending: false })
```

**Fetch Songs for List:**
```javascript
const { data, error } = await supabase
  .from('list_songs')
  .select(`
    position,
    songs (
      id,
      spotify_id,
      title,
      artist,
      album,
      duration_ms
    )
  `)
  .eq('list_id', listId)
  .order('position')
```

**Add Song to List:**
```javascript
// 1. Upsert song (insert if not exists)
const { data: song } = await supabase
  .from('songs')
  .upsert({
    spotify_id: track.id,
    title: track.name,
    artist: track.artists[0].name,
    album: track.album.name,
    duration_ms: track.duration_ms,
    suggested_by_user_id: user.id
  }, { onConflict: 'spotify_id' })
  .select()
  .single()

// 2. Get max position
const { data: maxPos } = await supabase
  .from('list_songs')
  .select('position')
  .eq('list_id', listId)
  .order('position', { ascending: false })
  .limit(1)
  .single()

const nextPosition = (maxPos?.position || 0) + 1

// 3. Insert list_songs entry
await supabase
  .from('list_songs')
  .insert({
    list_id: listId,
    song_id: song.id,
    position: nextPosition
  })
```

**Reorder Song:**
```javascript
// Simplified approach: just swap positions
const { data: songs } = await supabase
  .from('list_songs')
  .select('id, position')
  .eq('list_id', listId)
  .order('position')

// Find current and target indices
// Swap their positions
// Update both records
```

---

### Real-time Subscriptions

```javascript
onMounted(() => {
  const channel = supabase
    .channel('setlists-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lists'
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          lists.value.push(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          const index = lists.value.findIndex(l => l.id === payload.new.id)
          if (index !== -1) lists.value[index] = payload.new
        } else if (payload.eventType === 'DELETE') {
          lists.value = lists.value.filter(l => l.id !== payload.old.id)
        }
      }
    )
    .subscribe()

  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})
```

---

## Next Steps

After Phase 1 completion:

1. **Validate with Users:**
   - Test with band members
   - Gather feedback on UX flow
   - Identify pain points

2. **Phase 2 Planning:**
   - Design assignment tracking UI
   - Plan progress visualization
   - Define difficulty rating interface

3. **Technical Debt:**
   - Add unit tests for composables
   - Optimize Supabase queries (indexes, caching)
   - Add error monitoring (e.g., Sentry)

---

## Success Criteria

Phase 1 is complete when:

- [ ] Users can create/edit/delete lists
- [ ] Users can search Spotify and add songs
- [ ] Songs display with album artwork
- [ ] Manual reordering works (up/down buttons)
- [ ] Horizontal scrolling layout functions on desktop
- [ ] Snap scrolling works on mobile
- [ ] Real-time updates work across browsers
- [ ] All error states handled gracefully
- [ ] No console errors or warnings
- [ ] Code reviewed and merged to `main`

---

**End of Phase 1 Design Document**
