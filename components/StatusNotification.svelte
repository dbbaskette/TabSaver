<script lang="ts">
  import { statusStore } from '../lib/stores';
  import { fade, fly } from 'svelte/transition';

  function getStatusIcon(type: string) {
    switch (type) {
      case 'success':
        return 'M5 13l4 4L19 7';
      case 'error':
        return 'M6 18L18 6M6 6l12 12';
      case 'info':
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return '';
    }
  }

  function getStatusColors(type: string) {
    switch (type) {
      case 'success':
        return 'from-green-500 to-emerald-600 border-green-400';
      case 'error':
        return 'from-red-500 to-pink-600 border-red-400';
      case 'info':
        return 'from-blue-500 to-indigo-600 border-blue-400';
      default:
        return 'from-gray-500 to-gray-600 border-gray-400';
    }
  }
</script>

{#if $statusStore.visible && $statusStore.type}
  <div
    class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4"
    in:fly={{ y: -50, duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    <div class="status-notification bg-gradient-to-r {getStatusColors($statusStore.type)} text-white border-2 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getStatusIcon($statusStore.type)}></path>
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold leading-tight">
            {$statusStore.message}
          </p>
        </div>

        <button
          on:click={statusStore.hide}
          class="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors duration-150"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .status-notification {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) translateX(-50%);
    }
    to {
      opacity: 1;
      transform: translateY(0) translateX(-50%);
    }
  }
</style>