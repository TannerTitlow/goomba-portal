<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-y-full"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="currentTrack"
      class="fixed bottom-0 left-0 right-0 bg-base-200/95 backdrop-blur-md border-t border-white/10 shadow-2xl z-[60]"
    >
      <!-- Progress Bar -->
      <div class="w-full h-1 bg-base-300">
        <div
          class="h-full bg-primary transition-all duration-100"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>

      <!-- Player Content -->
      <div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
        <!-- Album Art -->
        <figure class="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
          <img
            v-if="albumArtUrl"
            :src="albumArtUrl"
            :alt="currentTrack.album?.name || 'Album art'"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gradient-to-br from-base-content/10 to-base-content/5 flex items-center justify-center">
            <Music :size="20" class="text-base-content/30" />
          </div>
        </figure>

        <!-- Track Info -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-sm sm:text-base truncate text-white/95">
            {{ currentTrack.name || currentTrack.title }}
          </h3>
          <p class="text-xs sm:text-sm text-base-content/50 truncate">
            {{ artistName }}
          </p>
          <!-- Time display (desktop only) -->
          <p class="hidden sm:block text-xs text-base-content/40 mt-0.5">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </p>
        </div>

        <!-- Controls -->
        <div class="shrink-0 flex items-center gap-1 sm:gap-2">
          <!-- Stop -->
          <button
            @click="stopPlayback"
            class="btn btn-ghost btn-sm btn-circle hover:bg-error/20 hover:text-error transition-colors"
            :aria-label="'Stop playback'"
          >
            <Square :size="16" :stroke-width="2.5" />
          </button>

          <!-- Previous -->
          <button
            @click="playPrevious"
            :disabled="!canGoPrevious"
            class="btn btn-ghost btn-sm btn-circle hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :aria-label="'Previous track'"
          >
            <SkipBack :size="18" :stroke-width="2.5" />
          </button>

          <!-- Play/Pause -->
          <button
            @click="togglePlayPause"
            class="btn btn-primary btn-sm btn-circle min-h-[44px] w-11 h-11"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
          >
            <Pause v-if="isPlaying" :size="20" :stroke-width="2.5" />
            <Play v-else :size="20" :stroke-width="2.5" />
          </button>

          <!-- Next -->
          <button
            @click="playNext"
            :disabled="!canGoNext"
            class="btn btn-ghost btn-sm btn-circle hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :aria-label="'Next track'"
          >
            <SkipForward :size="18" :stroke-width="2.5" />
          </button>

          <!-- Volume Control -->
          <div class="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
            <Volume2 :size="16" class="text-base-content/50" />
            <input
              type="range"
              min="0"
              max="100"
              :value="volume"
              @input="handleVolumeChange"
              class="range range-xs range-primary w-20"
              :aria-label="'Volume'"
            />
            <span class="text-xs text-base-content/50 w-8 text-right">{{ volume }}%</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useSpotify } from '@/composables/useSpotify'
import { Music, Play, Pause, SkipBack, SkipForward, Square, Volume2 } from 'lucide-vue-next'

const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  currentIndex,
  playbackContext,
  volume,
  togglePlayPause,
  stopPlayback,
  playNext,
  playPrevious,
  setVolume,
  getAlbumArtUrl,
} = useSpotify()

function handleVolumeChange(event) {
  setVolume(parseInt(event.target.value, 10))
}

const albumArtUrl = computed(() => {
  if (!currentTrack.value) return null

  // Handle both song objects (from DB) and Spotify track objects
  if (currentTrack.value.album_art_url) {
    return currentTrack.value.album_art_url
  }

  return getAlbumArtUrl(currentTrack.value, 'small')
})

const artistName = computed(() => {
  if (!currentTrack.value) return ''

  // Handle both song objects (from DB) and Spotify track objects
  if (currentTrack.value.artist) {
    return currentTrack.value.artist
  }

  if (currentTrack.value.artists) {
    return currentTrack.value.artists.map(a => a.name).join(', ')
  }

  return 'Unknown Artist'
})

const progressPercentage = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const canGoPrevious = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < playbackContext.value.length - 1)

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
