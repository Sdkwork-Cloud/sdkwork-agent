/**
 * Embedding Service
 * 
 * Provides semantic analysis and embedding capabilities for intelligent task processing.
 */

export class EmbeddingService {
  /**
   * Analyze task complexity based on semantic content
   */
  async analyzeComplexity(text: string): Promise<number> {
    // Simple heuristic for complexity analysis
    const wordCount = text.split(' ').length;
    const sentenceCount = text.split(/[.!?]/).length;
    const uniqueWords = new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 0)).size;
    
    // Calculate complexity score (0-1)
    const wordScore = Math.min(1, wordCount / 100);
    const sentenceScore = Math.min(1, sentenceCount / 10);
    const vocabularyScore = Math.min(1, uniqueWords / 50);
    
    return (wordScore * 0.4 + sentenceScore * 0.3 + vocabularyScore * 0.3);
  }

  /**
   * Calculate semantic similarity between two texts
   */
  calculateSemanticSimilarity(text1: string, text2: string): number {
    // Simple bag-of-words similarity
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 0));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 0));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate embedding vector for text (simplified)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Simplified embedding generation
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const embedding: number[] = [];
    
    // Generate simple vector based on word frequencies
    for (let i = 0; i < 10; i++) {
      const charCodeSum = words
        .filter((_, index) => index % 10 === i)
        .reduce((sum, word) => sum + word.charCodeAt(0), 0);
      embedding.push(charCodeSum / 1000);
    }
    
    return embedding;
  }

  /**
   * Compare embeddings to find similarity
   */
  compareEmbeddings(embedding1: number[], embedding2: number[]): number {
    // Calculate cosine similarity
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * (embedding2[i] || 0), 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude1 * magnitude2 > 0 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }
}

export default EmbeddingService;