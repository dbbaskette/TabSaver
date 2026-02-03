<script lang="ts">
  import { onMount } from "svelte";
  import {
    tabsStore,
    customFolderNameStore,
    statusStore,
    selectedTabs,
    tabsActions,
    refreshTrigger,
    frozenTabsStore,
    frozenTabsCount,
  } from "../../lib/stores";
  import type { Tab, SaveTabsResponse, FreezeTabsResponse, FrozenTabState } from "../../lib/types";
  import { deduplicateBookmarks } from "../../lib/bookmark-utils";
  import { estimateTabMemory, formatMemory, getMemoryLevel } from "../../lib/memory-utils";
  import ArchiveView from "./components/ArchiveView.svelte";
  import DashboardView from "./components/DashboardView.svelte";

  let isLoading = true;
  let isSaving = false;
  let isClosing = false;
  let isFreezing = false;
  let isThawing = false;
  let isDeduping = false;
  let dedupeProgress = 0;
  let dedupeStatus = "";
  let currentView = "tabs"; // 'tabs', 'archive', 'dashboard'
  let showMemoryColumn = false;

  onMount(async () => {
    try {
      // Get all tabs in current window
      const tabs = await chrome.tabs.query({ currentWindow: true });

      // Get frozen tabs state
      const frozenResponse = await chrome.runtime.sendMessage({ action: "getFrozenTabs" });
      const frozenTabs: Record<number, FrozenTabState> = frozenResponse?.frozenTabs || {};
      frozenTabsStore.set(frozenTabs);

      const formattedTabs: Tab[] = tabs.map((tab) => {
        const isFrozen = !!frozenTabs[tab.id!] || tab.url?.includes('frozen.html');
        const frozenState = frozenTabs[tab.id!];
        const tabUrl = isFrozen && frozenState ? frozenState.originalUrl : (tab.url || "");
        const formattedTab: Tab = {
          id: tab.id!,
          title: isFrozen && frozenState ? frozenState.title : (tab.title || "Untitled"),
          url: tabUrl,
          favIconUrl: isFrozen && frozenState ? frozenState.favIconUrl : tab.favIconUrl,
          selected: false,
          frozen: isFrozen,
          frozenAt: frozenState?.frozenAt,
        };
        // Add memory estimate
        formattedTab.memoryEstimate = estimateTabMemory({
          id: formattedTab.id,
          url: tabUrl,
          frozen: isFrozen,
        });
        return formattedTab;
      });

      tabsStore.set(formattedTabs);
      const frozenCount = formattedTabs.filter(t => t.frozen).length;
      const infoMsg = frozenCount > 0
        ? `Loaded ${formattedTabs.length} tabs (${frozenCount} frozen)`
        : `Loaded ${formattedTabs.length} tabs`;
      statusStore.setInfo(infoMsg);
    } catch (error) {
      console.error("Error loading tabs:", error);
      statusStore.setError("Failed to load tabs");
    } finally {
      isLoading = false;
    }
  });

  async function saveSelectedTabs() {
    let selectedTabsList = [];
    selectedTabs.subscribe((tabs) => (selectedTabsList = tabs))();

    if (selectedTabsList.length === 0) {
      statusStore.setError("Please select at least one tab to save");
      return;
    }

    isSaving = true;
    try {
      // Save to Chrome bookmarks
      const response = (await chrome.runtime.sendMessage({
        action: "saveTabsToBookmarks",
        tabs: $selectedTabs,
        customFolderName: $customFolderNameStore.trim(),
      })) as SaveTabsResponse;

      if (response.success) {
        statusStore.setSuccess(
          `Saved ${$selectedTabs.length} tabs to "${response.folderName}"`,
        );
        customFolderNameStore.set("");
        refreshTrigger.update((n) => n + 1); // Refresh archive view if open
      } else {
        statusStore.setError(response.error || "Failed to save tabs");
      }
    } catch (error) {
      console.error("Error saving tabs:", error);
      statusStore.setError("Failed to save tabs");
    } finally {
      isSaving = false;
    }
  }

  async function closeSelectedTabs() {
    if ($selectedTabs.length === 0) {
      statusStore.setError("Please select at least one tab to close");
      return;
    }

    const tabIds = $selectedTabs.map((tab) => tab.id);
    if (
      !confirm(
        `Close ${tabIds.length} selected tab${tabIds.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    isClosing = true;
    try {
      await chrome.tabs.remove(tabIds);
      statusStore.setSuccess(
        `Closed ${tabIds.length} tab${tabIds.length === 1 ? "" : "s"}`,
      );
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error closing tabs:", error);
      statusStore.setError("Failed to close tabs");
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

  async function freezeSelectedTabs() {
    // Filter out already frozen tabs and get only unfrozen selected tabs
    const unfrozenSelectedTabs = $selectedTabs.filter(tab => !tab.frozen);

    if (unfrozenSelectedTabs.length === 0) {
      statusStore.setError("No unfrozen tabs selected to freeze");
      return;
    }

    isFreezing = true;
    try {
      const tabIds = unfrozenSelectedTabs.map((tab) => tab.id);
      const response = (await chrome.runtime.sendMessage({
        action: "freezeTabs",
        tabIds,
      })) as FreezeTabsResponse;

      if (response.success) {
        let msg = `Froze ${response.frozenCount} tab${response.frozenCount === 1 ? "" : "s"}`;
        if (response.skippedCount && response.skippedCount > 0) {
          msg += ` (${response.skippedCount} skipped)`;
        }
        statusStore.setSuccess(msg);
        // Reload to show updated state
        setTimeout(() => window.location.reload(), 500);
      } else {
        statusStore.setError(response.error || "Failed to freeze tabs");
      }
    } catch (error) {
      console.error("Error freezing tabs:", error);
      statusStore.setError("Failed to freeze tabs");
    } finally {
      isFreezing = false;
    }
  }

  async function thawSelectedTabs() {
    // Get only frozen selected tabs
    const frozenSelectedTabs = $selectedTabs.filter(tab => tab.frozen);

    if (frozenSelectedTabs.length === 0) {
      statusStore.setError("No frozen tabs selected to thaw");
      return;
    }

    isThawing = true;
    try {
      const tabIds = frozenSelectedTabs.map((tab) => tab.id);
      const response = await chrome.runtime.sendMessage({
        action: "thawTabs",
        tabIds,
      });

      if (response.success) {
        statusStore.setSuccess(
          `Thawed ${response.thawedCount} tab${response.thawedCount === 1 ? "" : "s"}`,
        );
        // Reload to show updated state
        setTimeout(() => window.location.reload(), 500);
      } else {
        statusStore.setError(response.error || "Failed to thaw tabs");
      }
    } catch (error) {
      console.error("Error thawing tabs:", error);
      statusStore.setError("Failed to thaw tabs");
    } finally {
      isThawing = false;
    }
  }

  // Check if any selected tabs can be frozen (not already frozen)
  $: canFreeze = $selectedTabs.some(tab => !tab.frozen);
  // Check if any selected tabs can be thawed (are frozen)
  $: canThaw = $selectedTabs.some(tab => tab.frozen);

  async function handleDedupe() {
    if (
      !confirm(
        "This will scan all TabSaver archive folders and remove duplicate bookmarks, keeping only the most recent version. Continue?",
      )
    ) {
      return;
    }

    isDeduping = true;
    dedupeProgress = 0;
    dedupeStatus = "Initializing...";

    try {
      const stats = await deduplicateBookmarks((message, percentage) => {
        dedupeStatus = message;
        dedupeProgress = percentage;
      });

      let successMsg = `Scanned ${stats.scanned} bookmarks. Removed ${stats.removed} duplicates.`;
      if (stats.foldersRemoved > 0) {
        successMsg += ` Cleaned up ${stats.foldersRemoved} empty folders.`;
      }

      statusStore.setSuccess(successMsg);

      // Signal refresh using store
      refreshTrigger.update((n) => n + 1);
    } catch (err) {
      console.error("Dedupe failed:", err);
      statusStore.setError("Failed to deduplicate bookmarks");
    } finally {
      isDeduping = false;
      dedupeProgress = 0;
      dedupeStatus = "";
    }
  }

  function getFaviconUrl(tab: Tab): string {
    if (tab.favIconUrl) return tab.favIconUrl;
    try {
      const url = new URL(tab.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
    } catch {
      return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K";
    }
  }
</script>

<div class="container glass-container">
  <!-- Dedupe Modal Overlay -->
  {#if isDeduping}
    <div class="modal-overlay">
      <div class="modal-content glass-panel">
        <div class="spinner-large"></div>
        <h3>Deduplicating Bookmarks</h3>
        <p class="status-text-large">{dedupeStatus}</p>
        <div class="progress-bar-container-large">
          <div
            class="progress-bar-large"
            style="width: {dedupeProgress}%"
          ></div>
        </div>
        <span class="percentage-large">{Math.round(dedupeProgress)}%</span>
      </div>
    </div>
  {/if}

  <!-- Header -->
  <div class="header glass-panel">
    <div class="header-content">
      <div class="logo-section">
        <div class="icon-wrapper">
          <svg
            class="w-6 h-6 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            ></path>
          </svg>
        </div>
        <h2>
          TabSaver {#if currentView === "tabs"}{#if $selectedTabs.length > 0}({$selectedTabs.length} selected){/if}{#if $frozenTabsCount > 0}<span class="frozen-count">{$frozenTabsCount} frozen</span>{/if}{/if}
        </h2>
      </div>
      <div class="header-actions">
        {#if currentView !== "tabs"}
          <button
            on:click={() => (currentView = "tabs")}
            class="home-btn glass-button"
            title="Back to Current Tabs"
            aria-label="Back to Current Tabs"
          >
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
        {#if currentView === "tabs"}
          <button
            on:click={saveSelectedTabs}
            disabled={$selectedTabs.length === 0 || isSaving}
            class="sidebar-btn save-btn"
          >
            <i class="fas fa-bookmark"></i>
            <span>Save</span>
          </button>
          <button
            on:click={closeSelectedTabs}
            disabled={$selectedTabs.length === 0 || isClosing}
            class="sidebar-btn close-btn"
          >
            <i class="fas fa-times"></i>
            <span>Close</span>
          </button>
          <button
            on:click={saveAndClose}
            disabled={$selectedTabs.length === 0 || isSaving || isClosing}
            class="sidebar-btn save-close-btn"
          >
            <i class="fas fa-save"></i>
            <span>Save & Close</span>
          </button>
          <button
            on:click={freezeSelectedTabs}
            disabled={$selectedTabs.length === 0 || !canFreeze || isFreezing}
            class="sidebar-btn freeze-btn"
            title="Freeze selected tabs to save memory"
          >
            <span class="btn-emoji">🧊</span>
            <span>Freeze</span>
          </button>
          <button
            on:click={thawSelectedTabs}
            disabled={$selectedTabs.length === 0 || !canThaw || isThawing}
            class="sidebar-btn thaw-btn"
            title="Restore frozen tabs"
          >
            <span class="btn-emoji">🔥</span>
            <span>Thaw</span>
          </button>
          <button
            on:click={() => (currentView = "archive")}
            class="sidebar-btn archive-btn"
          >
            <i class="fas fa-archive"></i>
            <span>Archive</span>
          </button>
          <button
            on:click={() => (currentView = "dashboard")}
            class="sidebar-btn dashboard-btn"
            title="View memory usage dashboard"
          >
            <span class="btn-emoji">📊</span>
            <span>Dashboard</span>
          </button>
          <button
            on:click={() => window.location.reload()}
            class="sidebar-btn refresh-btn"
          >
            <i class="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </button>

          <div class="sidebar-input">
            <label class="input-label" for="folder-name-input"
              >Collection Name:</label
            >
            <input
              id="folder-name-input"
              type="text"
              bind:value={$customFolderNameStore}
              placeholder="Optional name"
              class="glass-input sidebar-input-field"
            />
          </div>
        {:else}
          <button
            on:click={() => (currentView = "tabs")}
            class="sidebar-btn back-btn"
          >
            <i class="fas fa-arrow-left"></i>
            <span>Back to Tabs</span>
          </button>

          <button
            on:click={handleDedupe}
            disabled={isDeduping}
            class="sidebar-btn dedupe-btn"
          >
            <i class="fas fa-magic"></i>
            <span>Dedupe</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Table Container -->
      <div class="table-container glass-panel">
        {#if isLoading}
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        {:else if currentView === "tabs"}
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
                <tr class="tab-row" class:selected={tab.selected} class:frozen={tab.frozen}>
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
                      {#if tab.frozen}
                        <span class="frozen-icon" title="Frozen tab">❄️</span>
                      {/if}
                      <img src={getFaviconUrl(tab)} alt="" class="favicon" class:frozen-favicon={tab.frozen} />
                      <span class="tab-title" class:frozen-title={tab.frozen}>{tab.title}</span>
                    </div>
                  </td>
                  <td class="url-cell">
                    <span class="tab-url">{tab.url}</span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else if currentView === "archive"}
          <ArchiveView />
        {:else if currentView === "dashboard"}
          <DashboardView />
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
  :global(html),
  :global(body) {
    width: 800px;
    height: 650px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
      Roboto, sans-serif;
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

  /* Modal Overlay */
  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-content {
    width: 300px;
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    background: linear-gradient(
      135deg,
      rgba(30, 41, 59, 0.95),
      rgba(15, 23, 42, 0.95)
    );
    border: 1px solid rgba(6, 182, 212, 0.4);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    border-radius: 16px;
  }

  .modal-content h3 {
    margin: 0;
    color: #ffffff;
    font-size: 18px;
    font-weight: 700;
  }

  .status-text-large {
    color: #06b6d4;
    font-size: 13px;
    text-align: center;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner-large {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(6, 182, 212, 0.3);
    border-top: 4px solid #06b6d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .progress-bar-container-large {
    width: 100%;
    height: 8px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar-large {
    height: 100%;
    background: linear-gradient(90deg, #06b6d4, #22c55e);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .percentage-large {
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
  }

  .glass-container {
    background: linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.95) 0%,
      rgba(30, 41, 59, 0.9) 50%,
      rgba(51, 65, 85, 0.85) 100%
    );
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 20px;
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.4),
      0 8px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(6, 182, 212, 0.2);
    padding: 8px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .glass-panel {
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.8) 0%,
      rgba(30, 41, 59, 0.9) 100%
    );
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 10px;
    padding: 6px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(6, 182, 212, 0.1);
  }

  /* Header */
  .header {
    padding: 8px 12px;
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
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.8),
      rgba(8, 145, 178, 0.8)
    );
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
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.8),
      rgba(8, 145, 178, 0.8)
    );
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
    background: linear-gradient(
      135deg,
      rgba(8, 145, 178, 0.9),
      rgba(14, 116, 144, 0.9)
    );
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
  }

  /* Main Layout */
  .main-layout {
    display: flex;
    flex: 1;
    gap: 6px;
    min-height: 0;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 110px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
  }

  .sidebar-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 6px;
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.9),
      rgba(30, 41, 59, 0.9)
    );
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
    font-size: 14px;
    margin-bottom: 1px;
  }

  /* Button Colors */
  .save-btn {
    border-color: rgba(16, 185, 129, 0.3);
  }
  .save-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.2),
      rgba(5, 150, 105, 0.2)
    );
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.5);
  }

  .close-btn {
    border-color: rgba(239, 68, 68, 0.3);
  }
  .close-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(239, 68, 68, 0.2),
      rgba(220, 38, 38, 0.2)
    );
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.5);
  }

  .save-close-btn {
    border-color: rgba(245, 158, 11, 0.3);
  }
  .save-close-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.2),
      rgba(217, 119, 6, 0.2)
    );
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.5);
  }

  .archive-btn {
    border-color: rgba(59, 130, 246, 0.3);
  }
  .archive-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.2),
      rgba(37, 99, 235, 0.2)
    );
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.5);
  }

  .refresh-btn {
    border-color: rgba(107, 114, 128, 0.3);
  }
  .refresh-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(107, 114, 128, 0.2),
      rgba(75, 85, 99, 0.2)
    );
    color: #6b7280;
    border-color: rgba(107, 114, 128, 0.5);
  }

  .back-btn {
    border-color: rgba(156, 163, 175, 0.3);
  }
  .back-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(156, 163, 175, 0.2),
      rgba(107, 114, 128, 0.2)
    );
    color: #9ca3af;
    border-color: rgba(156, 163, 175, 0.5);
  }

  .dedupe-btn {
    border-color: rgba(168, 85, 247, 0.3);
  }
  .dedupe-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.2),
      rgba(147, 51, 234, 0.2)
    );
    color: #d8b4fe;
    border-color: rgba(168, 85, 247, 0.5);
  }

  /* Freeze Button */
  .freeze-btn {
    border-color: rgba(56, 189, 248, 0.3);
  }
  .freeze-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.2),
      rgba(14, 165, 233, 0.2)
    );
    color: #38bdf8;
    border-color: rgba(56, 189, 248, 0.5);
  }

  /* Thaw Button */
  .thaw-btn {
    border-color: rgba(251, 146, 60, 0.3);
  }
  .thaw-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(251, 146, 60, 0.2),
      rgba(249, 115, 22, 0.2)
    );
    color: #fb923c;
    border-color: rgba(251, 146, 60, 0.5);
  }

  /* Dashboard Button */
  .dashboard-btn {
    border-color: rgba(34, 197, 94, 0.3);
  }
  .dashboard-btn:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(34, 197, 94, 0.2),
      rgba(22, 163, 74, 0.2)
    );
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.5);
  }

  .btn-emoji {
    font-size: 14px;
    line-height: 1;
  }

  /* Sidebar Input */
  .sidebar-input {
    margin-top: 4px;
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
    padding: 6px;
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 6px;
    background: rgba(51, 65, 85, 0.8);
    backdrop-filter: blur(8px);
    color: #ffffff;
    font-size: 10px;
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
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Tables */
  .tabs-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.6),
      rgba(30, 41, 59, 0.8)
    );
    backdrop-filter: blur(8px);
    border-radius: 8px;
    overflow: hidden;
  }

  .tabs-table thead th {
    background: linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.9),
      rgba(30, 41, 59, 0.9)
    );
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

  .checkbox-column {
    width: 40px;
  }
  .title-column {
    width: 50%;
  }
  .url-column {
    width: 50%;
  }
  .action-column {
    width: 60px;
  }

  .tab-row {
    transition: all 0.2s ease;
    border-bottom: 1px solid rgba(6, 182, 212, 0.1);
  }

  .tab-row:hover {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.1),
      rgba(8, 145, 178, 0.1)
    );
  }

  .tab-row.selected {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.2),
      rgba(8, 145, 178, 0.2)
    );
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

  /* Frozen Tab Styles */
  .tab-row.frozen {
    background: linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.08),
      rgba(14, 165, 233, 0.08)
    );
  }

  .tab-row.frozen:hover {
    background: linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.15),
      rgba(14, 165, 233, 0.15)
    );
  }

  .tab-row.frozen.selected {
    background: linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.25),
      rgba(14, 165, 233, 0.25)
    );
    border-color: rgba(56, 189, 248, 0.4);
  }

  .frozen-icon {
    font-size: 14px;
    filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.5));
  }

  .frozen-favicon {
    opacity: 0.7;
    filter: grayscale(30%);
  }

  .frozen-title {
    color: #7dd3fc;
  }

  /* Header frozen count */
  .frozen-count {
    font-size: 12px;
    font-weight: 500;
    color: #38bdf8;
    margin-left: 8px;
    padding: 2px 8px;
    background: rgba(56, 189, 248, 0.15);
    border-radius: 10px;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  /* Status Bar */
  .status {
    height: 28px;
    min-height: 28px;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.9),
      rgba(15, 23, 42, 0.9)
    );
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 0 0 16px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

  /* Glass Button Utility */
  .glass-button {
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.8),
      rgba(30, 41, 59, 0.8)
    );
    backdrop-filter: blur(12px);
    border: 1px solid rgba(6, 182, 212, 0.3);
    transition: all 0.3s ease;
  }

  .glass-button:hover {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.2),
      rgba(8, 145, 178, 0.2)
    );
  }

  /* Checkbox logic */
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
</style>
