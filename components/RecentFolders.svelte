<script lang="ts">
  import { onMount } from 'svelte';
  import { statusStore } from '../lib/stores';
  import { getRecentTabSaverFolders, openBookmarkFolder } from '../lib/bookmark-utils';
  import type { RecentBookmarkFolder } from '../lib/types';

  let recentFolders: RecentBookmarkFolder[] = [];
  let isLoading = true;
  let openingFolderId: string | null = null;

  onMount(async () => {
    try {
      recentFolders = await getRecentTabSaverFolders();
    } catch (error) {
      console.error('Error loading recent folders:', error);
      statusStore.setError('Failed to load recent folders');
    } finally {
      isLoading = false;
    }
  });

  async function openFolder(folder: RecentBookmarkFolder) {
    if (openingFolderId) return;

    openingFolderId = folder.id;
    try {
      await openBookmarkFolder(folder.id);
      statusStore.setSuccess(`Opened ${folder.tabCount} tab${folder.tabCount === 1 ? '' : 's'} from "${folder.title}"`);
    } catch (error) {
      console.error('Error opening folder:', error);
      statusStore.setError('Failed to open bookmark folder');
    } finally {
      openingFolderId = null;
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  function truncateTitle(title: string, maxLength: number = 35): string {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }
</script>

{#if recentFolders.length > 0}
  <div class="glass-panel rounded-xl p-4 border border-white/20">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-gray-900">Recent Saves</h3>
      <span class="text-xs text-gray-600">{recentFolders.length} folder{recentFolders.length === 1 ? '' : 's'}</span>
    </div>

    {#if isLoading}
      <div class="flex items-center justify-center py-4">
        <div class="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else}
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each recentFolders as folder (folder.id)}
          <button
            on:click={() => openFolder(folder)}
            disabled={openingFolderId !== null}
            class="w-full text-left p-3 rounded-lg glass-button hover:bg-white/30 transition-all duration-200 border border-white/10"
            class:loading={openingFolderId === folder.id}
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H9L7 5H3a2 2 0 00-2 2z"></path>
                  </svg>
                  <span class="text-sm font-medium text-gray-900 truncate">
                    {truncateTitle(folder.title)}
                  </span>
                </div>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs text-gray-600">
                    {folder.tabCount} tab{folder.tabCount === 1 ? '' : 's'}
                  </span>
                  <span class="text-xs text-gray-500">
                    {formatDate(folder.dateAdded)}
                  </span>
                </div>
              </div>

              <div class="ml-3 flex-shrink-0">
                {#if openingFolderId === folder.id}
                  <div class="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                {:else}
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading {
    @apply cursor-wait opacity-75;
  }
</style>