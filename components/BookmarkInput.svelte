<script lang="ts">
  import { customFolderNameStore, selectedTabs } from '../lib/stores';
  import { generateSmartFolderNames } from '../lib/bookmark-utils';
  import { onMount } from 'svelte';

  let suggestions: string[] = [];
  let showSuggestions = false;
  let inputElement: HTMLInputElement;

  onMount(() => {
    // Generate smart suggestions when component mounts
    const unsubscribe = selectedTabs.subscribe(tabs => {
      if (tabs.length > 0) {
        suggestions = generateSmartFolderNames(tabs);
      }
    });

    return unsubscribe;
  });

  function handleInputFocus() {
    showSuggestions = true;
  }

  function handleInputBlur() {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }

  function selectSuggestion(suggestion: string) {
    customFolderNameStore.set(suggestion);
    showSuggestions = false;
    inputElement?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      showSuggestions = false;
      inputElement?.blur();
    }
  }
</script>

<div class="relative">
  <div class="glass-panel rounded-xl p-4 border border-white/20">
    <label for="folder-name" class="block text-sm font-semibold text-gray-900 mb-2">
      Bookmark Folder Name
    </label>
    <div class="relative">
      <input
        bind:this={inputElement}
        bind:value={$customFolderNameStore}
        on:focus={handleInputFocus}
        on:blur={handleInputBlur}
        on:keydown={handleKeydown}
        type="text"
        id="folder-name"
        placeholder="Enter custom name (optional)"
        class="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
      />

      {#if showSuggestions && suggestions.length > 0}
        <div class="absolute top-full left-0 right-0 mt-2 glass-panel rounded-lg border border-white/20 shadow-xl z-50 max-h-48 overflow-y-auto">
          <div class="p-2">
            <div class="text-xs font-semibold text-gray-700 mb-2 px-2">Smart Suggestions</div>
            {#each suggestions as suggestion}
              <button
                type="button"
                on:click={() => selectSuggestion(suggestion)}
                class="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-900 hover:bg-white/30 transition-all duration-150 cursor-pointer"
              >
                {suggestion}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="mt-2 text-xs text-gray-600">
      {#if $customFolderNameStore.trim()}
        Preview: "{$customFolderNameStore.trim()} {new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(/[/:]/g, '').replace(', ', ' ')}"
      {:else}
        Will use default name: "Tabs {new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(/[/:]/g, '').replace(', ', ' ')}"
      {/if}
    </div>
  </div>
</div>