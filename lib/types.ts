export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  selected: boolean;
  frozen?: boolean;
  frozenAt?: number;
  memoryEstimate?: MemoryEstimate;
}

export type MemoryCategory = 'video' | 'webapp' | 'social' | 'standard' | 'frozen' | 'internal';

export interface MemoryEstimate {
  tabId: number;
  estimatedMB: number;
  confidence: 'high' | 'medium' | 'low';
  category: MemoryCategory;
}

export interface SavingsRecord {
  date: string;  // YYYY-MM-DD
  tabsFrozen: number;
  estimatedSavedMB: number;
}

export interface SavingsHistory {
  records: SavingsRecord[];
  totalSavedMB: number;
  totalTabsFrozen: number;
}

export interface FreezeSuggestion {
  tabIds: number[];
  reason: string;
  estimatedSavingsMB: number;
}

export interface FrozenTabState {
  tabId: number;
  originalUrl: string;
  title: string;
  favIconUrl: string;
  scrollX: number;
  scrollY: number;
  pinned: boolean;
  windowId: number;
  index: number;
  frozenAt: number;
  groupId?: number;
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

export interface FreezeTabsResponse {
  success: boolean;
  frozenCount?: number;
  skippedCount?: number;
  error?: string;
}

export interface ThawTabsResponse {
  success: boolean;
  thawedCount?: number;
  error?: string;
}