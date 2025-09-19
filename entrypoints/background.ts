export default defineBackground(() => {
  console.log('TabSaver extension installed');

  // Helper function to find "Other Bookmarks" folder
  async function findOtherBookmarksFolder() {
    return new Promise<chrome.bookmarks.BookmarkTreeNode | null>((resolve) => {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
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
        const otherBookmarks = findOtherBookmarks(bookmarkTreeNodes);
        resolve(otherBookmarks);
      });
    });
  }

  // Helper function to create timestamp-based folder name
  function createFolderName(customName = '') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timestamp = `${year}-${month}-${day} ${hours}${minutes}`;

    if (customName && customName.trim()) {
      const sanitized = customName.trim().replace(/[<>:"/\\|?*]/g, '');
      return `${sanitized} ${timestamp}`;
    }

    return `Tabs ${timestamp}`;
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabs') {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        sendResponse({ tabs: tabs });
      });
      return true;
    }

    if (request.action === 'saveTabsToBookmarks') {
      (async () => {
        try {
          const { tabs, customFolderName } = request;

          if (!tabs || tabs.length === 0) {
            sendResponse({ success: false, error: 'No tabs provided' });
            return;
          }

          const otherBookmarks = await findOtherBookmarksFolder();
          if (!otherBookmarks) {
            sendResponse({ success: false, error: 'Could not find Other Bookmarks folder' });
            return;
          }

          const folderName = createFolderName(customFolderName);
          const newFolder = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve, reject) => {
            chrome.bookmarks.create({
              parentId: otherBookmarks.id,
              title: folderName
            }, (folder) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(folder!);
              }
            });
          });

          const results = [];
          for (const tab of tabs) {
            try {
              if (tab.url && tab.url.startsWith('chrome://')) {
                results.push({
                  tabId: tab.id,
                  ok: false,
                  error: 'Chrome internal pages cannot be bookmarked',
                  title: tab.title,
                  url: tab.url
                });
                continue;
              }

              const bookmark = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve, reject) => {
                chrome.bookmarks.create({
                  parentId: newFolder.id,
                  title: tab.title || tab.url,
                  url: tab.url
                }, (bookmark) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(bookmark!);
                  }
                });
              });

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

          sendResponse({
            success: true,
            results,
            folderName,
            folderId: newFolder.id
          });
        } catch (err) {
          sendResponse({ success: false, error: (err as Error).message || err?.toString() });
        }
      })();
      return true;
    }
  });

  // Clean up storage on startup
  chrome.runtime.onStartup.addListener(async () => {
    await chrome.storage.local.clear();
    console.log('TabSaver: Cleaned up storage');
  });
});