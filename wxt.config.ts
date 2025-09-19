import { defineConfig } from 'wxt';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'TabSaver',
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