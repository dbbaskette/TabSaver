import type { Tab } from './background/types';

export default defineBackground(() => {
  console.log('TabSaver extension installed');

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

      default:
        // Allow other listeners to handle unknown actions
        return false;
    }
  });

  // Clean up storage on startup
  chrome.runtime.onStartup.addListener(async () => {
    await chrome.storage.local.clear();
    console.log('TabSaver: Cleaned up storage');
  });
});