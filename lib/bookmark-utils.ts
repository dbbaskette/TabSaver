import type { Tab } from './types';

export interface BookmarkFolder {
  id: string;
  title: string;
  dateAdded: number;
  parentId: string;
  children?: BookmarkFolder[];
}

export interface RecentBookmarkFolder {
  id: string;
  title: string;
  dateAdded: number;
  tabCount: number;
}

export interface DedupeStats {
  scanned: number;
  removed: number;
  foldersRemoved: number;
}

/**
 * Get recent TabSaver bookmark folders
 */
export async function getRecentTabSaverFolders(): Promise<RecentBookmarkFolder[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const folders: RecentBookmarkFolder[] = [];

      function findTabSaverFolders(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
        for (const node of nodes) {
          if (node.title === 'Other Bookmarks' || node.title === 'Other bookmarks') {
            if (node.children) {
              for (const child of node.children) {
                if (child.title && (
                  child.title.startsWith('Tabs ') ||
                  child.title.includes(' 20') // Contains year pattern
                )) {
                  folders.push({
                    id: child.id,
                    title: child.title,
                    dateAdded: child.dateAdded || 0,
                    tabCount: child.children?.length || 0
                  });
                }
              }
            }
          }
          if (node.children) {
            findTabSaverFolders(node.children);
          }
        }
      }

      findTabSaverFolders(tree);

      // Sort by date (newest first)
      folders.sort((a, b) => b.dateAdded - a.dateAdded);
      resolve(folders);
    });
  });
}

/**
 * Deduplicate bookmarks across TabSaver folders
 * Keeps the newest version of a bookmark and removes older duplicates
 */
export async function deduplicateBookmarks(
  onProgress?: (message: string, percentage: number) => void
): Promise<DedupeStats> {
  // Initial delay for UX
  if (onProgress) onProgress('Initializing...', 0);
  await new Promise(r => setTimeout(r, 500));

  const folders = await getRecentTabSaverFolders();
  const urlMap = new Map<string, chrome.bookmarks.BookmarkTreeNode[]>();
  let scannedCount = 0;
  let removedCount = 0;
  let foldersRemoved = 0;

  if (onProgress) onProgress(`Found ${folders.length} archive folders`, 5);
  await new Promise(r => setTimeout(r, 500));

  // 1. Scan all folders (0-50% progress)
  const progressPerFolder = 45 / Math.max(folders.length, 1);

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const currentProgress = 5 + (i * progressPerFolder);

    if (onProgress) onProgress(`Scanning ${folder.title}...`, currentProgress);
    await new Promise(r => setTimeout(r, 50)); // Reduced delay for speed since we might scan many

    const children = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) => {
      chrome.bookmarks.getChildren(folder.id, resolve);
    });

    for (const node of children) {
      if (node.url) {
        scannedCount++;
        const current = urlMap.get(node.url) || [];
        current.push(node);
        urlMap.set(node.url, current);
      }
    }
  }

  // Analyzing phase
  if (onProgress) onProgress(`Analyzing ${scannedCount} bookmarks...`, 50);
  await new Promise(r => setTimeout(r, 800));

  // 2. Identify and remove duplicates (50-90% progress)
  let processedUrls = 0;
  const totalUniqueUrls = urlMap.size;
  const progressPerUrl = 40 / Math.max(totalUniqueUrls, 1);

  for (const [url, nodes] of urlMap.entries()) {
    processedUrls++;

    if (processedUrls % 10 === 0 || processedUrls === totalUniqueUrls) {
      const currentProgress = 50 + (processedUrls * progressPerUrl);
      if (onProgress) onProgress(
        nodes.length > 1 ? `Found duplicates for ${new URL(url).hostname}...` : 'Checking...',
        currentProgress
      );
    }

    if (nodes.length > 1) {
      nodes.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      const toRemove = nodes.slice(1);

      for (const node of toRemove) {
        await new Promise<void>((resolve) => {
          chrome.bookmarks.remove(node.id, () => resolve());
        });
        removedCount++;
      }
    }
  }

  // 3. Clean up empty folders (90-100% progress)
  if (onProgress) onProgress('Cleaning up empty folders...', 90);

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const children = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) => {
      chrome.bookmarks.getChildren(folder.id, resolve);
    });

    if (children.length === 0) {
      if (onProgress) onProgress(`Removing empty folder: ${folder.title}`, 90 + (i / folders.length) * 10);
      await new Promise<void>((resolve) => {
        chrome.bookmarks.remove(folder.id, () => resolve());
      });
      foldersRemoved++;
      await new Promise(r => setTimeout(r, 50));
    }
  }

  if (onProgress) onProgress('Finalizing...', 100);
  await new Promise(r => setTimeout(r, 500));

  return { scanned: scannedCount, removed: removedCount, foldersRemoved };
}

/**
 * Generate smart folder name suggestions based on selected tabs
 */
export function generateSmartFolderNames(tabs: Tab[]): string[] {
  const suggestions: Set<string> = new Set();

  // Get unique domains
  const domains = tabs
    .map(tab => {
      try {
        const url = new URL(tab.url);
        return url.hostname.replace('www.', '');
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  const uniqueDomains = [...new Set(domains)];

  // Single domain suggestion
  if (uniqueDomains.length === 1) {
    const domain = uniqueDomains[0];
    const siteName = domain.split('.')[0];
    suggestions.add(siteName.charAt(0).toUpperCase() + siteName.slice(1) + ' Research');
    suggestions.add(siteName.charAt(0).toUpperCase() + siteName.slice(1) + ' Pages');
  }

  // Multiple domains - suggest by category
  if (uniqueDomains.length > 1) {
    const hasGithub = domains.some(d => d.includes('github'));
    const hasStackOverflow = domains.some(d => d.includes('stackoverflow'));
    const hasReddit = domains.some(d => d.includes('reddit'));
    const hasYoutube = domains.some(d => d.includes('youtube'));
    const hasTwitter = domains.some(d => d.includes('twitter') || d.includes('x.com'));
    const hasLinkedIn = domains.some(d => d.includes('linkedin'));

    if (hasGithub && hasStackOverflow) {
      suggestions.add('Development Research');
      suggestions.add('Coding Project');
    }

    if (hasReddit || hasTwitter) {
      suggestions.add('Social Research');
    }

    if (hasYoutube) {
      suggestions.add('Video Research');
      suggestions.add('Learning Materials');
    }

    if (hasLinkedIn) {
      suggestions.add('Professional Research');
    }

    // Generic suggestions
    suggestions.add('Research Session');
    suggestions.add('Web Research');
  }

  // Time-based suggestions
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 17) {
    suggestions.add('Work Session');
  } else if (hour >= 18 && hour <= 23) {
    suggestions.add('Evening Reading');
  }

  // Tab count based suggestions
  if (tabs.length >= 10) {
    suggestions.add('Deep Dive Research');
    suggestions.add('Extensive Reading');
  }

  return Array.from(suggestions).slice(0, 5);
}

/**
 * Open all bookmarks in a folder
 */
export async function openBookmarkFolder(folderId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(folderId, (bookmarks) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const urls = bookmarks
        .filter(bookmark => bookmark.url)
        .map(bookmark => bookmark.url!);

      // Open tabs in batches to avoid overwhelming the browser
      const batchSize = 5;
      let index = 0;

      function openBatch() {
        const batch = urls.slice(index, index + batchSize);
        batch.forEach((url, i) => {
          setTimeout(() => {
            chrome.tabs.create({ url, active: false });
          }, i * 100); // Small delay between tabs
        });

        index += batchSize;
        if (index < urls.length) {
          setTimeout(openBatch, 500); // Delay between batches
        } else {
          resolve();
        }
      }

      if (urls.length > 0) {
        openBatch();
      } else {
        resolve();
      }
    });
  });
}