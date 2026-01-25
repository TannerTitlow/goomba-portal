<script setup>
import { computed } from 'vue';
import { useProfiles } from '@/composables/useProfiles';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'md', // xs, sm, md, lg, xl
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(value)
  }
});

const { getAvatarUrl, getInitials } = useProfiles();

const avatarUrl = computed(() => getAvatarUrl(props.profile));
const initials = computed(() => getInitials(props.profile));

const sizeClasses = computed(() => {
  const sizes = {
    xs: 'w-8 h-8 text-sm',
    sm: 'w-12 h-12 text-base',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-4xl',
    xxl: 'w-48 h-48 text-6xl',
  };
  return sizes[props.size] || sizes.md;
});
</script>

<template>
  <div 
    :class="[
      'rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1db954] to-[#00ff88]',
      sizeClasses
    ]"
  >
    <img 
      v-if="avatarUrl" 
      :src="avatarUrl" 
      :alt="profile.display_name || profile.full_name || 'User avatar'"
      class="w-full h-full object-cover"
      @error="$event.target.style.display = 'none'"
    />
    <span 
      v-else 
      class="font-bold text-black"
    >
      {{ initials }}
    </span>
  </div>
</template>