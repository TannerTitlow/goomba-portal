import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

export function useSongs() {
  const songs = ref({}) // Object keyed by listId
  const loading = ref(false)
  const error = ref(null)

  async function fetchListSongs(listId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('list_songs')
        .select(`
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
            tempo
          )
        `)
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
      console.error('[useSongs] fetchListSongs error:', err)
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

      // Step 1: Upsert song (insert if doesn't exist, return if exists)
      const { data: song, error: songError } = await supabase
        .from('songs')
        .upsert(
          {
            spotify_id: spotifyTrack.id,
            title: spotifyTrack.name,
            artist: spotifyTrack.artists[0]?.name || 'Unknown Artist',
            album: spotifyTrack.album?.name || '',
            duration_ms: spotifyTrack.duration_ms,
            suggested_by_user_id: user.id
          },
          { onConflict: 'spotify_id' }
        )
        .select()
        .single()

      if (songError) throw songError

      // Step 2: Get max position in list
      const { data: maxPosData } = await supabase
        .from('list_songs')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = maxPosData?.[0]?.position
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
      console.error('[useSongs] addSongToList error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeSongFromList(listId, listSongId) {
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('list_songs')
        .delete()
        .eq('id', listSongId)

      if (deleteError) throw deleteError

      // Update local state
      if (songs.value[listId]) {
        songs.value[listId] = songs.value[listId].filter(
          s => s.list_song_id !== listSongId
        )
      }
    } catch (err) {
      error.value = err.message
      console.error('[useSongs] removeSongFromList error:', err)
      throw err
    }
  }

  async function reorderSong(listId, listSongId, direction) {
    error.value = null

    try {
      const listSongs = songs.value[listId] || []
      const currentIndex = listSongs.findIndex(s => s.list_song_id === listSongId)

      if (currentIndex === -1) return

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      // Check bounds
      if (targetIndex < 0 || targetIndex >= listSongs.length) {
        return
      }

      const currentSong = listSongs[currentIndex]
      const targetSong = listSongs[targetIndex]

      // Swap positions
      const { error: update1Error } = await supabase
        .from('list_songs')
        .update({ position: targetSong.position })
        .eq('id', currentSong.list_song_id)

      if (update1Error) throw update1Error

      const { error: update2Error } = await supabase
        .from('list_songs')
        .update({ position: currentSong.position })
        .eq('id', targetSong.list_song_id)

      if (update2Error) throw update2Error

      // Update local state
      const tempPosition = currentSong.position
      currentSong.position = targetSong.position
      targetSong.position = tempPosition

      listSongs[currentIndex] = targetSong
      listSongs[targetIndex] = currentSong

      songs.value[listId] = [...listSongs]
    } catch (err) {
      error.value = err.message
      console.error('[useSongs] reorderSong error:', err)
      throw err
    }
  }

  return {
    songs,
    loading,
    error,
    fetchListSongs,
    addSongToList,
    removeSongFromList,
    reorderSong
  }
}
