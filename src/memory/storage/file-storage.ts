/**
 * 文件存储适配器
 * 
 * 特点：
 * - 本地文件持久化
 * - JSON/Binary格式支持
 * - 自动备份与恢复
 * - 适合长期记忆存储
 * 
 * @module FileStorage
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  StorageAdapter,
  StorageConfig,
  MemoryItem,
  StorageQueryOptions,
  SemanticQueryOptions,
  StorageQueryResult,
  StorageStats,
  BatchOperationResult,
} from './storage-adapter.js';

/**
 * 文件存储配置
 */
export interface FileStorageConfig extends StorageConfig {
  options: {
    /** 数据目录 */
    dataDir: string;
    /** 存储格式 */
    format?: 'json' | 'binary';
    /** 自动保存间隔（毫秒） */
    autoSaveInterval?: number;
    /** 启用备份 */
    enableBackup?: boolean;
    /** 备份保留数量 */
    backupCount?: number;
    /** 写入缓冲大小 */
    writeBufferSize?: number;
    /** 同步写入 */
    syncWrites?: boolean;
  };
}

/**
 * 文件存储适配器
 */
export class FileStorageAdapter extends StorageAdapter {
  private dataDir: string;
  private format: 'json' | 'binary';
  private autoSaveInterval: number;
  private enableBackup: boolean;
  private backupCount: number;
  private syncWrites: boolean;

  private memory = new Map<string, MemoryItem>();
  private dirty = false;
  private autoSaveTimer?: NodeJS.Timeout;
  private writeBuffer: MemoryItem[] = [];
  private writeBufferSize: number;

  constructor(config: FileStorageConfig) {
    super(config);

    const opts = config.options;
    this.dataDir = opts.dataDir;
    this.format = opts.format || 'json';
    this.autoSaveInterval = opts.autoSaveInterval || 30000;
    this.enableBackup = opts.enableBackup ?? true;
    this.backupCount = opts.backupCount || 5;
    this.writeBufferSize = opts.writeBufferSize || 100;
    this.syncWrites = opts.syncWrites ?? false;
  }

  // --------------------------------------------------------------------------
  // 生命周期
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    try {
      // 创建数据目录
      await fs.mkdir(this.dataDir, { recursive: true });

      // 加载已有数据
      await this.loadFromDisk();

      // 启动自动保存
      if (this.autoSaveInterval > 0) {
        this.autoSaveTimer = setInterval(() => {
          this.flush();
        }, this.autoSaveInterval);
      }

      this.initialized = true;
      this.logger.info('File storage initialized', { dataDir: this.dataDir, format: this.format });
    } catch (error) {
      this.logger.error('Failed to initialize file storage', { error: (error as Error).message });
      throw error;
    }
  }

  async close(): Promise<void> {
    // 停止自动保存
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // 刷新缓冲区
    await this.flush();

    this.memory.clear();
    this.initialized = false;
    this.logger.info('File storage closed');
  }

  // --------------------------------------------------------------------------
  // CRUD操作
  // --------------------------------------------------------------------------

  async store(item: MemoryItem): Promise<void> {
    this.memory.set(item.id, item);
    this.dirty = true;
    this.updateStats('add', item);

    // 添加到写入缓冲区
    this.writeBuffer.push(item);
    if (this.writeBuffer.length >= this.writeBufferSize) {
      await this.flush();
    }

    this.emitEvent('item:stored', { id: item.id });
  }

  async storeBatch(items: MemoryItem[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        await this.store(item);
        succeeded.push(item.id);
      } catch (error) {
        failed.push({ id: item.id, error: (error as Error).message });
      }
    }

    return {
      succeeded,
      failed,
      duration: Date.now() - startTime,
    };
  }

  async retrieve(id: string): Promise<MemoryItem | null> {
    const item = this.memory.get(id);
    if (!item) return null;

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();

    return { ...item };
  }

  async retrieveBatch(ids: string[]): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];

    for (const id of ids) {
      const item = await this.retrieve(id);
      if (item) {
        results.push(item);
      }
    }

    return results;
  }

  async query(options: StorageQueryOptions): Promise<StorageQueryResult[]> {
    const {
      tier,
      type,
      tags,
      timeRange,
      importanceThreshold = 0,
      limit = 100,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    let results: StorageQueryResult[] = [];

    for (const item of this.memory.values()) {
      // 层级过滤
      if (tier) {
        const tiers = Array.isArray(tier) ? tier : [tier];
        if (!tiers.includes(item.tier)) continue;
      }

      // 类型过滤
      if (type) {
        const types = Array.isArray(type) ? type : [type];
        if (!types.includes(item.type)) continue;
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        if (!item.metadata.tags?.some(tag => tags.includes(tag))) continue;
      }

      // 时间范围过滤
      if (timeRange) {
        if (timeRange.start && item.createdAt < timeRange.start) continue;
        if (timeRange.end && item.createdAt > timeRange.end) continue;
      }

      // 重要性过滤
      if (item.importance < importanceThreshold) continue;

      // 计算得分
      const score = this.calculateScore(item);

      results.push({
        item: { ...item },
        score,
        importanceScore: item.importance,
        recencyScore: this.calculateRecencyScore(item.createdAt),
      });
    }

    // 排序
    results = this.sortResults(results, sortBy, sortOrder);

    // 分页
    results = results.slice(offset, offset + limit);

    return results;
  }

  async semanticQuery(options: SemanticQueryOptions): Promise<StorageQueryResult[]> {
    const { queryEmbedding, similarityThreshold = 0.7, vectorWeight = 0.7, textWeight = 0.3 } = options;

    // 先获取候选集
    const candidates = await this.query({ ...options, limit: options.limit ? options.limit * 2 : 100 });

    const results: StorageQueryResult[] = [];

    for (const candidate of candidates) {
      const item = this.memory.get(candidate.item.id);
      if (!item || !item.embedding) continue;

      // 计算向量相似度
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);

      if (similarity < similarityThreshold) continue;

      // 融合分数
      const textScore = candidate.score;
      const fusedScore = similarity * vectorWeight + textScore * textWeight;

      results.push({
        item: { ...item },
        score: fusedScore,
        similarityScore: similarity,
        recencyScore: candidate.recencyScore,
        importanceScore: candidate.importanceScore,
      });
    }

    // 按融合分数排序
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, options.limit || 10);
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const item = this.memory.get(id);
    if (!item) return null;

    // 应用更新
    Object.assign(item, updates);
    item.lastAccessed = Date.now();

    this.dirty = true;
    this.emitEvent('item:updated', { id });

    return { ...item };
  }

  async delete(id: string): Promise<boolean> {
    const item = this.memory.get(id);
    if (!item) return false;

    this.memory.delete(id);
    this.dirty = true;
    this.updateStats('remove', item);
    this.emitEvent('item:deleted', { id });

    return true;
  }

  async deleteBatch(ids: string[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const success = await this.delete(id);
      if (success) {
        succeeded.push(id);
      } else {
        failed.push({ id, error: 'Not found' });
      }
    }

    return {
      succeeded,
      failed,
      duration: Date.now() - startTime,
    };
  }

  async deleteByQuery(options: StorageQueryOptions): Promise<number> {
    const toDelete = await this.query(options);
    let count = 0;

    for (const result of toDelete) {
      if (await this.delete(result.item.id)) {
        count++;
      }
    }

    return count;
  }

  // --------------------------------------------------------------------------
  // 管理操作
  // --------------------------------------------------------------------------

  async clear(): Promise<void> {
    const count = this.memory.size;
    this.memory.clear();
    this.dirty = true;

    // 删除数据文件
    try {
      const dataFile = this.getDataFilePath();
      await fs.unlink(dataFile);
    } catch {
      // 文件可能不存在
    }

    this.emitEvent('storage:cleared', { count });
  }

  async flush(): Promise<void> {
    if (!this.dirty && this.writeBuffer.length === 0) return;

    try {
      // 合并缓冲区到内存
      for (const item of this.writeBuffer) {
        this.memory.set(item.id, item);
      }
      this.writeBuffer = [];

      // 创建备份
      if (this.enableBackup) {
        await this.createBackup();
      }

      // 保存到磁盘
      const dataFile = this.getDataFilePath();
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        items: Array.from(this.memory.entries()),
      };

      let content: string | Buffer;
      if (this.format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else {
        // Binary format - simplified
        content = Buffer.from(JSON.stringify(data), 'utf-8');
      }

      if (this.syncWrites) {
        await fs.writeFile(dataFile, content, { flag: 'w' });
      } else {
        await fs.writeFile(dataFile, content);
      }

      this.dirty = false;
      this.emitEvent('storage:flushed', { itemCount: this.memory.size });
    } catch (error) {
      this.logger.error('Failed to flush storage', { error: (error as Error).message });
      throw error;
    }
  }

  async getStats(): Promise<StorageStats> {
    let totalSize = 0;

    for (const item of this.memory.values()) {
      totalSize += JSON.stringify(item).length * 2;
    }

    // 计算各层级和类型的数量
    const tierCounts = { working: 0, short_term: 0, long_term: 0, archival: 0 };
    const typeCounts: Record<string, number> = {};

    for (const item of this.memory.values()) {
      tierCounts[item.tier]++;
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }

    return {
      totalCount: this.memory.size,
      tierCounts,
      typeCounts: typeCounts as Record<string, number>,
      totalSize,
      averageItemSize: this.memory.size > 0 ? totalSize / this.memory.size : 0,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // 检查数据目录可写
      const testFile = path.join(this.dataDir, '.healthcheck');
      await fs.writeFile(testFile, '');
      await fs.unlink(testFile);

      // 检查磁盘空间
      const stats = await fs.statfs?.(this.dataDir).catch(() => null);
      if (stats) {
        const freePercent = (stats.bavail / stats.blocks) * 100;
        if (freePercent < 5) {
          return { healthy: false, message: `Disk space critically low: ${freePercent.toFixed(1)}%` };
        }
        if (freePercent < 10) {
          return { healthy: true, message: `Disk space low: ${freePercent.toFixed(1)}%` };
        }
      }

      return { healthy: true };
    } catch (error) {
      return { healthy: false, message: `Health check failed: ${(error as Error).message}` };
    }
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private async loadFromDisk(): Promise<void> {
    try {
      const dataFile = this.getDataFilePath();
      
      try {
        await fs.access(dataFile);
      } catch {
        // 文件不存在，这是正常的
        return;
      }

      const content = await fs.readFile(dataFile, 'utf-8');
      const data = JSON.parse(content);

      if (data.items && Array.isArray(data.items)) {
        this.memory = new Map(data.items);
        this.logger.info('Loaded data from disk', { count: this.memory.size });
      }
    } catch (error) {
      this.logger.warn('Failed to load data from disk', { error: (error as Error).message });
      // 尝试从备份恢复
      await this.restoreFromBackup();
    }
  }

  private async createBackup(): Promise<void> {
    try {
      const dataFile = this.getDataFilePath();
      const backupDir = path.join(this.dataDir, 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.${this.format}`);

      // 复制当前数据文件
      try {
        await fs.copyFile(dataFile, backupFile);
      } catch {
        // 数据文件可能不存在
        return;
      }

      // 清理旧备份
      const backups = await fs.readdir(backupDir);
      const backupFiles = backups
        .filter(f => f.startsWith('backup-'))
        .map(f => ({ name: f, path: path.join(backupDir, f) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      while (backupFiles.length > this.backupCount) {
        const oldBackup = backupFiles.shift();
        if (oldBackup) {
          await fs.unlink(oldBackup.path).catch(() => {});
        }
      }

      this.logger.debug('Created backup', { file: backupFile });
    } catch (error) {
      this.logger.warn('Failed to create backup', { error: (error as Error).message });
    }
  }

  private async restoreFromBackup(): Promise<void> {
    try {
      const backupDir = path.join(this.dataDir, 'backups');
      
      try {
        await fs.access(backupDir);
      } catch {
        return;
      }

      const backups = await fs.readdir(backupDir);
      const latestBackup = backups
        .filter(f => f.startsWith('backup-'))
        .sort()
        .pop();

      if (!latestBackup) return;

      const backupFile = path.join(backupDir, latestBackup);
      const content = await fs.readFile(backupFile, 'utf-8');
      const data = JSON.parse(content);

      if (data.items && Array.isArray(data.items)) {
        this.memory = new Map(data.items);
        this.logger.info('Restored from backup', { file: latestBackup, count: this.memory.size });
      }
    } catch (error) {
      this.logger.error('Failed to restore from backup', { error: (error as Error).message });
    }
  }

  private getDataFilePath(): string {
    const extension = this.format === 'json' ? 'json' : 'bin';
    return path.join(this.dataDir, `memory.${extension}`);
  }

  private calculateScore(item: MemoryItem): number {
    let score = item.importance * 0.4;

    const age = Date.now() - item.createdAt;
    const recency = Math.exp(-age / (24 * 60 * 60 * 1000));
    score += recency * 0.3;

    const frequency = Math.min(item.accessCount / 100, 1);
    score += frequency * 0.3;

    return score;
  }

  private calculateRecencyScore(timestamp: number): number {
    const age = Date.now() - timestamp;
    return Math.exp(-age / (24 * 60 * 60 * 1000));
  }

  private sortResults(
    results: StorageQueryResult[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): StorageQueryResult[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
          comparison = a.item.createdAt - b.item.createdAt;
          break;
        case 'lastAccessed':
          comparison = a.item.lastAccessed - b.item.lastAccessed;
          break;
        case 'importance':
          comparison = a.item.importance - b.item.importance;
          break;
        case 'accessCount':
          comparison = a.item.accessCount - b.item.accessCount;
          break;
        default:
          comparison = a.score - b.score;
      }

      return comparison * multiplier;
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * 创建文件存储适配器
 */
export function createFileStorage(
  dataDir: string,
  config: Partial<Omit<FileStorageConfig, 'type' | 'options'>> & Partial<FileStorageConfig['options']> = {}
): FileStorageAdapter {
  const { dataDir: _, ...restOptions } = config;
  
  return new FileStorageAdapter({
    type: 'file',
    name: config.name || 'file',
    enabled: config.enabled ?? true,
    priority: config.priority ?? 2,
    options: {
      dataDir,
      format: config.format || 'json',
      autoSaveInterval: config.autoSaveInterval ?? 30000,
      enableBackup: config.enableBackup ?? true,
      backupCount: config.backupCount ?? 5,
      writeBufferSize: config.writeBufferSize ?? 100,
      syncWrites: config.syncWrites ?? false,
    },
    serialization: config.serialization,
    compression: config.compression,
    encryption: config.encryption,
  });
}
