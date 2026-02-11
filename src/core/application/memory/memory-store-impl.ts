/**
 * Memory Store Implementation
 * Multi-dimensional memory with semantic and full-text search
 * Reference: OpenClaw Memory System
 */

import { EventEmitter } from '../../../utils/event-emitter.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  Memory,
  MemoryStore,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryType,
  MemorySource,
  EmbeddingProvider,
  VectorStore,
  MemoryEvent,
} from '../../domain/memory.js';

// ============================================================================
// In-Memory Vector Store Implementation
// ============================================================================

class InMemoryVectorStore implements VectorStore {
  private vectors = new Map<string, { embedding: number[]; metadata?: Record<string, unknown> }>();

  async add(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void> {
    this.vectors.set(id, { embedding, metadata });
  }

  async search(query: number[], limit: number): Promise<Array<{ id: string; score: number }>> {
    const results: Array<{ id: string; score: number }> = [];

    for (const [id, { embedding }] of this.vectors) {
      const similarity = this.cosineSimilarity(query, embedding);
      results.push({ id, score: similarity });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  async clear(): Promise<void> {
    this.vectors.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ============================================================================
// Simple Embedding Provider (Fallback)
// ============================================================================

class SimpleEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension = 384) {
    this.dimension = dimension;
  }

  async embed(text: string): Promise<number[]> {
    // Simple hash-based embedding for demonstration
    // In production, use a proper embedding model
    const embedding: number[] = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % this.dimension] += charCode / 1000;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return embedding.map(val => val / norm);
    }

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }
}

// ============================================================================
// Memory Store Implementation
// ============================================================================

export interface MemoryStoreConfig {
  embeddingProvider?: EmbeddingProvider;
  vectorStore?: VectorStore;
  enableFullTextSearch?: boolean;
  defaultSearchLimit?: number;
  defaultThreshold?: number;
}

export class MemoryStoreImpl extends EventEmitter implements MemoryStore {
  private memories = new Map<string, Memory>();
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private config: Required<MemoryStoreConfig>;

  constructor(config: MemoryStoreConfig = {}) {
    super();
    this.config = {
      embeddingProvider: config.embeddingProvider ?? new SimpleEmbeddingProvider(),
      vectorStore: config.vectorStore ?? new InMemoryVectorStore(),
      enableFullTextSearch: config.enableFullTextSearch ?? true,
      defaultSearchLimit: config.defaultSearchLimit ?? 10,
      defaultThreshold: config.defaultThreshold ?? 0.7,
    };
    this.vectorStore = this.config.vectorStore;
    this.embeddingProvider = this.config.embeddingProvider;
  }

  // ============================================================================
  // Storage Operations
  // ============================================================================

  async store(memory: Memory): Promise<void> {
    const memoryWithId = memory.id ? memory : { ...memory, id: uuidv4() };
    
    // Generate embedding if not provided
    if (!memoryWithId.embedding) {
      memoryWithId.embedding = await this.embeddingProvider.embed(memoryWithId.content);
    }

    // Store in memory map
    this.memories.set(memoryWithId.id, memoryWithId);

    // Store in vector store
    await this.vectorStore.add(
      memoryWithId.id,
      memoryWithId.embedding,
      memoryWithId.metadata
    );

    // Emit event
    this.emit('memory:stored', {
      type: 'stored',
      memoryId: memoryWithId.id,
      timestamp: Date.now(),
    } as MemoryEvent);
  }

  async storeBatch(memories: Memory[]): Promise<void> {
    const memoriesWithEmbeddings = await Promise.all(
      memories.map(async (memory) => {
        const memoryWithId = memory.id ? memory : { ...memory, id: uuidv4() };
        if (!memoryWithId.embedding) {
          memoryWithId.embedding = await this.embeddingProvider.embed(memoryWithId.content);
        }
        return memoryWithId;
      })
    );

    // Store all memories
    for (const memory of memoriesWithEmbeddings) {
      this.memories.set(memory.id, memory);
      await this.vectorStore.add(memory.id, memory.embedding!, memory.metadata);
    }

    // Emit event
    this.emit('memory:stored', {
      type: 'stored',
      timestamp: Date.now(),
      metadata: { batchSize: memories.length },
    } as MemoryEvent);
  }

  // ============================================================================
  // Retrieval Operations
  // ============================================================================

  async retrieve(id: string): Promise<Memory | undefined> {
    const memory = this.memories.get(id);
    
    if (memory) {
      this.emit('memory:retrieved', {
        type: 'retrieved',
        memoryId: id,
        timestamp: Date.now(),
      } as MemoryEvent);
    }

    return memory;
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const limit = query.limit ?? this.config.defaultSearchLimit;

    // Semantic search
    if (query.content) {
      const semanticResults = await this.semanticSearch(query.content, limit);
      results.push(...semanticResults);
    }

    // Full-text search
    if (this.config.enableFullTextSearch && query.content) {
      const textResults = await this.fullTextSearch(query.content, limit);
      
      // Merge results, avoiding duplicates
      const existingIds = new Set(results.map(r => r.memory.id));
      for (const result of textResults) {
        if (!existingIds.has(result.memory.id)) {
          results.push(result);
        }
      }
    }

    // Apply filters
    let filteredResults = results;
    if (query.filters) {
      filteredResults = this.applyFilters(results, query.filters);
    }

    // Apply type filter
    if (query.type) {
      filteredResults = filteredResults.filter(r => r.memory.type === query.type);
    }

    // Apply source filter
    if (query.source) {
      filteredResults = filteredResults.filter(r => r.memory.source === query.source);
    }

    // Apply session filter
    if (query.sessionId) {
      filteredResults = filteredResults.filter(
        r => r.memory.metadata?.sessionId === query.sessionId
      );
    }

    // Sort by score and limit
    const sortedResults = filteredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Emit event
    this.emit('memory:searched', {
      type: 'searched',
      timestamp: Date.now(),
      metadata: { query: query.content, resultCount: sortedResults.length },
    } as MemoryEvent);

    return sortedResults;
  }

  async semanticSearch(query: string, limit?: number): Promise<MemorySearchResult[]> {
    const searchLimit = limit ?? this.config.defaultSearchLimit;
    const queryEmbedding = await this.embeddingProvider.embed(query);
    
    const vectorResults = await this.vectorStore.search(queryEmbedding, searchLimit);
    
    const results: MemorySearchResult[] = [];
    for (const { id, score } of vectorResults) {
      const memory = this.memories.get(id);
      if (memory && score >= this.config.defaultThreshold) {
        results.push({
          memory,
          score,
          relevance: score,
        });
      }
    }

    return results;
  }

  async fullTextSearch(query: string, limit?: number): Promise<MemorySearchResult[]> {
    const searchLimit = limit ?? this.config.defaultSearchLimit;
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);
    
    const results: MemorySearchResult[] = [];
    
    for (const memory of this.memories.values()) {
      const contentLower = memory.content.toLowerCase();
      
      // Calculate match score based on term frequency
      let matchCount = 0;
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        const score = matchCount / queryTerms.length;
        if (score >= this.config.defaultThreshold) {
          results.push({
            memory,
            score,
            relevance: score,
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, searchLimit);
  }

  // ============================================================================
  // Deletion Operations
  // ============================================================================

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
    await this.vectorStore.delete(id);

    this.emit('memory:deleted', {
      type: 'deleted',
      memoryId: id,
      timestamp: Date.now(),
    } as MemoryEvent);
  }

  async deleteBySession(sessionId: string): Promise<void> {
    const toDelete: string[] = [];
    
    for (const [id, memory] of this.memories) {
      if (memory.metadata?.sessionId === sessionId) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.memories.clear();
    await this.vectorStore.clear();

    this.emit('memory:deleted', {
      type: 'deleted',
      timestamp: Date.now(),
      metadata: { cleared: true },
    } as MemoryEvent);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async count(): Promise<number> {
    return this.memories.size;
  }

  async getStats(): Promise<MemoryStats> {
    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
    };

    const bySource: Record<MemorySource, number> = {
      conversation: 0,
      document: 0,
      system: 0,
      user: 0,
    };

    let oldestTimestamp: number | undefined;
    let newestTimestamp: number | undefined;

    for (const memory of this.memories.values()) {
      byType[memory.type]++;
      bySource[memory.source]++;

      if (oldestTimestamp === undefined || memory.timestamp < oldestTimestamp) {
        oldestTimestamp = memory.timestamp;
      }
      if (newestTimestamp === undefined || memory.timestamp > newestTimestamp) {
        newestTimestamp = memory.timestamp;
      }
    }

    return {
      totalCount: this.memories.size,
      byType,
      bySource,
      oldestTimestamp,
      newestTimestamp,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private applyFilters(
    results: MemorySearchResult[],
    filters: NonNullable<MemoryQuery['filters']>
  ): MemorySearchResult[] {
    return results.filter(({ memory }) => {
      if (filters.startTime && memory.timestamp < filters.startTime) {
        return false;
      }
      if (filters.endTime && memory.timestamp > filters.endTime) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        const memoryTags = memory.metadata?.tags ?? [];
        if (!filters.tags.some(tag => memoryTags.includes(tag))) {
          return false;
        }
      }
      if (filters.category && memory.metadata?.category !== filters.category) {
        return false;
      }
      if (filters.sourcePath && memory.metadata?.sourcePath !== filters.sourcePath) {
        return false;
      }
      return true;
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMemoryStore(config?: MemoryStoreConfig): MemoryStoreImpl {
  return new MemoryStoreImpl(config);
}

export { InMemoryVectorStore, SimpleEmbeddingProvider };
