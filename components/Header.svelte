<script lang="ts">
  import { selectedTabsCount, allTabsSelected, tabsActions } from '../lib/stores';
</script>

<header class="glass-panel rounded-t-2xl p-6 border-b border-white/20">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-black text-gray-900">TabSaver</h1>
        <p class="text-sm text-gray-600">Save tabs to organized bookmarks</p>
      </div>
    </div>

    <div class="flex items-center space-x-4">
      <span class="text-sm text-gray-700 font-semibold">
        {$selectedTabsCount} selected
      </span>
      <button
        on:click={tabsActions.toggleSelectAll}
        class="px-4 py-2 rounded-lg glass-button text-sm font-semibold text-gray-900 hover:bg-white/20 transition-all duration-200"
      >
        {$allTabsSelected ? 'Deselect All' : 'Select All'}
      </button>
    </div>
  </div>
</header>