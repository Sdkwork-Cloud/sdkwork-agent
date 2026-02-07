/**
 * Storage Adapter Types
 * Unified storage interface for browser and Node.js environments
 */

export interface StorageAdapter {
  readonly name: string;
  readonly isAvailable: boolean;

  // File operations
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;

  // Directory operations
  listDirectory(path: string): Promise<string[]>;
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;

  // Metadata
  getMetadata(path: string): Promise<FileMetadata | null>;
}

export interface FileMetadata {
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
}

export interface StorageConfig {
  basePath?: string;
  prefix?: string;
}

// Storage factory type
export type StorageAdapterFactory = (config?: StorageConfig) => StorageAdapter;
