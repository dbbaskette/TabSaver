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

      // Sort by date (newest first) and limit to 10
      folders.sort((a, b) => b.dateAdded - a.dateAdded);
      resolve(folders.slice(0, 10));
    });
  });
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