# Music Player Feature Design

**Date:** 2026-02-09
**Status:** Approved
**Author:** Claude Code (Brainstorming Session)

## Overview

Add a dynamic music player to the setlist view that allows users to play 30-second Spotify previews by clicking album art on song cards or search results. The player appears as a bottom overlay with iPod Touch-style controls and context-aware prev/next navigation.

## User Experience

- Click album art on any song card (in lists or search results) to play its preview
- Music player appears as overlay at bottom of screen
- Active track shows play icon overlay + subtle glow on its album art
- Click album art of playing track to pause/resume
- Player has Stop, Prev, Play/Pause, Next controls with progress bar
- Prev/next navigate within current context (list or search results)
- Stop button hides player and clears playback
- Player auto-hides when preview ends naturally (30s)
- Toast notification for tracks without previews

## Architecture

### 1. Playback State Management (`useSpotify` composable)

**New State:**
```javascript
const currentTrack = ref(null)           // Full track object
const isPlaying = ref(false)             // true = playing, false = paused
const currentTime = ref(0)               // Current position in seconds
const duration = ref(0)                  // Track duration (30s for previews)
const playbackContext = ref([])          // Array of tracks (from list or search)
const currentIndex = ref(-1)             // Index in playbackContext array
```

**New Methods:**
- `playTrack(track, context, index)` - Start playing a track with its context
- `togglePlayPause()` - Play/pause the current track
- `stopPlayback()` - Stop and clear everything (hides player)
- `playNext()` - Play next track in context array
- `playPrevious()` - Play previous track in context array

**HTML5 Audio Management:**
- Single `Audio` instance created once, reused for all tracks
- Change `audio.src` for each new track
- Event listeners:
  - `timeupdate` - Update currentTime (~4x per second)
  - `ended` - Set isPlaying = false to auto-hide player
  - `error` - Show toast and stop playback

**Context Switching:**
When user clicks album art from different list/search:
- Stop current playback
- Update `playbackContext` with new array
- Update `currentIndex` to clicked track's position
- Start playing new track

### 2. Player UI Component (`MusicPlayer.vue`)

**Layout Structure:**
```
[Progress Bar - full width across top]
[Album Art Thumbnail] [Track Info] [Controls]
```

**Visual Elements:**
- **Progress bar**: Slim bar (2-4px) at top edge, primary color fill
- **Album art**: 48x48px (mobile) / 56x56px (desktop), rounded
- **Track info**: Song title + artist (truncated)
- **Controls**: Stop, Previous, Play/Pause, Next buttons

**Styling:**
- Fixed position bottom overlay
- Dark background (`bg-base-200/95`) + backdrop blur
- Border top with subtle glow (`border-t border-white/10`)
- Height: ~80-100px
- Z-index: `z-40`

**Responsive:**
- **Mobile**: Smaller buttons, hide time labels, compact spacing
- **Desktop**: Larger controls, show time (0:15 / 0:30)

**Transitions:**
- Slide up/down from bottom (200-300ms)
- Only renders when `currentTrack` exists

### 3. Clickable Album Art

**SongCard.vue & SpotifySearchModal.vue Modifications:**

**Interaction:**
- Wrap album art in clickable container
- `@click.stop` handler to prevent drag interference
- Calls `playTrack(song, contextArray, index)`

**Visual Feedback:**
- Computed: `isCurrentTrack` checks if `currentTrack.value?.spotify_id === song.spotify_id`
- When active:
  - Play/Pause icon overlay (centered, semi-transparent circle)
  - Animated border glow (primary color pulse)
  - Darken album art with overlay (`bg-black/40`)

**Context Passing:**
- **SongCard**: Parent SetlistColumn provides its songs array
- **SearchModal**: Uses its `results` array as context
- Both pass array and clicked track's index

## Data Flow

### User Click → Playback
1. User clicks album art on SongCard or SearchModal
2. Component calls `playTrack(track, contextArray, indexInArray)`
3. Check if track has `preview_url` (if no → toast, return)
4. Check if already playing this track (if yes → toggle play/pause)
5. Update state: currentTrack, playbackContext, currentIndex
6. Set `audio.src = track.preview_url` and call `audio.play()`
7. MusicPlayer component appears reactively

### Prev/Next Navigation
1. User clicks Next/Prev in MusicPlayer
2. Calls `playNext()` or `playPrevious()`
3. Calculate new index: `currentIndex ± 1`
4. Check bounds, get track from `playbackContext[newIndex]`
5. Call `playTrack()` with new track

### Stop Button
1. User clicks Stop
2. Calls `stopPlayback()`
3. Pause audio, reset state: `currentTrack = null`
4. Player hides reactively

### Search Modal Selection
- When user clicks "Add" in search results
- **First call `stopPlayback()`** to clear player
- Then add song to list
- Prevents orphaned playback context

## Error Handling

### Tracks Without Preview URLs
- Check `track.preview_url` before playback
- Show toast: "Preview not available for this track"
- Don't change player state

### Audio Loading Errors
- Listen for `audio.error` event
- Show toast: "Failed to load audio preview"
- Stop playback and hide player

### End of Context Navigation
- Disable Previous button at index 0
- Disable Next button at last index
- Visual indicator (greyed out, not clickable)

### Playback End Behavior
- When preview ends (30s), `ended` event fires
- Set `isPlaying = false`
- Player stays visible in paused state

### Context Edge Cases
- Single track: Disable both prev/next
- Empty context (songs removed): Stop playback
- Song removed while playing: Continue (acceptable)

### Session Expiry
- 401 errors caught by existing `getValidSpotifyToken()`
- Show toast, stop playback

## Implementation

### Files to Modify

1. **`src/composables/useSpotify.js`**
   - Add playback state refs
   - Add Audio instance management
   - Add playback control methods
   - Add event listeners

2. **`src/components/Setlists/SongCard.vue`**
   - Make album art clickable
   - Add visual feedback for active track

3. **`src/components/Setlists/SetlistColumn.vue`**
   - Handle album art click events
   - Pass songs array as context

4. **`src/components/Setlists/SpotifySearchModal.vue`**
   - Make album art clickable
   - Add visual feedback
   - Call stopPlayback() on song selection

5. **`src/views/Setlists/SetlistsView.vue`**
   - Import and render MusicPlayer component

### Files to Create

1. **`src/components/Setlists/MusicPlayer.vue`**
   - Bottom overlay player component
   - Progress bar, controls, track info
   - Transitions

## Mobile Considerations

- Touch targets min-height 44px
- Compact player height ~70px on mobile
- Hide time labels on small screens
- Test Safari audio autoplay policies
- Ensure player doesn't cover critical content

## Future Iterations

- Volume control
- Full Spotify Web Playback SDK (Premium accounts)
- Queue management
- Keyboard shortcuts (spacebar play/pause)
- Persist playback across navigation
- Shuffle/repeat modes
