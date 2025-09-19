<script lang="ts">
  import { selectedTabs, customFolderNameStore, statusStore } from '../lib/stores';
  import type { SaveTabsResponse } from '../lib/types';

  let isSaving = false;
  let isClosing = false;

  async function saveSelectedTabs() {
    if ($selectedTabs.length === 0) {
      statusStore.setError('Please select at least one tab to save');
      return;
    }

    isSaving = true;
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveTabsToBookmarks',
        tabs: $selectedTabs,
        customFolderName: $customFolderNameStore.trim()
      }) as SaveTabsResponse;

      if (response.success) {
        statusStore.setSuccess(`Saved ${$selectedTabs.length} tabs to "${response.folderName}"`);
        customFolderNameStore.set('');
      } else {
        statusStore.setError(response.error || 'Failed to save tabs');
      }
    } catch (error) {
      console.error('Error saving tabs:', error);
      statusStore.setError('Failed to save tabs');
    } finally {
      isSaving = false;
    }
  }

  async function closeSelectedTabs() {
    if ($selectedTabs.length === 0) {
      statusStore.setError('Please select at least one tab to close');
      return;
    }

    const tabIds = $selectedTabs.map(tab => tab.id);
    const confirmMessage = `Close ${tabIds.length} selected tab${tabIds.length === 1 ? '' : 's'}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    isClosing = true;
    try {
      await chrome.tabs.remove(tabIds);
      statusStore.setSuccess(`Closed ${tabIds.length} tab${tabIds.length === 1 ? '' : 's'}`);

      // Refresh the popup after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error closing tabs:', error);
      statusStore.setError('Failed to close tabs');
    } finally {
      isClosing = false;
    }
  }

  async function saveAndClose() {
    if ($selectedTabs.length === 0) {
      statusStore.setError('Please select at least one tab to save and close');
      return;
    }

    // First save the tabs
    await saveSelectedTabs();

    // If saving was successful, close the tabs
    if (!isSaving) {
      setTimeout(async () => {
        await closeSelectedTabs();
      }, 500);
    }
  }
</script>

<div class="p-4 space-y-3">
  <div class="grid grid-cols-1 gap-3">
    <button
      on:click={saveSelectedTabs}
      disabled={$selectedTabs.length === 0 || isSaving}
      class="action-button action-button-primary"
      class:loading={isSaving}
    >
      <div class="flex items-center justify-center space-x-2">
        {#if isSaving}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
          </svg>
        {/if}
        <span>Save {$selectedTabs.length > 0 ? `${$selectedTabs.length} ` : ''}Tab{$selectedTabs.length === 1 ? '' : 's'}</span>
      </div>
    </button>

    <div class="grid grid-cols-2 gap-3">
      <button
        on:click={saveAndClose}
        disabled={$selectedTabs.length === 0 || isSaving || isClosing}
        class="action-button action-button-secondary"
      >
        <div class="flex items-center justify-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <span>Save & Close</span>
        </div>
      </button>

      <button
        on:click={closeSelectedTabs}
        disabled={$selectedTabs.length === 0 || isClosing}
        class="action-button action-button-danger"
        class:loading={isClosing}
      >
        <div class="flex items-center justify-center space-x-2">
          {#if isClosing}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          {/if}
          <span>Close</span>
        </div>
      </button>
    </div>
  </div>
</div>

<style>
  .action-button {
    @apply px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
    @apply hover:transform hover:scale-105 active:scale-95;
  }

  .action-button-primary {
    @apply bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent;
    @apply hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl;
  }

  .action-button-secondary {
    @apply glass-button text-gray-900 border-white/20;
    @apply hover:bg-white/30;
  }

  .action-button-danger {
    @apply bg-gradient-to-r from-red-500 to-pink-600 text-white border-transparent;
    @apply hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl;
  }

  .loading {
    @apply cursor-wait;
  }
</style>