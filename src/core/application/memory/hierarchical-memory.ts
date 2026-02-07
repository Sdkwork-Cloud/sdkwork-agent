/**
 * Hierarchical Memory System with Importance Scoring
 * Multi-tier memory architecture inspired by MemGPT and human cognitive memory
 *
 * Architecture:
 * - Core Memory: Critical long-term memories (unlimited, always retained)
 * - Working Memory: Active short-term memories (limited capacity, LRU eviction)
 * - Archive Memory: Infrequently accessed memories (compressed storage)
 *
 * Importance Scoring:
 * - Combines access frequency, recency, and semantic importance
 * - Time-based decay with access-based refresh
 */

import { EventEmitter } from '../../../utils/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import type {
  Memory,
  MemoryType,
  MemorySource,
  MemoryMetadata,
  MemoryEvent,
} from '../../domain/memory';

// ============================================================================
// Memory Tier Types
// ============================================================================

export type MemoryTier = 'core' | 'working' | 'archive';

// ============================================================================
// Memory with Lifecycle
// ============================================================================

export interface HierarchicalMemory extends Memory {
  tier: MemoryTier;
  importance: MemoryImportance;
  lifecycle: MemoryLifecycle;
  compression?: MemoryCompression;
}

export interface MemoryImportance {
  /** Base importance score (0-1) */
  baseScore: number;
  /** Access frequency count */
  accessCount: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** Decay rate (per day) */
  decayRate: number;
  /** Computed importance score */
  computedScore: number;
}

export interface MemoryLifecycle {
  createdAt: number;
  updatedAt: number;
  accessedAt: number[];
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Expiration timestamp */
  expiresAt?: number;
  /** Whether memory is archived */
  isArchived: boolean;
  archivedAt?: number;
}

export interface MemoryCompression {
  /** Whether memory is compressed */
  isCompressed: boolean;
  /** Original content length */
  originalLength: number;
  /** Compressed content length */
  compressedLength: number;
  /** Compression ratio */
  ratio: number;
  /** Summary of compressed content */
  summary?: string;
  /** Key points extracted */
  keyPoints: string[];
}

// ============================================================================
// Hierarchical Memory Config
// ============================================================================

export interface HierarchicalMemoryConfig {
  /** Working memory capacity */
  workingMemoryCapacity: number;
  /** Archive threshold (importance score below this gets archived) */
  archiveThreshold: number;
  /** Default decay rate (per day) */
  defaultDecayRate: number;
  /** Compression threshold (days without access) */
  compressionThreshold: number;
  /** Enable automatic tier management */
  autoTierManagement: boolean;
  /** Enable automatic compression */
  autoCompression: boolean;
}

export const DEFAULT_HIERARCHICAL_CONFIG: HierarchicalMemoryConfig = {
  workingMemoryCapacity: 100,
  archiveThreshold: 0.3,
  defaultDecayRate: 0.1,
  compressionThreshold: 30,
  autoTierManagement: true,
  autoCompression: true,
};

// ============================================================================
// Tier Statistics
// ============================================================================

export interface TierStats {
  tier: MemoryTier;
  count: number;
  avgImportance: number;
  totalSize: number;
  oldestMemory?: number;
  newestMemory?: number;
}

// ============================================================================
// Hierarchical Memory Store
// ============================================================================

export class HierarchicalMemoryStore extends EventEmitter {
  private memories = new Map<string, HierarchicalMemory>();
  private config: HierarchicalMemoryConfig;
  private accessQueue: string[] = []; // LRU queue for working memory

  constructor(config: Partial<HierarchicalMemoryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_HIERARCHICAL_CONFIG, ...config };
  }

  // ============================================================================
  // Memory Storage
  // ============================================================================

  /**
   * Store a new memory with automatic tier assignment
   */
  store(
    content: string,
    type: MemoryType,
    source: MemorySource,
    metadata?: MemoryMetadata,
    initialImportance?: number
  ): HierarchicalMemory {
    const now = Date.now();
    const id = uuidv4();

    // Determine initial tier based on importance
    const baseImportance = initialImportance ?? this.estimateImportance(content, metadata);
    const tier = this.determineInitialTier(baseImportance);

    const memory: HierarchicalMemory = {
      id,
      content,
      type,
      source,
      metadata,
      timestamp: now,
      tier,
      importance: {
        baseScore: baseImportance,
        accessCount: 0,
        lastAccessedAt: now,
        decayRate: this.config.defaultDecayRate,
        computedScore: baseImportance,
      },
      lifecycle: {
        createdAt: now,
        updatedAt: now,
        accessedAt: [now],
        isArchived: tier === 'archive',
        archivedAt: tier === 'archive' ? now : undefined,
      },
    };

    this.memories.set(id, memory);

    // Add to access queue if working memory
    if (tier === 'working') {
      this.accessQueue.push(id);
      this.enforceWorkingMemoryCapacity();
    }

    // Emit event
    this.emit('memory:stored', {
      type: 'stored',
      memoryId: id,
      timestamp: now,
      metadata: { tier, importance: baseImportance },
    } as MemoryEvent);

    return memory;
  }

  /**
   * Store batch memories
   */
  storeBatch(
    items: Array<{
      content: string;
      type: MemoryType;
      source: MemorySource;
      metadata?: MemoryMetadata;
      importance?: number;
    }>
  ): HierarchicalMemory[] {
    return items.map(item =>
      this.store(item.content, item.type, item.source, item.metadata, item.importance)
    );
  }

  // ============================================================================
  // Memory Retrieval
  // ============================================================================

  /**
   * Retrieve memory by ID with access tracking
   */
  retrieve(id: string): HierarchicalMemory | undefined {
    const memory = this.memories.get(id);
    if (!memory) return undefined;

    // Update access statistics
    this.updateAccessStats(memory);

    // Promote from archive if accessed
    if (memory.tier === 'archive' && this.config.autoTierManagement) {
      this.promoteToWorking(memory);
    }

    // Decompress if needed
    if (memory.compression?.isCompressed && this.config.autoCompression) {
      this.decompress(memory);
    }

    this.emit('memory:retrieved', {
      type: 'retrieved',
      memoryId: id,
      timestamp: Date.now(),
    } as MemoryEvent);

    return memory;
  }

  /**
   * Get memories by tier
   */
  getByTier(tier: MemoryTier): HierarchicalMemory[] {
    return Array.from(this.memories.values())
      .filter(m => m.tier === tier)
      .sort((a, b) => b.importance.computedScore - a.importance.computedScore);
  }

  /**
   * Get working memory (most important active memories)
   */
  getWorkingMemory(): HierarchicalMemory[] {
    return this.getByTier('working');
  }

  /**
   * Get core memory (critical long-term memories)
   */
  getCoreMemory(): HierarchicalMemory[] {
    return this.getByTier('core');
  }

  /**
   * Get archived memories
   */
  getArchivedMemory(): HierarchicalMemory[] {
    return this.getByTier('archive');
  }

  // ============================================================================
  // Importance Scoring
  // ============================================================================

  /**
   * Calculate importance score using multiple factors
   *
   * Formula: importance = base * (1 + log(accessCount + 1)) * decayFactor
   */
  calculateImportance(memory: HierarchicalMemory): number {
    const now = Date.now();
    const daysSinceAccess = (now - memory.importance.lastAccessedAt) / (1000 * 60 * 60 * 24);

    // Decay factor: exponential decay based on time
    const decayFactor = Math.exp(-memory.importance.decayRate * daysSinceAccess);

    // Access frequency boost: logarithmic to prevent spam from dominating
    const accessBoost = 1 + Math.log(memory.importance.accessCount + 1) * 0.1;

    // Compute final importance
    const importance = memory.importance.baseScore * accessBoost * decayFactor;

    return Math.max(0, Math.min(1, importance));
  }

  /**
   * Update importance scores for all memories
   */
  updateAllImportance(): void {
    for (const memory of this.memories.values()) {
      memory.importance.computedScore = this.calculateImportance(memory);
    }
  }

  /**
   * Estimate initial importance based on content analysis
   */
  private estimateImportance(content: string, metadata?: MemoryMetadata): number {
    let importance = 0.5; // Base importance

    // Length factor: longer content often more important
    const lengthFactor = Math.min(content.length / 1000, 1) * 0.1;
    importance += lengthFactor;

    // Keyword importance
    const importantKeywords = ['critical', 'important', 'key', 'essential', 'must', 'always'];
    const keywordMatches = importantKeywords.filter(kw =>
      content.toLowerCase().includes(kw)
    ).length;
    importance += keywordMatches * 0.05;

    // Source importance
    if (metadata?.category === 'critical') importance += 0.2;
    if (metadata?.tags?.includes('important')) importance += 0.1;

    return Math.min(1, importance);
  }

  // ============================================================================
  // Tier Management
  // ============================================================================

  /**
   * Determine initial tier based on importance
   */
  private determineInitialTier(importance: number): MemoryTier {
    if (importance >= 0.8) return 'core';
    if (importance >= this.config.archiveThreshold) return 'working';
    return 'archive';
  }

  /**
   * Promote memory to working tier
   */
  private promoteToWorking(memory: HierarchicalMemory): void {
    if (memory.tier === 'working') return;

    memory.tier = 'working';
    memory.lifecycle.isArchived = false;
    memory.lifecycle.archivedAt = undefined;
    memory.lifecycle.updatedAt = Date.now();

    this.accessQueue.push(memory.id);
    this.enforceWorkingMemoryCapacity();

    this.emit('memory:promoted', {
      type: 'stored',
      memoryId: memory.id,
      timestamp: Date.now(),
      metadata: { fromTier: 'archive', toTier: 'working' },
    } as MemoryEvent);
  }

  /**
   * Demote memory to archive tier
   */
  private demoteToArchive(memory: HierarchicalMemory): void {
    if (memory.tier === 'archive') return;

    // Save original tier for event
    const fromTier = memory.tier;

    // Compress before archiving
    if (this.config.autoCompression && !memory.compression?.isCompressed) {
      this.compress(memory);
    }

    memory.tier = 'archive';
    memory.lifecycle.isArchived = true;
    memory.lifecycle.archivedAt = Date.now();
    memory.lifecycle.updatedAt = Date.now();

    // Remove from access queue
    const index = this.accessQueue.indexOf(memory.id);
    if (index !== -1) {
      this.accessQueue.splice(index, 1);
    }

    this.emit('memory:archived', {
      type: 'stored',
      memoryId: memory.id,
      timestamp: Date.now(),
      metadata: { fromTier, toTier: 'archive' },
    } as MemoryEvent);
  }

  /**
   * Enforce working memory capacity (LRU eviction)
   */
  private enforceWorkingMemoryCapacity(): void {
    const workingMemories = Array.from(this.memories.values())
      .filter(m => m.tier === 'working');

    if (workingMemories.length > this.config.workingMemoryCapacity) {
      // Sort by last accessed time (oldest first)
      workingMemories.sort((a, b) =>
        a.importance.lastAccessedAt - b.importance.lastAccessedAt
      );

      // Demote oldest to archive
      const toDemote = workingMemories.slice(0, workingMemories.length - this.config.workingMemoryCapacity);
      for (const memory of toDemote) {
        this.demoteToArchive(memory);
      }
    }
  }

  /**
   * Run automatic tier management
   */
  runTierManagement(): void {
    if (!this.config.autoTierManagement) return;

    this.updateAllImportance();

    for (const memory of this.memories.values()) {
      const importance = memory.importance.computedScore;

      // Promote high-importance archived memories
      if (memory.tier === 'archive' && importance > 0.6) {
        this.promoteToWorking(memory);
      }

      // Demote low-importance working memories
      if (memory.tier === 'working' && importance < this.config.archiveThreshold) {
        this.demoteToArchive(memory);
      }
    }
  }

  // ============================================================================
  // Compression
  // ============================================================================

  /**
   * Compress memory content
   */
  private compress(memory: HierarchicalMemory): void {
    if (memory.compression?.isCompressed) return;

    const originalLength = memory.content.length;

    // Simple compression: extract key sentences
    const sentences = memory.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keySentences = sentences.slice(0, Math.max(1, Math.floor(sentences.length * 0.3)));
    const compressedContent = keySentences.join('. ') + '.';

    const compressedLength = compressedContent.length;

    memory.compression = {
      isCompressed: true,
      originalLength,
      compressedLength,
      ratio: compressedLength / originalLength,
      summary: this.generateSummary(memory.content),
      keyPoints: this.extractKeyPoints(memory.content),
    };

    // Store compressed content (in real implementation, replace content)
    // memory.content = compressedContent;
  }

  /**
   * Decompress memory content
   */
  private decompress(memory: HierarchicalMemory): void {
    if (!memory.compression?.isCompressed) return;

    // In real implementation, restore original content
    memory.compression.isCompressed = false;
  }

  /**
   * Generate summary of content
   */
  private generateSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return '';

    // Return first sentence as summary
    return sentences[0].trim();
  }

  /**
   * Extract key points from content
   */
  private extractKeyPoints(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints: string[] = [];

    // Extract sentences with important keywords
    const importantKeywords = ['important', 'key', 'critical', 'essential', 'main'];
    for (const sentence of sentences) {
      if (importantKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
        keyPoints.push(sentence.trim());
      }
    }

    // If no key points found, take first 3 sentences
    if (keyPoints.length === 0) {
      keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()));
    }

    return keyPoints.slice(0, 5);
  }

  // ============================================================================
  // Access Tracking
  // ============================================================================

  private updateAccessStats(memory: HierarchicalMemory): void {
    const now = Date.now();

    memory.importance.accessCount++;
    memory.importance.lastAccessedAt = now;
    memory.lifecycle.accessedAt.push(now);

    // Keep only last 100 access times
    if (memory.lifecycle.accessedAt.length > 100) {
      memory.lifecycle.accessedAt = memory.lifecycle.accessedAt.slice(-100);
    }

    // Update computed importance
    memory.importance.computedScore = this.calculateImportance(memory);

    // Update LRU queue
    const index = this.accessQueue.indexOf(memory.id);
    if (index !== -1) {
      this.accessQueue.splice(index, 1);
    }
    this.accessQueue.push(memory.id);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  getStats(): {
    total: number;
    byTier: Record<MemoryTier, number>;
    avgImportance: number;
    tierStats: TierStats[];
  } {
    const byTier: Record<MemoryTier, number> = { core: 0, working: 0, archive: 0 };
    let totalImportance = 0;
    const tierStats: TierStats[] = [];

    for (const tier of ['core', 'working', 'archive'] as MemoryTier[]) {
      const memories = this.getByTier(tier);
      byTier[tier] = memories.length;

      const totalSize = memories.reduce((sum, m) => sum + m.content.length, 0);
      const avgImportance = memories.length > 0
        ? memories.reduce((sum, m) => sum + m.importance.computedScore, 0) / memories.length
        : 0;

      totalImportance += memories.reduce((sum, m) => sum + m.importance.computedScore, 0);

      tierStats.push({
        tier,
        count: memories.length,
        avgImportance,
        totalSize,
        oldestMemory: memories.length > 0
          ? Math.min(...memories.map(m => m.lifecycle.createdAt))
          : undefined,
        newestMemory: memories.length > 0
          ? Math.max(...memories.map(m => m.lifecycle.createdAt))
          : undefined,
      });
    }

    return {
      total: this.memories.size,
      byTier,
      avgImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
      tierStats,
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up expired memories
   */
  cleanup(): number {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, memory] of this.memories) {
      if (memory.lifecycle.expiresAt && memory.lifecycle.expiresAt < now) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.memories.delete(id);
    }

    return toDelete.length;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
    this.accessQueue = [];
  }

  // ============================================================================
  // Serialization / Deserialization
  // ============================================================================

  /**
   * Serialize all memories to JSON
   */
  serialize(): string {
    const data = {
      memories: Array.from(this.memories.entries()),
      accessQueue: this.accessQueue,
      config: this.config,
    };
    return JSON.stringify(data);
  }

  /**
   * Deserialize memories from JSON
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json) as {
        memories: [string, HierarchicalMemory][];
        accessQueue: string[];
        config: HierarchicalMemoryConfig;
      };

      this.memories = new Map(data.memories);
      this.accessQueue = data.accessQueue;
      this.config = { ...this.config, ...data.config };
    } catch (error) {
      throw new Error(`Failed to deserialize memories: ${error}`);
    }
  }

  /**
   * Export memories to plain object
   */
  toJSON(): object {
    return {
      memories: Array.from(this.memories.entries()),
      accessQueue: this.accessQueue,
      config: this.config,
      stats: this.getStats(),
    };
  }

  /**
   * Import memories from plain object
   */
  fromJSON(data: {
    memories: [string, HierarchicalMemory][];
    accessQueue: string[];
    config?: HierarchicalMemoryConfig;
  }): void {
    this.memories = new Map(data.memories);
    this.accessQueue = data.accessQueue;
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHierarchicalMemoryStore(
  config?: Partial<HierarchicalMemoryConfig>
): HierarchicalMemoryStore {
  return new HierarchicalMemoryStore(config);
}
