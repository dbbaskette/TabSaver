export interface Tab {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  description?: string;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  tabs: Tab[];
  createdAt: number;
  updatedAt: number;
}

export interface ObsidianConfig {
  vaultPath: string;
  enabled: boolean;
}
