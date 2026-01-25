<template>
  <div class="group card card-side items-center flex-grow bg-base-300/40 backdrop-blur-sm border border-white/5 rounded-xl p-2.5 sm:p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-base-300/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:translate-x-1">
    <!-- Album Art -->
    <figure class="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shadow-md ring-1 ring-white/10">
      <img
        v-if="albumArtUrl"
        :src="albumArtUrl"
        :alt="song.album"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-base-content/10 to-base-content/5 flex items-center justify-center">
        <Music :size="24" :stroke-width="1.5" class="text-base-content/30" />
      </div>
    </figure>

    <!-- Song Info -->
    <div class="flex-1 flex flex-col justify-center px-3">
      <h3 class="font-semibold text-sm sm:text-base truncate text-white/95 group-hover:text-primary transition-colors" :title="song.title">
        {{ song.title }}
      </h3>
      <p class="text-xs sm:text-sm text-base-content/50 truncate mt-0.5" :title="song.artist">
        {{ song.artist }}
      </p>
    </div>

    <!-- Assignments -->
    <SongCardAssignments :assignments="song.assignments" />

    <!-- Remove Button -->
    <div class="shrink-0 flex items-center">
      <button
        @click.stop="$emit('remove')"
        class="btn btn-ghost btn-sm btn-circle opacity-0 group-hover:opacity-100 transition-all hover:bg-error/20 hover:text-error min-h-[44px] min-w-[44px]"
        :aria-label="`Remove ${song.title} from list`"
      >
        <X :size="18" :stroke-width="2.5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SongCardAssignments from './SongCardAssignments.vue'
import { Music, X } from 'lucide-vue-next'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

defineEmits(['remove'])

const albumArtUrl = computed(() => {
  if (props.song.album_art_url) {
    return props.song.album_art_url
  }
  return null
})
</script>
