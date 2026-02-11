/**
 * Memory System - Application Layer
 * Industry-leading multi-dimensional memory storage with semantic search
 *
 * Features:
 * - HNSW Vector Index: O(log n) approximate nearest neighbor search
 * - BM25 Full-Text Search: Industry-standard probabilistic retrieval
 * - RRF Hybrid Search: Reciprocal Rank Fusion for result combination
 * - Hierarchical Memory: Core/Working/Archive tier management
 * - Importance Scoring: Time-decay with access-based refresh
 */

// ============================================================================
// Core Memory Store
// ============================================================================

export {
  MemoryStoreImpl,
  createMemoryStore,
  InMemoryVectorStore,
  SimpleEmbeddingProvider,
  type MemoryStoreConfig,
} from './memory-store-impl.js';

// ============================================================================
// HNSW Vector Index (O(log n) search)
// ============================================================================

export {
  HNSWIndex,
  createHNSWIndex,
  DEFAULT_HNSW_CONFIG,
  type HNSWConfig,
} from './hnsw-index.js';

// ============================================================================
// BM25 Full-Text Search
// ============================================================================

export {
  BM25SearchEngine,
  createBM25SearchEngine,
  DEFAULT_BM25_CONFIG,
  type BM25Config,
} from './bm25-search.js';

// ============================================================================
// Hybrid Search with RRF
// ============================================================================

export {
  HybridSearchEngine,
  createHybridSearchEngine,
  fuseWithRRF,
  fuseWithWeights,
  DEFAULT_RRF_CONFIG,
  type RRFConfig,
  type SearchSourceResult,
  type RRFResult,
} from './hybrid-search.js';

// ============================================================================
// Hierarchical Memory with Importance Scoring
// ============================================================================

export {
  HierarchicalMemoryStore,
  createHierarchicalMemoryStore,
  DEFAULT_HIERARCHICAL_CONFIG,
  type MemoryTier,
  type HierarchicalMemory,
  type MemoryImportance,
  type MemoryLifecycle,
  type MemoryCompression,
  type HierarchicalMemoryConfig,
  type TierStats,
} from './hierarchical-memory.js';
