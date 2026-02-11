/**
 * MemGPT 风格分层记忆系统
 *
 * 参考: "MemGPT: Towards LLMs as Operating Systems"
 * https://arxiv.org/abs/2310.08560
 *
 * 核心概念:
 * 1. Core Memory (核心记忆) - 有限但快速访问的关键信息
 * 2. Recall Memory (回忆记忆) - 向量数据库存储的历史对话
 * 3. Archival Memory (归档记忆) - 长期存储的压缩信息
 * 4. Working Context (工作上下文) - 当前会话的临时状态
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { HNSWVectorDatabase } from './hnsw-vector-database.js';
import type { SearchOptions } from './vector-database.js';

// ============================================
// 类型定义
// ============================================

export interface MemGPTConfig {
  /** 核心记忆大小限制 (字符数) */
  coreMemoryLimit: number;
  /** 回忆记忆最大条目数 */
  recallMemoryLimit: number;
  /** 归档记忆最大条目数 */
  archivalMemoryLimit: number;
  /** 工作上下文大小限制 */
  workingContextLimit: number;
  /** 自动归档阈值 */
  autoArchiveThreshold: number;
  /** 记忆重要性阈值 */
  importanceThreshold: number;
  /** 向量维度 */
  embeddingDimension: number;
  /** 相似度阈值 */
  similarityThreshold: number;
  /** 是否启用自动归档 */
  enableAutoArchive: boolean;
  /** 是否启用记忆压缩 */
  enableCompression: boolean;
}

export interface CoreMemory {
  /** 人物信息 */
  persona: string;
  /** 用户偏好 */
  human: string;
  /** 系统指令 */
  system: string;
  /** 功能说明 */
  functions: string;
  /** 元数据 */
  metadata: Map<string, string>;
}

export interface RecallMemoryEntry {
  id: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 重要性评分 (0-1) */
  importance: number;
  /** 情感标签 */
  sentiment?: string;
  /** 关键词 */
  keywords: string[];
  /** 关联的记忆ID */
  relatedIds: string[];
  /** 向量表示 */
  embedding?: number[];
}

export interface ArchivalMemoryEntry {
  id: string;
  /** 压缩后的内容摘要 */
  summary: string;
  /** 原始内容长度 */
  originalLength: number;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessed: Date;
  /** 访问次数 */
  accessCount: number;
  /** 类别标签 */
  category: string;
  /** 向量表示 */
  embedding?: number[];
}

export interface WorkingContext {
  /** 当前会话ID */
  sessionId: string;
  /** 当前话题 */
  currentTopic?: string;
  /** 待处理任务 */
  pendingTasks: Task[];
  /** 临时变量 */
  variables: Map<string, unknown>;
  /** 最近操作 */
  recentActions: Action[];
  /** 上下文开始时间 */
  startTime: Date;
}

export interface Task {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  deadline?: Date;
}

export interface Action {
  type: string;
  description: string;
  timestamp: Date;
  result?: unknown;
}

export interface MemorySearchResult {
  entry: RecallMemoryEntry | ArchivalMemoryEntry;
  score: number;
  source: 'core' | 'recall' | 'archival';
}

export interface MemoryStats {
  coreMemorySize: number;
  recallMemoryCount: number;
  archivalMemoryCount: number;
  workingContextSize: number;
  totalMemorySize: number;
  lastArchiveTime?: Date;
}

// ============================================
// MemGPT 记忆管理器
// ============================================

export class MemGPTMemory extends EventEmitter {
  private config: MemGPTConfig;

  // 四层记忆系统
  private coreMemory: CoreMemory;
  private recallMemory: Map<string, RecallMemoryEntry>;
  private archivalMemory: Map<string, ArchivalMemoryEntry>;
  private workingContext: WorkingContext;

  // 向量数据库 (用于回忆和归档记忆的语义搜索)
  private recallVectorDB: HNSWVectorDatabase;
  private archivalVectorDB: HNSWVectorDatabase;

  // 记忆操作队列 (未来使用)
  // private operationQueue: Array<() => Promise<void>> = [];
  // private isProcessingQueue = false;

  constructor(config: Partial<MemGPTConfig> = {}) {
    super();

    this.config = {
      coreMemoryLimit: 2000,
      recallMemoryLimit: 1000,
      archivalMemoryLimit: 10000,
      workingContextLimit: 5000,
      autoArchiveThreshold: 100,
      importanceThreshold: 0.5,
      embeddingDimension: 1536,
      similarityThreshold: 0.7,
      enableAutoArchive: true,
      enableCompression: true,
      ...config,
    };

    // 初始化核心记忆
    this.coreMemory = {
      persona: '',
      human: '',
      system: '',
      functions: '',
      metadata: new Map(),
    };

    // 初始化回忆记忆
    this.recallMemory = new Map();

    // 初始化归档记忆
    this.archivalMemory = new Map();

    // 初始化工作上下文
    this.workingContext = {
      sessionId: this.generateId(),
      pendingTasks: [],
      variables: new Map(),
      recentActions: [],
      startTime: new Date(),
    };

    // 初始化向量数据库
    const vectorDBConfig = {
      provider: 'memory' as const,
      connection: {},
      collection: 'recall_memory',
      dimension: this.config.embeddingDimension,
      metric: 'cosine' as const,
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true,
      cacheSize: 1000,
    };

    this.recallVectorDB = new HNSWVectorDatabase(vectorDBConfig);

    this.archivalVectorDB = new HNSWVectorDatabase({
      ...vectorDBConfig,
      collection: 'archival_memory',
    });
  }

  /**
   * 初始化记忆系统
   */
  async initialize(): Promise<void> {
    await this.recallVectorDB.initialize();
    await this.archivalVectorDB.initialize();
    this.emit('initialized');
  }

  // ============================================
  // 核心记忆操作
  // ============================================

  /**
   * 更新核心记忆
   */
  updateCoreMemory(section: keyof Omit<CoreMemory, 'metadata'>, content: string): void {
    const currentSize = this.getCoreMemorySize();
    const newSize = currentSize - this.coreMemory[section].length + content.length;

    if (newSize > this.config.coreMemoryLimit) {
      // 需要压缩或清理
      this.compressCoreMemory();
    }

    this.coreMemory[section] = content;
    this.emit('coreMemoryUpdated', { section, content });
  }

  /**
   * 获取核心记忆
   */
  getCoreMemory(): CoreMemory {
    return { ...this.coreMemory };
  }

  /**
   * 设置核心记忆元数据
   */
  setCoreMetadata(key: string, value: string): void {
    this.coreMemory.metadata.set(key, value);
  }

  /**
   * 获取核心记忆元数据
   */
  getCoreMetadata(key: string): string | undefined {
    return this.coreMemory.metadata.get(key);
  }

  /**
   * 获取核心记忆大小
   */
  private getCoreMemorySize(): number {
    return (
      this.coreMemory.persona.length +
      this.coreMemory.human.length +
      this.coreMemory.system.length +
      this.coreMemory.functions.length +
      Array.from(this.coreMemory.metadata.values()).reduce((sum, v) => sum + v.length, 0)
    );
  }

  /**
   * 压缩核心记忆
   */
  private compressCoreMemory(): void {
    // 压缩策略：保留关键信息，移除冗余
    if (this.coreMemory.persona.length > 500) {
      this.coreMemory.persona = this.summarizeText(this.coreMemory.persona, 500);
    }
    if (this.coreMemory.human.length > 500) {
      this.coreMemory.human = this.summarizeText(this.coreMemory.human, 500);
    }
  }

  // ============================================
  // 回忆记忆操作
  // ============================================

  /**
   * 添加回忆记忆条目
   */
  async addRecallEntry(entry: Omit<RecallMemoryEntry, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId();
    const fullEntry: RecallMemoryEntry = {
      ...entry,
      id,
      timestamp: new Date(),
    };

    // 检查是否需要自动归档
    if (this.config.enableAutoArchive && this.recallMemory.size >= this.config.autoArchiveThreshold) {
      await this.archiveOldMemories();
    }

    // 添加到回忆记忆
    this.recallMemory.set(id, fullEntry);

    // 添加到向量数据库 (如果有embedding)
    if (fullEntry.embedding) {
      await this.recallVectorDB.insert({
        id,
        vector: fullEntry.embedding,
        content: fullEntry.content,
        metadata: {
          role: fullEntry.role,
          importance: fullEntry.importance,
          keywords: fullEntry.keywords,
        },
      });
    }

    this.emit('recallEntryAdded', fullEntry);
    return id;
  }

  /**
   * 获取回忆记忆条目
   */
  getRecallEntry(id: string): RecallMemoryEntry | undefined {
    return this.recallMemory.get(id);
  }

  /**
   * 搜索回忆记忆
   */
  async searchRecall(
    query: string,
    queryEmbedding?: number[],
    options: SearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    // 1. 向量搜索 (如果有embedding)
    if (queryEmbedding) {
      const vectorResults = await this.recallVectorDB.search(queryEmbedding, {
        limit: options.limit || 10,
        threshold: this.config.similarityThreshold,
      });

      for (const result of vectorResults) {
        const entry = this.recallMemory.get(result.document.id);
        if (entry) {
          results.push({
            entry,
            score: result.score,
            source: 'recall',
          });
        }
      }
    }

    // 2. 关键词搜索
    const keywords = query.toLowerCase().split(/\s+/);
    for (const entry of this.recallMemory.values()) {
      const matchScore = this.calculateKeywordMatch(entry, keywords);
      if (matchScore > 0) {
        results.push({
          entry,
          score: matchScore,
          source: 'recall',
        });
      }
    }

    // 去重并排序
    const uniqueResults = this.deduplicateResults(results);
    uniqueResults.sort((a, b) => b.score - a.score);

    return uniqueResults.slice(0, options.limit || 10);
  }

  /**
   * 归档旧记忆
   */
  private async archiveOldMemories(): Promise<void> {
    // 选择重要性较低且较旧的记忆进行归档
    const entriesToArchive = Array.from(this.recallMemory.values())
      .filter(e => e.importance < this.config.importanceThreshold)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, Math.floor(this.recallMemory.size * 0.2)); // 归档20%

    for (const entry of entriesToArchive) {
      await this.archiveEntry(entry);
    }

    this.emit('memoriesArchived', entriesToArchive.length);
  }

  // ============================================
  // 归档记忆操作
  // ============================================

  /**
   * 归档记忆条目
   */
  private async archiveEntry(entry: RecallMemoryEntry): Promise<void> {
    const id = this.generateId();

    // 压缩内容
    const summary = this.config.enableCompression
      ? this.compressContent(entry.content)
      : entry.content.substring(0, 200) + '...';

    const archivalEntry: ArchivalMemoryEntry = {
      id,
      summary,
      originalLength: entry.content.length,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      category: this.categorizeContent(entry.content),
      embedding: entry.embedding,
    };

    // 添加到归档记忆
    this.archivalMemory.set(id, archivalEntry);

    // 添加到向量数据库
    if (archivalEntry.embedding) {
      await this.archivalVectorDB.insert({
        id,
        vector: archivalEntry.embedding,
        content: archivalEntry.summary,
        metadata: {
          category: archivalEntry.category,
          originalLength: archivalEntry.originalLength,
        },
      });
    }

    // 从回忆记忆中移除
    this.recallMemory.delete(entry.id);
    await this.recallVectorDB.delete(entry.id);

    this.emit('entryArchived', archivalEntry);
  }

  /**
   * 搜索归档记忆
   */
  async searchArchival(
    query: string,
    queryEmbedding?: number[],
    options: SearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    // 向量搜索
    if (queryEmbedding) {
      const vectorResults = await this.archivalVectorDB.search(queryEmbedding, {
        limit: options.limit || 5,
        threshold: this.config.similarityThreshold,
      });

      for (const result of vectorResults) {
        const entry = this.archivalMemory.get(result.document.id);
        if (entry) {
          entry.accessCount++;
          entry.lastAccessed = new Date();
          results.push({
            entry,
            score: result.score * 0.9, // 归档记忆分数稍低
            source: 'archival',
          });
        }
      }
    }

    // 关键词搜索
    const keywords = query.toLowerCase().split(/\s+/);
    for (const entry of this.archivalMemory.values()) {
      const matchScore = this.calculateKeywordMatchInSummary(entry, keywords);
      if (matchScore > 0) {
        entry.accessCount++;
        entry.lastAccessed = new Date();
        results.push({
          entry,
          score: matchScore * 0.9,
          source: 'archival',
        });
      }
    }

    const uniqueResults = this.deduplicateResults(results);
    uniqueResults.sort((a, b) => b.score - a.score);

    return uniqueResults.slice(0, options.limit || 5);
  }

  // ============================================
  // 工作上下文操作
  // ============================================

  /**
   * 设置当前话题
   */
  setCurrentTopic(topic: string): void {
    this.workingContext.currentTopic = topic;
  }

  /**
   * 添加任务
   */
  addTask(description: string, priority: Task['priority'] = 'medium', deadline?: Date): string {
    const id = this.generateId();
    const task: Task = {
      id,
      description,
      priority,
      status: 'pending',
      createdAt: new Date(),
      deadline,
    };

    this.workingContext.pendingTasks.push(task);
    this.emit('taskAdded', task);
    return id;
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string): boolean {
    const task = this.workingContext.pendingTasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      this.emit('taskCompleted', task);
      return true;
    }
    return false;
  }

  /**
   * 获取待处理任务
   */
  getPendingTasks(): Task[] {
    return this.workingContext.pendingTasks.filter(t => t.status !== 'completed');
  }

  /**
   * 设置上下文变量
   */
  setVariable(key: string, value: unknown): void {
    this.workingContext.variables.set(key, value);
  }

  /**
   * 获取上下文变量
   */
  getVariable(key: string): unknown | undefined {
    return this.workingContext.variables.get(key);
  }

  /**
   * 记录操作
   */
  recordAction(type: string, description: string, result?: unknown): void {
    const action: Action = {
      type,
      description,
      timestamp: new Date(),
      result,
    };

    this.workingContext.recentActions.push(action);

    // 限制最近操作数量
    if (this.workingContext.recentActions.length > 20) {
      this.workingContext.recentActions.shift();
    }

    this.emit('actionRecorded', action);
  }

  /**
   * 获取最近操作
   */
  getRecentActions(limit: number = 10): Action[] {
    return this.workingContext.recentActions.slice(-limit);
  }

  /**
   * 清空工作上下文
   */
  clearWorkingContext(): void {
    this.workingContext = {
      sessionId: this.generateId(),
      pendingTasks: [],
      variables: new Map(),
      recentActions: [],
      startTime: new Date(),
    };
    this.emit('workingContextCleared');
  }

  // ============================================
  // 统一搜索接口
  // ============================================

  /**
   * 统一搜索所有记忆层
   */
  async search(
    query: string,
    queryEmbedding?: number[],
    options: { limit?: number; includeCore?: boolean } = {}
  ): Promise<{
    core: string[];
    recall: MemorySearchResult[];
    archival: MemorySearchResult[];
  }> {
    const { limit = 10, includeCore = true } = options;

    // 搜索核心记忆
    const coreResults: string[] = [];
    if (includeCore) {
      if (this.coreMemory.persona.toLowerCase().includes(query.toLowerCase())) {
        coreResults.push('persona');
      }
      if (this.coreMemory.human.toLowerCase().includes(query.toLowerCase())) {
        coreResults.push('human');
      }
    }

    // 并行搜索回忆和归档记忆
    const [recallResults, archivalResults] = await Promise.all([
      this.searchRecall(query, queryEmbedding, { limit: Math.ceil(limit / 2) }),
      this.searchArchival(query, queryEmbedding, { limit: Math.floor(limit / 2) }),
    ]);

    return {
      core: coreResults,
      recall: recallResults,
      archival: archivalResults,
    };
  }

  // ============================================
  // 辅助方法
  // ============================================

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 文本摘要
   */
  private summarizeText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // 简单的摘要策略：保留开头和结尾，中间用省略号
    const halfLength = Math.floor((maxLength - 3) / 2);
    return text.substring(0, halfLength) + '...' + text.substring(text.length - halfLength);
  }

  /**
   * 压缩内容
   */
  private compressContent(content: string): string {
    // 提取关键句 (简化版)
    const sentences = content.split(/[.!?。！？]+/);
    const keySentences = sentences.slice(0, 3); // 取前3句
    return keySentences.join('. ') + (sentences.length > 3 ? '...' : '');
  }

  /**
   * 内容分类
   */
  private categorizeContent(content: string): string {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('code') || lowerContent.includes('function')) {
      return 'code';
    } else if (lowerContent.includes('meeting') || lowerContent.includes('discuss')) {
      return 'meeting';
    } else if (lowerContent.includes('task') || lowerContent.includes('todo')) {
      return 'task';
    } else if (lowerContent.includes('question') || lowerContent.includes('?')) {
      return 'question';
    }

    return 'general';
  }

  /**
   * 计算关键词匹配分数
   */
  private calculateKeywordMatch(entry: RecallMemoryEntry, keywords: string[]): number {
    const content = entry.content.toLowerCase();
    let matches = 0;

    for (const keyword of keywords) {
      if (content.includes(keyword)) matches++;
      if (entry.keywords.some(k => k.toLowerCase().includes(keyword))) matches += 2;
    }

    return matches / (keywords.length * 3); // 归一化
  }

  /**
   * 计算归档摘要的关键词匹配
   */
  private calculateKeywordMatchInSummary(entry: ArchivalMemoryEntry, keywords: string[]): number {
    const summary = entry.summary.toLowerCase();
    let matches = 0;

    for (const keyword of keywords) {
      if (summary.includes(keyword)) matches++;
    }

    return matches / keywords.length;
  }

  /**
   * 结果去重
   */
  private deduplicateResults(results: MemorySearchResult[]): MemorySearchResult[] {
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.entry.id)) return false;
      seen.add(r.entry.id);
      return true;
    });
  }

  // ============================================
  // 统计和导出
  // ============================================

  /**
   * 获取记忆统计
   */
  getStats(): MemoryStats {
    const recallSize = Array.from(this.recallMemory.values()).reduce(
      (sum, e) => sum + e.content.length,
      0
    );
    const archivalSize = Array.from(this.archivalMemory.values()).reduce(
      (sum, e) => sum + e.summary.length,
      0
    );

    return {
      coreMemorySize: this.getCoreMemorySize(),
      recallMemoryCount: this.recallMemory.size,
      archivalMemoryCount: this.archivalMemory.size,
      workingContextSize: JSON.stringify(this.workingContext).length,
      totalMemorySize: recallSize + archivalSize,
    };
  }

  /**
   * 导出所有记忆
   */
  async export(): Promise<{
    core: CoreMemory;
    recall: RecallMemoryEntry[];
    archival: ArchivalMemoryEntry[];
    context: WorkingContext;
  }> {
    return {
      core: this.getCoreMemory(),
      recall: Array.from(this.recallMemory.values()),
      archival: Array.from(this.archivalMemory.values()),
      context: this.workingContext,
    };
  }

  /**
   * 导入记忆
   */
  async import(data: {
    core: CoreMemory;
    recall: RecallMemoryEntry[];
    archival: ArchivalMemoryEntry[];
  }): Promise<void> {
    // 导入核心记忆
    this.coreMemory = {
      ...data.core,
      metadata: new Map(Object.entries(data.core.metadata || {})),
    };

    // 导入回忆记忆
    this.recallMemory.clear();
    for (const entry of data.recall) {
      this.recallMemory.set(entry.id, entry);
    }

    // 导入归档记忆
    this.archivalMemory.clear();
    for (const entry of data.archival) {
      this.archivalMemory.set(entry.id, entry);
    }

    this.emit('memoryImported');
  }

  /**
   * 清空所有记忆
   */
  async clear(): Promise<void> {
    this.coreMemory = {
      persona: '',
      human: '',
      system: '',
      functions: '',
      metadata: new Map(),
    };
    this.recallMemory.clear();
    this.archivalMemory.clear();
    this.clearWorkingContext();

    await this.recallVectorDB.clear();
    await this.archivalVectorDB.clear();

    this.emit('memoryCleared');
  }
}

// ============================================
// 导出便捷函数
// ============================================

export function createMemGPTMemory(config: Partial<MemGPTConfig> = {}): MemGPTMemory {
  return new MemGPTMemory(config);
}

export function createDefaultMemGPTConfig(): MemGPTConfig {
  return {
    coreMemoryLimit: 2000,
    recallMemoryLimit: 1000,
    archivalMemoryLimit: 10000,
    workingContextLimit: 5000,
    autoArchiveThreshold: 100,
    importanceThreshold: 0.5,
    embeddingDimension: 1536,
    similarityThreshold: 0.7,
    enableAutoArchive: true,
    enableCompression: true,
  };
}
