import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useSpotifyPlayback } from './useSpotifyPlayback'

// Development mode logging (disable in production)
const DEBUG_MODE = import.meta.env.DEV
const log = (...args) => DEBUG_MODE && console.log(...args)
const logError = (...args) => console.error(...args)
const logWarn = (...args) => console.warn(...args)

// Module-level state (singleton pattern)
const currentTrack = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackContext = ref([])
const currentIndex = ref(-1)
const loading = ref(false)
const error = ref(null)
const volume = ref(100) // Volume 0-100 (defaults to 100% to allow OS volume control)

// Spotify Web Playback SDK player instance
let player = null
let deviceId = null
let isPlayerReady = false
let currentPlayOperation = null
let initializationPending = false
let getPlaybackTokenFn = null
let positionUpdateInterval = null

// Define SDK ready callback at module level (before any component uses it)
if (typeof window !== 'undefined') {
  window.onSpotifyWebPlaybackSDKReady = () => {
    log('[useSpotify] Spotify SDK ready')
    // Only initialize if useSpotify has been called
    if (getPlaybackTokenFn) {
      initializePlayerInternal()
    }
  }
}

async function initializePlayerInternal() {
  if (player || typeof window === 'undefined' || !window.Spotify) {
    return
  }

  if (!getPlaybackTokenFn) {
    logWarn('[useSpotify] Cannot initialize - no token function available')
    return
  }

  try {
    const token = await getPlaybackTokenFn()
    if (!token) {
      logWarn('[useSpotify] No playback token available')
      return
    }

    log('[useSpotify] Initializing player with playback token:', token.substring(0, 20) + '...')

    player = new window.Spotify.Player({
      name: 'Goomba Portal Player',
      getOAuthToken: async (cb) => {
        const freshToken = await getPlaybackTokenFn()
        if (!freshToken) {
          logError('[useSpotify] Failed to get playback token')
          return
        }
        cb(freshToken)
      },
      volume: 1.0, // 100% to allow OS volume control
    })

    // Player ready
    player.addListener('ready', ({ device_id }) => {
      log('[useSpotify] Player ready with device ID:', device_id)
      deviceId = device_id
      isPlayerReady = true
      loadVolumePreference()
    })

    // Player not ready
    player.addListener('not_ready', () => {
      isPlayerReady = false
    })

    // Player state changed
    player.addListener('player_state_changed', (state) => {
      if (!state) return

      // Update currentTime and duration
      currentTime.value = state.position / 1000 // Convert ms to seconds
      duration.value = state.duration / 1000

      // Update playing state
      const wasPlaying = isPlaying.value
      isPlaying.value = !state.paused

      // Start/stop position updates based on play/pause
      if (isPlaying.value && !wasPlaying) {
        startPositionUpdates()
      } else if (!isPlaying.value && wasPlaying) {
        stopPositionUpdates()
      }

      // Track ended
      if (state.paused && state.position === 0 && currentTrack.value) {
        isPlaying.value = false
        stopPositionUpdates()
      }
    })

    // Errors
    player.addListener('initialization_error', ({ message }) => {
      logError('[useSpotify] Initialization error:', message)
      error.value = 'Failed to initialize player'
    })

    player.addListener('authentication_error', ({ message }) => {
      // Scope check errors are harmless (SDK checks for internal 'web-playback' scope)
      if (message.toLowerCase().includes('scope')) {
        logWarn('[useSpotify] SDK scope check failed (expected - playback still works):', message)
      } else {
        logError('[useSpotify] Authentication error:', message)
        error.value = 'Authentication failed'
      }
    })

    player.addListener('account_error', ({ message }) => {
      logError('[useSpotify] Account error:', message)

      // Check if it's a scope issue
      if (message.includes('restricted') || message.includes('scope')) {
        error.value = 'Missing playback permissions. Please sign out and sign back in.'
      } else {
        error.value = 'Premium required for playback'
      }
    })

    player.addListener('playback_error', ({ message }) => {
      logError('[useSpotify] Playback error:', message)
      error.value = 'Playback failed'
    })

    // Connect to the player
    const connected = await player.connect()
    if (!connected) {
      throw new Error('Failed to connect to Spotify player')
    }

    log('[useSpotify] Player connected successfully')
  } catch (err) {
    logError('[useSpotify] initializePlayer error:', err)
    error.value = err.message
  }
}

// Position update polling (for smooth progress bar)
function startPositionUpdates() {
  if (positionUpdateInterval) return // Already running

  positionUpdateInterval = setInterval(async () => {
    if (!player || !isPlaying.value) {
      stopPositionUpdates()
      return
    }

    try {
      const state = await player.getCurrentState()
      if (state) {
        currentTime.value = state.position / 1000
        duration.value = state.duration / 1000
      }
    } catch (err) {
      // Silently ignore polling errors
    }
  }, 1000) // Update every second
}

function stopPositionUpdates() {
  if (positionUpdateInterval) {
    clearInterval(positionUpdateInterval)
    positionUpdateInterval = null
  }
}

// Load stored volume preference
function loadVolumePreference() {
  try {
    const storedVolume = localStorage.getItem('spotify_player_volume')
    if (storedVolume) {
      const vol = parseInt(storedVolume, 10)
      if (!isNaN(vol)) {
        volume.value = vol
        if (player) {
          player.setVolume(vol / 100)
        }
      }
    }
  } catch (err) {
    // Ignore errors loading preference
  }
}

export function useSpotify() {
  const { getValidSpotifyToken } = useAuth()
  const { getValidToken: getPlaybackToken } = useSpotifyPlayback()

  // Store token function at module level so initialization can use it
  if (!getPlaybackTokenFn) {
    getPlaybackTokenFn = getPlaybackToken
  }

  // Initialize player if SDK is already loaded
  if (typeof window !== 'undefined' && window.Spotify && !player) {
    initializePlayerInternal()
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
      logError('[useSpotify] searchTracks error:', err)
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

  // Get the current device ID from Spotify's API (more reliable than SDK's device_id)
  async function getCurrentDeviceId() {
    try {
      const token = await getPlaybackToken()
      if (!token) return null

      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        logError('[useSpotify] Failed to fetch devices:', response.status)
        return null
      }

      const data = await response.json()
      // Find our device by name
      const ourDevice = data.devices?.find((d) => d.name === 'Goomba Portal Player')

      if (ourDevice) {
        log('[useSpotify] Found device ID from API:', ourDevice.id)
        return ourDevice.id
      }

      logWarn('[useSpotify] Could not find "Goomba Portal Player" device in:', data.devices)
      return null
    } catch (err) {
      logError('[useSpotify] Error fetching device ID:', err)
      return null
    }
  }

  async function playTrack(track, context = [], index = 0) {
    if (!player || !isPlayerReady) {
      logWarn('[useSpotify] Player not ready yet')
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
      logWarn('[useSpotify] No Spotify ID for track:', track)
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
      const token = await getPlaybackToken()
      if (!token) {
        logError('[useSpotify] No playback token available')
        error.value = 'Playback not set up. Please sign in again.'
        return false
      }

      // Get the current device ID from API (more reliable than cached value)
      const currentDeviceId = await getCurrentDeviceId()
      if (!currentDeviceId) {
        logError('[useSpotify] Could not get device ID')
        error.value = 'Player device not found. Try refreshing the page.'
        return false
      }

      // Play track using Spotify Web API
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`,
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

      // Start position updates for progress bar
      startPositionUpdates()

      return true
    } catch (err) {
      if (operation.cancelled) return false

      logError('[useSpotify] playTrack error:', err)
      error.value = err.message
      return false
    }
  }

  async function togglePlayPause() {
    if (!player) return

    try {
      // Check if there's an active playback session
      const state = await player.getCurrentState()
      if (!state) {
        logWarn('[useSpotify] No active playback session')
        return
      }

      await player.togglePlay()
    } catch (err) {
      logError('[useSpotify] togglePlayPause error:', err)
      // Don't show error to user for "no list loaded" - just a state issue
      if (!err.message?.includes('no list was loaded')) {
        error.value = 'Failed to toggle playback'
      }
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
      logError('[useSpotify] stopPlayback error:', err)
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

  async function setVolume(newVolume) {
    if (!player) return

    // Clamp volume between 0 and 100
    const clampedVolume = Math.max(0, Math.min(100, newVolume))

    try {
      await player.setVolume(clampedVolume / 100) // SDK expects 0-1
      volume.value = clampedVolume
      // Store volume preference
      localStorage.setItem('spotify_player_volume', clampedVolume.toString())
    } catch (err) {
      logError('[useSpotify] setVolume error:', err)
    }
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
    volume,
    // Playback controls
    playTrack,
    togglePlayPause,
    stopPlayback,
    playNext,
    playPrevious,
    setVolume,
  }
}
