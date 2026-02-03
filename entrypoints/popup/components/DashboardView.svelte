<script lang="ts">
  import { onMount } from 'svelte';
  import {
    tabsStore,
    frozenTabsStore,
    frozenTabsCount,
    totalMemoryUsage,
    memorySaved,
    savingsHistoryStore,
    statusStore,
  } from '../../../lib/stores';
  import type { Tab, FreezeSuggestion, SavingsHistory } from '../../../lib/types';
  import {
    formatMemory,
    getMemoryLevel,
    generateFreezeSuggestions,
    loadSavingsHistory,
    getRecentSavings,
  } from '../../../lib/memory-utils';

  let suggestions: FreezeSuggestion[] = [];
  let recentSavings = { savedMB: 0, tabsFrozen: 0 };
  let isFreezingSuggested = false;

  // Sort tabs by memory usage
  $: sortedTabs = [...$tabsStore].sort((a, b) => {
    const memA = a.memoryEstimate?.estimatedMB || 0;
    const memB = b.memoryEstimate?.estimatedMB || 0;
    return memB - memA;
  });

  // Top memory consumers (non-frozen)
  $: topConsumers = sortedTabs.filter(t => !t.frozen).slice(0, 5);

  onMount(async () => {
    // Load savings history
    const history = await loadSavingsHistory();
    savingsHistoryStore.set(history);
    recentSavings = getRecentSavings(history, 7);

    // Generate suggestions
    suggestions = generateFreezeSuggestions($tabsStore, $frozenTabsStore);
  });

  async function freezeSuggestedTabs(suggestion: FreezeSuggestion) {
    isFreezingSuggested = true;
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'freezeTabs',
        tabIds: suggestion.tabIds,
      });

      if (response.success) {
        statusStore.setSuccess(`Froze ${response.frozenCount} tabs (~${formatMemory(suggestion.estimatedSavingsMB)} saved)`);
        setTimeout(() => window.location.reload(), 500);
      } else {
        statusStore.setError(response.error || 'Failed to freeze tabs');
      }
    } catch (error) {
      console.error('Error freezing suggested tabs:', error);
      statusStore.setError('Failed to freeze tabs');
    } finally {
      isFreezingSuggested = false;
    }
  }

  function getMemoryColor(level: string): string {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#06b6d4';
    }
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'video': return '🎬';
      case 'webapp': return '💼';
      case 'social': return '💬';
      case 'frozen': return '❄️';
      case 'internal': return '⚙️';
      default: return '🌐';
    }
  }
</script>

<div class="dashboard">
  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon current">📊</div>
      <div class="stat-content">
        <div class="stat-value">{formatMemory($totalMemoryUsage)}</div>
        <div class="stat-label">Current Usage</div>
        <div class="stat-detail">{$tabsStore.length} tabs</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon saved">💾</div>
      <div class="stat-content">
        <div class="stat-value saved-value">{formatMemory($memorySaved)}</div>
        <div class="stat-label">Memory Saved</div>
        <div class="stat-detail">{$frozenTabsCount} frozen</div>
      </div>
    </div>
  </div>

  <!-- 7-Day Summary -->
  <div class="section">
    <h3 class="section-title">Last 7 Days</h3>
    <div class="weekly-stats">
      <span class="weekly-item">
        <span class="weekly-value">{formatMemory(recentSavings.savedMB)}</span> saved
      </span>
      <span class="weekly-divider">•</span>
      <span class="weekly-item">
        <span class="weekly-value">{recentSavings.tabsFrozen}</span> tabs frozen
      </span>
    </div>
  </div>

  <!-- Top Memory Consumers -->
  <div class="section">
    <h3 class="section-title">Top Memory Usage</h3>
    <div class="tab-list">
      {#each topConsumers as tab (tab.id)}
        {@const level = getMemoryLevel(tab.memoryEstimate?.estimatedMB || 0)}
        <div class="tab-item">
          <span class="tab-category">{getCategoryIcon(tab.memoryEstimate?.category || 'standard')}</span>
          <div class="tab-info">
            <div class="tab-title">{tab.title}</div>
            <div class="tab-url">{tab.url}</div>
          </div>
          <div class="tab-memory" style="color: {getMemoryColor(level)}">
            {formatMemory(tab.memoryEstimate?.estimatedMB || 0)}
          </div>
        </div>
      {/each}
      {#if topConsumers.length === 0}
        <div class="empty-state">No active tabs to analyze</div>
      {/if}
    </div>
  </div>

  <!-- Freeze Suggestions -->
  {#if suggestions.length > 0}
    <div class="section">
      <h3 class="section-title">Suggestions</h3>
      <div class="suggestions-list">
        {#each suggestions as suggestion, i}
          <div class="suggestion-card">
            <div class="suggestion-content">
              <div class="suggestion-reason">{suggestion.reason}</div>
              <div class="suggestion-detail">
                {suggestion.tabIds.length} tabs • ~{formatMemory(suggestion.estimatedSavingsMB)} savings
              </div>
            </div>
            <button
              class="freeze-btn"
              on:click={() => freezeSuggestedTabs(suggestion)}
              disabled={isFreezingSuggested}
            >
              🧊 Freeze
            </button>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="section">
      <div class="optimized-state">
        <span class="optimized-icon">✨</span>
        <span>All tabs optimized!</span>
      </div>
    </div>
  {/if}

  <!-- Legend -->
  <div class="legend">
    <span class="legend-item"><span class="dot high"></span> High (&gt;150MB)</span>
    <span class="legend-item"><span class="dot medium"></span> Medium (75-150MB)</span>
    <span class="legend-item"><span class="dot low"></span> Low (30-75MB)</span>
    <span class="legend-item"><span class="dot minimal"></span> Minimal (&lt;30MB)</span>
  </div>
</div>

<style>
  .dashboard {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .stat-card {
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.9));
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .stat-icon {
    font-size: 32px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
  }

  .stat-value.saved-value {
    color: #22c55e;
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-detail {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }

  .section {
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.8));
    border: 1px solid rgba(6, 182, 212, 0.15);
    border-radius: 12px;
    padding: 12px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px 0;
  }

  .weekly-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #e2e8f0;
  }

  .weekly-value {
    font-weight: 700;
    color: #22c55e;
  }

  .weekly-divider {
    color: #475569;
  }

  .tab-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(15, 23, 42, 0.5);
    border-radius: 8px;
    border: 1px solid rgba(6, 182, 212, 0.1);
  }

  .tab-category {
    font-size: 16px;
    flex-shrink: 0;
  }

  .tab-info {
    flex: 1;
    min-width: 0;
  }

  .tab-title {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-url {
    font-size: 10px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-memory {
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .empty-state {
    text-align: center;
    color: #64748b;
    padding: 16px;
    font-size: 13px;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .suggestion-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.1));
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 10px;
  }

  .suggestion-content {
    flex: 1;
  }

  .suggestion-reason {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .suggestion-detail {
    font-size: 11px;
    color: #7dd3fc;
    margin-top: 2px;
  }

  .freeze-btn {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.3));
    border: 1px solid rgba(56, 189, 248, 0.4);
    border-radius: 8px;
    padding: 8px 12px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .freeze-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.5), rgba(14, 165, 233, 0.5));
    transform: translateY(-1px);
  }

  .freeze-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .optimized-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    color: #22c55e;
    font-weight: 600;
  }

  .optimized-icon {
    font-size: 20px;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 8px;
    font-size: 10px;
    color: #64748b;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .dot.high { background: #ef4444; }
  .dot.medium { background: #f59e0b; }
  .dot.low { background: #22c55e; }
  .dot.minimal { background: #06b6d4; }
</style>
