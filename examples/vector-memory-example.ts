/**
 * Example: Vector Memory System
 *
 * This example demonstrates how to use the vector memory system including
 * Embedding Providers and Vector Databases for semantic search and retrieval.
 */

import { EmbeddingProviderFactory } from '../src/embeddings/embedding-provider';
import { VectorDatabaseFactory, VectorDatabaseManager } from '../src/memory/vector-database';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'VectorMemoryExample');

class VectorMemoryExample {
  async run() {
    logger.info('=== Vector Memory System Example ===\n');

    await this.demonstrateEmbeddingProviders();
    await this.demonstrateVectorDatabase();
    await this.demonstrateHybridSearch();
    await this.demonstrateDatabaseManager();
    await this.demonstrateSemanticSimilarity();

    logger.info('\n=== All demos completed successfully ===');
  }

  async demonstrateEmbeddingProviders() {
    logger.info('=== Embedding Providers Demo ===');

    // Create TF-IDF embedder (works without API keys)
    const embedder = EmbeddingProviderFactory.create({
      provider: 'tfidf',
      dimensions: 384,
      cacheEnabled: true,
    });

    await embedder.initialize();
    logger.info('TF-IDF embedder initialized');

    // Single embedding
    const text1 = 'Machine learning is a subset of artificial intelligence';
    logger.info(`\nEmbedding text: "${text1}"`);
    const vector1 = await embedder.embed(text1);
    logger.info(`Vector dimension: ${vector1.length}`);
    logger.info(`Vector sample: [${vector1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    // Batch embedding
    const texts = [
      'Deep learning uses neural networks',
      'Natural language processing understands text',
      'Computer vision recognizes images',
      'Reinforcement learning through trial and error',
    ];

    logger.info(`\nBatch embedding ${texts.length} texts...`);
    const startTime = Date.now();
    const vectors = await embedder.embedBatch(texts);
    const duration = Date.now() - startTime;

    logger.info(`Batch embedding completed in ${duration}ms`);
    logger.info(`Average time per text: ${(duration / texts.length).toFixed(2)}ms`);

    // Cleanup
    await embedder.destroy();
    logger.info('Embedder destroyed\n');
  }

  async demonstrateVectorDatabase() {
    logger.info('=== Vector Database Demo ===');

    // Create in-memory vector database
    const db = VectorDatabaseFactory.createMemory({
      dimension: 384,
      metric: 'cosine',
      cacheEnabled: true,
      cacheSize: 100,
    });

    await db.initialize();
    logger.info('Vector database initialized');

    // Create embedder
    const embedder = EmbeddingProviderFactory.create({
      provider: 'tfidf',
      dimensions: 384,
    });
    await embedder.initialize();

    // Sample documents
    const documents = [
      {
        id: 'doc-1',
        content: 'JavaScript is a programming language for web development',
        metadata: { category: 'programming', language: 'javascript' },
      },
      {
        id: 'doc-2',
        content: 'Python is great for data science and machine learning',
        metadata: { category: 'programming', language: 'python' },
      },
      {
        id: 'doc-3',
        content: 'TypeScript adds type safety to JavaScript',
        metadata: { category: 'programming', language: 'typescript' },
      },
      {
        id: 'doc-4',
        content: 'React is a library for building user interfaces',
        metadata: { category: 'framework', language: 'javascript' },
      },
      {
        id: 'doc-5',
        content: 'Node.js allows running JavaScript on the server',
        metadata: { category: 'runtime', language: 'javascript' },
      },
    ];

    // Insert documents
    logger.info(`\nInserting ${documents.length} documents...`);
    for (const doc of documents) {
      await db.insert({
        id: doc.id,
        vector: await embedder.embed(doc.content),
        content: doc.content,
        metadata: doc.metadata,
      });
    }
    logger.info('Documents inserted');

    // Vector search
    logger.info('\n--- Vector Search ---');
    const query1 = 'What is JavaScript used for?';
    logger.info(`Query: "${query1}"`);
    const queryVector1 = await embedder.embed(query1);

    const results1 = await db.search(queryVector1, {
      limit: 3,
      includeContent: true,
    });

    logger.info(`Top ${results1.length} results:`);
    results1.forEach((result, i) => {
      logger.info(`  ${i + 1}. [${result.score.toFixed(4)}] ${result.document.content}`);
    });

    // Filtered search
    logger.info('\n--- Filtered Search (category = programming) ---');
    const results2 = await db.search(queryVector1, {
      limit: 3,
      filter: { category: 'programming' },
      includeContent: true,
    });

    logger.info(`Top ${results2.length} results:`);
    results2.forEach((result, i) => {
      logger.info(`  ${i + 1}. [${result.score.toFixed(4)}] ${result.document.content}`);
    });

    // Get stats
    const stats = await db.getStats();
    logger.info(`\nDatabase stats:`);
    logger.info(`  Total documents: ${stats.totalDocuments}`);
    logger.info(`  Dimension: ${stats.dimension}`);
    logger.info(`  Size: ${(stats.sizeInBytes / 1024).toFixed(2)} KB`);

    // Cleanup
    await embedder.destroy();
    await db.close();
    logger.info('Database closed\n');
  }

  async demonstrateHybridSearch() {
    logger.info('=== Hybrid Search Demo ===');

    const db = VectorDatabaseFactory.createMemory({
      dimension: 384,
      metric: 'cosine',
    });

    await db.initialize();

    const embedder = EmbeddingProviderFactory.create({
      provider: 'tfidf',
      dimensions: 384,
    });
    await embedder.initialize();

    // Insert documents
    const docs = [
      { id: '1', content: 'Introduction to Machine Learning', metadata: {} },
      { id: '2', content: 'Advanced Deep Learning Techniques', metadata: {} },
      { id: '3', content: 'Machine Learning in Production', metadata: {} },
      { id: '4', content: 'Data Science Fundamentals', metadata: {} },
      { id: '5', content: 'Neural Networks Architecture', metadata: {} },
    ];

    for (const doc of docs) {
      await db.insert({
        id: doc.id,
        vector: await embedder.embed(doc.content),
        content: doc.content,
        metadata: doc.metadata,
      });
    }

    // Hybrid search
    const query = 'machine learning';
    logger.info(`\nHybrid search query: "${query}"`);

    const queryVector = await embedder.embed(query);
    const results = await db.hybridSearch(query, queryVector, {
      fusionType: 'rrf',
      vectorWeight: 0.7,
      limit: 3,
      includeContent: true,
    });

    logger.info('Results (RRF fusion):');
    results.forEach((result, i) => {
      logger.info(`  ${i + 1}. [${result.score.toFixed(4)}] ${result.document.content}`);
    });

    await embedder.destroy();
    await db.close();
    logger.info('');
  }

  async demonstrateDatabaseManager() {
    logger.info('=== Database Manager Demo ===');

    // Create embedder
    const embedder = EmbeddingProviderFactory.create({
      provider: 'tfidf',
      dimensions: 384,
    });
    await embedder.initialize();

    // Create manager
    const manager = new VectorDatabaseManager(embedder);

    // Create multiple databases
    manager.createMemoryDB('articles', { dimension: 384 });
    manager.createMemoryDB('conversations', { dimension: 384 });

    logger.info('Created 2 databases: articles, conversations');

    // Insert with automatic embedding
    await manager.insertWithEmbedding('articles', 'article-1', 'Introduction to AI', {
      author: 'John Doe',
      date: '2024-01-01',
    });

    await manager.insertWithEmbedding('articles', 'article-2', 'Machine Learning Basics', {
      author: 'Jane Smith',
      date: '2024-01-15',
    });

    logger.info('Inserted 2 articles with automatic embedding');

    // Search by text (automatic embedding)
    logger.info('\nSearching articles for "AI":');
    const results = await manager.searchByText('articles', 'artificial intelligence', {
      limit: 2,
      includeContent: true,
    });

    results.forEach((result, i) => {
      logger.info(`  ${i + 1}. [${result.score.toFixed(4)}] ${result.document.content}`);
    });

    // Batch insert
    await manager.insertBatchWithEmbedding('conversations', [
      { id: 'conv-1', content: 'Hello, how are you?', metadata: { user: 'user1' } },
      { id: 'conv-2', content: 'I need help with programming', metadata: { user: 'user2' } },
      { id: 'conv-3', content: 'What is the weather today?', metadata: { user: 'user1' } },
    ]);

    logger.info('\nInserted 3 conversations in batch');

    await manager.closeAll();
    logger.info('All databases closed\n');
  }

  async demonstrateSemanticSimilarity() {
    logger.info('=== Semantic Similarity Demo ===');

    const embedder = EmbeddingProviderFactory.create({
      provider: 'tfidf',
      dimensions: 384,
    });
    await embedder.initialize();

    // Compare semantic similarity
    const pairs = [
      ['Machine learning is amazing', 'ML is incredible'],
      ['I love programming', 'Coding is my passion'],
      ['The weather is nice', 'Machine learning is fascinating'],
    ];

    logger.info('Comparing semantic similarity:\n');

    for (const [text1, text2] of pairs) {
      const vec1 = await embedder.embed(text1);
      const vec2 = await embedder.embed(text2);

      // Cosine similarity
      const similarity = this.cosineSimilarity(vec1, vec2);

      logger.info(`Text 1: "${text1}"`);
      logger.info(`Text 2: "${text2}"`);
      logger.info(`Similarity: ${(similarity * 100).toFixed(2)}%`);
      logger.info('');
    }

    await embedder.destroy();
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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Run the example
async function main() {
  const example = new VectorMemoryExample();

  try {
    await example.run();
  } catch (error) {
    logger.error('Example failed:', {}, error as Error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { VectorMemoryExample };
