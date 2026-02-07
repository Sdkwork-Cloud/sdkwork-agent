/**
 * Semantic Cache
 *
 * Caches LLM responses based on semantic meaning using vector similarity.
 * Provides intelligent caching that understands query intent, not just exact matches.
 * Compatible with both browser and Node.js environments.
 */

// ============================================
// Types
// ============================================

export interface SemanticCacheConfig {
  similarityThreshold: number;
  maxEntries: number;
  ttl: number;
  vectorDimension: number;
}

export interface SemanticCacheEntry<T> {
  id: string;
  query: string;
  embedding: number[];
  response: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]> | number[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  avgSimilarity: number;
  size: number;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_SEMANTIC_CACHE_CONFIG: SemanticCacheConfig = {
  similarityThreshold: 0.85,
  maxEntries: 1000,
  ttl: 30 * 60 * 1000, // 30 minutes
  vectorDimension: 384, // Default for small embedding models
};

// ============================================
// Simple Embedding Provider (TF-IDF based)
// ============================================

export class SimpleEmbeddingProvider implements EmbeddingProvider {
  private vocabulary = new Map<string, number>();
  private dimension: number;

  constructor(dimension = 384) {
    this.dimension = dimension;
  }

  embed(text: string): number[] {
    const tokens = this.tokenize(text);
    const embedding = new Array(this.dimension).fill(0);

    // Build vocabulary dynamically
    for (const token of tokens) {
      if (!this.vocabulary.has(token)) {
        if (this.vocabulary.size < this.dimension) {
          this.vocabulary.set(token, this.vocabulary.size);
        }
      }
    }

    // Create TF-IDF-like embedding
    const tokenCounts = new Map<string, number>();
    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }

    tokenCounts.forEach((count, token) => {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined && idx < this.dimension) {
        // TF component
        embedding[idx] = count / tokens.length;
      }
    });

    // Normalize
    return this.normalize(embedding);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map((v) => v / magnitude);
  }
}

// ============================================
// Semantic Cache
// ============================================

export class SemanticCache<T> {
  private entries: SemanticCacheEntry<T>[] = [];
  private config: SemanticCacheConfig;
  private embeddingProvider: EmbeddingProvider;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSimilarity: 0,
  };

  constructor(
    embeddingProvider?: EmbeddingProvider,
    config: Partial<SemanticCacheConfig> = {}
  ) {
    this.config = { ...DEFAULT_SEMANTIC_CACHE_CONFIG, ...config };
    this.embeddingProvider = embeddingProvider || new SimpleEmbeddingProvider(this.config.vectorDimension);
  }

  /**
   * Get cached response for semantically similar query
   */
  async get(query: string): Promise<T | undefined> {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    // Find best matching entry
    let bestMatch: SemanticCacheEntry<T> | undefined;
    let bestSimilarity = 0;

    for (const entry of this.entries) {
      // Check expiration
      if (this.isExpired(entry)) {
        continue;
      }

      // Calculate similarity
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      if (similarity > bestSimilarity && similarity >= this.config.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      // Update stats
      bestMatch.accessCount++;
      bestMatch.lastAccessed = Date.now();
      this.stats.hits++;
      this.stats.totalSimilarity += bestSimilarity;
      return bestMatch.response;
    }

    this.stats.misses++;
    return undefined;
  }

  /**
   * Store response with embedding
   */
  async set(query: string, response: T, options: { ttl?: number } = {}): Promise<void> {
    // Clean expired entries first
    this.cleanup();

    // Evict if at capacity
    if (this.entries.length >= this.config.maxEntries) {
      this.evictLRU();
    }

    const embedding = await this.embeddingProvider.embed(query);
    const id = this.generateId();

    const entry: SemanticCacheEntry<T> = {
      id,
      query,
      embedding,
      response,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      ttl: options.ttl ?? this.config.ttl,
    };

    this.entries.push(entry);
  }

  /**
   * Check if entry exists for query
   */
  async has(query: string): Promise<boolean> {
    const result = await this.get(query);
    return result !== undefined;
  }

  /**
   * Delete entry by query
   */
  async delete(query: string): Promise<boolean> {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    const index = this.entries.findIndex((entry) => {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      return similarity >= this.config.similarityThreshold;
    });

    if (index >= 0) {
      this.entries.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Invalidate entries by tag pattern
   */
  invalidateByPattern(pattern: string): number {
    const before = this.entries.length;

    if (pattern.includes('*')) {
      // Wildcard pattern
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      this.entries = this.entries.filter((entry) => !regex.test(entry.query));
    } else {
      // Exact match
      this.entries = this.entries.filter((entry) => !entry.query.includes(pattern));
    }

    const removed = before - this.entries.length;
    this.stats.evictions += removed;
    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      avgSimilarity: this.stats.hits > 0 ? this.stats.totalSimilarity / this.stats.hits : 0,
      size: this.entries.length,
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.stats = { hits: 0, misses: 0, evictions: 0, totalSimilarity: 0 };
  }

  /**
   * Get all entries (for debugging)
   */
  getEntries(): SemanticCacheEntry<T>[] {
    return this.entries.map((e) => ({ ...e }));
  }

  /**
   * Pre-warm cache with common queries
   */
  async warmCache(queries: Array<{ query: string; response: T }>): Promise<void> {
    for (const { query, response } of queries) {
      await this.set(query, response);
    }
  }

  /**
   * Find similar queries
   */
  async findSimilar(query: string, limit = 5): Promise<Array<{ query: string; similarity: number }>> {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    const similarities = this.entries
      .filter((entry) => !this.isExpired(entry))
      .map((entry) => ({
        query: entry.query,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .filter((s) => s.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  // ============================================
  // Private Methods
  // ============================================

  private isExpired(entry: SemanticCacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanup(): void {
    const before = this.entries.length;
    this.entries = this.entries.filter((entry) => !this.isExpired(entry));
    this.stats.evictions += before - this.entries.length;
  }

  private evictLRU(): void {
    if (this.entries.length === 0) return;

    // Find least recently used
    let lruIndex = 0;
    let lruTime = this.entries[0].lastAccessed;

    for (let i = 1; i < this.entries.length; i++) {
      if (this.entries[i].lastAccessed < lruTime) {
        lruTime = this.entries[i].lastAccessed;
        lruIndex = i;
      }
    }

    this.entries.splice(lruIndex, 1);
    this.stats.evictions++;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Multi-Tier Cache
// ============================================

export interface MultiTierCacheConfig {
  l1: {
    maxSize: number;
    ttl: number;
  };
  semantic: {
    maxSize: number;
    ttl: number;
    similarityThreshold: number;
  };
}

export class MultiTierCache<T> {
  private l1: Map<string, { value: T; timestamp: number; ttl: number }>;
  private semantic: SemanticCache<T>;
  private config: MultiTierCacheConfig;
  private stats = { l1Hits: 0, semanticHits: 0, misses: 0 };

  constructor(config: Partial<MultiTierCacheConfig> = {}) {
    this.config = {
      l1: { maxSize: 100, ttl: 60 * 1000 }, // 1 minute
      semantic: { maxSize: 1000, ttl: 30 * 60 * 1000, similarityThreshold: 0.85 }, // 30 minutes
      ...config,
    };

    this.l1 = new Map();
    this.semantic = new SemanticCache(undefined, {
      maxEntries: this.config.semantic.maxSize,
      ttl: this.config.semantic.ttl,
      similarityThreshold: this.config.semantic.similarityThreshold,
    });
  }

  /**
   * Get with tiered fallback
   */
  async get(key: string): Promise<T | undefined> {
    // L1: Exact match (fastest)
    const l1Entry = this.l1.get(key);
    if (l1Entry && !this.isL1Expired(l1Entry)) {
      l1Entry.timestamp = Date.now(); // Update LRU
      this.stats.l1Hits++;
      return l1Entry.value;
    }

    // L2: Semantic match
    const semanticResult = await this.semantic.get(key);
    if (semanticResult !== undefined) {
      // Promote to L1
      this.setL1(key, semanticResult);
      this.stats.semanticHits++;
      return semanticResult;
    }

    this.stats.misses++;
    return undefined;
  }

  /**
   * Set across all tiers
   */
  async set(key: string, value: T, options: { l1?: boolean; semantic?: boolean; ttl?: number } = {}): Promise<void> {
    const opts = { l1: true, semantic: true, ...options };

    if (opts.l1) {
      this.setL1(key, value, opts.ttl);
    }

    if (opts.semantic) {
      await this.semantic.set(key, value, { ttl: opts.ttl });
    }
  }

  /**
   * Get or compute with caching
   */
  async getOrSet(key: string, factory: () => Promise<T>, options?: { ttl?: number }): Promise<T> {
    let value = await this.get(key);

    if (value === undefined) {
      value = await factory();
      await this.set(key, value, options);
    }

    return value;
  }

  /**
   * Invalidate across all tiers
   */
  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    await this.semantic.delete(key);
  }

  /**
   * Get combined stats
   */
  getStats(): { l1Hits: number; semanticHits: number; misses: number; hitRate: number } {
    const total = this.stats.l1Hits + this.stats.semanticHits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.l1Hits + this.stats.semanticHits) / total : 0,
    };
  }

  /**
   * Clear all tiers
   */
  clear(): void {
    this.l1.clear();
    this.semantic.clear();
    this.stats = { l1Hits: 0, semanticHits: 0, misses: 0 };
  }

  private setL1(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.l1.size >= this.config.l1.maxSize && !this.l1.has(key)) {
      this.evictL1LRU();
    }

    this.l1.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.l1.ttl,
    });
  }

  private isL1Expired(entry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictL1LRU(): void {
    let oldest: string | undefined;
    let oldestTime = Infinity;

    this.l1.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    });

    if (oldest) {
      this.l1.delete(oldest);
    }
  }
}

// ============================================
// Export
// ============================================

export { SemanticCache as default };
