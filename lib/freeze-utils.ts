import type { FrozenTabState } from './types';

/**
 * Check if a tab can be frozen
 */
export function canFreezeTab(tab: chrome.tabs.Tab): { canFreeze: boolean; reason?: string } {
  // Skip chrome:// and chrome-extension:// URLs
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    return { canFreeze: false, reason: 'Cannot freeze internal Chrome pages' };
  }

  // Skip tabs playing audio
  if (tab.audible) {
    return { canFreeze: false, reason: 'Cannot freeze tabs playing audio' };
  }

  // Skip already frozen tabs
  if (isFrozenTab(tab)) {
    return { canFreeze: false, reason: 'Tab is already frozen' };
  }

  // Skip tabs without a URL
  if (!tab.url) {
    return { canFreeze: false, reason: 'Tab has no URL' };
  }

  return { canFreeze: true };
}

/**
 * Check if a tab is currently frozen (by checking URL)
 */
export function isFrozenTab(tab: chrome.tabs.Tab | { url?: string }): boolean {
  return tab.url?.includes('frozen.html') ?? false;
}

/**
 * Get the frozen page URL with encoded state
 */
export function getFrozenPageUrl(state: FrozenTabState): string {
  const params = new URLSearchParams({
    url: state.originalUrl,
    title: state.title,
    favicon: state.favIconUrl || '',
    tabId: state.tabId.toString(),
    scrollX: state.scrollX.toString(),
    scrollY: state.scrollY.toString(),
  });

  return chrome.runtime.getURL(`frozen.html?${params.toString()}`);
}

/**
 * Parse frozen tab state from URL parameters
 */
export function parseFrozenState(url: string): Partial<FrozenTabState> | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      originalUrl: params.get('url') || '',
      title: params.get('title') || '',
      favIconUrl: params.get('favicon') || '',
      tabId: parseInt(params.get('tabId') || '0', 10),
      scrollX: parseInt(params.get('scrollX') || '0', 10),
      scrollY: parseInt(params.get('scrollY') || '0', 10),
    };
  } catch {
    return null;
  }
}

/**
 * Get all frozen tabs from storage
 */
export async function getFrozenTabs(): Promise<Record<number, FrozenTabState>> {
  const { frozenTabs = {} } = await chrome.storage.local.get('frozenTabs');
  return frozenTabs;
}

/**
 * Save frozen tab state to storage
 */
export async function saveFrozenTab(state: FrozenTabState): Promise<void> {
  const frozenTabs = await getFrozenTabs();
  frozenTabs[state.tabId] = state;
  await chrome.storage.local.set({ frozenTabs });
}

/**
 * Remove frozen tab state from storage
 */
export async function removeFrozenTab(tabId: number): Promise<void> {
  const frozenTabs = await getFrozenTabs();
  delete frozenTabs[tabId];
  await chrome.storage.local.set({ frozenTabs });
}

/**
 * Get frozen tab count
 */
export async function getFrozenTabCount(): Promise<number> {
  const frozenTabs = await getFrozenTabs();
  return Object.keys(frozenTabs).length;
}
