export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  selected: boolean;
}

export interface BookmarkResult {
  tabId: number;
  ok: boolean;
  title: string;
  url: string;
  error?: string;
  bookmarkId?: string;
}

export interface SaveTabsResponse {
  success: boolean;
  results: BookmarkResult[];
  folderName?: string;
  folderId?: string;
  error?: string;
}

export type StatusType = 'success' | 'error' | 'info' | null;

export interface Status {
  type: StatusType;
  message: string;
  visible: boolean;
}

export interface RecentBookmarkFolder {
  id: string;
  title: string;
  dateAdded: number;
  tabCount: number;
}