/**
 * Agent Memory System
 *
 * Provides hierarchical memory management for intelligent agents.
 * Includes working memory, short-term memory, and long-term memory layers.
 * Compatible with both browser and Node.js environments.
 */

import { BoundedHistory } from '../utils/bounded-cache.js';
import { EmbeddingService } from '../utils/embedding-service.js';

// ============================================
// Types
// ============================================

export interface MemoryEntry<T = unknown> {
  id: string;
  content: T;
  timestamp: number;
  importance: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  tags?: string[];
  startTime?: number;
  endTime?: number;
  minImportance?: number;
  limit?: number;
  semanticQuery?: string; // 语义搜索查询
  metadataFilter?: Record<string, unknown>; // 元数据过滤
}

export interface SemanticSearchResult<T> {
  entries: MemoryEntry<T>[];
  total: number;
  query: string;
  similarities: number[]; // 相似度分数
}

export interface KnowledgeNode {
  id: string;
  content: string;
  type: 'concept' | 'fact' | 'procedure' | 'experience';
  importance: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  relatedNodes: string[]; // 相关节点ID
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphConfig {
  maxNodes: number;
  embeddingDimension: number;
  similarityThreshold: number;
}

export interface MemorySearchResult<T> {
  entries: MemoryEntry<T>[];
  total: number;
  query: MemoryQuery;
}

export interface WorkingMemoryConfig {
  maxEntries: number;
  defaultTTL: number;
}

export interface ShortTermMemoryConfig {
  maxEntries: number;
  compressionThreshold: number;
}

export interface LongTermMemoryConfig {
  storageType: 'memory' | 'indexeddb' | 'localstorage';
  maxEntries: number;
  indexFields: string[];
}

// ============================================
// Working Memory
// ============================================

export class WorkingMemory<T = unknown> {
  private entries = new Map<string, MemoryEntry<T>>();
  private config: WorkingMemoryConfig;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<WorkingMemoryConfig> = {}) {
    this.config = {
      maxEntries: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      ...config,
    };
    this.startCleanup();
  }

  /**
   * Store an entry in working memory
   */
  set(id: string, content: T, options?: {
    ttl?: number;
    importance?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): void {
    // Evict oldest if at capacity
    if (this.entries.size >= this.config.maxEntries && !this.entries.has(id)) {
      this.evictOldest();
    }

    const entry: MemoryEntry<T> = {
      id,
      content,
      timestamp: Date.now(),
      importance: options?.importance ?? 0.5,
      tags: options?.tags ?? [],
      metadata: {
        ...options?.metadata,
        expiresAt: Date.now() + (options?.ttl ?? this.config.defaultTTL),
      },
    };

    this.entries.set(id, entry);
  }

  /**
   * Get an entry from working memory
   */
  get(id: string): T | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;

    // Check expiration
    const expiresAt = entry.metadata?.expiresAt as number;
    if (expiresAt && Date.now() > expiresAt) {
      this.entries.delete(id);
      return undefined;
    }

    return entry.content;
  }

  /**
   * Check if entry exists
   */
  has(id: string): boolean {
    return this.get(id) !== undefined;
  }

  /**
   * Delete an entry
   */
  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Find entries by tags
   */
  findByTags(tags: string[]): MemoryEntry<T>[] {
    const tagSet = new Set(tags);
    return Array.from(this.entries.values()).filter(entry =>
      entry.tags.some(tag => tagSet.has(tag))
    );
  }

  /**
   * Get all entries
   */
  getAll(): MemoryEntry<T>[] {
    this.cleanup();
    return Array.from(this.entries.values());
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get memory stats
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.entries.size,
      maxSize: this.config.maxEntries,
    };
  }

  /**
   * Destroy working memory
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }

  private evictOldest(): void {
    let oldest: MemoryEntry<T> | undefined;
    let oldestTime = Infinity;

    this.entries.forEach((entry) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = entry;
      }
    });

    if (oldest) {
      this.entries.delete(oldest.id);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    this.entries.forEach((entry, id) => {
      const expiresAt = entry.metadata?.expiresAt as number;
      if (expiresAt && now > expiresAt) {
        this.entries.delete(id);
      }
    });
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), 30000); // Every 30s
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// ============================================
// Short Term Memory
// ============================================

export class ShortTermMemory<T = unknown> {
  private history: BoundedHistory<MemoryEntry<T>>;
  private config: ShortTermMemoryConfig;

  constructor(config: Partial<ShortTermMemoryConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      compressionThreshold: 0.8,
      ...config,
    };

    this.history = new BoundedHistory<MemoryEntry<T>>({
      maxSize: this.config.maxEntries,
      enableSummarization: true,
      summarizationThreshold: this.config.compressionThreshold,
    });
  }

  /**
   * Add an entry to short-term memory
   */
  add(content: T, options?: {
    importance?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): string {
    const id = this.generateId();
    const entry: MemoryEntry<T> = {
      id,
      content,
      timestamp: Date.now(),
      importance: options?.importance ?? 0.5,
      tags: options?.tags ?? [],
      metadata: options?.metadata,
    };

    this.history.add(entry);
    return id;
  }

  /**
   * Get recent entries
   */
  getRecent(count: number): MemoryEntry<T>[] {
    return this.history.getRecent(count);
  }

  /**
   * Get entries since a timestamp
   */
  getSince(timestamp: number): MemoryEntry<T>[] {
    return this.history.getSince(timestamp);
  }

  /**
   * Get all entries
   */
  getAll(): MemoryEntry<T>[] {
    return this.history.getAll();
  }

  /**
   * Search entries by query
   */
  search(query: MemoryQuery): MemorySearchResult<T> {
    let entries = this.history.getAll();

    // Filter by time range
    if (query.startTime !== undefined) {
      entries = entries.filter(e => e.timestamp >= query.startTime!);
    }
    if (query.endTime !== undefined) {
      entries = entries.filter(e => e.timestamp <= query.endTime!);
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      entries = entries.filter(e => e.importance >= query.minImportance!);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      const tagSet = new Set(query.tags);
      entries = entries.filter(e => e.tags.some(tag => tagSet.has(tag)));
    }

    const total = entries.length;

    // Apply limit
    if (query.limit !== undefined && query.limit > 0) {
      entries = entries.slice(-query.limit);
    }

    return { entries, total, query };
  }

  /**
   * Get memory size
   */
  size(): number {
    return this.history.size();
  }

  /**
   * Clear memory
   */
  clear(): void {
    this.history.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Long Term Memory
// ============================================

export class LongTermMemory<T = unknown> {
  private storage: Map<string, MemoryEntry<T>> = new Map();
  private index: Map<string, Set<string>> = new Map(); // tag -> ids
  private config: LongTermMemoryConfig;
  private embeddingService?: EmbeddingService;
  private knowledgeNodes: Map<string, KnowledgeNode> = new Map();

  constructor(config: Partial<LongTermMemoryConfig> = {}) {
    this.config = {
      storageType: 'memory',
      maxEntries: 10000,
      indexFields: ['tags', 'timestamp'],
      ...config,
    };
    
    try {
      this.embeddingService = new EmbeddingService();
    } catch (error) {
      console.warn('Embedding service initialization failed:', error);
    }
  }

  /**
   * Store an entry in long-term memory
   */
  async store(id: string, content: T, options?: {
    importance?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const entry: MemoryEntry<T> = {
      id,
      content,
      timestamp: Date.now(),
      importance: options?.importance ?? 0.5,
      tags: options?.tags ?? [],
      metadata: options?.metadata,
    };

    // Store in memory
    this.storage.set(id, entry);

    // Update index
    this.updateIndex(entry);

    // Persist if needed
    if (this.config.storageType !== 'memory') {
      await this.persistEntry(entry);
    }

    // Check capacity
    if (this.storage.size > this.config.maxEntries) {
      await this.evictLeastImportant();
    }
  }

  /**
   * Retrieve an entry
   */
  async retrieve(id: string): Promise<T | undefined> {
    // Try memory first
    const entry = this.storage.get(id);
    if (entry) {
      return entry.content;
    }

    // Try persistent storage
    if (this.config.storageType !== 'memory') {
      const persisted = await this.loadEntry(id);
      if (persisted) {
        this.storage.set(id, persisted);
        return persisted.content;
      }
    }

    return undefined;
  }

  /**
   * Search by tags
   */
  async searchByTags(tags: string[]): Promise<MemoryEntry<T>[]> {
    const results = new Set<string>();

    for (const tag of tags) {
      const ids = this.index.get(tag);
      if (ids) {
        ids.forEach(id => results.add(id));
      }
    }

    return Array.from(results)
      .map(id => this.storage.get(id))
      .filter((e): e is MemoryEntry<T> => e !== undefined)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Semantic search by text
   */
  async semanticSearch(query: string, limit: number = 10): Promise<SemanticSearchResult<T>> {
    if (!this.embeddingService) {
      // Fallback to tag-based search if embedding service is not available
      const entries = this.getAll();
      return {
        entries: entries.slice(0, limit),
        total: entries.length,
        query,
        similarities: entries.slice(0, limit).map(() => 0.5),
      };
    }

    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const results: Array<{ entry: MemoryEntry<T>; similarity: number }> = [];

      // Calculate similarity for each entry
      for (const entry of this.storage.values()) {
        const entryText = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
        const entryEmbedding = await this.embeddingService!.generateEmbedding(entryText);
        const similarity = this.embeddingService!.compareEmbeddings(queryEmbedding, entryEmbedding);
        
        results.push({ entry, similarity });
      }

      // Sort by similarity
      results.sort((a, b) => b.similarity - a.similarity);

      // Apply limit
      const topResults = results.slice(0, limit);

      return {
        entries: topResults.map(r => r.entry),
        total: results.length,
        query,
        similarities: topResults.map(r => r.similarity),
      };
    } catch (error) {
      console.warn('Semantic search failed:', error);
      // Fallback
      const entries = this.getAll();
      return {
        entries: entries.slice(0, limit),
        total: entries.length,
        query,
        similarities: entries.slice(0, limit).map(() => 0.5),
      };
    }
  }

  /**
   * Add knowledge node
   */
  async addKnowledgeNode(node: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const newNode: KnowledgeNode = {
      ...node,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.knowledgeNodes.set(id, newNode);
    
    // Also store as memory entry
    await this.store(id, newNode.content as T, {
      importance: node.importance,
      tags: node.tags,
      metadata: {
        ...node.metadata,
        knowledgeType: node.type,
      },
    });

    return id;
  }

  /**
   * Get knowledge node
   */
  getKnowledgeNode(id: string): KnowledgeNode | undefined {
    return this.knowledgeNodes.get(id);
  }

  /**
   * Update knowledge node
   */
  updateKnowledgeNode(id: string, updates: Partial<Omit<KnowledgeNode, 'id' | 'createdAt'>>): boolean {
    const node = this.knowledgeNodes.get(id);
    if (!node) return false;

    const updatedNode: KnowledgeNode = {
      ...node,
      ...updates,
      updatedAt: Date.now(),
    };

    this.knowledgeNodes.set(id, updatedNode);
    return true;
  }

  /**
   * Get related knowledge nodes
   */
  getRelatedNodes(nodeId: string, limit: number = 5): KnowledgeNode[] {
    const node = this.knowledgeNodes.get(nodeId);
    if (!node) return [];

    return node.relatedNodes
      .map(id => this.knowledgeNodes.get(id))
      .filter((n): n is KnowledgeNode => n !== undefined)
      .slice(0, limit);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all entries
   */
  getAll(): MemoryEntry<T>[] {
    return Array.from(this.storage.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Delete an entry
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.storage.get(id);
    if (!entry) return false;

    // Remove from storage
    this.storage.delete(id);

    // Remove from index
    for (const tag of entry.tags) {
      const ids = this.index.get(tag);
      if (ids) {
        ids.delete(id);
        if (ids.size === 0) {
          this.index.delete(tag);
        }
      }
    }

    // Remove from persistent storage
    if (this.config.storageType !== 'memory') {
      await this.removeFromPersistence(id);
    }

    return true;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.storage.clear();
    this.index.clear();

    if (this.config.storageType !== 'memory') {
      await this.clearPersistence();
    }
  }

  /**
   * Get stats
   */
  getStats(): { size: number; maxSize: number; indexSize: number } {
    return {
      size: this.storage.size,
      maxSize: this.config.maxEntries,
      indexSize: this.index.size,
    };
  }

  private updateIndex(entry: MemoryEntry<T>): void {
    for (const tag of entry.tags) {
      if (!this.index.has(tag)) {
        this.index.set(tag, new Set());
      }
      this.index.get(tag)!.add(entry.id);
    }
  }

  private async evictLeastImportant(): Promise<void> {
    let leastImportant: MemoryEntry<T> | undefined;
    let minImportance = Infinity;

    this.storage.forEach((entry) => {
      if (entry.importance < minImportance) {
        minImportance = entry.importance;
        leastImportant = entry;
      }
    });

    if (leastImportant) {
      await this.delete(leastImportant.id);
    }
  }

  private async persistEntry(entry: MemoryEntry<T>): Promise<void> {
    if (this.config.storageType === 'localstorage' && typeof localStorage !== 'undefined') {
      localStorage.setItem(
        `memory:${entry.id}`,
        JSON.stringify(entry)
      );
    }
    // IndexedDB implementation would go here
  }

  private async loadEntry(id: string): Promise<MemoryEntry<T> | undefined> {
    if (this.config.storageType === 'localstorage' && typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(`memory:${id}`);
      if (data) {
        return JSON.parse(data) as MemoryEntry<T>;
      }
    }
    return undefined;
  }

  private async removeFromPersistence(id: string): Promise<void> {
    if (this.config.storageType === 'localstorage' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(`memory:${id}`);
    }
  }

  private async clearPersistence(): Promise<void> {
    if (this.config.storageType === 'localstorage' && typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('memory:')) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}

// ============================================
// Hierarchical Memory System
// ============================================

export class HierarchicalMemory<T = unknown> {
  workingMemory: WorkingMemory<T>;
  shortTermMemory: ShortTermMemory<T>;
  longTermMemory: LongTermMemory<T>;

  constructor(options?: {
    working?: Partial<WorkingMemoryConfig>;
    shortTerm?: Partial<ShortTermMemoryConfig>;
    longTerm?: Partial<LongTermMemoryConfig>;
  }) {
    this.workingMemory = new WorkingMemory<T>(options?.working);
    this.shortTermMemory = new ShortTermMemory<T>(options?.shortTerm);
    this.longTermMemory = new LongTermMemory<T>(options?.longTerm);
  }

  /**
   * Store in working memory
   */
  setWorking(id: string, content: T, options?: Parameters<WorkingMemory<T>['set']>[2]): void {
    this.workingMemory.set(id, content, options);
  }

  /**
   * Get from working memory
   */
  getWorking(id: string): T | undefined {
    return this.workingMemory.get(id);
  }

  /**
   * Add to short-term memory
   */
  addShortTerm(content: T, options?: Parameters<ShortTermMemory<T>['add']>[1]): string {
    return this.shortTermMemory.add(content, options);
  }

  /**
   * Store in long-term memory
   */
  async storeLongTerm(id: string, content: T, options?: Parameters<LongTermMemory<T>['store']>[2]): Promise<void> {
    await this.longTermMemory.store(id, content, options);
  }

  /**
   * Consolidate short-term to long-term memory
   */
  async consolidate(): Promise<void> {
    const entries = this.shortTermMemory.getAll();
    const importantEntries = entries.filter(e => e.importance > 0.7);

    for (const entry of importantEntries) {
      await this.longTermMemory.store(entry.id, entry.content, {
        importance: entry.importance,
        tags: entry.tags,
        metadata: entry.metadata,
      });
    }

    // Clear consolidated entries from short-term
    // (In a real implementation, we'd be more selective)
  }

  /**
   * Search across all memory layers
   */
  async search(query: MemoryQuery): Promise<{
    working: MemoryEntry<T>[];
    shortTerm: MemoryEntry<T>[];
    longTerm: MemoryEntry<T>[];
  }> {
    const [working, shortTerm, longTerm] = await Promise.all([
      Promise.resolve(this.workingMemory.getAll()),
      Promise.resolve(this.shortTermMemory.search(query).entries),
      this.longTermMemory.searchByTags(query.tags || []),
    ]);

    return { working, shortTerm, longTerm };
  }

  /**
   * Semantic search across all memory layers
   */
  async semanticSearch(query: string, limit: number = 10): Promise<{
    longTerm: SemanticSearchResult<T>;
  }> {
    // 主要在长期记忆中进行语义搜索
    const longTermResults = await this.longTermMemory.semanticSearch(query, limit);

    return { longTerm: longTermResults };
  }

  /**
   * Add knowledge node
   */
  async addKnowledgeNode(node: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.longTermMemory.addKnowledgeNode(node);
  }

  /**
   * Get knowledge node
   */
  getKnowledgeNode(id: string): KnowledgeNode | undefined {
    return this.longTermMemory.getKnowledgeNode(id);
  }

  /**
   * Update knowledge node
   */
  updateKnowledgeNode(id: string, updates: Partial<Omit<KnowledgeNode, 'id' | 'createdAt'>>): boolean {
    return this.longTermMemory.updateKnowledgeNode(id, updates);
  }

  /**
   * Get related knowledge nodes
   */
  getRelatedNodes(nodeId: string, limit: number = 5): KnowledgeNode[] {
    return this.longTermMemory.getRelatedNodes(nodeId, limit);
  }

  /**
   * Intelligent consolidation with knowledge extraction
   */
  async intelligentConsolidation(): Promise<void> {
    const entries = this.shortTermMemory.getAll();
    
    // 提取重要条目并转换为知识节点
    for (const entry of entries) {
      if (entry.importance > 0.7) {
        // 提取知识类型
        let knowledgeType: KnowledgeNode['type'] = 'fact';
        const contentStr = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
        
        // 简单的类型检测
        if (contentStr.includes('步骤') || contentStr.includes('过程') || contentStr.includes('如何')) {
          knowledgeType = 'procedure';
        } else if (contentStr.includes('概念') || contentStr.includes('定义') || contentStr.includes('是什么')) {
          knowledgeType = 'concept';
        } else if (contentStr.includes('经历') || contentStr.includes('体验') || contentStr.includes('记得')) {
          knowledgeType = 'experience';
        }

        // 添加为知识节点
        await this.addKnowledgeNode({
          content: contentStr,
          type: knowledgeType,
          importance: entry.importance,
          tags: entry.tags,
          relatedNodes: [],
          metadata: entry.metadata,
        });
      }
    }
  }

  /**
   * Get stats for all layers
   */
  getStats(): {
    working: ReturnType<WorkingMemory<T>['getStats']>;
    shortTerm: { size: number };
    longTerm: ReturnType<LongTermMemory<T>['getStats']>;
  } {
    return {
      working: this.workingMemory.getStats(),
      shortTerm: { size: this.shortTermMemory.size() },
      longTerm: this.longTermMemory.getStats(),
    };
  }

  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    this.workingMemory.clear();
    this.shortTermMemory.clear();
    await this.longTermMemory.clear();
  }

  /**
   * Destroy all memory
   */
  destroy(): void {
    this.workingMemory.destroy();
    this.shortTermMemory.clear();
    // Long-term memory cleanup is async
  }
}

// Classes are already exported above
