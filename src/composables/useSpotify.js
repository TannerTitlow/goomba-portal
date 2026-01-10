import { ref } from 'vue'
import { useAuth } from './useAuth'

export function useSpotify() {
  const { session } = useAuth()
  const loading = ref(false)
  const error = ref(null)

  async function searchTracks(query) {
    if (!query || query.length < 2) {
      return []
    }

    loading.value = true
    error.value = null

    try {
      const token = session.value?.provider_token

      if (!token) {
        throw new Error('No Spotify token available')
      }

      const response = await fetch(
        `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Spotify session expired. Please log in again.')
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || 5
          throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`)
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

    // Spotify typically returns [large, medium, small]
    const sizeMap = {
      large: 0,
      medium: 1,
      small: 2
    }

    const index = sizeMap[size] || 1
    return track.album.images[index]?.url || track.album.images[0]?.url
  }

  return {
    loading,
    error,
    searchTracks,
    getAlbumArtUrl
  }
}
