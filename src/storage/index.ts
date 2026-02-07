/**
 * Storage Module
 * Unified storage interface for browser and Node.js environments
 */

import { StorageAdapter, StorageConfig } from './types';
import { BrowserStorageAdapter } from './browser-adapter';
import { NodeStorageAdapter } from './node-adapter';

export * from './types';
export { BrowserStorageAdapter } from './browser-adapter';
export { NodeStorageAdapter } from './node-adapter';

/**
 * Create the appropriate storage adapter for the current environment
 */
export function createStorage(config?: StorageConfig): StorageAdapter {
  if (typeof window !== 'undefined') {
    return new BrowserStorageAdapter(config);
  }
  return new NodeStorageAdapter(config);
}

/**
 * Get the default storage adapter singleton
 */
let defaultStorage: StorageAdapter | null = null;

export function getDefaultStorage(config?: StorageConfig): StorageAdapter {
  if (!defaultStorage) {
    defaultStorage = createStorage(config);
  }
  return defaultStorage;
}

/**
 * Reset the default storage adapter (useful for testing)
 */
export function resetDefaultStorage(): void {
  defaultStorage = null;
}
