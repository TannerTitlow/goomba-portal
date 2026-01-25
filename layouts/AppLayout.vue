<script setup>
    import AppHeader from '../src/components/AppHeader.vue';
</script>

<template>
  <div class="app-layout">
    <header>
        <AppHeader />
    </header>
    <main>
      <slot /> <!-- This is where the page content will be injected -->
    </main>
  </div>
</template>
