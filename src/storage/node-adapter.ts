/**
 * Node.js Storage Adapter
 *
 * 专为 Node.js 环境设计的存储适配器
 * 使用原生 fs 模块进行文件操作
 *
 * @adapter Storage
 * @version 2.0.0
 * @architecture Node.js Native Only
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageAdapter, FileMetadata, StorageConfig } from './types';

export class NodeStorageAdapter implements StorageAdapter {
  readonly name = 'node';
  readonly isAvailable = true; // 始终可用，因为是 Node.js 专用

  constructor(private config: StorageConfig = {}) {}

  private resolvePath(filePath: string): string {
    if (this.config.basePath) {
      return path.join(this.config.basePath, filePath);
    }
    return filePath;
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      return await fs.readFile(resolvedPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);

    // 确保目录存在
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(resolvedPath, content, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await fs.unlink(resolvedPath);
    } catch {
      // 忽略错误
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      return entries.filter(e => e.isFile()).map(e => e.name);
    } catch {
      return [];
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      await fs.mkdir(resolvedPath, { recursive: true });
    } catch {
      // 忽略错误
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      await fs.rm(resolvedPath, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  }

  async getMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const resolvedPath = this.resolvePath(filePath);
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

  /**
   * 读取文件为 Buffer
   */
  async readFileBuffer(filePath: string): Promise<Buffer | null> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      return await fs.readFile(resolvedPath);
    } catch {
      return null;
    }
  }

  /**
   * 写入 Buffer 到文件
   */
  async writeFileBuffer(filePath: string, content: Buffer): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(resolvedPath, content);
  }

  /**
   * 追加内容到文件
   */
  async appendFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    await fs.appendFile(resolvedPath, content, 'utf-8');
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const resolvedSource = this.resolvePath(sourcePath);
    const resolvedDest = this.resolvePath(destPath);
    await fs.copyFile(resolvedSource, resolvedDest);
  }

  /**
   * 移动文件
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const resolvedSource = this.resolvePath(sourcePath);
    const resolvedDest = this.resolvePath(destPath);
    await fs.rename(resolvedSource, resolvedDest);
  }

  /**
   * 获取文件状态
   */
  async stat(filePath: string): Promise<{
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    createdAt: Date;
    modifiedAt: Date;
    accessedAt: Date;
  } | null> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      const stats = await fs.stat(resolvedPath);

      return {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        accessedAt: stats.atime,
      };
    } catch {
      return null;
    }
  }

  /**
   * 递归列出目录中的所有文件
   */
  async walkDirectory(dirPath: string): Promise<string[]> {
    const resolvedPath = this.resolvePath(dirPath);
    const files: string[] = [];

    const walk = async (currentPath: string, prefix: string = '') => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await walk(fullPath, relativePath);
          } else {
            files.push(relativePath);
          }
        }
      } catch {
        // 忽略错误
      }
    };

    await walk(resolvedPath);
    return files;
  }

  /**
   * 监听文件变化
   */
  watch(
    filePath: string,
    callback: (event: 'change' | 'rename', filename: string) => void
  ): { close: () => void } {
    const resolvedPath = this.resolvePath(filePath);
    
    // Node.js fs.watch returns an async iterator in newer versions
    const ac = new AbortController();
    const { signal } = ac;
    
    (async () => {
      try {
        const watcher = fs.watch(resolvedPath, { signal });
        for await (const event of watcher) {
          callback(event.eventType as 'change' | 'rename', event.filename || '');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          throw err;
        }
      }
    })();

    return {
      close: () => ac.abort(),
    };
  }
}
