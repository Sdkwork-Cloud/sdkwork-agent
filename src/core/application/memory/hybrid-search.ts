/**
 * Hybrid Search with Reciprocal Rank Fusion (RRF)
 * Industry-leading result fusion algorithm for combining multiple search sources
 *
 * Reference:
 * - Paper: "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods"
 *   (Cormack, Clarke & Buettcher, SIGIR 2009)
 * - Used by: Elasticsearch, Vespa, Weaviate, Pinecone
 *
 * RRF Formula: score = Σ(1 / (k + rank))
 * Where k is a constant (typically 60) to prevent top ranks from dominating
 */

import type { Memory } from '../../domain/memory.js';

// ============================================================================
// RRF Configuration
// ============================================================================

export interface RRFConfig {
  /** RRF constant (k) - default 60, prevents top ranks from dominating */
  k: number;
  /** Weight for semantic search results */
  semanticWeight: number;
  /** Weight for full-text search results */
  textWeight: number;
  /** Weight for keyword search results */
  keywordWeight: number;
  /** Minimum score threshold */
  minScore: number;
}

export const DEFAULT_RRF_CONFIG: RRFConfig = {
  k: 60,
  semanticWeight: 1.0,
  textWeight: 0.8,
  keywordWeight: 0.6,
  minScore: 0.01,
};

// ============================================================================
// Search Source Results
// ============================================================================

export interface SearchSourceResult {
  source: 'semantic' | 'fulltext' | 'keyword';
  results: Array<{ id: string; score: number; memory?: Memory }>;
}

// ============================================================================
// RRF Fusion Result
// ============================================================================

export interface RRFResult {
  id: string;
  rrfScore: number;
  ranks: Array<{
    source: string;
    rank: number;
    originalScore: number;
  }>;
  memory?: Memory;
}

// ============================================================================
// Hybrid Search Engine
// ============================================================================

export class HybridSearchEngine {
  private config: RRFConfig;

  constructor(config: Partial<RRFConfig> = {}) {
    this.config = { ...DEFAULT_RRF_CONFIG, ...config };
  }

  // ============================================================================
  // RRF Fusion
  // ============================================================================

  /**
   * Fuse multiple search results using RRF algorithm
   *
   * Algorithm:
   * 1. For each source, assign ranks to results (1-based)
   * 2. Calculate RRF score: Σ(weight_i / (k + rank_i))
   * 3. Sort by RRF score descending
   */
  fuseResults(sources: SearchSourceResult[]): RRFResult[] {
    const rrfScores = new Map<string, { score: number; ranks: RRFResult['ranks']; memory?: Memory }>();

    for (const source of sources) {
      const weight = this.getWeightForSource(source.source);

      // Assign ranks (1-based) and calculate RRF contribution
      for (let i = 0; i < source.results.length; i++) {
        const result = source.results[i];
        const rank = i + 1;
        const rrfContribution = weight / (this.config.k + rank);

        const existing = rrfScores.get(result.id);
        if (existing) {
          existing.score += rrfContribution;
          existing.ranks.push({
            source: source.source,
            rank,
            originalScore: result.score,
          });
        } else {
          rrfScores.set(result.id, {
            score: rrfContribution,
            ranks: [{
              source: source.source,
              rank,
              originalScore: result.score,
            }],
            memory: result.memory,
          });
        }
      }
    }

    // Convert to array and filter by minimum score
    const results: RRFResult[] = Array.from(rrfScores.entries())
      .map(([id, data]) => ({
        id,
        rrfScore: data.score,
        ranks: data.ranks,
        memory: data.memory,
      }))
      .filter(result => result.rrfScore >= this.config.minScore);

    // Sort by RRF score descending
    return results.sort((a, b) => b.rrfScore - a.rrfScore);
  }

  /**
   * Fuse with weighted scores (alternative to rank-based)
   *
   * Use case: When you want to preserve original score magnitudes
   */
  fuseWithWeightedScores(
    sources: Array<{
      source: string;
      results: Array<{ id: string; score: number; memory?: Memory }>;
      weight: number;
    }>
  ): Array<{ id: string; fusedScore: number; memory?: Memory }> {
    const fusedScores = new Map<string, { score: number; memory?: Memory }>();

    for (const source of sources) {
      // Normalize scores to [0, 1] range
      const maxScore = Math.max(...source.results.map(r => r.score), 0.0001);

      for (const result of source.results) {
        const normalizedScore = result.score / maxScore;
        const weightedScore = normalizedScore * source.weight;

        const existing = fusedScores.get(result.id);
        if (existing) {
          // Use max fusion or sum fusion based on preference
          existing.score = Math.max(existing.score, weightedScore); // Max fusion
          // existing.score += weightedScore; // Sum fusion (alternative)
        } else {
          fusedScores.set(result.id, {
            score: weightedScore,
            memory: result.memory,
          });
        }
      }
    }

    return Array.from(fusedScores.entries())
      .map(([id, data]) => ({
        id,
        fusedScore: data.score,
        memory: data.memory,
      }))
      .sort((a, b) => b.fusedScore - a.fusedScore);
  }

  // ============================================================================
  // Diversified Ranking (MMR - Maximal Marginal Relevance)
  // ============================================================================

  /**
   * Re-rank results using MMR for diversity
   *
   * MMR Formula: λ * Relevance - (1 - λ) * max(Similarity to selected)
   *
   * Use case: When you want diverse results rather than just top similar ones
   */
  diversifyResults(
    results: RRFResult[],
    _query: number[],
    embeddings: Map<string, number[]>,
    lambda: number = 0.5,
    limit: number = 10
  ): RRFResult[] {
    if (results.length === 0) return [];

    const selected: RRFResult[] = [];
    const remaining = [...results];

    while (selected.length < limit && remaining.length > 0) {
      let bestMMR = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevance = candidate.rrfScore;

        // Calculate maximum similarity to already selected items
        let maxSimilarity = 0;
        for (const sel of selected) {
          const sim = this.calculateSimilarity(
            embeddings.get(candidate.id) || [],
            embeddings.get(sel.id) || []
          );
          maxSimilarity = Math.max(maxSimilarity, sim);
        }

        // MMR score
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestMMR) {
          bestMMR = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      }
    }

    return selected;
  }

  // ============================================================================
  // Query Expansion
  // ============================================================================

  /**
   * Expand query with synonyms and related terms
   *
   * Use case: Improve recall by including semantically similar terms
   */
  expandQuery(
    query: string,
    synonyms: Map<string, string[]> = new Map()
  ): string[] {
    const terms = query.toLowerCase().split(/\s+/);
    const expanded = new Set<string>(terms);

    for (const term of terms) {
      const termSynonyms = synonyms.get(term);
      if (termSynonyms) {
        for (const syn of termSynonyms) {
          expanded.add(syn);
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Generate query variations for better coverage
   */
  generateQueryVariations(query: string): string[] {
    const variations: string[] = [query];

    // Original query
    variations.push(query);

    // Without stop words
    const withoutStops = this.removeStopWords(query);
    if (withoutStops !== query) {
      variations.push(withoutStops);
    }

    // Stemmed version (simplified)
    const stemmed = this.simpleStem(query);
    if (stemmed !== query) {
      variations.push(stemmed);
    }

    return [...new Set(variations)];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getWeightForSource(source: string): number {
    switch (source) {
      case 'semantic':
        return this.config.semanticWeight;
      case 'fulltext':
        return this.config.textWeight;
      case 'keyword':
        return this.config.keywordWeight;
      default:
        return 1.0;
    }
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) {
      return 0;
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

  private removeStopWords(text: string): string {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => !stopWords.has(word))
      .join(' ');
  }

  private simpleStem(word: string): string {
    // Simplified stemming (remove common suffixes)
    const suffixes = ['ing', 'ed', 's', 'es', 'ies', 'ied', 'ly'];
    let stemmed = word.toLowerCase();

    for (const suffix of suffixes) {
      if (stemmed.endsWith(suffix) && stemmed.length > suffix.length + 2) {
        stemmed = stemmed.slice(0, -suffix.length);
        break;
      }
    }

    return stemmed;
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  updateConfig(config: Partial<RRFConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RRFConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHybridSearchEngine(config?: Partial<RRFConfig>): HybridSearchEngine {
  return new HybridSearchEngine(config);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick RRF fusion without creating engine instance
 */
export function fuseWithRRF(
  sources: SearchSourceResult[],
  k: number = 60
): RRFResult[] {
  const engine = createHybridSearchEngine({ k });
  return engine.fuseResults(sources);
}

/**
 * Quick weighted fusion without creating engine instance
 */
export function fuseWithWeights(
  sources: Array<{
    source: string;
    results: Array<{ id: string; score: number }>;
    weight: number;
  }>
): Array<{ id: string; fusedScore: number }> {
  const engine = createHybridSearchEngine();
  return engine.fuseWithWeightedScores(sources);
}
