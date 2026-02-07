/**
 * RAG (Retrieval-Augmented Generation) System
 * For knowledge-enhanced AI responses
 * Reference: LangChain, LlamaIndex
 */

import { EventEmitter } from '../../../utils/event-emitter';

// ============================================================================
// Core Types
// ============================================================================

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface DocumentMetadata {
  source?: string;
  title?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  category?: string;
  [key: string]: unknown;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  embedding?: number[];
  metadata?: DocumentMetadata;
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
  relevance: number;
}

export interface RAGQuery {
  text: string;
  topK?: number;
  filters?: QueryFilter;
  minScore?: number;
  rerank?: boolean;
}

export interface QueryFilter {
  tags?: string[];
  category?: string;
  dateRange?: { start: Date; end: Date };
  metadata?: Record<string, unknown>;
}

export interface RAGResponse {
  answer: string;
  sources: RetrievalResult[];
  context: string;
  confidence: number;
  metadata: {
    queryTime: number;
    tokensUsed: number;
    chunksRetrieved: number;
  };
}

export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  minScore: number;
  rerankTopK: number;
  embeddingModel: string;
  completionModel: string;
  maxContextTokens: number;
}

// ============================================================================
// Vector Store Interface
// ============================================================================

export interface VectorStore {
  add(chunks: Chunk[]): Promise<void>;
  search(query: number[], topK: number, filters?: QueryFilter): Promise<RetrievalResult[]>;
  delete(documentId: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

// ============================================================================
// Embedding Provider Interface
// ============================================================================

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

// ============================================================================
// LLM Provider Interface
// ============================================================================

export interface LLMProvider {
  complete(prompt: string, options?: unknown): Promise<string>;
  completeStream(prompt: string, options?: unknown): AsyncGenerator<string>;
}

// ============================================================================
// Text Splitter
// ============================================================================

export interface TextSplitter {
  split(text: string): string[];
}

export class RecursiveCharacterTextSplitter implements TextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    separators: string[] = ['\n\n', '\n', '. ', ' ', '']
  ) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.separators = separators;
  }

  split(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + this.chunkSize, text.length);

      // Try to find a good break point
      if (end < text.length) {
        for (const separator of this.separators) {
          const lastIndex = text.lastIndexOf(separator, end);
          if (lastIndex > start) {
            end = lastIndex + separator.length;
            break;
          }
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - this.chunkOverlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}

// ============================================================================
// RAG System Implementation
// ============================================================================

export class RAGSystem extends EventEmitter {
  private config: RAGConfig;
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private llmProvider: LLMProvider;
  private textSplitter: TextSplitter;

  private documents = new Map<string, Document>();
  private chunks = new Map<string, Chunk>();

  constructor(
    config: Partial<RAGConfig>,
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    llmProvider: LLMProvider,
    textSplitter?: TextSplitter
  ) {
    super();
    this.config = {
      chunkSize: 1000,
      chunkOverlap: 200,
      topK: 5,
      minScore: 0.7,
      rerankTopK: 10,
      embeddingModel: 'text-embedding-3-small',
      completionModel: 'gpt-4',
      maxContextTokens: 4000,
      ...config,
    };
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.llmProvider = llmProvider;
    this.textSplitter = textSplitter || new RecursiveCharacterTextSplitter(
      this.config.chunkSize,
      this.config.chunkOverlap
    );
  }

  /**
   * Add documents to the RAG system
   */
  async addDocuments(docs: Document[]): Promise<void> {
    this.emit('indexing:started', { count: docs.length });

    for (const doc of docs) {
      // Store document
      this.documents.set(doc.id, doc);

      // Split into chunks
      const texts = this.textSplitter.split(doc.content);
      const docChunks: Chunk[] = [];

      for (let i = 0; i < texts.length; i++) {
        const chunk: Chunk = {
          id: `${doc.id}-chunk-${i}`,
          documentId: doc.id,
          content: texts[i],
          index: i,
          metadata: doc.metadata,
        };
        docChunks.push(chunk);
        this.chunks.set(chunk.id, chunk);
      }

      // Generate embeddings
      const embeddings = await this.embeddingProvider.embedBatch(
        docChunks.map(c => c.content)
      );

      for (let i = 0; i < docChunks.length; i++) {
        docChunks[i].embedding = embeddings[i];
      }

      // Add to vector store
      await this.vectorStore.add(docChunks);

      this.emit('document:indexed', { documentId: doc.id, chunks: docChunks.length });
    }

    this.emit('indexing:completed', { totalDocuments: this.documents.size, totalChunks: this.chunks.size });
  }

  /**
   * Query the RAG system
   */
  async query(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();
    this.emit('query:started', { query: query.text });

    // 1. Embed query
    const queryEmbedding = await this.embeddingProvider.embed(query.text);

    // 2. Retrieve relevant chunks
    const topK = query.topK || this.config.topK;
    const results = await this.vectorStore.search(
      queryEmbedding,
      query.rerank ? this.config.rerankTopK : topK,
      query.filters
    );

    // 3. Filter by minimum score
    const minScore = query.minScore || this.config.minScore;
    const filteredResults = results.filter(r => r.score >= minScore);

    // 4. Rerank if enabled
    let finalResults = filteredResults;
    if (query.rerank && filteredResults.length > topK) {
      finalResults = await this._rerank(query.text, filteredResults, topK);
    } else {
      finalResults = filteredResults.slice(0, topK);
    }

    // 5. Build context
    const context = this._buildContext(finalResults);

    // 6. Generate answer
    const prompt = this._buildPrompt(query.text, context);
    const answer = await this.llmProvider.complete(prompt);

    // 7. Calculate confidence
    const confidence = this._calculateConfidence(finalResults, answer);

    const response: RAGResponse = {
      answer,
      sources: finalResults,
      context,
      confidence,
      metadata: {
        queryTime: Date.now() - startTime,
        tokensUsed: this._estimateTokens(prompt + answer),
        chunksRetrieved: finalResults.length,
      },
    };

    this.emit('query:completed', response);
    return response;
  }

  /**
   * Stream query response
   */
  async *queryStream(query: RAGQuery): AsyncGenerator<string> {
    // 1-5. Same as query()
    const queryEmbedding = await this.embeddingProvider.embed(query.text);
    const topK = query.topK || this.config.topK;
    const results = await this.vectorStore.search(queryEmbedding, topK, query.filters);
    const minScore = query.minScore || this.config.minScore;
    const filteredResults = results.filter(r => r.score >= minScore);
    const context = this._buildContext(filteredResults);
    const prompt = this._buildPrompt(query.text, context);

    // 6. Stream answer
    for await (const chunk of this.llmProvider.completeStream(prompt)) {
      yield chunk;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    this.documents.delete(documentId);

    // Remove associated chunks
    for (const [id, chunk] of this.chunks) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(id);
      }
    }

    await this.vectorStore.delete(documentId);
    this.emit('document:deleted', { documentId });
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.chunks.clear();
    await this.vectorStore.clear();
    this.emit('index:cleared');
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    documentCount: number;
    chunkCount: number;
    vectorCount: Promise<number>;
  } {
    return {
      documentCount: this.documents.size,
      chunkCount: this.chunks.size,
      vectorCount: this.vectorStore.count(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async _rerank(
    query: string,
    results: RetrievalResult[],
    topK: number
  ): Promise<RetrievalResult[]> {
    // Simple reranking based on LLM scoring
    // In production, use a dedicated reranking model like Cohere Rerank
    const scoredResults = await Promise.all(
      results.map(async (result) => {
        const score = await this._scoreRelevance(query, result.chunk.content);
        return { ...result, relevance: score };
      })
    );

    scoredResults.sort((a, b) => b.relevance - a.relevance);
    return scoredResults.slice(0, topK);
  }

  private async _scoreRelevance(query: string, content: string): Promise<number> {
    // Simple relevance scoring
    // In production, use cross-encoder or LLM-based scoring
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.some(cw => cw.includes(word))) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  private _buildContext(results: RetrievalResult[]): string {
    return results
      .map((r, i) => `[${i + 1}] ${r.chunk.content}`)
      .join('\n\n');
  }

  private _buildPrompt(query: string, context: string): string {
    return `You are a helpful assistant. Use the following context to answer the question. If you don't know the answer based on the context, say so.

Context:
${context}

Question: ${query}

Answer:`;
  }

  private _calculateConfidence(results: RetrievalResult[], answer: string): number {
    if (results.length === 0) return 0;

    // Average similarity score
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Check if answer contains "I don't know" or similar
    const uncertaintyIndicators = [
      "i don't know",
      "i'm not sure",
      "no information",
      "cannot answer",
      "not mentioned",
    ];

    const hasUncertainty = uncertaintyIndicators.some(indicator =>
      answer.toLowerCase().includes(indicator)
    );

    return hasUncertainty ? avgScore * 0.5 : avgScore;
  }

  private _estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// ============================================================================
// In-Memory Vector Store (for testing)
// ============================================================================

export class InMemoryVectorStore implements VectorStore {
  private vectors: Array<{ chunk: Chunk; embedding: number[] }> = [];

  async add(chunks: Chunk[]): Promise<void> {
    for (const chunk of chunks) {
      if (chunk.embedding) {
        this.vectors.push({ chunk, embedding: chunk.embedding });
      }
    }
  }

  async search(query: number[], topK: number, filters?: QueryFilter): Promise<RetrievalResult[]> {
    let results = this.vectors.map(({ chunk, embedding }) => ({
      chunk,
      score: this._cosineSimilarity(query, embedding),
      relevance: 0,
    }));

    // Apply filters
    if (filters) {
      results = results.filter(r => this._matchesFilters(r.chunk, filters));
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  async delete(documentId: string): Promise<void> {
    this.vectors = this.vectors.filter(v => v.chunk.documentId !== documentId);
  }

  async clear(): Promise<void> {
    this.vectors = [];
  }

  async count(): Promise<number> {
    return this.vectors.length;
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private _matchesFilters(chunk: Chunk, filters: QueryFilter): boolean {
    if (filters.tags && chunk.metadata?.tags) {
      if (!filters.tags.some(tag => chunk.metadata!.tags!.includes(tag))) {
        return false;
      }
    }

    if (filters.category && chunk.metadata?.category !== filters.category) {
      return false;
    }

    return true;
  }
}

export default RAGSystem;
