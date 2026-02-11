/**
 * Bounded Cache with TTL and LRU eviction
 *
 * @deprecated 建议使用 WTinyLFUCache 或 LRUCache
 * 此实现功能被 LRUCache 完全覆盖
 *
 * Prevents memory leaks by enforcing size limits and time-based expiration.
 * Compatible with both browser and Node.js environments.
 */

// ============================================
// Types
// ============================================

/** 浏览器 Performance 内存信息接口 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/** 扩展 Performance 接口 */
declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface BoundedCacheConfig {
  // Maximum number of entries
  maxSize: number;
  // Time to live in milliseconds
  ttl: number;
  // Cleanup interval in milliseconds
  cleanupInterval: number;
  // Enable LRU eviction when full
  enableLRU: boolean;
}

export const DEFAULT_CACHE_CONFIG: BoundedCacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  enableLRU: true,
};

// ============================================
// Bounded Cache
// ============================================

export class BoundedCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private config: BoundedCacheConfig;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<BoundedCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get all keys (non-expired only)
   */
  keys(): K[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values (non-expired only)
   */
  values(): V[] {
    this.cleanup();
    return Array.from(this.cache.values()).map(e => e.value);
  }

  /**
   * Get all entries (non-expired only)
   */
  entries(): Array<[K, V]> {
    this.cleanup();
    return Array.from(this.cache.entries()).map(([k, e]) => [k, e.value]);
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (!this.config.enableLRU || this.cache.size === 0) return;

    let lruKey: K | undefined;
    let lruTime = Infinity;

    for (const entry of Array.from(this.cache.entries())) {
      const [key, cacheEntry] = entry;
      if (cacheEntry.lastAccessed < lruTime) {
        lruTime = cacheEntry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const entry of Array.from(this.cache.entries())) {
      const [key, cacheEntry] = entry;
      if (now - cacheEntry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * Stop periodic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// ============================================
// Bounded History
// ============================================

export interface HistoryEntry<T> {
  data: T;
  timestamp: number;
}

export interface BoundedHistoryConfig {
  maxSize: number;
  // Enable automatic summarization when full
  enableSummarization: boolean;
  // Summarization threshold (0-1)
  summarizationThreshold: number;
}

export const DEFAULT_HISTORY_CONFIG: BoundedHistoryConfig = {
  maxSize: 1000,
  enableSummarization: true,
  summarizationThreshold: 0.8,
};

export class BoundedHistory<T> {
  private history: HistoryEntry<T>[] = [];
  private config: BoundedHistoryConfig;

  constructor(config: Partial<BoundedHistoryConfig> = {}) {
    this.config = { ...DEFAULT_HISTORY_CONFIG, ...config };
  }

  /**
   * Add entry to history
   */
  add(data: T): void {
    // Check if we need to summarize
    if (this.config.enableSummarization &&
        this.history.length >= this.config.maxSize * this.config.summarizationThreshold) {
      this.summarize();
    }

    // Add new entry
    this.history.push({
      data,
      timestamp: Date.now(),
    });

    // Enforce max size
    if (this.history.length > this.config.maxSize) {
      this.history = this.history.slice(-this.config.maxSize);
    }
  }

  /**
   * Get all history entries
   */
  getAll(): T[] {
    return this.history.map(e => e.data);
  }

  /**
   * Get recent entries
   */
  getRecent(count: number): T[] {
    return this.history.slice(-count).map(e => e.data);
  }

  /**
   * Get entries since timestamp
   */
  getSince(timestamp: number): T[] {
    return this.history
      .filter(e => e.timestamp >= timestamp)
      .map(e => e.data);
  }

  /**
   * Get history size
   */
  size(): number {
    return this.history.length;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Summarize old entries
   */
  private summarize(): void {
    // Keep recent 50% and summarize older 50%
    const keepCount = Math.floor(this.config.maxSize * 0.5);
    const toSummarize = this.history.slice(0, -keepCount);
    const toKeep = this.history.slice(-keepCount);

    // Create summary entry (implementation depends on T)
    const summary = this.createSummary(toSummarize);

    this.history = [
      { data: summary, timestamp: toSummarize[0]?.timestamp || Date.now() },
      ...toKeep,
    ];
  }

  /**
   * Create summary of entries (override for specific types)
   */
  protected createSummary(entries: HistoryEntry<T>[]): T {
    // Default: return first entry with count
    const first = entries[0];
    return {
      ...first.data,
      _summary: true,
      _count: entries.length,
    } as unknown as T;
  }
}

// ============================================
// Memory Monitor
// ============================================

export interface MemoryMonitorConfig {
  // Maximum memory usage in MB
  maxMemoryMB: number;
  // Warning threshold (0-1)
  warningThreshold: number;
  // Check interval in milliseconds
  checkInterval: number;
  // Callback when memory limit exceeded
  onLimitExceeded?: () => void;
  // Callback when warning threshold reached
  onWarning?: (usage: number) => void;
}

export const DEFAULT_MEMORY_CONFIG: MemoryMonitorConfig = {
  maxMemoryMB: 512,
  warningThreshold: 0.8,
  checkInterval: 30 * 1000, // 30 seconds
};

export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private checkTimer?: ReturnType<typeof setInterval>;
  private isRunning = false;

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.checkTimer = setInterval(() => {
      this.checkMemory();
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }

  /**
   * Get current memory usage in MB
   */
  getMemoryUsage(): number {
    // Node.js 内存监控 - 使用 process.memoryUsage()
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  /**
   * Check memory usage and trigger callbacks
   */
  private checkMemory(): void {
    const usage = this.getMemoryUsage();
    const maxMB = this.config.maxMemoryMB;

    if (usage > maxMB) {
      this.config.onLimitExceeded?.();
    } else if (usage > maxMB * this.config.warningThreshold) {
      this.config.onWarning?.(usage);
    }
  }
}

// ============================================
// Export singletons
// ============================================

export const defaultCache = new BoundedCache<string, unknown>();
export const defaultHistory = new BoundedHistory<unknown>();
export const memoryMonitor = new MemoryMonitor();
