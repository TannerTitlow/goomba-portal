import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

// Development mode logging (disable in production)
const DEBUG_MODE = import.meta.env.DEV
const log = (...args) => DEBUG_MODE && console.log(...args)
const logError = (...args) => console.error(...args)

const instruments = ref([])
const loading = ref(false)
const error = ref(null)

let initialized = false

export async function fetchInstruments() {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await supabase
      .from('instruments')
      .select('*')
      .order('name')

    if (fetchError) throw fetchError

    instruments.value = data || []
    return instruments.value
  } catch (err) {
    error.value = err.message
    logError('[useInstruments] fetchInstruments error:', err)
    return []
  } finally {
    loading.value = false
  }
}

export function useInstruments() {
  if (!initialized) {
    initialized = true
    fetchInstruments()
  }

  async function addInstrument(instrumentName) {
    try {
      log('[useInstruments] Adding instrument...')

      const { data: instrument, error: instrumentError } = await supabase
        .from('instruments')
        .upsert(
          {
            name: instrumentName,
          },
          { onConflict: 'name' },
        )
        .select()
        .single()

      if (instrumentError) throw instrumentError

      log('[useInstruments] Instrument upserted, instrument.id:', instrument.id)

      // Update local state
      const newInstrument = {
        ...instrument,
      }

      instruments.value.push(newInstrument)

      return newInstrument
    } catch (err) {
      error.value = err.message
      logError('[useInstruments] addInstrument error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteInstrument(instrumentId) {
    error.value = null

    try {
      log('[useInstruments] Deleting instrument:', { instrumentId })
      const { data, error: deleteError } = await supabase
        .from('instruments')
        .delete()
        .eq('id', instrumentId)
        .select()

      log('[useInstruments] Delete response:', { data, deleteError })

      if (deleteError) throw deleteError

      // Update local state
      if (instruments.value) {
        instruments.value = instruments.value.filter(
          (i) => i.id !== instrumentId,
        )
      }

      log('[useInstruments] Instrument deleted successfully')
    } catch (err) {
      error.value = err.message
      logError('[useInstruments] deleteInstrument error:', err)
      throw err
    }
  }

  function subscribeToInstruments(callback) {
    const channel = supabase
      .channel('instruments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instruments',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            instruments.value.unshift(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            const index = instruments.value.findIndex((i) => i.id === payload.new.id)
            if (index !== -1) {
              instruments.value[index] = payload.new
            }
          } else if (payload.eventType === 'DELETE') {
            instruments.value = instruments.value.filter((i) => i.id !== payload.old.id)
          }

          if (callback) callback(payload)
        },
      )
      .subscribe()

    return channel
  }

  return {
    instruments,
    loading,
    error,
    fetchInstruments,
    addInstrument,
    deleteInstrument,
    subscribeToInstruments,
  }
}
