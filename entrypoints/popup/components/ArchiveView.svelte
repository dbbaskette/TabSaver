<script lang="ts">
  import { onMount } from "svelte";
  import {
    getRecentTabSaverFolders,
    openBookmarkFolder,
  } from "../../../lib/bookmark-utils";
  import { refreshTrigger } from "../../../lib/stores";

  let chromeBookmarks: any[] = [];
  let selectedBookmarkFolder: any = null;
  let folderBookmarks: any[] = [];
  let isLoading = true;
  let error = "";

  // Subscribe to refresh trigger
  $: if ($refreshTrigger > 0) {
    loadChromeBookmarks();
  }

  onMount(async () => {
    await loadChromeBookmarks();
  });

  async function loadChromeBookmarks() {
    isLoading = true;
    error = "";

    try {
      chromeBookmarks = await getRecentTabSaverFolders();
    } catch (err) {
      console.error("Failed to load Chrome bookmarks:", err);
    } finally {
      isLoading = false;
    }
  }

  async function viewBookmarkFolder(folder: any) {
    try {
      const bookmarks = await chrome.bookmarks.getChildren(folder.id);
      folderBookmarks = bookmarks
        .filter((b) => b.url)
        .map((b) => ({
          id: b.id,
          title: b.title,
          url: b.url,
          dateAdded: b.dateAdded,
        }));
      selectedBookmarkFolder = folder;
    } catch (err) {
      console.error("Failed to load bookmark folder:", err);
      error = "Failed to load bookmark folder";
    }
  }

  function backToList() {
    selectedBookmarkFolder = null;
  }

  async function openBookmarkFolderTabs(folder: any) {
    try {
      await openBookmarkFolder(folder.id);
    } catch (err) {
      console.error("Failed to open bookmark folder:", err);
      error = "Failed to open bookmark folder";
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="archive-view">
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else}
    <!-- Chrome Bookmarks View -->
    {#if selectedBookmarkFolder}
      <div class="detail-view">
        <div class="detail-header">
          <button on:click={backToList} class="back-btn">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <div class="detail-actions">
            <button
              on:click={() => openBookmarkFolderTabs(selectedBookmarkFolder)}
              class="action-btn open"
            >
              <i class="fas fa-external-link-alt"></i> Open All
            </button>
          </div>
        </div>

        <div class="detail-content">
          <h3>{selectedBookmarkFolder.title}</h3>
          <div class="metadata">
            <span class="meta-item">
              <i class="fas fa-bookmark"></i>
              {folderBookmarks.length} bookmarks
            </span>
            <span class="meta-item">
              <i class="fas fa-clock"></i>
              {formatDate(selectedBookmarkFolder.dateAdded)}
            </span>
          </div>

          <div class="items-list">
            {#each folderBookmarks as bookmark}
              <div class="item-card">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=16`}
                  alt=""
                  class="favicon"
                />
                <div class="item-content">
                  <a href={bookmark.url} target="_blank" class="item-title"
                    >{bookmark.title}</a
                  >
                  <span class="item-url">{bookmark.url}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="list-view">
        {#if chromeBookmarks.length === 0}
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No bookmark folders yet</p>
            <span>Save your first collection to get started</span>
          </div>
        {:else}
          {#each chromeBookmarks as folder}
            <div class="card">
              <button
                class="card-main"
                on:click={() => viewBookmarkFolder(folder)}
              >
                <div class="card-header">
                  <h4>{folder.title}</h4>
                  <span class="count-badge">{folder.tabCount}</span>
                </div>
                <div class="card-footer">
                  <span class="card-date">{formatDate(folder.dateAdded)}</span>
                </div>
              </button>
              <div class="card-actions">
                <button
                  on:click={() => openBookmarkFolderTabs(folder)}
                  class="icon-btn"
                  title="Open all tabs"
                >
                  <i class="fas fa-external-link-alt"></i>
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .archive-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
  }

  /* Common Styles */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 20px;
    gap: 16px;
    color: rgba(255, 255, 255, 0.8);
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

  .error-message {
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    font-size: 13px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 20px;
    gap: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
  }

  .empty-state i {
    font-size: 48px;
    color: rgba(6, 182, 212, 0.3);
  }

  .empty-state p {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  }

  .empty-state span {
    font-size: 13px;
  }

  /* List View */
  .list-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    padding-bottom: 20px; /* Add padding to bottom to prevent cut-off */
  }

  .card {
    display: flex;
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.8),
      rgba(30, 41, 59, 0.8)
    );
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    min-height: 80px; /* Ensure minimum height */
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: rgba(6, 182, 212, 0.4);
  }

  .card-main {
    flex: 1;
    background: none;
    border: none;
    padding: 20px; /* Increased padding */
    text-align: left;
    cursor: pointer;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    width: 100%;
  }

  .card-header h4 {
    margin: 0;
    font-size: 16px; /* Slightly larger font */
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count-badge {
    padding: 4px 10px;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #06b6d4;
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: 12px;
  }

  .card-footer {
    display: flex;
    align-items: center;
  }

  .card-date {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .card-actions {
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(6, 182, 212, 0.2);
    justify-content: center;
  }

  .icon-btn {
    padding: 24px 20px; /* Larger hit area */
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
    height: 100%;
  }

  .icon-btn:hover {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }

  /* Detail View */
  .detail-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    overflow: hidden;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.8),
      rgba(30, 41, 59, 0.8)
    );
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .back-btn:hover {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.2),
      rgba(8, 145, 178, 0.2)
    );
    border-color: rgba(6, 182, 212, 0.4);
  }

  .detail-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .action-btn.open {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border-color: rgba(34, 197, 94, 0.3);
    color: white;
  }

  .action-btn.open:hover {
    background: linear-gradient(135deg, #16a34a, #15803d);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .detail-content {
    padding: 16px;
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.8),
      rgba(30, 41, 59, 0.8)
    );
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .detail-content h3 {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    flex-shrink: 0;
  }

  .metadata {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .meta-item i {
    color: #06b6d4;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    flex: 1; /* Take remaining height */
    padding-bottom: 10px;
  }

  .item-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(
      135deg,
      rgba(51, 65, 85, 0.5),
      rgba(30, 41, 59, 0.5)
    );
    border: 1px solid rgba(6, 182, 212, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .item-card:hover {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.1),
      rgba(8, 145, 178, 0.1)
    );
    border-color: rgba(6, 182, 212, 0.3);
  }

  .favicon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    margin-top: 2px;
  }

  .item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .item-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    text-decoration: none;
    transition: color 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-title:hover {
    color: #06b6d4;
  }

  .item-url {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
