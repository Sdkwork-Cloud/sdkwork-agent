/**
 * BM25 (Best Match 25) Full-Text Search Algorithm
 * Industry-leading probabilistic retrieval function
 * 
 * Reference:
 * - Paper: "Okapi at TREC-3" (Robertson et al., 1994)
 * - Implementation based on Elasticsearch and Lucene principles
 * 
 * Advantages over TF-IDF:
 * - Term frequency saturation (prevents keyword stuffing)
 * - Document length normalization (fair comparison across doc lengths)
 * - Better handling of long documents
 */

// ============================================================================
// BM25 Configuration
// ============================================================================

export interface BM25Config {
  /** Term frequency saturation parameter (k1) - default 1.5 */
  k1: number;
  /** Length normalization parameter (b) - default 0.75 */
  b: number;
  /** IDF smoothing parameter (delta) - default 1.0 */
  delta: number;
}

export const DEFAULT_BM25_CONFIG: BM25Config = {
  k1: 1.5,
  b: 0.75,
  delta: 1.0,
};

// ============================================================================
// Document Structure
// ============================================================================

interface Document {
  id: string;
  content: string;
  tokens: string[];
  length: number;
}

// ============================================================================
// Inverted Index Entry
// ============================================================================

interface Posting {
  docId: string;
  termFrequency: number;
  positions: number[];
}

interface InvertedIndexEntry {
  documentFrequency: number;
  postings: Map<string, Posting>;
}

// ============================================================================
// BM25 Search Engine
// ============================================================================

export class BM25SearchEngine {
  private documents = new Map<string, Document>();
  private invertedIndex = new Map<string, InvertedIndexEntry>();
  private config: BM25Config;
  private totalDocLength = 0;
  private avgDocLength = 0;

  constructor(config: Partial<BM25Config> = {}) {
    this.config = { ...DEFAULT_BM25_CONFIG, ...config };
  }

  // ============================================================================
  // Document Management
  // ============================================================================

  /**
   * Add document to index
   */
  addDocument(id: string, content: string): void {
    // Remove existing document if present
    if (this.documents.has(id)) {
      this.removeDocument(id);
    }

    // Tokenize content
    const tokens = this.tokenize(content);
    const doc: Document = {
      id,
      content,
      tokens,
      length: tokens.length,
    };

    // Store document
    this.documents.set(id, doc);
    this.totalDocLength += doc.length;
    this.avgDocLength = this.totalDocLength / this.documents.size;

    // Build inverted index
    this.buildIndexForDocument(doc);
  }

  /**
   * Remove document from index
   */
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Remove from inverted index
    for (const term of new Set(doc.tokens)) {
      const entry = this.invertedIndex.get(term);
      if (entry) {
        entry.postings.delete(id);
        entry.documentFrequency--;
        if (entry.documentFrequency === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    // Remove from documents
    this.documents.delete(id);
    this.totalDocLength -= doc.length;
    this.avgDocLength = this.documents.size > 0 ? this.totalDocLength / this.documents.size : 0;
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.totalDocLength = 0;
    this.avgDocLength = 0;
  }

  // ============================================================================
  // Search
  // ============================================================================

  /**
   * Search documents using BM25 scoring
   */
  search(query: string, limit: number = 10): Array<{ id: string; score: number }> {
    if (this.documents.size === 0) {
      return [];
    }

    const queryTokens = this.tokenize(query);
    const scores = new Map<string, number>();

    // Calculate BM25 score for each document
    for (const doc of this.documents.values()) {
      let score = 0;
      for (const term of queryTokens) {
        score += this.calculateBM25(term, doc);
      }
      if (score > 0) {
        scores.set(doc.id, score);
      }
    }

    // Sort by score and return top results
    return Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Search with highlighting
   */
  searchWithHighlight(
    query: string,
    limit: number = 10
  ): Array<{ id: string; score: number; highlights: string[] }> {
    const results = this.search(query, limit);
    const queryTokens = new Set(this.tokenize(query));

    return results.map(({ id, score }) => {
      const doc = this.documents.get(id);
      const highlights: string[] = [];

      if (doc) {
        // Find sentences containing query terms
        const sentences = this.extractSentences(doc.content);
        for (const sentence of sentences) {
          const sentenceTokens = new Set(this.tokenize(sentence));
          const hasOverlap = Array.from(queryTokens).some(token => sentenceTokens.has(token));
          if (hasOverlap) {
            highlights.push(sentence);
          }
        }
      }

      return { id, score, highlights };
    });
  }

  // ============================================================================
  // BM25 Scoring
  // ============================================================================

  /**
   * Calculate BM25 score for a term in a document
   * 
   * BM25 formula:
   * score = IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * |D| / avgDL))
   * 
   * Where:
   * - IDF = log((N - n + 0.5) / (n + 0.5) + delta)  [delta-smoothed IDF]
   * - TF = term frequency in document
   * - N = total number of documents
   * - n = number of documents containing the term
   * - |D| = document length
   * - avgDL = average document length
   * - k1 = term frequency saturation parameter (default 1.5)
   * - b = length normalization parameter (default 0.75)
   * - delta = IDF smoothing parameter (default 1.0)
   */
  private calculateBM25(term: string, doc: Document): number {
    const entry = this.invertedIndex.get(term);
    if (!entry) return 0;

    const posting = entry.postings.get(doc.id);
    if (!posting) return 0;

    // Calculate IDF
    const N = this.documents.size;
    const n = entry.documentFrequency;
    const idf = Math.log((N - n + 0.5) / (n + 0.5) + this.config.delta);

    // Calculate TF component with saturation
    const tf = posting.termFrequency;
    const docLengthNorm = 1 - this.config.b + this.config.b * (doc.length / this.avgDocLength);
    const tfComponent = (tf * (this.config.k1 + 1)) / (tf + this.config.k1 * docLengthNorm);

    return idf * tfComponent;
  }

  // ============================================================================
  // Index Building
  // ============================================================================

  /**
   * Build inverted index for a document
   */
  private buildIndexForDocument(doc: Document): void {
    const termPositions = new Map<string, number[]>();

    // Collect term positions
    for (let i = 0; i < doc.tokens.length; i++) {
      const term = doc.tokens[i];
      if (!termPositions.has(term)) {
        termPositions.set(term, []);
      }
      termPositions.get(term)!.push(i);
    }

    // Add to inverted index
    for (const [term, positions] of termPositions) {
      let entry = this.invertedIndex.get(term);
      if (!entry) {
        entry = {
          documentFrequency: 0,
          postings: new Map(),
        };
        this.invertedIndex.set(term, entry);
      }

      entry.documentFrequency++;
      entry.postings.set(doc.id, {
        docId: doc.id,
        termFrequency: positions.length,
        positions,
      });
    }
  }

  // ============================================================================
  // Text Processing
  // ============================================================================

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    // Convert to lowercase and extract words
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0 && !this.isStopWord(token));
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they',
      'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do',
      'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out',
      'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
      'make', 'like', 'into', 'him', 'has', 'two', 'more', 'go',
      'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call',
      'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did',
      'get', 'come', 'made', 'may', 'part', 'over', 'say', 'she',
    ]);
    return stopWords.has(word.toLowerCase());
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get search engine statistics
   */
  getStats(): {
    documentCount: number;
    termCount: number;
    avgDocLength: number;
    totalTokens: number;
  } {
    return {
      documentCount: this.documents.size,
      termCount: this.invertedIndex.size,
      avgDocLength: this.avgDocLength,
      totalTokens: this.totalDocLength,
    };
  }

  /**
   * Get term statistics
   */
  getTermStats(term: string): {
    documentFrequency: number;
    totalFrequency: number;
    idf: number;
  } | null {
    const entry = this.invertedIndex.get(term);
    if (!entry) return null;

    const N = this.documents.size;
    const n = entry.documentFrequency;
    const idf = Math.log((N - n + 0.5) / (n + 0.5) + this.config.delta);

    let totalFrequency = 0;
    for (const posting of entry.postings.values()) {
      totalFrequency += posting.termFrequency;
    }

    return {
      documentFrequency: n,
      totalFrequency,
      idf,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBM25SearchEngine(config?: Partial<BM25Config>): BM25SearchEngine {
  return new BM25SearchEngine(config);
}
