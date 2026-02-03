import type { ObsidianConfig } from '../types';

/**
 * File system service for reading/writing to Obsidian vault
 * Uses Chrome's File System Access API
 */

/**
 * Request permission to access a directory
 */
export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    // @ts-ignore - File System Access API
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    return dirHandle;
  } catch (err) {
    console.error('Directory access denied:', err);
    return null;
  }
}

/**
 * Ensure TabSaver directory exists in vault
 */
export async function ensureTabSaverDirectory(
  vaultHandle: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle> {
  try {
    return await vaultHandle.getDirectoryHandle('TabSaver', { create: true });
  } catch (err) {
    throw new Error(`Failed to create TabSaver directory: ${err}`);
  }
}

/**
 * Write a markdown file to the vault
 */
export async function writeMarkdownFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<void> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (err) {
    throw new Error(`Failed to write file ${filename}: ${err}`);
  }
}

/**
 * Read a markdown file from the vault
 */
export async function readMarkdownFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<string | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err) {
    console.error(`Failed to read file ${filename}:`, err);
    return null;
  }
}

/**
 * List all markdown files in the TabSaver directory
 */
export async function listMarkdownFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<string[]> {
  const files: string[] = [];

  try {
    // @ts-ignore - FileSystemDirectoryHandle is iterable
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        files.push(entry.name);
      }
    }
  } catch (err) {
    console.error('Failed to list files:', err);
  }

  return files;
}

/**
 * Delete a markdown file from the vault
 */
export async function deleteMarkdownFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<boolean> {
  try {
    await dirHandle.removeEntry(filename);
    return true;
  } catch (err) {
    console.error(`Failed to delete file ${filename}:`, err);
    return false;
  }
}

/**
 * Store directory handle in IndexedDB for persistence
 */
export async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openHandleDB();
  const tx = db.transaction('handles', 'readwrite');
  await tx.objectStore('handles').put({ id: 'vault', handle });
  await tx.done;
}

/**
 * Retrieve stored directory handle from IndexedDB
 */
export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB();
    const tx = db.transaction('handles', 'readonly');
    const result = await tx.objectStore('handles').get('vault');

    if (!result?.handle) {
      return null;
    }

    // Verify we still have permission
    const permission = await result.handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      // Try to request permission again
      const requestResult = await result.handle.requestPermission({ mode: 'readwrite' });
      if (requestResult !== 'granted') {
        return null;
      }
    }

    return result.handle;
  } catch (err) {
    console.error('Failed to get stored directory handle:', err);
    return null;
  }
}

/**
 * Open IndexedDB for storing file handles
 */
function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TabSaverHandles', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles', { keyPath: 'id' });
      }
    };
  });
}
