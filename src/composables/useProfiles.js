import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

const currentProfile = ref(null)
const profileLoading = ref(false)
const profileError = ref(null)
let initialized = false

/**
 * Fetch the current user's profile
 */
async function fetchCurrentProfile() {
  profileLoading.value = true
  profileError.value = null

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      currentProfile.value = null
      return null
    }

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (fetchError) throw fetchError

    currentProfile.value = data
    return data
  } catch (err) {
    profileError.value = err.message
    console.error('[useProfiles] fetchCurrentProfile error:', err)
    return null
  } finally {
    profileLoading.value = false
  }
}

async function initializeCurrentProfile() {
  if (initialized) return
  initialized = true
  await fetchCurrentProfile()
}

export function useProfiles() {
  const profiles = ref([])
  const loading = ref(false)
  const error = ref(null)

  if (!initialized) {
    initializeCurrentProfile()
  }

  /**
   * Get the full avatar URL for a profile
   * Returns Supabase storage URL if avatar_path exists, otherwise returns null
   */
  function getAvatarUrl(profile) {
    if (!profile?.avatar_path) return null

    const { data } = supabase.storage
      .from('profile_avatars')
      .getPublicUrl(profile.avatar_path)

    return data.publicUrl
  }

  /**
   * Get initials for a profile
   */
  function getInitials(profile) {
    if (!profile) return ''

    const name = profile.display_name || profile.full_name || ''
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
    return initials.substring(0, 2)
  }

  /**
   * Fetch all profiles
   */
  async function fetchProfiles() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name')

      if (fetchError) throw fetchError

      profiles.value = data || []
      return profiles.value
    } catch (err) {
      error.value = err.message
      console.error('[useProfiles] fetchProfiles error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload a new profile picture
   * @param {File} file - The image file to upload
   * @param {string} userId - Optional user ID (defaults to current user)
   */
  async function uploadAvatar(file, userId = null) {
    loading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id

      if (!targetUserId) throw new Error('No user ID provided')
      if (!file) throw new Error('No file provided')

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      // Validate file size (e.g., 5MB max)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB')
      }

      console.log('[useProfiles] Uploading avatar:', {
        userId: targetUserId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })

      // Get file extension
      const fileExt = file.name.split('.').pop()
      const fileName = `${targetUserId}/avatar.${fileExt}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('profile_avatars')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) throw uploadError

      console.log('[useProfiles] Avatar uploaded successfully:', fileName)

      // Update profile with new avatar path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_path: fileName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)

      if (updateError) throw updateError

      // Update local state if it's the current user
      if (targetUserId === user?.id && currentProfile.value) {
        currentProfile.value.avatar_path = fileName
      }

      return fileName
    } catch (err) {
      error.value = err.message
      console.error('[useProfiles] uploadAvatar error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete the current user's avatar
   */
  async function deleteAvatar() {
    loading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const profile = currentProfile.value || (await fetchCurrentProfile())
      if (!profile?.avatar_path) {
        console.log('[useProfiles] No avatar to delete')
        return
      }

      console.log('[useProfiles] Deleting avatar:', profile.avatar_path)

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('profile_avatars')
        .remove([profile.avatar_path])

      if (deleteError) throw deleteError

      // Update profile to remove avatar_path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_path: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      if (currentProfile.value) {
        currentProfile.value.avatar_path = null
      }

      console.log('[useProfiles] Avatar deleted successfully')
    } catch (err) {
      error.value = err.message
      console.error('[useProfiles] deleteAvatar error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update profile information
   */
  async function updateProfile(updates) {
    loading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      console.log('[useProfiles] Updating profile:', updates)

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      currentProfile.value = data
      console.log('[useProfiles] Profile updated successfully')

      return data
    } catch (err) {
      error.value = err.message
      console.error('[useProfiles] updateProfile error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Subscribe to profile changes
   */
  function subscribeToProfiles(callback) {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const index = profiles.value.findIndex(
              (p) => p.id === payload.new.id,
            )
            if (index !== -1) {
              profiles.value[index] = payload.new
            }

            // Update current profile if it's the one that changed
            if (currentProfile.value?.id === payload.new.id) {
              currentProfile.value = payload.new
            }
          }

          if (callback) callback(payload)
        },
      )
      .subscribe()

    return channel
  }

  return {
    profiles,
    currentProfile,
    loading,
    error,
    getAvatarUrl,
    getInitials,
    fetchCurrentProfile,
    fetchProfiles,
    uploadAvatar,
    deleteAvatar,
    updateProfile,
    subscribeToProfiles,
  }
}
