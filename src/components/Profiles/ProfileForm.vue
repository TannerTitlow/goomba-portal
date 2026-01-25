<script setup>
import { ref, computed } from 'vue';
import { useProfiles } from '@/composables/useProfiles';
import ProfileAvatar from './ProfileAvatar.vue';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
});

const { uploadAvatar, deleteAvatar, updateProfile, loading, error } = useProfiles();

const displayName = ref(props.profile.display_name || '');
const fullName = ref(props.profile.full_name || '');
const fileInput = ref(null);
const uploadError = ref(null);
const uploadSuccess = ref(false);
const isUploading = ref(false);

const hasChanges = computed(() => {
  return displayName.value !== (props.profile.display_name || '') ||
         fullName.value !== (props.profile.full_name || '');
});

const canSave = computed(() => {
  return hasChanges.value && displayName.value.trim().length >= 3;
});

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  uploadError.value = null;
  uploadSuccess.value = false;
  isUploading.value = true;

  try {
    // Validate file size (2MB max as per label)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 2MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    await uploadAvatar(file);
    uploadSuccess.value = true;
    
    // Clear the file input
    if (fileInput.value) {
      fileInput.value.value = '';
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);
  } catch (err) {
    uploadError.value = err.message;
    console.error('Upload error:', err);
  } finally {
    isUploading.value = false;
  }
}

async function handleDeleteAvatar() {
  if (!props.profile.avatar_path) return;
  
  if (!confirm('Are you sure you want to delete your profile picture?')) {
    return;
  }

  uploadError.value = null;
  isUploading.value = true;

  try {
    await deleteAvatar();
    uploadSuccess.value = true;
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);
  } catch (err) {
    uploadError.value = err.message;
    console.error('Delete error:', err);
  } finally {
    isUploading.value = false;
  }
}

async function handleSave() {
  if (!canSave.value) return;

  try {
    await updateProfile({
      display_name: displayName.value.trim(),
      full_name: fullName.value.trim()
    });
    
    // Show success feedback
    uploadSuccess.value = true;
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);
  } catch (err) {
    uploadError.value = err.message;
    console.error('Save error:', err);
  }
}

function handleCancel() {
  displayName.value = props.profile.display_name || '';
  fullName.value = props.profile.full_name || '';
}

function triggerFileInput() {
  if (isUploading.value) return;
  fileInput.value?.click();
}
</script>

<template>
  <div class="card border border-white/10 bg-gradient-to-br from-black/50 to-black/30 backdrop-blur-md w-full max-w-2xl mx-auto overflow-hidden">
    <div class="card-body gap-6 p-6 sm:p-8">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold opacity-80">Update Profile</h3>
        <div v-if="uploadSuccess" class="badge badge-success gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          Saved!
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="uploadError || error" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ uploadError || error }}</span>
      </div>

      <!-- Avatar Section -->
      <div class="flex flex-col items-center gap-4">
        <div class="relative group cursor-pointer rounded-full overflow-hidden" @click="triggerFileInput">
          <ProfileAvatar v-if="profile" :profile="profile" size="xxl" />
          <div v-else class="loading loading-ring loading-lg"></div>
          
          <!-- Edit overlay -->
          <div 
            v-if="!isUploading"
            class="absolute bottom-0 left-0 right-0 bg-black/80 py-2 rounded-b-full flex items-center justify-center gap-2 transition-opacity"
            :class="profile.avatar_path ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span class="text-xs font-medium">Edit</span>
          </div>

          <!-- Loading spinner overlay -->
          <div 
            v-if="isUploading"
            class="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center"
          >
            <span class="loading loading-spinner loading-md text-primary"></span>
          </div>
          
          <!-- Delete button -->
          <button 
            v-if="profile.avatar_path && !isUploading"
            @click.stop="handleDeleteAvatar"
            class="absolute -top-2 -right-2 btn btn-circle btn-sm btn-error opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete avatar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        
        <!-- Hidden file input -->
        <input 
          ref="fileInput"
          type="file" 
          class="hidden" 
          accept="image/*"
          @change="handleFileChange"
          :disabled="isUploading"
        />
        
        <p class="text-xs opacity-60 text-center">
          Click avatar to upload • Max size 5MB
        </p>
      </div>

      <div class="divider"></div>

      <!-- Form Fields -->
      <div class="flex flex-col gap-4 w-full max-w-md mx-auto">
        <!-- Display Name -->
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Display Name *</span>
          </div>
          <label class="input input-bordered flex items-center gap-2 my-2">
            <svg class="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              v-model="displayName"
              type="text"
              class="grow"
              placeholder="Enter your display name"
              minlength="3"
              maxlength="30"
            />
          </label>
          <div class="label">
            <span class="label-text-alt opacity-60">
              3-30 characters, letters, numbers, and spaces only
            </span>
            <span class="label-text-alt" :class="displayName.length < 3 ? 'text-error' : ''">
              {{ displayName.length }}/30
            </span>
          </div>
        </label>

        <!-- Full Name -->
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Full Name</span>
          </div>
          <label class="input input-bordered flex items-center gap-2 my-2">
            <svg class="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            <input
              v-model="fullName"
              type="text"
              class="grow"
              placeholder="Enter your full name"
              maxlength="50"
            />
          </label>
          <div class="label">
            <span class="label-text-alt opacity-60">Optional</span>
          </div>
        </label>

        <!-- Email (read-only) -->
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Email</span>
          </div>
          <label class="input input-bordered flex items-center gap-2 my-2 opacity-60">
            <svg class="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <input
              :value="profile.email"
              type="email"
              class="grow"
              disabled
              readonly
            />
          </label>
          <div class="label">
            <span class="label-text-alt opacity-60">Email cannot be changed</span>
          </div>
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="card-actions justify-end gap-3 pt-4">
        <button 
          v-if="hasChanges"
          @click="handleCancel" 
          class="btn btn-ghost"
          :disabled="loading"
        >
          Cancel
        </button>
        <button 
          @click="handleSave" 
          class="btn btn-primary"
          :disabled="!canSave || loading"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>Save Changes</span>
        </button>
      </div>
    </div>
  </div>
</template>