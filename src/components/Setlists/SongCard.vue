<template>
  <div class="song-card">
    <div class="drag-handle">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        class="drag-handle-icon"
      >
        <circle cx="4" cy="4" r="1.5"/>
        <circle cx="4" cy="8" r="1.5"/>
        <circle cx="4" cy="12" r="1.5"/>
        <circle cx="8" cy="4" r="1.5"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="8" cy="12" r="1.5"/>
      </svg>
    </div>

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
  }
})

defineEmits(['remove'])

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
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2);
}

.song-card:hover {
  background: #222222;
  border-color: #333;
  transform: translateY(-2px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.4),
    0 4px 12px rgba(29, 185, 84, 0.15);
}

.song-card:hover .drag-handle-icon {
  opacity: 0.6;
}

.song-card:active {
  cursor: grabbing;
}

.drag-handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 100%;
  color: #666;
  cursor: grab;
}

.drag-handle-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.album-art {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.album-art-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.song-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.song-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 0.25rem 0;
}

.song-artist {
  font-size: 0.8rem;
  color: #999999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
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
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.btn-icon:hover {
  transform: scale(1.1);
}

.btn-remove:hover {
  background: #f44336;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .song-card {
    padding: 0.5rem;
  }

  .drag-handle-icon {
    opacity: 0.4;
  }

  .btn-icon {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
