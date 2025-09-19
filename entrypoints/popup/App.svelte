<script lang="ts">
  import { onMount } from 'svelte';

  let message = 'TabSaver - Coming Soon!';

  onMount(() => {
    console.log('TabSaver app mounted');
  });
</script>

<div class="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
  <div class="glass-panel p-8 text-center">
    <h1 class="text-3xl font-bold text-white mb-4">{message}</h1>
    <p class="text-white/80">Your beautiful tab manager is being set up...</p>
  </div>
</div>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
</style>