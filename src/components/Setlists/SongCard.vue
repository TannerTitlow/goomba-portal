<template>
  <div class="song-card">
    <img
      v-if="albumArtUrl"
      :src="albumArtUrl"
      :alt="song.album"
      class="album-art"
    />
    <div v-else class="album-art-placeholder">
      <span>♪</span>
    </div>

    <div class="song-info">
      <h3 class="song-title" :title="song.title">{{ song.title }}</h3>
      <p class="song-artist" :title="song.artist">{{ song.artist }}</p>
    </div>

    <div class="song-actions">
      <button
        @click="$emit('reorder', 'up')"
        class="btn-icon"
        title="Move up"
        :disabled="isFirst"
      >
        ↑
      </button>
      <button
        @click="$emit('reorder', 'down')"
        class="btn-icon"
        title="Move down"
        :disabled="isLast"
      >
        ↓
      </button>
      <button
        @click="$emit('remove')"
        class="btn-icon btn-remove"
        title="Remove from list"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  song: {
    type: Object,
    required: true
  },
  isFirst: {
    type: Boolean,
    default: false
  },
  isLast: {
    type: Boolean,
    default: false
  }
})

defineEmits(['reorder', 'remove'])

const albumArtUrl = computed(() => {
  // Try to construct Spotify CDN URL from spotify_id if no direct URL
  if (props.song.album_art_url) {
    return props.song.album_art_url
  }
  return null
})
</script>

<style scoped>
.song-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #1a1a1a;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.song-card:hover {
  background: #222222;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.2);
}

.album-art {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.album-art-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.song-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.song-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.song-artist {
  font-size: 0.75rem;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  margin-top: 0.125rem;
}

.song-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-icon {
  min-width: 32px;
  min-height: 32px;
  padding: 0.25rem;
  background: #333;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover:not(:disabled) {
  background: #1db954;
  transform: scale(1.1);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-remove:hover:not(:disabled) {
  background: #f44336;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .btn-icon {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
