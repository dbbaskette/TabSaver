<script lang="ts">
  import { tabsStore, tabsActions } from '../lib/stores';
  import type { Tab } from '../lib/types';

  function getFaviconUrl(tab: Tab): string {
    if (tab.favIconUrl) {
      return tab.favIconUrl;
    }

    try {
      const url = new URL(tab.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
    } catch {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
    }
  }

  function truncateTitle(title: string, maxLength: number = 45): string {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }

  function getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
</script>

<div class="flex-1 overflow-y-auto">
  <div class="p-4 space-y-2">
    {#each $tabsStore as tab (tab.id)}
      <div
        class="tab-item rounded-xl p-4 glass-panel hover:bg-white/30 transition-all duration-200 cursor-pointer border border-white/10"
        class:selected={tab.selected}
        on:click={() => tabsActions.toggleTab(tab.id)}
        on:keydown={(e) => e.key === 'Enter' && tabsActions.toggleTab(tab.id)}
        role="button"
        tabindex="0"
      >
        <div class="flex items-center space-x-3">
          <div class="relative">
            <input
              type="checkbox"
              checked={tab.selected}
              on:click|stopPropagation
              on:change={() => tabsActions.toggleTab(tab.id)}
              class="w-4 h-4 rounded border-2 border-gray-400 text-blue-600 focus:ring-blue-500 focus:ring-2 bg-white/50"
            />
          </div>

          <div class="w-4 h-4 flex-shrink-0">
            <img
              src={getFaviconUrl(tab)}
              alt=""
              class="w-4 h-4 rounded-sm"
              on:error={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
              }}
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-900 truncate">
                {truncateTitle(tab.title)}
              </h3>
              <span class="text-xs text-gray-600 ml-2 flex-shrink-0">
                {getDomainFromUrl(tab.url)}
              </span>
            </div>
            <p class="text-xs text-gray-600 truncate mt-1">
              {tab.url}
            </p>
          </div>
        </div>
      </div>
    {/each}

    <!-- Spacer to ensure last item is visible -->
    <div class="h-4"></div>
  </div>
</div>

<style>
  .tab-item.selected {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
    border-color: rgba(59, 130, 246, 0.3);
  }

  .tab-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
</style>