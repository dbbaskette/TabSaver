import { writable, derived } from 'svelte/store';
import type { Tab, Status } from './types';

// Tabs store
export const tabsStore = writable<Tab[]>([]);

// Custom folder name store
export const customFolderNameStore = writable<string>('');

// Refresh trigger for components
export const refreshTrigger = writable<number>(0);

// Status store
function createStatusStore() {
  const { subscribe, set, update } = writable<Status>({
    type: null,
    message: '',
    visible: false
  });

  return {
    subscribe,
    setSuccess: (message: string) => {
      set({ type: 'success', message, visible: true });
      setTimeout(() => update(s => ({ ...s, visible: false })), 3000);
    },
    setError: (message: string) => {
      set({ type: 'error', message, visible: true });
      setTimeout(() => update(s => ({ ...s, visible: false })), 5000);
    },
    setInfo: (message: string) => {
      set({ type: 'info', message, visible: true });
      setTimeout(() => update(s => ({ ...s, visible: false })), 3000);
    },
    hide: () => update(s => ({ ...s, visible: false }))
  };
}

export const statusStore = createStatusStore();

// Derived stores
export const selectedTabs = derived(
  tabsStore,
  $tabs => $tabs.filter(tab => tab.selected)
);

export const selectedTabsCount = derived(
  selectedTabs,
  $selectedTabs => $selectedTabs.length
);

export const allTabsSelected = derived(
  [tabsStore, selectedTabsCount],
  ([$tabs, $selectedCount]) => $tabs.length > 0 && $selectedCount === $tabs.length
);

// Helper functions for tabs store
export const tabsActions = {
  toggleTab: (tabId: number) => {
    tabsStore.update(tabs =>
      tabs.map(tab =>
        tab.id === tabId ? { ...tab, selected: !tab.selected } : tab
      )
    );
  },

  selectAll: () => {
    tabsStore.update(tabs =>
      tabs.map(tab => ({ ...tab, selected: true }))
    );
  },

  unselectAll: () => {
    tabsStore.update(tabs =>
      tabs.map(tab => ({ ...tab, selected: false }))
    );
  },

  toggleSelectAll: () => {
    tabsStore.update(tabs => {
      const allSelected = tabs.every(tab => tab.selected);
      return tabs.map(tab => ({ ...tab, selected: !allSelected }));
    });
  }
};