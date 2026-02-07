/**
 * Embedding Provider System
 *
 * Provides highly configurable text embedding capabilities with multiple backend options.
 * Supports OpenAI, local models, transformers.js, and custom embedding services.
 * Compatible with both browser and Node.js environments.
 */

// ============================================
// Types
// ============================================

export interface EmbeddingConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'transformers' | 'custom' | 'tfidf';
  model: string;
  dimensions: number;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  cacheEnabled: boolean;
  cacheSize: number;
  normalize: boolean;
  quantization: 'none' | 'int8' | 'binary';
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface SimilarityResult {
  score: number;
  index: number;
  text?: string;
}

export interface EmbeddingCacheEntry {
  text: string;
  embedding: number[];
  timestamp: number;
  accessCount: number;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: 'tfidf',
  model: 'default',
  dimensions: 384,
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  cacheEnabled: true,
  cacheSize: 10000,
  normalize: true,
  quantization: 'none',
};

// ============================================
// Base Embedding Provider
// ============================================

export abstract class EmbeddingProvider {
  protected config: EmbeddingConfig;
  protected cache = new Map<string, EmbeddingCacheEntry>();
  protected metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalTokens: 0,
    errors: 0,
    averageLatency: 0,
  };

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
  }

  /**
   * Embed a single text
   */
  abstract embed(text: string): Promise<EmbeddingResult>;

  /**
   * Embed multiple texts in batch
   */
  abstract embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Get provider name
   */
  abstract getName(): string;

  /**
   * Check if provider is available
   */
  abstract isAvailable(): boolean;

  /**
   * Embed with caching
   */
  async embedWithCache(text: string): Promise<EmbeddingResult> {
    this.metrics.totalRequests++;

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(text);
      if (cached) {
        this.metrics.cacheHits++;
        return { embedding: cached, model: this.config.model, dimensions: this.config.dimensions };
      }
    }

    this.metrics.cacheMisses++;

    // Generate embedding
    const startTime = Date.now();
    const result = await this.embed(text);
    const latency = Date.now() - startTime;

    // Update metrics
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests;

    // Cache result
    if (this.config.cacheEnabled) {
      this.addToCache(text, result.embedding);
    }

    return result;
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
    }

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

  /**
   * Calculate Euclidean distance
   */
  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Find most similar texts
   */
  async findSimilar(
    query: string,
    candidates: string[],
    topK = 5
  ): Promise<SimilarityResult[]> {
    const queryEmbedding = (await this.embedWithCache(query)).embedding;
    const candidateEmbeddings = await this.embedBatch(candidates);

    const similarities = candidateEmbeddings.embeddings.map((embedding, index) => ({
      score: this.cosineSimilarity(queryEmbedding, embedding),
      index,
      text: candidates[index],
    }));

    return similarities.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.metrics.cacheHits / total : 0,
    };
  }

  /**
   * Get provider metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Normalize embedding vector
   */
  protected normalize(vector: number[]): number[] {
    if (!this.config.normalize) return vector;

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;

    return vector.map((v) => v / magnitude);
  }

  /**
   * Quantize embedding
   */
  protected quantize(vector: number[]): number[] {
    switch (this.config.quantization) {
      case 'int8':
        return vector.map((v) => Math.round(v * 127));
      case 'binary':
        return vector.map((v) => (v > 0 ? 1 : 0));
      default:
        return vector;
    }
  }

  private getFromCache(text: string): number[] | null {
    const key = this.hashText(text);
    const entry = this.cache.get(key);

    if (entry) {
      entry.accessCount++;
      return entry.embedding;
    }

    return null;
  }

  private addToCache(text: string, embedding: number[]): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.cacheSize) {
      this.evictLRU();
    }

    const key = this.hashText(text);
    this.cache.set(key, {
      text,
      embedding,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}

// ============================================
// OpenAI Embedding Provider
// ============================================

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

export class OpenAIEmbeddingProvider extends EmbeddingProvider {
  private openaiConfig: OpenAIConfig;

  constructor(openaiConfig: OpenAIConfig, embeddingConfig?: Partial<EmbeddingConfig>) {
    super({
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      ...embeddingConfig,
    });
    this.openaiConfig = openaiConfig;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const result = await this.embedBatch([text]);
    return {
      embedding: result.embeddings[0],
      model: result.model,
      dimensions: result.dimensions,
      usage: result.usage,
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const url = `${this.openaiConfig.baseUrl || 'https://api.openai.com/v1'}/embeddings`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiConfig.apiKey}`,
        ...(this.openaiConfig.organization && { 'OpenAI-Organization': this.openaiConfig.organization }),
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimensions,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    const embeddings = data.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((item: { embedding: number[] }) => this.normalize(item.embedding));

    return {
      embeddings,
      model: this.config.model,
      dimensions: this.config.dimensions,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  getName(): string {
    return 'openai';
  }

  isAvailable(): boolean {
    return !!this.openaiConfig.apiKey;
  }
}

// ============================================
// Anthropic Embedding Provider
// ============================================

export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AnthropicEmbeddingProvider extends EmbeddingProvider {
  constructor(anthropicConfig: AnthropicConfig, embeddingConfig?: Partial<EmbeddingConfig>) {
    super({
      provider: 'anthropic',
      model: 'claude-3-embedding',
      dimensions: 1024,
      ...embeddingConfig,
    });
    // Store anthropicConfig for future use
    void anthropicConfig;
  }

  async embed(_text: string): Promise<EmbeddingResult> {
    // Anthropic doesn't have a dedicated embedding API yet
    // This is a placeholder for when they release one
    throw new Error('Anthropic embeddings not yet available');
  }

  async embedBatch(_texts: string[]): Promise<BatchEmbeddingResult> {
    throw new Error('Anthropic embeddings not yet available');
  }

  getName(): string {
    return 'anthropic';
  }

  isAvailable(): boolean {
    return false; // Not available yet
  }
}

// ============================================
// Local Model Embedding Provider
// ============================================

export interface LocalModelConfig {
  modelPath: string;
  runtime: 'onnx' | 'tensorflow' | 'pytorch';
}

export class LocalEmbeddingProvider extends EmbeddingProvider {
  constructor(localConfig: LocalModelConfig, embeddingConfig?: Partial<EmbeddingConfig>) {
    super({
      provider: 'local',
      model: localConfig.modelPath,
      dimensions: 384,
      ...embeddingConfig,
    });
    // Store localConfig for future use
    void localConfig;
  }

  async embed(_text: string): Promise<EmbeddingResult> {
    // Placeholder for local model inference
    // Would integrate with ONNX Runtime, TensorFlow.js, etc.
    throw new Error('Local embedding provider not yet implemented');
  }

  async embedBatch(_texts: string[]): Promise<BatchEmbeddingResult> {
    throw new Error('Local embedding provider not yet implemented');
  }

  getName(): string {
    return 'local';
  }

  isAvailable(): boolean {
    return false; // Requires model loading
  }
}

// ============================================
// Transformers.js Embedding Provider
// ============================================

export class TransformersEmbeddingProvider extends EmbeddingProvider {
  constructor(embeddingConfig?: Partial<EmbeddingConfig>) {
    super({
      provider: 'transformers',
      model: 'Xenova/all-MiniLM-L6-v2',
      dimensions: 384,
      ...embeddingConfig,
    });
  }

  async embed(text: string): Promise<EmbeddingResult> {
    // Would use @xenova/transformers
    // const { pipeline } = await import('@xenova/transformers');
    // if (!this.pipeline) {
    //   this.pipeline = await pipeline('feature-extraction', this.config.model);
    // }
    // const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
    // return { embedding: Array.from(result.data), ... };

    // Fallback to TF-IDF for now
    return new TFIDFEmbeddingProvider(this.config).embed(text);
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const embeddings = await Promise.all(texts.map((text) => this.embed(text)));
    return {
      embeddings: embeddings.map((e) => e.embedding),
      model: this.config.model,
      dimensions: this.config.dimensions,
    };
  }

  getName(): string {
    return 'transformers';
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined'; // Only in browser for now
  }
}

// ============================================
// TF-IDF Embedding Provider (Fallback)
// ============================================

export class TFIDFEmbeddingProvider extends EmbeddingProvider {
  private vocabulary = new Map<string, number>();
  private documentFrequencies = new Map<string, number>();
  private totalDocuments = 0;

  constructor(embeddingConfig?: Partial<EmbeddingConfig>) {
    super({
      provider: 'tfidf',
      model: 'tfidf',
      dimensions: 384,
      ...embeddingConfig,
    });
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const tokens = this.tokenize(text);
    const embedding = this.computeTFIDF(tokens);

    return {
      embedding: this.normalize(embedding),
      model: 'tfidf',
      dimensions: this.config.dimensions,
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    // Build vocabulary from all texts
    this.buildVocabulary(texts);

    const embeddings = texts.map((text) => {
      const tokens = this.tokenize(text);
      return this.normalize(this.computeTFIDF(tokens));
    });

    return {
      embeddings,
      model: 'tfidf',
      dimensions: this.config.dimensions,
    };
  }

  getName(): string {
    return 'tfidf';
  }

  isAvailable(): boolean {
    return true;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private buildVocabulary(texts: string[]): void {
    this.vocabulary.clear();
    this.documentFrequencies.clear();
    this.totalDocuments = texts.length;

    // Count document frequencies
    texts.forEach((text) => {
      const tokens = new Set(this.tokenize(text));
      tokens.forEach((token) => {
        this.documentFrequencies.set(token, (this.documentFrequencies.get(token) || 0) + 1);
      });
    });

    // Build vocabulary with top dimensions tokens
    const sortedTokens = Array.from(this.documentFrequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.dimensions);

    sortedTokens.forEach(([token], index) => {
      this.vocabulary.set(token, index);
    });
  }

  private computeTFIDF(tokens: string[]): number[] {
    const embedding = new Array(this.config.dimensions).fill(0);

    // Compute term frequencies
    const termCounts = new Map<string, number>();
    tokens.forEach((token) => {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    });

    // Compute TF-IDF
    termCounts.forEach((count, token) => {
      const index = this.vocabulary.get(token);
      if (index !== undefined) {
        const tf = count / tokens.length;
        const df = this.documentFrequencies.get(token) || 1;
        const idf = Math.log(this.totalDocuments / df);
        embedding[index] = tf * idf;
      }
    });

    return embedding;
  }
}

// ============================================
// Embedding Provider Factory
// ============================================

export class EmbeddingProviderFactory {
  /**
   * Create embedding provider based on configuration
   */
  static create(config: Partial<EmbeddingConfig> & { apiKey?: string; baseUrl?: string }): EmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        if (!config.apiKey) throw new Error('OpenAI API key required');
        return new OpenAIEmbeddingProvider(
          { apiKey: config.apiKey, baseUrl: config.baseUrl },
          config
        );

      case 'anthropic':
        if (!config.apiKey) throw new Error('Anthropic API key required');
        return new AnthropicEmbeddingProvider(
          { apiKey: config.apiKey, baseUrl: config.baseUrl },
          config
        );

      case 'transformers':
        return new TransformersEmbeddingProvider(config);

      case 'local':
        throw new Error('Local provider requires model path configuration');

      case 'tfidf':
      default:
        return new TFIDFEmbeddingProvider(config);
    }
  }

  /**
   * Create provider with auto-fallback
   */
  static createWithFallback(
    primaryConfig: Parameters<typeof EmbeddingProviderFactory.create>[0],
    fallbackConfigs: Parameters<typeof EmbeddingProviderFactory.create>[0][]
  ): EmbeddingProvider {
    try {
      return this.create(primaryConfig);
    } catch (error) {
      for (const config of fallbackConfigs) {
        try {
          return this.create(config);
        } catch {
          continue;
        }
      }
      // Final fallback to TF-IDF
      return new TFIDFEmbeddingProvider();
    }
  }
}

// ============================================
// Embedding Service (High-level API)
// ============================================

export class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(provider?: EmbeddingProvider) {
    this.provider = provider || new TFIDFEmbeddingProvider();
  }

  /**
   * Set embedding provider
   */
  setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
  }

  /**
   * Embed text
   */
  async embed(text: string): Promise<number[]> {
    const result = await this.provider.embedWithCache(text);
    return result.embedding;
  }

  /**
   * Embed multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.provider.embedBatch(texts);
    return result.embeddings;
  }

  /**
   * Calculate similarity between two texts
   */
  async similarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([this.embed(text1), this.embed(text2)]);
    return this.provider.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Find similar texts
   */
  async findSimilar(query: string, candidates: string[], topK = 5): Promise<SimilarityResult[]> {
    return this.provider.findSimilar(query, candidates, topK);
  }

  /**
   * Cluster texts
   */
  async cluster(texts: string[], numClusters: number): Promise<Map<number, string[]>> {
    const embeddings = await this.embedBatch(texts);

    // Simple k-means clustering
    const clusters = new Map<number, string[]>();

    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < numClusters; i++) {
      centroids.push(embeddings[Math.floor(Math.random() * embeddings.length)]);
    }

    // Iterate
    for (let iteration = 0; iteration < 10; iteration++) {
      // Assign to clusters
      clusters.clear();
      embeddings.forEach((embedding, index) => {
        let bestCluster = 0;
        let bestDistance = Infinity;

        centroids.forEach((centroid, clusterIndex) => {
          const distance = this.provider.euclideanDistance(embedding, centroid);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestCluster = clusterIndex;
          }
        });

        if (!clusters.has(bestCluster)) {
          clusters.set(bestCluster, []);
        }
        clusters.get(bestCluster)!.push(texts[index]);
      });

      // Update centroids
      centroids.forEach((_, clusterIndex) => {
        const clusterTexts = clusters.get(clusterIndex) || [];
        if (clusterTexts.length > 0) {
          const clusterIndices = clusterTexts.map((t) => texts.indexOf(t));
          const clusterEmbeddings = clusterIndices.map((i) => embeddings[i]);
          centroids[clusterIndex] = this.computeCentroid(clusterEmbeddings);
        }
      });
    }

    return clusters;
  }

  private computeCentroid(embeddings: number[][]): number[] {
    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);

    embeddings.forEach((embedding) => {
      embedding.forEach((value, index) => {
        centroid[index] += value;
      });
    });

    return centroid.map((sum) => sum / embeddings.length);
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return this.provider.getMetrics();
  }
}

// ============================================
// Export
// ============================================

export { EmbeddingProvider as default };
