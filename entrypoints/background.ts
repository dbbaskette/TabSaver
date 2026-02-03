import type { Tab } from './background/types';
import type { FrozenTabState } from '../lib/types';

export default defineBackground(() => {
  console.log('TabSaver extension installed');

  // --- Freeze/Thaw Utilities ---

  /**
   * Check if a tab can be frozen
   */
  function canFreezeTab(tab: chrome.tabs.Tab): { canFreeze: boolean; reason?: string } {
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
      return { canFreeze: false, reason: 'Cannot freeze internal Chrome pages' };
    }
    if (tab.audible) {
      return { canFreeze: false, reason: 'Cannot freeze tabs playing audio' };
    }
    if (tab.url?.includes('frozen.html')) {
      return { canFreeze: false, reason: 'Tab is already frozen' };
    }
    if (!tab.url) {
      return { canFreeze: false, reason: 'Tab has no URL' };
    }
    return { canFreeze: true };
  }

  /**
   * Get all frozen tabs from storage
   */
  async function getFrozenTabs(): Promise<Record<number, FrozenTabState>> {
    const { frozenTabs = {} } = await chrome.storage.local.get('frozenTabs');
    return frozenTabs;
  }

  /**
   * Save frozen tab state to storage
   */
  async function saveFrozenTab(state: FrozenTabState): Promise<void> {
    const frozenTabs = await getFrozenTabs();
    frozenTabs[state.tabId] = state;
    await chrome.storage.local.set({ frozenTabs });
  }

  /**
   * Remove frozen tab state from storage
   */
  async function removeFrozenTab(tabId: number): Promise<void> {
    const frozenTabs = await getFrozenTabs();
    delete frozenTabs[tabId];
    await chrome.storage.local.set({ frozenTabs });
  }

  /**
   * Recursive helper to find the "Other Bookmarks" folder.
   */
  function findOtherBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): chrome.bookmarks.BookmarkTreeNode | null {
    for (const node of nodes) {
      if (node.title === 'Other Bookmarks' || node.title === 'Other bookmarks') {
        return node;
      }
      if (node.children) {
        const found = findOtherBookmarks(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Promisified wrapper to get the "Other Bookmarks" node.
   */
  async function getOtherBookmarksNode(): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
    const tree = await chrome.bookmarks.getTree();
    return findOtherBookmarks(tree);
  }

  /**
   * Create a bookmark folder.
   */
  async function createBookmarkFolder(parentId: string, title: string): Promise<chrome.bookmarks.BookmarkTreeNode> {
    return chrome.bookmarks.create({ parentId, title });
  }

  /**
   * Create a bookmark item.
   */
  async function createBookmarkItem(parentId: string, title: string, url: string): Promise<chrome.bookmarks.BookmarkTreeNode> {
    return chrome.bookmarks.create({ parentId, title, url });
  }

  /**
   * Generate a standardized folder name with timestamp.
   */
  function generateFolderName(customName: string = ''): string {
    const now = new Date();
    // Format: YYYY-MM-DD HH:MM
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}${minutes}`;

    if (customName?.trim()) {
      const sanitized = customName.trim().replace(/[<>:"/\\|?*]/g, '');
      return `${sanitized} ${timestamp}`;
    }

    return `Tabs ${timestamp}`;
  }

  // --- Message Handlers ---

  async function handleSaveTabsToBookmarks(request: any) {
    const { tabs, customFolderName } = request;

    if (!tabs?.length) {
      throw new Error('No tabs provided');
    }

    const otherBookmarks = await getOtherBookmarksNode();
    if (!otherBookmarks) {
      throw new Error('Could not find "Other Bookmarks" folder');
    }

    const folderName = generateFolderName(customFolderName);
    const newFolder = await createBookmarkFolder(otherBookmarks.id, folderName);
    const results = [];

    for (const tab of tabs) {
      try {
        if (tab.url && tab.url.startsWith('chrome://')) {
          results.push({
            tabId: tab.id,
            ok: false,
            error: 'Cannot bookmark internal Chrome pages',
            title: tab.title,
            url: tab.url
          });
          continue;
        }

        const bookmark = await createBookmarkItem(
          newFolder.id,
          tab.title || tab.url,
          tab.url
        );

        results.push({
          tabId: tab.id,
          ok: true,
          title: tab.title,
          url: tab.url,
          bookmarkId: bookmark.id
        });
      } catch (error) {
        results.push({
          tabId: tab.id,
          ok: false,
          error: (error as Error).message,
          title: tab.title,
          url: tab.url
        });
      }
    }

    return {
      success: true,
      results,
      folderName,
      folderId: newFolder.id
    };
  }

  /**
   * Freeze selected tabs - replace with lightweight placeholder
   */
  async function handleFreezeTabs(request: { tabIds: number[] }) {
    const { tabIds } = request;

    if (!tabIds?.length) {
      throw new Error('No tabs provided');
    }

    let frozenCount = 0;
    let skippedCount = 0;
    const skippedReasons: string[] = [];

    for (const tabId of tabIds) {
      try {
        const tab = await chrome.tabs.get(tabId);
        const { canFreeze, reason } = canFreezeTab(tab);

        if (!canFreeze) {
          skippedCount++;
          if (reason) skippedReasons.push(`${tab.title}: ${reason}`);
          continue;
        }

        // Capture scroll position via scripting
        let scrollX = 0;
        let scrollY = 0;
        try {
          const [result] = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => ({ scrollX: window.scrollX, scrollY: window.scrollY }),
          });
          scrollX = result?.result?.scrollX || 0;
          scrollY = result?.result?.scrollY || 0;
        } catch {
          // Scripting may fail on some pages, that's ok
        }

        // Build frozen state
        const frozenState: FrozenTabState = {
          tabId,
          originalUrl: tab.url || '',
          title: tab.title || '',
          favIconUrl: tab.favIconUrl || '',
          scrollX,
          scrollY,
          pinned: tab.pinned || false,
          windowId: tab.windowId,
          index: tab.index,
          frozenAt: Date.now(),
          groupId: tab.groupId,
        };

        // Save state to storage
        await saveFrozenTab(frozenState);

        // Build frozen page URL
        const params = new URLSearchParams({
          url: frozenState.originalUrl,
          title: frozenState.title,
          favicon: frozenState.favIconUrl,
          tabId: tabId.toString(),
          scrollX: scrollX.toString(),
          scrollY: scrollY.toString(),
        });
        const frozenUrl = chrome.runtime.getURL(`frozen.html?${params.toString()}`);

        // Navigate tab to frozen page
        await chrome.tabs.update(tabId, { url: frozenUrl });
        frozenCount++;
      } catch (error) {
        console.error(`Failed to freeze tab ${tabId}:`, error);
        skippedCount++;
      }
    }

    return {
      success: true,
      frozenCount,
      skippedCount,
      skippedReasons,
    };
  }

  /**
   * Thaw a frozen tab - restore original URL
   */
  async function handleThawTab(request: { tabId: number; originalUrl: string; scrollX?: number; scrollY?: number }) {
    const { tabId, originalUrl, scrollX = 0, scrollY = 0 } = request;

    if (!tabId || !originalUrl) {
      throw new Error('Missing tabId or originalUrl');
    }

    // Navigate back to original URL
    await chrome.tabs.update(tabId, { url: originalUrl });

    // Remove from frozen tabs storage
    await removeFrozenTab(tabId);

    // Wait for page load, then restore scroll position
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Restore scroll position after a short delay
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId },
            func: (x: number, y: number) => {
              window.scrollTo(x, y);
            },
            args: [scrollX, scrollY],
          }).catch(() => {
            // Scripting may fail on some pages
          });
        }, 300);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Clean up listener after 30 seconds in case page never loads
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
    }, 30000);

    return { success: true };
  }

  /**
   * Thaw multiple tabs
   */
  async function handleThawTabs(request: { tabIds: number[] }) {
    const { tabIds } = request;

    if (!tabIds?.length) {
      throw new Error('No tabs provided');
    }

    const frozenTabs = await getFrozenTabs();
    let thawedCount = 0;

    for (const tabId of tabIds) {
      const state = frozenTabs[tabId];
      if (state) {
        try {
          await handleThawTab({
            tabId,
            originalUrl: state.originalUrl,
            scrollX: state.scrollX,
            scrollY: state.scrollY,
          });
          thawedCount++;
        } catch (error) {
          console.error(`Failed to thaw tab ${tabId}:`, error);
        }
      }
    }

    return { success: true, thawedCount };
  }

  /**
   * Get all frozen tabs state
   */
  async function handleGetFrozenTabs() {
    const frozenTabs = await getFrozenTabs();
    return { success: true, frozenTabs };
  }

  // --- Main Message Listener ---

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Helper to execute async handlers and send standardized response
    const execute = async (action: () => Promise<any> | any) => {
      try {
        const result = await action();
        sendResponse(result);
      } catch (err) {
        sendResponse({ success: false, error: (err as Error).message });
      }
    };

    switch (request.action) {
      case 'getTabs':
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          sendResponse({ tabs });
        });
        return true;

      case 'saveTabsToBookmarks':
        execute(() => handleSaveTabsToBookmarks(request));
        return true;

      case 'freezeTabs':
        execute(() => handleFreezeTabs(request));
        return true;

      case 'thawTab':
        execute(() => handleThawTab(request));
        return true;

      case 'thawTabs':
        execute(() => handleThawTabs(request));
        return true;

      case 'getFrozenTabs':
        execute(() => handleGetFrozenTabs());
        return true;

      default:
        // Allow other listeners to handle unknown actions
        return false;
    }
  });

  // Log startup (don't clear storage as it contains frozen tabs state)
  chrome.runtime.onStartup.addListener(() => {
    console.log('TabSaver: Extension started');
  });
});