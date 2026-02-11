/**
 * Enhanced Streaming Support
 *
 * Provides advanced streaming capabilities including backpressure handling,
 * Server-Sent Events (SSE), WebSocket support, and streaming decision execution.
 * Compatible with both browser and Node.js environments.
 */

import type { LLMProvider, LLMRequest } from '../llm/provider.js';

// ============================================
// Types
// ============================================

export interface StreamConfig {
  enableBackpressure: boolean;
  highWaterMark: number;
  lowWaterMark: number;
  bufferSize: number;
  timeout: number;
}

export interface StreamMetrics {
  chunksReceived: number;
  chunksProcessed: number;
  bytesReceived: number;
  startTime: number;
  endTime?: number;
  averageChunkSize: number;
  backpressureEvents: number;
}

export interface SSEConfig {
  endpoint: string;
  headers?: Record<string, string>;
  retryInterval: number;
  maxRetries: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval: number;
  maxReconnects: number;
  heartbeatInterval: number;
}

export type StreamTransform<T, R> = (chunk: T) => R | Promise<R>;

export interface StreamingDecisionContext {
  streamId: string;
  partialResults: unknown[];
  confidence: number;
  isComplete: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  enableBackpressure: true,
  highWaterMark: 16,
  lowWaterMark: 4,
  bufferSize: 1024 * 1024, // 1MB
  timeout: 30000,
};

// ============================================
// Backpressure Controller
// ============================================

export class BackpressureController {
  private paused = false;
  private resumeCallbacks: Array<() => void> = [];
  private config: StreamConfig;
  private bufferSize = 0;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
  }

  /**
   * Check if stream should pause
   */
  shouldPause(): boolean {
    return this.config.enableBackpressure && this.bufferSize >= this.config.highWaterMark;
  }

  /**
   * Check if stream should resume
   */
  shouldResume(): boolean {
    return this.paused && this.bufferSize <= this.config.lowWaterMark;
  }

  /**
   * Pause the stream
   */
  pause(): Promise<void> {
    if (this.paused) return Promise.resolve();

    this.paused = true;
    return new Promise((resolve) => {
      this.resumeCallbacks.push(resolve);
    });
  }

  /**
   * Resume the stream
   */
  resume(): void {
    if (!this.paused) return;

    this.paused = false;
    const callbacks = this.resumeCallbacks;
    this.resumeCallbacks = [];
    callbacks.forEach((cb) => cb());
  }

  /**
   * Update buffer size
   */
  updateBufferSize(delta: number): void {
    this.bufferSize = Math.max(0, this.bufferSize + delta);

    if (this.shouldResume()) {
      this.resume();
    }
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.bufferSize;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }
}

// ============================================
// Enhanced Stream Processor
// ============================================

export class EnhancedStreamProcessor<T> {
  private controller: BackpressureController;
  private transforms: Array<StreamTransform<T, T>> = [];
  private metrics: StreamMetrics;
  private aborted = false;
  private abortController: AbortController;

  constructor(config?: Partial<StreamConfig>) {
    this.controller = new BackpressureController(config);
    this.abortController = new AbortController();
    this.metrics = {
      chunksReceived: 0,
      chunksProcessed: 0,
      bytesReceived: 0,
      startTime: Date.now(),
      averageChunkSize: 0,
      backpressureEvents: 0,
    };
  }

  /**
   * Add transform to the pipeline
   */
  pipe<R>(transform: StreamTransform<T, R>): EnhancedStreamProcessor<R> {
    const processor = new EnhancedStreamProcessor<R>();
    // Type casting needed due to TypeScript limitations with generic array spread
    (processor as unknown as { transforms: Array<StreamTransform<R, R>> }).transforms = [
      ...(this.transforms as unknown as Array<StreamTransform<R, R>>),
      transform as unknown as StreamTransform<R, R>,
    ];
    return processor;
  }

  /**
   * Process stream with backpressure handling
   */
  async *process(source: AsyncIterableIterator<T>): AsyncIterableIterator<T> {
    for await (const chunk of source) {
      if (this.aborted) {
        throw new Error('Stream aborted');
      }

      // Handle backpressure
      if (this.controller.shouldPause()) {
        this.metrics.backpressureEvents++;
        await this.controller.pause();
      }

      this.metrics.chunksReceived++;
      this.metrics.bytesReceived += this.estimateSize(chunk);

      // Apply transforms
      let result: unknown = chunk;
      for (const transform of this.transforms) {
        result = await transform(result as T);
      }

      this.metrics.chunksProcessed++;
      this.updateMetrics();

      yield result as T;

      // Update buffer size (simulate consumption)
      this.controller.updateBufferSize(-1);
    }

    this.metrics.endTime = Date.now();
  }

  /**
   * Process with timeout
   */
  async *processWithTimeout(
    source: AsyncIterableIterator<T>,
    timeoutMs: number
  ): AsyncIterableIterator<T> {
    const timeoutId = setTimeout(() => {
      this.abort();
    }, timeoutMs);

    try {
      yield* this.process(source);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Abort processing
   */
  abort(): void {
    this.aborted = true;
    this.abortController.abort();
  }

  /**
   * Get metrics
   */
  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  private estimateSize(chunk: T): number {
    if (typeof chunk === 'string') return chunk.length;
    if (typeof chunk === 'object') return JSON.stringify(chunk).length;
    return 0;
  }

  private updateMetrics(): void {
    if (this.metrics.chunksReceived > 0) {
      this.metrics.averageChunkSize = this.metrics.bytesReceived / this.metrics.chunksReceived;
    }
  }
}

// ============================================
// Server-Sent Events (SSE) Transport
// ============================================

export class SSETransport {
  private config: SSEConfig;
  private eventSource?: EventSource;
  private reconnectCount = 0;
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(config: SSEConfig) {
    this.config = config;
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.config.endpoint);

        this.eventSource.onopen = () => {
          this.reconnectCount = 0;
          resolve();
        };

        this.eventSource.onerror = (error) => {
          if (this.reconnectCount < this.config.maxRetries) {
            this.reconnectCount++;
            setTimeout(() => this.connect(), this.config.retryInterval);
          } else {
            reject(error);
          }
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to event type
   */
  on(eventType: string, handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  /**
   * Send data via SSE (requires POST endpoint)
   */
  async send(data: unknown): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`SSE send failed: ${response.statusText}`);
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
    this.listeners.clear();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type || 'message';

      const handlers = this.listeners.get(eventType);
      handlers?.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('SSE handler error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  }
}

// ============================================
// WebSocket Transport
// ============================================

export class WebSocketTransport {
  private config: WebSocketConfig;
  private ws?: WebSocket;
  private reconnectCount = 0;
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private messageQueue: unknown[] = [];

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        this.ws.onopen = () => {
          this.reconnectCount = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to message type
   */
  on(messageType: string, handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    this.listeners.get(messageType)!.add(handler);

    return () => {
      this.listeners.get(messageType)?.delete(handler);
    };
  }

  /**
   * Send message
   */
  send(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = undefined;
    this.listeners.clear();
    this.messageQueue = [];
  }

  private attemptReconnect(): void {
    if (this.reconnectCount < this.config.maxReconnects) {
      this.reconnectCount++;
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnect failed, will try again
        });
      }, this.config.reconnectInterval);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send('ping', { timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws?.send(message as string);
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const handlers = this.listeners.get(message.type);
      handlers?.forEach((handler) => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('WebSocket handler error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }
}

// ============================================
// Streaming Decision Engine
// ============================================

export class StreamingDecisionEngine {
  private llmProvider: LLMProvider;
  private activeStreams = new Map<string, StreamingDecisionContext>();

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Stream decision making process
   */
  async *streamDecision(
    input: string,
    _context: Record<string, unknown> = {}
  ): AsyncIterableIterator<{
    type: 'thinking' | 'action' | 'observation' | 'result';
    content: unknown;
    confidence: number;
  }> {
    const streamId = this.generateId();
    const streamContext: StreamingDecisionContext = {
      streamId,
      partialResults: [],
      confidence: 0,
      isComplete: false,
    };
    this.activeStreams.set(streamId, streamContext);

    try {
      // Stream thinking process
      yield { type: 'thinking', content: 'Analyzing input...', confidence: 0.1 };

      const request: LLMRequest = {
        messages: [
          { role: 'system', content: 'You are a decision-making AI. Think step by step.' },
          { role: 'user', content: input },
        ],
        stream: true,
        temperature: 0.7,
      };

      let accumulatedContent = '';
      const stream = this.llmProvider.stream(request);

      for await (const chunk of stream) {
        if (chunk.delta.content) {
          accumulatedContent += chunk.delta.content;

          // Parse partial decisions
          const partialDecision = this.parsePartialDecision(accumulatedContent);
          if (partialDecision) {
            streamContext.confidence = partialDecision.confidence;
            yield {
              type: partialDecision.type,
              content: partialDecision.content,
              confidence: partialDecision.confidence,
            };
          }
        }
      }

      // Final result
      const finalDecision = this.parseFinalDecision(accumulatedContent);
      streamContext.isComplete = true;
      yield {
        type: 'result',
        content: finalDecision,
        confidence: streamContext.confidence,
      };
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Get active stream context
   */
  getStreamContext(streamId: string): StreamingDecisionContext | undefined {
    return this.activeStreams.get(streamId);
  }

  private parsePartialDecision(content: string): { type: 'thinking' | 'action' | 'observation'; content: unknown; confidence: number } | null {
    // Simple heuristic parsing
    if (content.includes('Action:')) {
      return { type: 'action', content: content.split('Action:')[1].trim(), confidence: 0.7 };
    }
    if (content.includes('Observation:')) {
      return { type: 'observation', content: content.split('Observation:')[1].trim(), confidence: 0.8 };
    }
    if (content.length > 50) {
      return { type: 'thinking', content: content.slice(-100), confidence: 0.5 };
    }
    return null;
  }

  private parseFinalDecision(content: string): unknown {
    try {
      // Try to extract JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return { decision: content.trim() };
    } catch {
      return { decision: content.trim() };
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Export
// ============================================

export { EnhancedStreamProcessor as default };
