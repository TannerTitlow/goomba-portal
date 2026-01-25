import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

export function useListSongs() {
  const songs = ref({}) // Object keyed by listId
  const loading = ref(false)
  const error = ref(null)

  async function fetchListSongs(listId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('list_songs')
        .select(
          `
          id,
          position,
          song:songs (
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
                avatar_path
              ),
              instrument: instruments (
                name
              ),
              status,
              difficulty_rating
            ),
            suggested_by: profiles (
              display_name,
              full_name,
              avatar_path
            )
          )
        `,
        )
        .eq('list_id', listId)
        .order('position')

      if (fetchError) throw fetchError

      // Flatten the nested structure
      const flattenedSongs = (data || []).map(item => ({
        ...item.song,
        list_song_id: item.id,
        position: item.position
      }))

      songs.value[listId] = flattenedSongs
      return flattenedSongs
    } catch (err) {
      error.value = err.message
      console.error('[useListSongs] fetchListSongs error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function addSongToList(listId, spotifyTrack) {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()

      console.log('[useListSongs] Adding song:', {
        spotifyId: spotifyTrack.id,
        title: spotifyTrack.name,
        listId
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

      console.log('[useListSongs] Song upserted, song.id:', song.id, 'spotify_id:', song.spotify_id)

      // Step 2: Get max position in list
      const { data: maxPosData } = await supabase
        .from('list_songs')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = maxPosData?.[0]?.position != null
        ? maxPosData[0].position + 1
        : 0

      // Step 3: Insert list_songs entry
      const { data: listSong, error: listSongError } = await supabase
        .from('list_songs')
        .insert({
          list_id: listId,
          song_id: song.id,
          position: nextPosition
        })
        .select()
        .single()

      if (listSongError) {
        // Check if it's a duplicate
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

      if (!songs.value[listId]) {
        songs.value[listId] = []
      }
      songs.value[listId].push(newSong)

      return newSong
    } catch (err) {
      error.value = err.message
      console.error('[useListSongs] addSongToList error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeSongFromList(listId, listSongId) {
    error.value = null

    try {
      console.log('[useListSongs] Removing song from list:', { listId, listSongId })

      const { data, error: deleteError } = await supabase
        .from('list_songs')
        .delete()
        .eq('id', listSongId)
        .select()

      console.log('[useListSongs] Delete response:', { data, deleteError })

      if (deleteError) throw deleteError

      // Update local state
      if (songs.value[listId]) {
        songs.value[listId] = songs.value[listId].filter(
          s => s.list_song_id !== listSongId
        )
      }

      console.log('[useListSongs] Song removed successfully')
    } catch (err) {
      error.value = err.message
      console.error('[useListSongs] removeSongFromList error:', err)
      throw err
    }
  }

  async function reorderSongsInList(listId, reorderedSongs) {
    loading.value = true
    error.value = null

    try {
      console.log('[useListSongs] Reordering songs in list:', listId)

      // Update positions for all songs in the reordered list
      const updates = reorderedSongs.map((song, index) => ({
        id: song.list_song_id,
        position: index
      }))

      // Batch update positions in parallel
      await Promise.all(
        updates.map(update =>
          supabase
            .from('list_songs')
            .update({ position: update.position })
            .eq('id', update.id)
            .then(({ error }) => {
              if (error) throw error
            })
        )
      )

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
    } finally {
      loading.value = false
    }
  }

  async function copySongToList(targetListId, song) {
    loading.value = true
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
    } finally {
      loading.value = false
    }
  }

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
}
