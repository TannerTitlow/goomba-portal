import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

// Development mode logging (disable in production)
const DEBUG_MODE = import.meta.env.DEV
const log = (...args) => DEBUG_MODE && console.log(...args)
const logError = (...args) => console.error(...args)

export function useSongAssignments() {
  const songAssignments = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchSongAssignments(songId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('song_assignments')
        .select(
          `
            id,
            user: profiles (
              display_name,
              full_name,
              avatar_path
            ),
            instrument: instruments (
              id,
              name
            ),
            status,
            difficulty_rating
          `,
        )
        .eq('song_id', songId)
        .order('created_at')

      if (fetchError) throw fetchError

      songAssignments.value = data || []
      return songAssignments.value
    } catch (err) {
      error.value = err.message
      logError('[useSongAssignments] fetchSongAssignments error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function addSongAssignment(assignmentData) {
    try {
      log('[useSongAssignments] Adding assignment...')

      // First upsert the assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('song_assignments')
        .upsert(
          {
            song_id: assignmentData.song_id,
            user_id: assignmentData.user_id,
            instrument_id: assignmentData.instrument_id,
          },
          { onConflict: 'song_id, user_id, instrument_id' },
        )
        .select()
        .single()

      if (assignmentError) throw assignmentError

      log('[useSongAssignments] Assignment upserted, assignment.id:', assignment.id)

      // Fetch with joined data
      const { data: fullAssignment, error: fetchError } = await supabase
        .from('song_assignments')
        .select(
          `
            id,
            user: profiles (
              display_name,
              full_name,
              avatar_path
            ),
            instrument: instruments (
              id,
              name
            ),
            status,
            difficulty_rating
          `,
        )
        .eq('id', assignment.id)
        .single()

      if (fetchError) throw fetchError

      log('[useSongAssignments] Full assignment fetched:', fullAssignment)

      // Update local state
      songAssignments.value.push(fullAssignment)

      return fullAssignment
    } catch (err) {
      error.value = err.message
      logError('[useSongAssignments] addSongAssignment error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateSongAssignment(assignmentId, updates) {
    error.value = null

    try {
      log('[useSongAssignments] Updating assignment:', { assignmentId, updates })

      // Update in database
      const { data, error: updateError } = await supabase
        .from('song_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select(
          `
            id,
            user: profiles (
              display_name,
              full_name,
              avatar_path
            ),
            instrument: instruments (
              id,
              name
            ),
            status,
            difficulty_rating
          `,
        )
        .single()

      if (updateError) throw updateError

      log('[useSongAssignments] Assignment updated successfully')

      // Update local state
      const index = songAssignments.value.findIndex((a) => a.id === assignmentId)
      if (index !== -1) {
        songAssignments.value[index] = data
      }

      return data
    } catch (err) {
      error.value = err.message
      logError('[useSongAssignments] updateSongAssignment error:', err)
      throw err
    }
  }

  async function deleteSongAssignment(songAssignmentId) {
    error.value = null

    try {
      log('[useSongAssignments] Deleting assignment:', { songAssignmentId })
      const { data, error: deleteError } = await supabase
        .from('song_assignments')
        .delete()
        .eq('id', assignmentId)
        .select()

      log('[useSongAssignments] Delete response:', { data, deleteError })

      if (deleteError) throw deleteError

      // Update local state
      if (songAssignments.value) {
        songAssignments.value = songAssignments.value.filter(
          (a) => a.id !== songAssignmentId,
        )
      }

      log('[useSongAssignments] Assignment deleted successfully')
    } catch (err) {
      error.value = err.message
      logError('[useSongAssignments] deleteAssignment error:', err)
      throw err
    }
  }

  function subscribeToSongAssignments(songId, callback) {
    const channel = supabase
      .channel('song-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'song_assignments',
        },
        (payload) => { // scope to specific songId
          if (payload.new && payload.new.song_id !== songId) return
          if (payload.old && payload.old.song_id !== songId) return
          if (payload.eventType === 'INSERT') {
            songAssignments.value.unshift(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            const index = songAssignments.value.findIndex((s_a) => s_a.id === payload.new.id)
            if (index !== -1) {
              songAssignments.value[index] = payload.new
            }
          } else if (payload.eventType === 'DELETE') {
            songAssignments.value = songAssignments.value.filter((s_a) => s_a.id !== payload.old.id)
          }

          if (callback) callback(payload)
        },
      )
      .subscribe()

    return channel
  }

  return {
    songAssignments,
    loading,
    error,
    fetchSongAssignments,
    addSongAssignment,
    updateSongAssignment,
    deleteSongAssignment,
    subscribeToSongAssignments,
  }
}
