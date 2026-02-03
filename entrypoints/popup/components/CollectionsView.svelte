<script lang="ts">
  import { onMount } from 'svelte';
  import type { Collection } from '../../../entrypoints/background/types';

  let collections: Collection[] = [];
  let selectedCollection: Collection | null = null;
  let isLoading = true;
  let error = '';

  onMount(async () => {
    await loadCollections();
  });

  async function loadCollections() {
    isLoading = true;
    error = '';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCollections' });

      if (response.success) {
        collections = response.collections || [];
      } else {
        error = response.error || 'Failed to load collections';
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
      error = 'Failed to load collections';
    } finally {
      isLoading = false;
    }
  }

  async function viewCollection(collection: Collection) {
    selectedCollection = collection;
  }

  function backToList() {
    selectedCollection = null;
  }

  async function deleteCollection(id: string, name: string) {
    if (!confirm(`Delete collection "${name}"?`)) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteCollection',
        id
      });

      if (response.success) {
        await loadCollections();
        selectedCollection = null;
      } else {
        error = 'Failed to delete collection';
      }
    } catch (err) {
      console.error('Failed to delete collection:', err);
      error = 'Failed to delete collection';
    }
  }

  async function openAllTabs(collection: Collection) {
    try {
      for (const tab of collection.tabs) {
        await chrome.tabs.create({ url: tab.url, active: false });
      }
    } catch (err) {
      console.error('Failed to open tabs:', err);
      error = 'Failed to open tabs';
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="collections-view">
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading collections...</p>
    </div>
  {:else if selectedCollection}
    <!-- Collection Detail View -->
    <div class="collection-detail">
      <div class="detail-header">
        <button on:click={backToList} class="back-btn">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div class="collection-actions">
          <button on:click={() => openAllTabs(selectedCollection)} class="open-all-btn">
            <i class="fas fa-external-link-alt"></i> Open All
          </button>
          <button on:click={() => deleteCollection(selectedCollection.id, selectedCollection.name)} class="delete-btn">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>

      <div class="collection-header">
        <h3>{selectedCollection.name}</h3>
        {#if selectedCollection.description}
          <p class="description">{selectedCollection.description}</p>
        {/if}
        <div class="metadata">
          <span class="meta-item">
            <i class="fas fa-bookmark"></i>
            {selectedCollection.tabs.length} tabs
          </span>
          <span class="meta-item">
            <i class="fas fa-clock"></i>
            {formatDate(selectedCollection.createdAt)}
          </span>
        </div>
      </div>

      <div class="tabs-list">
        {#each selectedCollection.tabs as tab}
          <div class="tab-item">
            <img
              src={tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=16`}
              alt=""
              class="favicon"
            />
            <div class="tab-content">
              <a href={tab.url} target="_blank" class="tab-title">{tab.title}</a>
              <span class="tab-url">{tab.url}</span>
              {#if tab.description}
                <p class="tab-description">{tab.description}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Collections List View -->
    <div class="collections-list">
      {#if collections.length === 0}
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No collections yet</p>
          <span>Save your first collection to get started</span>
        </div>
      {:else}
        {#each collections as collection}
          <div class="collection-card">
            <button class="card-main" on:click={() => viewCollection(collection)}>
              <div class="card-header">
                <h4>{collection.name}</h4>
                <span class="tab-count">{collection.tabs.length} tabs</span>
              </div>
              {#if collection.description}
                <p class="card-description">{collection.description}</p>
              {/if}
              <div class="card-footer">
                <span class="date">{formatDate(collection.createdAt)}</span>
              </div>
            </button>
            <div class="card-actions">
              <button
                on:click={() => openAllTabs(collection)}
                class="action-btn open"
                title="Open all tabs"
              >
                <i class="fas fa-external-link-alt"></i>
              </button>
              <button
                on:click={() => deleteCollection(collection.id, collection.name)}
                class="action-btn delete"
                title="Delete collection"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .collections-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px;
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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

  /* Collections List */
  .collections-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .collection-card {
    display: flex;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.8));
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .collection-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: rgba(6, 182, 212, 0.4);
  }

  .card-main {
    flex: 1;
    background: none;
    border: none;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    color: white;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .card-header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
  }

  .tab-count {
    padding: 4px 8px;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    color: #06b6d4;
  }

  .card-description {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.4;
  }

  .card-footer {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .date {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }

  .card-actions {
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(6, 182, 212, 0.2);
  }

  .action-btn {
    padding: 16px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .action-btn:hover {
    background: rgba(6, 182, 212, 0.1);
  }

  .action-btn.open:hover {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }

  .action-btn.delete:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  /* Collection Detail */
  .collection-detail {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.8));
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .back-btn:hover {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2));
    border-color: rgba(6, 182, 212, 0.4);
  }

  .collection-actions {
    display: flex;
    gap: 8px;
  }

  .open-all-btn, .delete-btn {
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

  .open-all-btn {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border-color: rgba(34, 197, 94, 0.3);
    color: white;
  }

  .open-all-btn:hover {
    background: linear-gradient(135deg, #16a34a, #15803d);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .delete-btn {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-color: rgba(239, 68, 68, 0.3);
    color: white;
  }

  .delete-btn:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .collection-header {
    padding: 16px;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.8));
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
  }

  .collection-header h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
  }

  .description {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
  }

  .metadata {
    display: flex;
    gap: 16px;
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

  /* Tabs List */
  .tabs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    max-height: 400px;
  }

  .tab-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.6));
    border: 1px solid rgba(6, 182, 212, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .tab-item:hover {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(8, 145, 178, 0.1));
    border-color: rgba(6, 182, 212, 0.3);
  }

  .favicon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    margin-top: 2px;
  }

  .tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tab-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .tab-title:hover {
    color: #06b6d4;
  }

  .tab-url {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    word-break: break-all;
  }

  .tab-description {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
  }
</style>
