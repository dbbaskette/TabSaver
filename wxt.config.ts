import { defineConfig } from 'wxt';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import os from 'os';

export default defineConfig({
  extensionApi: 'chrome',
  outDir: path.join(os.homedir(), 'Downloads', 'TabSaver-build'),
  manifest: {
    name: 'TabSaver',
    version: '2.1.1',
    description: 'Manage and save your open Chrome tabs to organized bookmark folders',
    permissions: ['tabs', 'bookmarks', 'storage'],
    action: {
      default_popup: 'popup.html'
    }
  },
  vite: () => ({
    plugins: [svelte({
      compilerOptions: {
        compatibility: {
          componentApi: 4
        }
      }
    })],
    build: {
      target: 'es2022'
    }
  })
});