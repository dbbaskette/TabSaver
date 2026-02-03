import type { MemoryEstimate, MemoryCategory, SavingsHistory, SavingsRecord, FreezeSuggestion, Tab } from './types';

// Domain patterns for memory estimation
const VIDEO_DOMAINS = ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'hulu.com', 'disneyplus.com', 'primevideo.com', 'hbomax.com', 'peacocktv.com', 'dailymotion.com'];
const WEBAPP_DOMAINS = ['docs.google.com', 'sheets.google.com', 'slides.google.com', 'drive.google.com', 'notion.so', 'figma.com', 'miro.com', 'airtable.com', 'monday.com', 'asana.com', 'trello.com', 'jira.atlassian.com', 'confluence.atlassian.com', 'office.com', 'outlook.com'];
const SOCIAL_DOMAINS = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'tiktok.com', 'discord.com', 'slack.com', 'teams.microsoft.com', 'whatsapp.com', 'messenger.com'];

// Memory estimates by category (in MB)
const MEMORY_ESTIMATES: Record<MemoryCategory, { base: number; variance: number }> = {
  video: { base: 280, variance: 120 },      // 160-400 MB
  webapp: { base: 95, variance: 55 },       // 40-150 MB
  social: { base: 120, variance: 60 },      // 60-180 MB
  standard: { base: 45, variance: 25 },     // 20-70 MB
  frozen: { base: 3, variance: 1 },         // 2-4 MB (minimal placeholder)
  internal: { base: 15, variance: 5 },      // 10-20 MB (chrome:// pages)
};

/**
 * Get the domain from a URL
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Determine the memory category for a tab based on its URL
 */
function getMemoryCategory(url: string, isFrozen: boolean): MemoryCategory {
  if (isFrozen || url.includes('frozen.html')) {
    return 'frozen';
  }

  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return 'internal';
  }

  const domain = getDomain(url);

  if (VIDEO_DOMAINS.some(d => domain.includes(d))) {
    return 'video';
  }

  if (WEBAPP_DOMAINS.some(d => domain.includes(d))) {
    return 'webapp';
  }

  if (SOCIAL_DOMAINS.some(d => domain.includes(d))) {
    return 'social';
  }

  return 'standard';
}

/**
 * Estimate memory usage for a single tab
 */
export function estimateTabMemory(tab: { id: number; url: string; frozen?: boolean }): MemoryEstimate {
  const category = getMemoryCategory(tab.url || '', tab.frozen || false);
  const { base, variance } = MEMORY_ESTIMATES[category];

  // Add some pseudo-random variance based on tabId for consistency
  const varianceFactor = ((tab.id % 100) / 100) * 2 - 1; // -1 to 1
  const estimatedMB = Math.round(base + (variance * varianceFactor));

  // Confidence based on category
  const confidence: 'high' | 'medium' | 'low' =
    category === 'frozen' || category === 'internal' ? 'high' :
    category === 'video' || category === 'webapp' ? 'medium' : 'low';

  return {
    tabId: tab.id,
    estimatedMB,
    confidence,
    category,
  };
}

/**
 * Estimate total memory for multiple tabs
 */
export function estimateTotalMemory(tabs: Array<{ id: number; url: string; frozen?: boolean }>): number {
  return tabs.reduce((total, tab) => total + estimateTabMemory(tab).estimatedMB, 0);
}

/**
 * Calculate memory saved by frozen tabs
 */
export function calculateSavedMemory(tabs: Array<{ id: number; url: string; frozen?: boolean }>, frozenTabs: Record<number, { originalUrl: string }>): number {
  let savedMB = 0;

  for (const tab of tabs) {
    if (tab.frozen && frozenTabs[tab.id]) {
      // Calculate what the tab would have used if not frozen
      const originalEstimate = estimateTabMemory({
        id: tab.id,
        url: frozenTabs[tab.id].originalUrl,
        frozen: false,
      });
      // Subtract the frozen placeholder memory
      const frozenEstimate = estimateTabMemory(tab);
      savedMB += originalEstimate.estimatedMB - frozenEstimate.estimatedMB;
    }
  }

  return savedMB;
}

/**
 * Get memory level indicator (for color coding)
 */
export function getMemoryLevel(estimatedMB: number): 'high' | 'medium' | 'low' | 'minimal' {
  if (estimatedMB >= 150) return 'high';
  if (estimatedMB >= 75) return 'medium';
  if (estimatedMB >= 30) return 'low';
  return 'minimal';
}

/**
 * Format memory size for display
 */
export function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

/**
 * Generate freeze suggestions based on tab analysis
 */
export function generateFreezeSuggestions(tabs: Tab[], frozenTabs: Record<number, unknown>): FreezeSuggestion[] {
  const suggestions: FreezeSuggestion[] = [];
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  // Get unfrozen tabs with memory estimates
  const unfrozenTabs = tabs.filter(t => !t.frozen && !frozenTabs[t.id]);

  // Suggestion 1: High memory tabs (> 100 MB estimated)
  const highMemoryTabs = unfrozenTabs
    .filter(t => t.memoryEstimate && t.memoryEstimate.estimatedMB > 100)
    .slice(0, 5);

  if (highMemoryTabs.length > 0) {
    const totalSavings = highMemoryTabs.reduce(
      (sum, t) => sum + (t.memoryEstimate?.estimatedMB || 0) - 3, // Subtract frozen placeholder cost
      0
    );
    suggestions.push({
      tabIds: highMemoryTabs.map(t => t.id),
      reason: 'High memory usage tabs',
      estimatedSavingsMB: totalSavings,
    });
  }

  // Suggestion 2: Video/streaming tabs
  const videoTabs = unfrozenTabs
    .filter(t => t.memoryEstimate?.category === 'video')
    .slice(0, 3);

  if (videoTabs.length > 0) {
    const totalSavings = videoTabs.reduce(
      (sum, t) => sum + (t.memoryEstimate?.estimatedMB || 0) - 3,
      0
    );
    suggestions.push({
      tabIds: videoTabs.map(t => t.id),
      reason: 'Video/streaming tabs use significant memory',
      estimatedSavingsMB: totalSavings,
    });
  }

  // Suggestion 3: Social media tabs
  const socialTabs = unfrozenTabs
    .filter(t => t.memoryEstimate?.category === 'social')
    .slice(0, 5);

  if (socialTabs.length >= 2) {
    const totalSavings = socialTabs.reduce(
      (sum, t) => sum + (t.memoryEstimate?.estimatedMB || 0) - 3,
      0
    );
    suggestions.push({
      tabIds: socialTabs.map(t => t.id),
      reason: 'Social media tabs often run background processes',
      estimatedSavingsMB: totalSavings,
    });
  }

  return suggestions;
}

/**
 * Load savings history from storage
 */
export async function loadSavingsHistory(): Promise<SavingsHistory> {
  const { savingsHistory } = await chrome.storage.local.get('savingsHistory');
  return savingsHistory || { records: [], totalSavedMB: 0, totalTabsFrozen: 0 };
}

/**
 * Record a freeze event in history
 */
export async function recordFreeze(tabCount: number, savedMB: number): Promise<void> {
  const history = await loadSavingsHistory();
  const today = new Date().toISOString().split('T')[0];

  // Find or create today's record
  let todayRecord = history.records.find(r => r.date === today);
  if (todayRecord) {
    todayRecord.tabsFrozen += tabCount;
    todayRecord.estimatedSavedMB += savedMB;
  } else {
    history.records.push({
      date: today,
      tabsFrozen: tabCount,
      estimatedSavedMB: savedMB,
    });
  }

  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  history.records = history.records.filter(r => r.date >= cutoffDate);

  // Update totals
  history.totalSavedMB += savedMB;
  history.totalTabsFrozen += tabCount;

  await chrome.storage.local.set({ savingsHistory: history });
}

/**
 * Get savings for the last N days
 */
export function getRecentSavings(history: SavingsHistory, days: number): { savedMB: number; tabsFrozen: number } {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const recentRecords = history.records.filter(r => r.date >= cutoff);

  return {
    savedMB: recentRecords.reduce((sum, r) => sum + r.estimatedSavedMB, 0),
    tabsFrozen: recentRecords.reduce((sum, r) => sum + r.tabsFrozen, 0),
  };
}
