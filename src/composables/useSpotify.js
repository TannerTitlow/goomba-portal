import { ref } from 'vue'
import { useAuth } from './useAuth'

// Module-level singleton pattern to prevent memory leaks
let audioInstance = null
let eventListenersAttached = false

// Module-level refs for playback state (shared across all composable instances)
const currentTrack = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackContext = ref([])
const currentIndex = ref(-1)

// Track in-flight play operations to handle race conditions
let currentPlayOperation = null

export function useSpotify() {
  const { getValidSpotifyToken } = useAuth()
  const loading = ref(false)
  const error = ref(null)

  // Initialize audio instance only once at module level
  if (!audioInstance && typeof window !== 'undefined') {
    audioInstance = new Audio()
    audioInstance.preload = 'auto'
  }

  const audio = audioInstance

  // Attach event listeners only once
  if (audio && !eventListenersAttached) {
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

    eventListenersAttached = true
  }

  async function searchTracks(query) {
    if (!query || query.length < 2) {
      return []
    }

    loading.value = true
    error.value = null

    try {
      const token = await getValidSpotifyToken()

      const response = await fetch(
        `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Spotify session expired. You have been signed out.')
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || 5
          throw new Error(
            `Too many requests. Try again in ${retryAfter} seconds.`,
          )
        }
        throw new Error(`Spotify API error: ${response.status}`)
      }

      const data = await response.json()
      return data.tracks?.items || []
    } catch (err) {
      error.value = err.message
      console.error('[useSpotify] searchTracks error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function getAlbumArtUrl(track, size = 'medium') {
    if (!track?.album?.images?.length) return null

    const sizeMap = {
      large: 0,
      medium: 1,
      small: 2,
    }

    const index = sizeMap[size] || 1
    return track.album.images[index]?.url || track.album.images[0]?.url
  }

  async function playTrack(track, context = [], index = 0) {
    if (!audio) return false

    // Cancel any in-flight operation to prevent race conditions
    if (currentPlayOperation) {
      currentPlayOperation.cancelled = true
    }

    const operation = { cancelled: false }
    currentPlayOperation = operation

    // Check if track has preview URL
    if (!track.preview_url) {
      console.warn('[useSpotify] No preview URL for track:', track)
      // Caller should show toast
      return false
    }

    // If clicking the same track, toggle play/pause
    const currentId = currentTrack.value?.spotify_id || currentTrack.value?.id
    const trackId = track.spotify_id || track.id

    if (currentId && trackId && currentId === trackId) {
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

      // Only update state if this operation wasn't cancelled
      if (operation.cancelled) {
        return false
      }

      return true
    } catch (err) {
      if (operation.cancelled) return false

      console.error('[useSpotify] playTrack error:', err)
      error.value = 'Failed to load audio preview'
      stopPlayback()
      return false
    }
  }

  async function togglePlayPause() {
    if (!audio || !currentTrack.value) return

    if (isPlaying.value) {
      audio.pause()
      isPlaying.value = false
    } else {
      try {
        await audio.play()
        isPlaying.value = true
      } catch (err) {
        console.error('[useSpotify] togglePlayPause error:', err)
        isPlaying.value = false
        error.value = 'Failed to resume playback'
      }
    }
  }

  function stopPlayback() {
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    audio.src = ''
    currentTrack.value = null
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    playbackContext.value = []
    currentIndex.value = -1
  }

  async function playNext() {
    if (currentIndex.value >= playbackContext.value.length - 1) return false

    const nextIndex = currentIndex.value + 1
    const nextTrack = playbackContext.value[nextIndex]

    if (nextTrack) {
      return await playTrack(nextTrack, playbackContext.value, nextIndex)
    }
    return false
  }

  async function playPrevious() {
    if (currentIndex.value <= 0) return false

    const prevIndex = currentIndex.value - 1
    const prevTrack = playbackContext.value[prevIndex]

    if (prevTrack) {
      return await playTrack(prevTrack, playbackContext.value, prevIndex)
    }
    return false
  }

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
}
