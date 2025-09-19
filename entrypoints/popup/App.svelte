<script lang="ts">
  import { onMount } from 'svelte';
  import { tabsStore, customFolderNameStore, statusStore, selectedTabs, tabsActions } from '../../lib/stores';
  import type { Tab, SaveTabsResponse } from '../../lib/types';
  import { getRecentTabSaverFolders, openBookmarkFolder } from '../../lib/bookmark-utils';

  let isLoading = true;
  let isSaving = false;
  let isClosing = false;
  let currentView = 'tabs'; // 'tabs', 'folders', 'bookmarks'
  let recentFolders = [];
  let selectedFolder = null;
  let folderBookmarks = [];
  let selectedBookmarks = [];

  onMount(async () => {
    try {
      // Get all tabs in current window
      const tabs = await chrome.tabs.query({ currentWindow: true });

      const formattedTabs: Tab[] = tabs.map(tab => ({
        id: tab.id!,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        selected: false
      }));

      tabsStore.set(formattedTabs);
      statusStore.setInfo(`Loaded ${formattedTabs.length} tabs`);

      // Load recent folders
      recentFolders = await getRecentTabSaverFolders();
    } catch (error) {
      console.error('Error loading tabs:', error);
      statusStore.setError('Failed to load tabs');
    } finally {
      isLoading = false;
    }
  });

  async function saveSelectedTabs() {
    let selectedTabsList = [];
    selectedTabs.subscribe(tabs => selectedTabsList = tabs)();

    if (selectedTabsList.length === 0) {
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
        // Refresh recent folders
        recentFolders = await getRecentTabSaverFolders();
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
    if (!confirm(`Close ${tabIds.length} selected tab${tabIds.length === 1 ? '' : 's'}?`)) {
      return;
    }

    isClosing = true;
    try {
      await chrome.tabs.remove(tabIds);
      statusStore.setSuccess(`Closed ${tabIds.length} tab${tabIds.length === 1 ? '' : 's'}`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error closing tabs:', error);
      statusStore.setError('Failed to close tabs');
    } finally {
      isClosing = false;
    }
  }

  async function saveAndClose() {
    await saveSelectedTabs();
    if (!isSaving) {
      setTimeout(async () => await closeSelectedTabs(), 500);
    }
  }

  async function viewFolderBookmarks(folder) {
    try {
      const bookmarks = await chrome.bookmarks.getChildren(folder.id);
      folderBookmarks = bookmarks.filter(bookmark => bookmark.url).map(bookmark => ({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        dateAdded: bookmark.dateAdded,
        selected: false
      }));
      selectedBookmarks = [];
      selectedFolder = folder;
      currentView = 'bookmarks';
      statusStore.setInfo(`Viewing ${folderBookmarks.length} bookmarks from "${folder.title}"`);
    } catch (error) {
      statusStore.setError('Failed to load bookmark folder');
    }
  }

  function toggleBookmark(bookmarkId) {
    folderBookmarks = folderBookmarks.map(bookmark =>
      bookmark.id === bookmarkId
        ? { ...bookmark, selected: !bookmark.selected }
        : bookmark
    );
    selectedBookmarks = folderBookmarks.filter(bookmark => bookmark.selected);
  }

  function toggleAllBookmarks() {
    const allSelected = folderBookmarks.every(bookmark => bookmark.selected);
    folderBookmarks = folderBookmarks.map(bookmark => ({
      ...bookmark,
      selected: !allSelected
    }));
    selectedBookmarks = folderBookmarks.filter(bookmark => bookmark.selected);
  }

  async function openSelectedBookmarks() {
    if (selectedBookmarks.length === 0) {
      statusStore.setError('Please select bookmarks to open');
      return;
    }

    try {
      for (const bookmark of selectedBookmarks) {
        await chrome.tabs.create({ url: bookmark.url, active: false });
      }
      statusStore.setSuccess(`Opened ${selectedBookmarks.length} bookmark${selectedBookmarks.length === 1 ? '' : 's'}`);
    } catch (error) {
      statusStore.setError('Failed to open bookmarks');
    }
  }

  async function openFolder(folder) {
    try {
      await openBookmarkFolder(folder.id);
      statusStore.setSuccess(`Opened ${folder.tabCount} tab${folder.tabCount === 1 ? '' : 's'} from "${folder.title}"`);
    } catch (error) {
      statusStore.setError('Failed to open bookmark folder');
    }
  }

  function getFaviconUrl(tab: Tab): string {
    if (tab.favIconUrl) return tab.favIconUrl;
    try {
      const url = new URL(tab.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
    } catch {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
    }
  }
</script>

<div class="container glass-container">
  <!-- Header -->
  <div class="header glass-panel">
    <div class="header-content">
      <div class="logo-section">
        <div class="icon-wrapper">
          <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
          </svg>
        </div>
        <h2>TabSaver {#if currentView === 'tabs' && $selectedTabs.length > 0}({$selectedTabs.length} selected){/if}</h2>
      </div>
      <div class="header-actions">
        {#if currentView !== 'tabs'}
          <button on:click={() => currentView = 'tabs'} class="home-btn glass-button" title="Back to Current Tabs" aria-label="Back to Current Tabs">
            <i class="fas fa-home"></i>
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="main-layout">
    <!-- Sidebar -->
    <div class="sidebar glass-panel">
      <div class="sidebar-content">
        {#if currentView === 'tabs'}
          <button on:click={saveSelectedTabs} disabled={$selectedTabs.length === 0 || isSaving} class="sidebar-btn save-btn">
            <i class="fas fa-bookmark"></i>
            <span>Save</span>
          </button>
          <button on:click={closeSelectedTabs} disabled={$selectedTabs.length === 0 || isClosing} class="sidebar-btn close-btn">
            <i class="fas fa-times"></i>
            <span>Close</span>
          </button>
          <button on:click={saveAndClose} disabled={$selectedTabs.length === 0 || isSaving || isClosing} class="sidebar-btn save-close-btn">
            <i class="fas fa-save"></i>
            <span>Save & Close</span>
          </button>
          <button on:click={() => currentView = 'folders'} class="sidebar-btn archive-btn">
            <i class="fas fa-archive"></i>
            <span>Archive</span>
          </button>
          <button on:click={() => window.location.reload()} class="sidebar-btn refresh-btn">
            <i class="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </button>

          <div class="sidebar-input">
            <label class="input-label" for="folder-name-input">Folder Name:</label>
            <input
              id="folder-name-input"
              type="text"
              bind:value={$customFolderNameStore}
              placeholder="Custom name"
              class="glass-input sidebar-input-field"
            />
          </div>
        {:else if currentView === 'folders'}
          <button on:click={() => currentView = 'tabs'} class="sidebar-btn back-btn">
            <i class="fas fa-arrow-left"></i>
            <span>Back to Tabs</span>
          </button>
        {:else if currentView === 'bookmarks'}
          <button on:click={() => currentView = 'folders'} class="sidebar-btn back-btn">
            <i class="fas fa-arrow-left"></i>
            <span>Back to Archive</span>
          </button>
          <button on:click={openSelectedBookmarks} disabled={selectedBookmarks.length === 0} class="sidebar-btn open-btn">
            <i class="fas fa-external-link-alt"></i>
            <span>Open Selected</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Content Header -->
      {#if currentView === 'folders'}
        <div class="content-header glass-panel">
          <h3>Bookmark Archive</h3>
          <p class="view-description">Click a folder to view bookmarks, or click count to open all tabs</p>
        </div>
      {:else if currentView === 'bookmarks'}
        <div class="content-header glass-panel">
          <div class="breadcrumb">
            <span class="folder-title">"{selectedFolder.title}" ({selectedBookmarks.length} selected)</span>
          </div>
        </div>
      {/if}

      <!-- Table Container -->
      <div class="table-container glass-panel">
    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    {:else if currentView === 'tabs'}
      <table class="tabs-table">
        <thead>
          <tr>
            <th class="checkbox-column">
              <input
                type="checkbox"
                on:change={tabsActions.toggleSelectAll}
                class="glass-checkbox"
                title="Select All Tabs"
              />
            </th>
            <th class="title-column">Title</th>
            <th class="url-column">URL</th>
          </tr>
        </thead>
        <tbody>
          {#each $tabsStore as tab (tab.id)}
            <tr class="tab-row" class:selected={tab.selected}>
              <td class="checkbox-cell">
                <input
                  type="checkbox"
                  checked={tab.selected}
                  on:change={() => tabsActions.toggleTab(tab.id)}
                  class="glass-checkbox"
                />
              </td>
              <td class="title-cell">
                <div class="tab-info">
                  <img src={getFaviconUrl(tab)} alt="" class="favicon" />
                  <span class="tab-title">{tab.title}</span>
                </div>
              </td>
              <td class="url-cell">
                <span class="tab-url">{tab.url}</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else if currentView === 'folders'}
      <div class="folders-view">
        {#each recentFolders as folder}
          <div class="folder-row">
            <button class="folder-main" on:click={() => viewFolderBookmarks(folder)}>
              <div class="folder-info">
                <i class="fas fa-folder folder-icon"></i>
                <span class="folder-name">{folder.title}</span>
                <span class="folder-date">{new Date(folder.dateAdded).toLocaleDateString()}</span>
              </div>
            </button>
            <button class="folder-count-btn" on:click={() => openFolder(folder)} title="Open all tabs">
              {folder.tabCount}
            </button>
          </div>
        {/each}
      </div>
    {:else if currentView === 'bookmarks'}
      <table class="tabs-table">
        <thead>
          <tr>
            <th class="checkbox-column">
              <input
                type="checkbox"
                on:change={toggleAllBookmarks}
                checked={folderBookmarks.length > 0 && folderBookmarks.every(bookmark => bookmark.selected)}
                class="glass-checkbox"
                title="Select All Bookmarks"
              />
            </th>
            <th class="title-column">Bookmark</th>
            <th class="url-column">URL</th>
            <th class="action-column">Action</th>
          </tr>
        </thead>
        <tbody>
          {#each folderBookmarks as bookmark}
            <tr class="tab-row" class:selected={bookmark.selected}>
              <td class="checkbox-cell">
                <input
                  type="checkbox"
                  checked={bookmark.selected}
                  on:change={() => toggleBookmark(bookmark.id)}
                  class="glass-checkbox"
                />
              </td>
              <td class="title-cell">
                <div class="tab-info">
                  <img src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=16`} alt="" class="favicon" />
                  <span class="tab-title">{bookmark.title}</span>
                </div>
              </td>
              <td class="url-cell">
                <span class="tab-url">{bookmark.url}</span>
              </td>
              <td class="action-cell">
                <button class="open-btn" on:click={() => window.open(bookmark.url, '_blank')} aria-label="Open bookmark in new tab">
                  <i class="fas fa-external-link-alt"></i>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {/if}
      </div>
    </div>
  </div>

  <!-- Status Bar -->
  <div id="status" class="status glass-panel">
    {#if $statusStore.visible}
      <div class="status-message {$statusStore.type}">
        {$statusStore.message}
      </div>
    {:else}
      <div class="status-message">Ready</div>
    {/if}
  </div>
</div>

<style>
  :global(html), :global(body) {
    width: 800px;
    height: 650px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b  50%, #334155 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  }

  :global(#app) {
    width: 100%;
    height: 100%;
  }

  .container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .glass-container {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.90) 50%, rgba(51, 65, 85, 0.85) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 20px;
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.4),
      0 8px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(6, 182, 212, 0.2);
    padding: 8px 8px 40px 8px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .glass-panel {
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    padding: 8px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(6, 182, 212, 0.1);
    flex-shrink: 0;
  }

  /* Header */
  .header {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(6, 182, 212, 0.3);
    flex-shrink: 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-wrapper {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(8, 145, 178, 0.8));
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
  }

  h2 {
    margin: 0;
    color: #ffffff;
    font-size: 18px;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .header-actions {
    display: flex;
    align-items: center;
  }

  .home-btn {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(8, 145, 178, 0.8));
    color: white;
    border: 1px solid rgba(6, 182, 212, 0.3);
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
  }

  .home-btn:hover {
    background: linear-gradient(135deg, rgba(8, 145, 178, 0.9), rgba(14, 116, 144, 0.9));
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
  }

  /* Main Layout */
  .main-layout {
    display: flex;
    flex: 1;
    gap: 8px;
    min-height: 0;
  }

  /* Sidebar */
  .sidebar {
    width: 120px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
  }

  .sidebar-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.9), rgba(30, 41, 59, 0.9));
    backdrop-filter: blur(12px);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .sidebar-btn:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    border-color: rgba(6, 182, 212, 0.4);
  }

  .sidebar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sidebar-btn i {
    font-size: 16px;
    margin-bottom: 2px;
  }

  /* Button Colors */
  .save-btn {
    border-color: rgba(16, 185, 129, 0.3);
  }
  .save-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.5);
  }

  .close-btn {
    border-color: rgba(239, 68, 68, 0.3);
  }
  .close-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.5);
  }

  .save-close-btn {
    border-color: rgba(245, 158, 11, 0.3);
  }
  .save-close-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2));
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.5);
  }

  .archive-btn {
    border-color: rgba(59, 130, 246, 0.3);
  }
  .archive-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2));
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.5);
  }

  .refresh-btn {
    border-color: rgba(107, 114, 128, 0.3);
  }
  .refresh-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(75, 85, 99, 0.2));
    color: #6b7280;
    border-color: rgba(107, 114, 128, 0.5);
  }

  .back-btn {
    border-color: rgba(156, 163, 175, 0.3);
  }
  .back-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(156, 163, 175, 0.2), rgba(107, 114, 128, 0.2));
    color: #9ca3af;
    border-color: rgba(156, 163, 175, 0.5);
  }

  .open-btn {
    border-color: rgba(34, 197, 94, 0.3);
  }
  .open-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2));
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.5);
  }

  /* Sidebar Input */
  .sidebar-input {
    margin-top: 8px;
  }

  .input-label {
    display: block;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sidebar-input-field {
    width: 100%;
    padding: 8px;
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 8px;
    background: rgba(51, 65, 85, 0.8);
    backdrop-filter: blur(8px);
    color: #ffffff;
    font-size: 11px;
    box-sizing: border-box;
  }

  .sidebar-input-field::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .sidebar-input-field:focus {
    outline: none;
    border-color: rgba(6, 182, 212, 0.6);
    box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
    background: rgba(51, 65, 85, 0.9);
  }

  /* Content Area */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .content-header {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(6, 182, 212, 0.2);
  }

  .content-header h3 {
    margin: 0 0 8px 0;
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .view-description {
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    line-height: 1.4;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .folder-title {
    color: #06b6d4;
    font-weight: 600;
    font-size: 14px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }

  .glass-checkbox {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(6, 182, 212, 0.5);
    border-radius: 4px;
    background: rgba(51, 65, 85, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .glass-checkbox:checked {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border-color: #06b6d4;
  }

  /* Table Container */
  .table-container {
    flex: 1;
    overflow-y: auto;
    border-radius: 12px;
    min-height: 0;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    gap: 16px;
    color: #ffffff;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(6, 182, 212, 0.3);
    border-top: 3px solid #06b6d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Tables */
  .tabs-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.8));
    backdrop-filter: blur(8px);
    border-radius: 8px;
    overflow: hidden;
  }

  .tabs-table thead th {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
    color: #ffffff;
    font-weight: 700;
    padding: 12px 8px;
    text-align: left;
    border-bottom: 2px solid rgba(6, 182, 212, 0.3);
    position: sticky;
    top: 0;
    z-index: 10;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .checkbox-column { width: 40px; }
  .title-column { width: 50%; }
  .url-column { width: 50%; }
  .action-column { width: 60px; }

  .tab-row {
    transition: all 0.2s ease;
    border-bottom: 1px solid rgba(6, 182, 212, 0.1);
  }

  .tab-row:hover {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(8, 145, 178, 0.1));
  }

  .tab-row.selected {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2));
    border-color: rgba(6, 182, 212, 0.4);
  }

  .tab-row td {
    padding: 10px 8px;
    vertical-align: middle;
    border-bottom: 1px solid rgba(6, 182, 212, 0.1);
  }

  .tab-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .favicon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .tab-title {
    font-weight: 600;
    color: #ffffff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .tab-url {
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }



  /* Status Bar */
  .status {
    height: 32px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(15, 23, 42, 0.9));
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 0 0 20px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
  }

  .status-message {
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #22c55e;
  }

  .status-message.success {
    color: #22c55e;
    text-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
  }

  .status-message.error {
    color: #ef4444;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
  }

  .status-message.info {
    color: #06b6d4;
    text-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
  }

  /* Folder Views */
  .folders-view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
  }

  .folder-row {
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.8));
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
  }

  .folder-row:hover {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(8, 145, 178, 0.1));
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: rgba(6, 182, 212, 0.4);
  }

  .folder-main {
    flex: 1;
    background: none;
    border: none;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    color: #ffffff;
  }

  .folder-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .folder-icon {
    color: #06b6d4;
    font-size: 18px;
  }

  .folder-name {
    font-weight: 600;
    color: #ffffff;
    flex: 1;
    font-size: 14px;
  }

  .folder-date {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
  }

  .folder-count-btn {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    color: white;
    border: none;
    padding: 12px 20px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 60px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .folder-count-btn:hover {
    background: linear-gradient(135deg, #0891b2, #0e7490);
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
  }

  .action-cell {
    text-align: center;
  }

  .action-cell .open-btn {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    border: 1px solid rgba(34, 197, 94, 0.3);
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
    font-size: 12px;
  }

  .action-cell .open-btn:hover {
    background: linear-gradient(135deg, #16a34a, #15803d);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }
  /* Glass Button Utility */
  .glass-button {
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.8));
    backdrop-filter: blur(12px);
    border: 1px solid rgba(6, 182, 212, 0.3);
    transition: all 0.3s ease;
  }

  .glass-button:hover {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2));
    border-color: rgba(6, 182, 212, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.2);
  }
</style>