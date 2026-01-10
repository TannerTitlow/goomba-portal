<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'

const router = useRouter()
const status = ref('loading') // 'loading', 'success', 'error'
const message = ref('Processing authentication...')

// Constants for redirect delays
const SUCCESS_REDIRECT_DELAY = 1500
const ERROR_REDIRECT_DELAY = 3000

// Store timeout IDs for cleanup
const successTimeoutId = ref(null)
const errorTimeoutId = ref(null)

onMounted(async () => {
  try {
    // Supabase automatically handles the OAuth callback via the URL hash
    // We just need to check if we have a session now
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      throw error
    }

    if (session) {
      status.value = 'success'
      message.value = 'Authentication successful!'

      // Redirect to dashboard after brief delay
      successTimeoutId.value = setTimeout(() => {
        router.push({ name: 'dashboard' })
      }, SUCCESS_REDIRECT_DELAY)
    } else {
      throw new Error('No session found after authentication')
    }
  } catch (err) {
    console.error('Auth callback error:', err)
    status.value = 'error'
    message.value = err.message || 'Authentication failed. Please try again.'

    // Redirect back to login after delay
    errorTimeoutId.value = setTimeout(() => {
      router.push({ name: 'login' })
    }, ERROR_REDIRECT_DELAY)
  }
})

onBeforeUnmount(() => {
  // Clear timeouts to prevent memory leaks
  if (successTimeoutId.value) {
    clearTimeout(successTimeoutId.value)
  }
  if (errorTimeoutId.value) {
    clearTimeout(errorTimeoutId.value)
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
    <!-- Portal Glow Effect -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-2xl sm:blur-3xl animate-glow"></div>

    <!-- Main Content -->
    <div class="relative z-10 text-center max-w-md px-4 sm:px-6">
      <!-- Loading State -->
      <div v-if="status === 'loading'" class="flex flex-col items-center">
        <div class="mb-8 sm:mb-10">
          <div class="inline-block p-6 sm:p-8 bg-black border-2 border-green-500/40 shadow-2xl shadow-green-500/30 relative">
            <div class="absolute inset-0 bg-green-500/5"></div>
            <svg class="w-16 h-16 sm:w-20 sm:h-20 text-green-500 relative z-10 animate-spin" fill="none" viewBox="0 0 24 24" stroke-width="2" aria-label="Loading authentication">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <!-- Corner accents -->
            <div class="absolute top-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-l-2 border-green-500"></div>
            <div class="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-r-2 border-green-500"></div>
            <div class="absolute bottom-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-l-2 border-green-500"></div>
            <div class="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-r-2 border-green-500"></div>
          </div>
        </div>
        <h2 class="text-lg sm:text-xl lg:text-2xl font-light text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide sm:tracking-wider">{{ message }}</h2>
        <p class="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Establishing secure connection...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center">
        <div class="mb-8 sm:mb-10">
          <div class="inline-block p-6 sm:p-8 bg-black border-2 border-green-500 shadow-2xl shadow-green-500/50 relative">
            <div class="absolute inset-0 bg-green-500/10"></div>
            <svg class="w-16 h-16 sm:w-20 sm:h-20 text-green-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3" aria-label="Authentication successful">
              <path stroke-linecap="square" stroke-linejoin="miter" d="M5 13l4 4L19 7"></path>
            </svg>
            <!-- Corner accents -->
            <div class="absolute top-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-l-2 border-green-500"></div>
            <div class="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-r-2 border-green-500"></div>
            <div class="absolute bottom-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-l-2 border-green-500"></div>
            <div class="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-r-2 border-green-500"></div>
          </div>
        </div>
        <h2 class="text-lg sm:text-xl lg:text-2xl font-light text-green-500 mb-2 sm:mb-3 uppercase tracking-wide sm:tracking-wider">Access Granted</h2>
        <p class="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Redirecting to portal...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="status === 'error'" class="flex flex-col items-center">
        <div class="mb-6 sm:mb-8">
          <div class="inline-block px-4 py-2 sm:px-6 border border-red-500/30 bg-black mb-4 sm:mb-6">
            <span class="text-red-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">ACCESS DENIED</span>
          </div>
        </div>
        <div class="mb-8 sm:mb-10">
          <div class="inline-block p-6 sm:p-8 bg-black border-2 border-red-500/40 shadow-2xl shadow-red-500/30 relative">
            <div class="absolute inset-0 bg-red-500/5"></div>
            <svg class="w-16 h-16 sm:w-20 sm:h-20 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3" aria-label="Authentication failed">
              <path stroke-linecap="square" stroke-linejoin="miter" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <!-- Corner accents -->
            <div class="absolute top-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-l-2 border-red-500"></div>
            <div class="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-r-2 border-red-500"></div>
            <div class="absolute bottom-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-l-2 border-red-500"></div>
            <div class="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-r-2 border-red-500"></div>
          </div>
        </div>
        <h2 class="text-lg sm:text-xl lg:text-2xl font-light text-red-500 mb-2 sm:mb-3 uppercase tracking-wide sm:tracking-wider">Authentication Failed</h2>
        <p class="text-xs text-gray-500 mb-8 sm:mb-12 uppercase tracking-wider font-mono max-w-sm break-words px-4">{{ message }}</p>
        <p class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest font-mono">Redirecting to login...</p>
      </div>
    </div>
  </div>
</template>
