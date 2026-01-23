import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

export function useSetlists() {
  const lists = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchLists() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('lists')
        .select('*, created_by: profiles ( display_name, full_name, avatar_url )')
        .order('position', { ascending: true })

      if (fetchError) throw fetchError

      lists.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('[useSetlists] fetchLists error:', err)
    } finally {
      loading.value = false
    }
  }

  async function createList(name, description = '', listType = 'setlist') {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Get max position
      const { data: maxPosData } = await supabase
        .from('lists')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = maxPosData?.[0]?.position != null
        ? maxPosData[0].position + 1
        : 0

      const { data, error: insertError } = await supabase
        .from('lists')
        .insert({
          name,
          description,
          list_type: listType,
          created_by_user_id: user.id,
          position: nextPosition
        })
        .select()
        .single()

      if (insertError) throw insertError

      lists.value.unshift(data)
      return data
    } catch (err) {
      error.value = err.message
      console.error('[useSetlists] createList error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateList(id, updates) {
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const index = lists.value.findIndex(l => l.id === id)
      if (index !== -1) {
        lists.value[index] = data
      }

      return data
    } catch (err) {
      error.value = err.message
      console.error('[useSetlists] updateList error:', err)
      throw err
    }
  }

  async function deleteList(id) {
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('lists')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      lists.value = lists.value.filter(l => l.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('[useSetlists] deleteList error:', err)
      throw err
    }
  }

  function subscribeToLists(callback) {
    const channel = supabase
      .channel('lists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            lists.value.unshift(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            const index = lists.value.findIndex(l => l.id === payload.new.id)
            if (index !== -1) {
              lists.value[index] = payload.new
            }
          } else if (payload.eventType === 'DELETE') {
            lists.value = lists.value.filter(l => l.id !== payload.old.id)
          }

          if (callback) callback(payload)
        }
      )
      .subscribe()

    return channel
  }

  async function reorderLists(reorderedLists) {
    error.value = null

    try {
      // Update positions for all lists
      const updates = reorderedLists.map((list, index) => ({
        id: list.id,
        position: index
      }))

      // Batch update positions
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('lists')
          .update({ position: update.position })
          .eq('id', update.id)

        if (updateError) throw updateError
      }

      // Update local state
      lists.value = reorderedLists.map((list, index) => ({
        ...list,
        position: index
      }))
    } catch (err) {
      error.value = err.message
      console.error('[useSetlists] reorderLists error:', err)
      throw err
    }
  }

  return {
    lists,
    loading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList,
    subscribeToLists,
    reorderLists
  }
}
