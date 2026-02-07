/**
 * Node.js Storage Adapter
 * Uses native fs module for file operations
 */

import { StorageAdapter, FileMetadata, StorageConfig } from './types';

export class NodeStorageAdapter implements StorageAdapter {
  readonly name = 'node';
  readonly isAvailable = typeof window === 'undefined';

  constructor(private config: StorageConfig = {}) {}

  private resolvePath(path: string): string {
    if (this.config.basePath) {
      return `${this.config.basePath}/${path}`.replace(/\/+/g, '/');
    }
    return path;
  }

  async readFile(path: string): Promise<string | null> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      return await fs.readFile(resolvedPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    const resolvedPath = this.resolvePath(path);
    
    // Ensure directory exists
    const dir = resolvedPath.substring(0, resolvedPath.lastIndexOf('/'));
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    await fs.writeFile(resolvedPath, content, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      await fs.unlink(resolvedPath);
    } catch {
      // Ignore errors
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      return entries.filter(e => e.isFile()).map(e => e.name);
    } catch {
      return [];
    }
  }

  async createDirectory(path: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      await fs.mkdir(resolvedPath, { recursive: true });
    } catch {
      // Ignore errors
    }
  }

  async deleteDirectory(path: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      await fs.rm(resolvedPath, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const fs = await import('fs/promises');
      const resolvedPath = this.resolvePath(path);
      const stats = await fs.stat(resolvedPath);
      
      return {
        path: resolvedPath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch {
      return null;
    }
  }
}
