import { ref } from 'vue'
import { useAuth } from './useAuth'

// Module-level state (singleton pattern)
const currentTrack = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackContext = ref([])
const currentIndex = ref(-1)
const loading = ref(false)
const error = ref(null)

// Spotify Web Playback SDK player instance
let player = null
let deviceId = null
let isPlayerReady = false
let currentPlayOperation = null

export function useSpotify() {
  const { getValidSpotifyToken } = useAuth()

  // Initialize Spotify Web Playback SDK
  async function initializePlayer() {
    if (player || typeof window === 'undefined' || !window.Spotify) {
      return
    }

    try {
      const token = await getValidSpotifyToken()

      player = new window.Spotify.Player({
        name: 'Goomba Portal Player',
        getOAuthToken: async (cb) => {
          const freshToken = await getValidSpotifyToken()
          cb(freshToken)
        },
        volume: 0.8,
      })

      // Player ready
      player.addListener('ready', ({ device_id }) => {
        console.log('[useSpotify] Player ready with device ID:', device_id)
        deviceId = device_id
        isPlayerReady = true
      })

      // Player not ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('[useSpotify] Player not ready:', device_id)
        isPlayerReady = false
      })

      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) return

        // Update currentTime and duration
        currentTime.value = state.position / 1000 // Convert ms to seconds
        duration.value = state.duration / 1000

        // Update playing state
        isPlaying.value = !state.paused

        // Track ended
        if (state.paused && state.position === 0 && currentTrack.value) {
          console.log('[useSpotify] Track ended')
          isPlaying.value = false
        }
      })

      // Errors
      player.addListener('initialization_error', ({ message }) => {
        console.error('[useSpotify] Initialization error:', message)
        error.value = 'Failed to initialize player'
      })

      player.addListener('authentication_error', ({ message }) => {
        console.error('[useSpotify] Authentication error:', message)
        error.value = 'Authentication failed'
      })

      player.addListener('account_error', ({ message }) => {
        console.error('[useSpotify] Account error:', message)

        // Check if it's a scope issue
        if (message.includes('restricted') || message.includes('scope')) {
          error.value = 'Missing playback permissions. Please sign out and sign back in.'
        } else {
          error.value = 'Premium required for playback'
        }
      })

      player.addListener('playback_error', ({ message }) => {
        console.error('[useSpotify] Playback error:', message)
        error.value = 'Playback failed'
      })

      // Connect to the player
      const connected = await player.connect()
      if (!connected) {
        throw new Error('Failed to connect to Spotify player')
      }

      console.log('[useSpotify] Player connected successfully')
    } catch (err) {
      console.error('[useSpotify] initializePlayer error:', err)
      error.value = err.message
    }
  }

  // Wait for Spotify SDK to load
  if (typeof window !== 'undefined') {
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('[useSpotify] Spotify SDK ready')
      initializePlayer()
    }

    // If SDK is already loaded
    if (window.Spotify) {
      initializePlayer()
    }
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
    if (!player || !isPlayerReady) {
      console.warn('[useSpotify] Player not ready yet')
      error.value = 'Player is initializing...'
      return false
    }

    // Cancel any in-flight operation
    if (currentPlayOperation) {
      currentPlayOperation.cancelled = true
    }

    const operation = { cancelled: false }
    currentPlayOperation = operation

    // Get Spotify URI (track ID)
    const spotifyId = track.spotify_id || track.id
    if (!spotifyId) {
      console.warn('[useSpotify] No Spotify ID for track:', track)
      error.value = 'Cannot play track: missing Spotify ID'
      return false
    }

    // If clicking the same track, toggle play/pause
    const currentId = currentTrack.value?.spotify_id || currentTrack.value?.id
    if (currentId && currentId === spotifyId) {
      await togglePlayPause()
      return true
    }

    try {
      const token = await getValidSpotifyToken()

      // Play track using Spotify Web API
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uris: [`spotify:track:${spotifyId}`],
          }),
        },
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Player device not found. Try refreshing the page.')
        }
        if (response.status === 403) {
          throw new Error('Spotify Premium required for playback')
        }
        throw new Error(`Playback failed: ${response.status}`)
      }

      // Check if operation was cancelled
      if (operation.cancelled) {
        return false
      }

      // Update state
      currentTrack.value = track
      playbackContext.value = context
      currentIndex.value = index
      isPlaying.value = true

      return true
    } catch (err) {
      if (operation.cancelled) return false

      console.error('[useSpotify] playTrack error:', err)
      error.value = err.message
      return false
    }
  }

  async function togglePlayPause() {
    if (!player) return

    try {
      await player.togglePlay()
    } catch (err) {
      console.error('[useSpotify] togglePlayPause error:', err)
      error.value = 'Failed to toggle playback'
    }
  }

  async function stopPlayback() {
    if (!player) return

    try {
      await player.pause()
      currentTrack.value = null
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
      playbackContext.value = []
      currentIndex.value = -1
    } catch (err) {
      console.error('[useSpotify] stopPlayback error:', err)
    }
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
    // SDK initialization
    initializePlayer,
  }
}
