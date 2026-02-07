/**
 * Browser Storage Adapter
 * Uses IndexedDB for file-like storage and fetch for remote resources
 */

import { StorageAdapter, FileMetadata, StorageConfig } from './types';

interface IndexedDBFile {
  path: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
  size: number;
}

export class BrowserStorageAdapter implements StorageAdapter {
  readonly name = 'browser';
  readonly isAvailable = typeof window !== 'undefined';
  
  private dbName: string;
  private dbVersion = 1;
  private storeName = 'files';
  private db: IDBDatabase | null = null;

  constructor(config: StorageConfig = {}) {
    this.dbName = config.prefix ? `${config.prefix}_agent_storage` : 'agent_storage';
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'path' });
          store.createIndex('path', 'path', { unique: true });
        }
      };
    });
  }

  async readFile(path: string): Promise<string | null> {
    try {
      // Try local storage first
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(path);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const file = request.result as IndexedDBFile | undefined;
          resolve(file ? file.content : null);
        };
      });
    } catch {
      // Fallback to fetch for remote resources
      try {
        const response = await fetch(path);
        if (!response.ok) return null;
        return await response.text();
      } catch {
        return null;
      }
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const db = await this.getDB();
    const file: IndexedDBFile = {
      path,
      content,
      createdAt: new Date(),
      modifiedAt: new Date(),
      size: new Blob([content]).size,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(file);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(path);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.count(path);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result > 0);
      });
    } catch {
      return false;
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const files = request.result as IndexedDBFile[];
          const filtered = files
            .filter(file => file.path.startsWith(path))
            .map(file => file.path.replace(path, '').replace(/^\//, ''))
            .filter(name => !name.includes('/'));
          resolve(filtered);
        };
      });
    } catch {
      return [];
    }
  }

  async createDirectory(path: string): Promise<void> {
    // In IndexedDB, directories are implicit from file paths
    // We create a placeholder file to mark the directory
    await this.writeFile(`${path}/.directory`, '');
  }

  async deleteDirectory(path: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const files = request.result as IndexedDBFile[];
          const toDelete = files.filter(file => file.path.startsWith(path));
          
          Promise.all(toDelete.map(file => 
            new Promise<void>((res, rej) => {
              const delReq = store.delete(file.path);
              delReq.onerror = () => rej(delReq.error);
              delReq.onsuccess = () => res();
            })
          )).then(() => resolve()).catch(reject);
        };
      });
    } catch {
      // Ignore errors
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(path);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const file = request.result as IndexedDBFile | undefined;
          if (!file) {
            resolve(null);
            return;
          }
          
          resolve({
            path: file.path,
            size: file.size,
            createdAt: file.createdAt,
            modifiedAt: file.modifiedAt,
            isDirectory: path.endsWith('/.directory') || path.endsWith('/'),
          });
        };
      });
    } catch {
      return null;
    }
  }
}