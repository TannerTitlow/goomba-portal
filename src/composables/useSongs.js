import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

export function useSongs() {
  const songs = ref({})
  const loading = ref(false)
  const error = ref(null)

  async function fetchSongs() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('songs')
        .select(
          `
          id,
          spotify_id,
          title,
          artist,
          album,
          duration_ms,
          key,
          tempo,
          difficulty_rating,
          album_art_url,
          assignments: song_assignments (
            id,
            user: profiles (
              display_name,
              full_name,
              avatar_url
            ),
            instrument: instruments (
              name
            )
          ),
          suggested_by: profiles (
            display_name,
            full_name,
            avatar_url
          )
        `,
        )
        .order('title')

      if (fetchError) throw fetchError
      
      songs.value = data || []
      return songs.value
    } catch (err) {
      error.value = err.message
      console.error('[useSongs] fetchSongs error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function addSong(spotifyTrack) {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()

      console.log('[useSongs] Adding song:', {
        spotifyId: spotifyTrack.id,
        title: spotifyTrack.name
      })

      // Step 1: Upsert song (insert if doesn't exist, return if exists)
      // Extract album art URL (prefer medium size, fallback to first available)
      const albumArtUrl = spotifyTrack.album?.images?.[1]?.url ||
                          spotifyTrack.album?.images?.[0]?.url ||
                          null

      const { data: song, error: songError } = await supabase
        .from('songs')
        .upsert(
          {
            spotify_id: spotifyTrack.id,
            title: spotifyTrack.name,
            artist: spotifyTrack.artists[0]?.name || 'Unknown Artist',
            album: spotifyTrack.album?.name || '',
            album_art_url: albumArtUrl,
            duration_ms: spotifyTrack.duration_ms,
            suggested_by_user_id: user.id
          },
          { onConflict: 'spotify_id' }
        )
        .select()
        .single()

      if (songError) throw songError

      console.log('[useSongs] Song upserted, song.id:', song.id, 'spotify_id:', song.spotify_id)

      // Update local state
      const newSong = {
        ...song
      }

      songs.value.push(newSong)

      return newSong
    } catch (err) {
      error.value = err.message
      console.error('[useSongs] addSong error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSong(songId) {
    error.value = null

    try {
      console.log('[useSongs] Deleting song:', { songId })

      const { data, error: deleteError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId)
        .select()

      console.log('[useSongs] Delete response:', { data, deleteError })

      if (deleteError) throw deleteError

      // Update local state
      if (songs.value) {
        songs.value = songs.value.filter(
          s => s.id !== songId
        )
      }

      console.log('[useSongs] Song deleted successfully')
    } catch (err) {
      error.value = err.message
      console.error('[useSongs] deleteSong error:', err)
      throw err
    }
  }

  function subscribeToSongs(callback) {
    const channel = supabase
      .channel('songs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'songs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            songs.value.unshift(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            const index = songs.value.findIndex((s) => s.id === payload.new.id)
            if (index !== -1) {
              songs.value[index] = payload.new
            }
          } else if (payload.eventType === 'DELETE') {
            songs.value = songs.value.filter((s) => s.id !== payload.old.id)
          }

          if (callback) callback(payload)
        },
      )
      .subscribe()

    return channel
  }

  return {
    songs,
    loading,
    error,
    fetchSongs,
    addSong,
    deleteSong,
    subscribeToSongs,
  }
}
