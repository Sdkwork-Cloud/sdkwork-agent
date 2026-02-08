/**
 * 统一记忆存储适配器接口
 * 
 * 提供完美的存储抽象层，支持多种存储后端：
 * - Memory: 内存存储（高速，临时）
 * - File: 文件存储（持久化，本地）
 * - IndexedDB: 浏览器IndexedDB（持久化，前端）
 * - Redis: Redis存储（分布式，高性能）
 * - SQLite: SQLite数据库存储（关系型，本地）
 * - Vector: 向量数据库存储（语义检索）
 * 
 * @module StorageAdapter
 * @version 1.0.0
 * @architecture Unified Storage Abstraction Layer
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger, createLogger } from '../../utils/logger.js';

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 存储类型
 */
export type StorageType = 
  | 'memory' 
  | 'file' 
  | 'indexeddb' 
  | 'redis' 
  | 'sqlite' 
  | 'vector'
  | 'hybrid';

/**
 * 存储层级
 */
export type StorageTier = 'working' | 'short_term' | 'long_term' | 'archival';

/**
 * 记忆条目接口 - 统一的数据结构
 */
export interface MemoryItem {
  /** 唯一标识符 */
  id: string;
  
  /** 记忆内容 */
  content: string;
  
  /** 向量嵌入（可选） */
  embedding?: number[];
  
  /** 存储层级 */
  tier: StorageTier;
  
  /** 记忆类型 */
  type: MemoryType;
  
  /** 重要性评分 (0-1) */
  importance: number;
  
  /** 创建时间戳 */
  createdAt: number;
  
  /** 最后访问时间戳 */
  lastAccessed: number;
  
  /** 访问次数 */
  accessCount: number;
  
  /** 生存时间 (毫秒) */
  ttl?: number;
  
  /** 元数据 */
  metadata: MemoryMetadata;
}

/**
 * 记忆类型
 */
export type MemoryType =
  | 'conversation'   // 对话记录
  | 'fact'          // 事实信息
  | 'preference'    // 用户偏好
  | 'skill_usage'   // Skill使用记录
  | 'error'         // 错误记录
  | 'feedback'      // 用户反馈
  | 'context'       // 上下文信息
  | 'parameter'     // 参数值
  | 'reflection'    // 反思总结
  | 'knowledge';    // 知识图谱

/**
 * 记忆元数据
 */
export interface MemoryMetadata {
  /** 关联的Skill名称 */
  skillName?: string;
  
  /** 任务类型 */
  taskType?: string;
  
  /** 是否成功 */
  success?: boolean;
  
  /** 用户反馈 */
  userFeedback?: 'positive' | 'negative' | 'neutral';
  
  /** 标签 */
  tags?: string[];
  
  /** 来源 */
  source?: string;
  
  /** 会话ID */
  sessionId?: string;
  
  /** 用户ID */
  userId?: string;
  
  /** 自定义字段 */
  [key: string]: unknown;
}

/**
 * 存储配置基础接口
 */
export interface StorageConfig {
  /** 存储类型 */
  type: StorageType;
  
  /** 存储名称 */
  name: string;
  
  /** 是否启用 */
  enabled: boolean;
  
  /** 优先级（数字越小优先级越高） */
  priority: number;
  
  /** 存储特定配置 */
  options: Record<string, unknown>;
  
  /** 序列化配置 */
  serialization?: SerializationConfig;
  
  /** 压缩配置 */
  compression?: CompressionConfig;
  
  /** 加密配置 */
  encryption?: EncryptionConfig;
}

/**
 * 序列化配置
 */
export interface SerializationConfig {
  /** 序列化格式 */
  format: 'json' | 'msgpack' | 'protobuf';
  
  /** 是否包含类型信息 */
  includeTypes: boolean;
  
  /** 日期格式 */
  dateFormat: 'iso' | 'timestamp' | 'custom';
}

/**
 * 压缩配置
 */
export interface CompressionConfig {
  /** 是否启用压缩 */
  enabled: boolean;
  
  /** 压缩算法 */
  algorithm: 'gzip' | 'brotli' | 'lz4' | 'zstd';
  
  /** 压缩级别 */
  level: number;
  
  /** 压缩阈值（字节） */
  threshold: number;
}

/**
 * 加密配置
 */
export interface EncryptionConfig {
  /** 是否启用加密 */
  enabled: boolean;
  
  /** 加密算法 */
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
  
  /** 密钥（从环境变量或密钥管理服务获取） */
  key?: string;
}

/**
 * 查询选项
 */
export interface StorageQueryOptions {
  /** 存储层级过滤 */
  tier?: StorageTier | StorageTier[];
  
  /** 记忆类型过滤 */
  type?: MemoryType | MemoryType[];
  
  /** 标签过滤 */
  tags?: string[];
  
  /** 时间范围 */
  timeRange?: {
    start?: number;
    end?: number;
  };
  
  /** 重要性阈值 */
  importanceThreshold?: number;
  
  /** 最大返回数量 */
  limit?: number;
  
  /** 偏移量 */
  offset?: number;
  
  /** 排序方式 */
  sortBy?: 'createdAt' | 'lastAccessed' | 'importance' | 'accessCount';
  
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 语义查询选项
 */
export interface SemanticQueryOptions extends StorageQueryOptions {
  /** 查询向量 */
  queryEmbedding: number[];
  
  /** 相似度阈值 */
  similarityThreshold?: number;
  
  /** 向量权重 */
  vectorWeight?: number;
  
  /** 文本权重 */
  textWeight?: number;
}

/**
 * 查询结果
 */
export interface StorageQueryResult {
  /** 记忆条目 */
  item: MemoryItem;
  
  /** 综合得分 */
  score: number;
  
  /** 相似度得分（语义查询） */
  similarityScore?: number;
  
  /** 时间得分 */
  recencyScore?: number;
  
  /** 重要性得分 */
  importanceScore?: number;
}

/**
 * 存储统计
 */
export interface StorageStats {
  /** 总条目数 */
  totalCount: number;
  
  /** 各层级数量 */
  tierCounts: Record<StorageTier, number>;
  
  /** 各类型数量 */
  typeCounts: Record<MemoryType, number>;
  
  /** 总存储大小（字节） */
  totalSize: number;
  
  /** 平均条目大小 */
  averageItemSize: number;
  
  /** 缓存命中率 */
  cacheHitRate?: number;
  
  /** 查询平均耗时 */
  averageQueryTime?: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 成功的条目ID */
  succeeded: string[];
  
  /** 失败的条目 */
  failed: Array<{ id: string; error: string }>;
  
  /** 操作耗时 */
  duration: number;
}

/**
 * 存储事件类型
 */
export type StorageEventType =
  | 'item:stored'
  | 'item:retrieved'
  | 'item:updated'
  | 'item:deleted'
  | 'batch:completed'
  | 'storage:flushed'
  | 'storage:cleared'
  | 'storage:error';

/**
 * 存储事件
 */
export interface StorageEvent {
  type: StorageEventType;
  timestamp: number;
  storageType: StorageType;
  storageName: string;
  data?: unknown;
}

// ============================================================================
// 抽象存储适配器
// ============================================================================

/**
 * 抽象存储适配器基类
 * 
 * 所有具体存储实现必须继承此类，确保接口一致性
 */
export abstract class StorageAdapter extends EventEmitter {
  protected config: StorageConfig;
  protected logger: Logger;
  protected initialized = false;
  protected stats: StorageStats;

  constructor(config: StorageConfig) {
    super();
    this.config = config;
    this.logger = createLogger({ name: `${config.type}Storage` });
    this.stats = {
      totalCount: 0,
      tierCounts: { working: 0, short_term: 0, long_term: 0, archival: 0 },
      typeCounts: {} as Record<MemoryType, number>,
      totalSize: 0,
      averageItemSize: 0,
    };
  }

  // --------------------------------------------------------------------------
  // 生命周期方法
  // --------------------------------------------------------------------------

  /**
   * 初始化存储
   */
  abstract initialize(): Promise<void>;

  /**
   * 关闭存储
   */
  abstract close(): Promise<void>;

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // --------------------------------------------------------------------------
  // 核心CRUD操作
  // --------------------------------------------------------------------------

  /**
   * 存储单个记忆条目
   */
  abstract store(item: MemoryItem): Promise<void>;

  /**
   * 批量存储记忆条目
   */
  abstract storeBatch(items: MemoryItem[]): Promise<BatchOperationResult>;

  /**
   * 根据ID检索记忆
   */
  abstract retrieve(id: string): Promise<MemoryItem | null>;

  /**
   * 根据ID批量检索
   */
  abstract retrieveBatch(ids: string[]): Promise<MemoryItem[]>;

  /**
   * 条件查询
   */
  abstract query(options: StorageQueryOptions): Promise<StorageQueryResult[]>;

  /**
   * 语义搜索
   */
  abstract semanticQuery(options: SemanticQueryOptions): Promise<StorageQueryResult[]>;

  /**
   * 更新记忆条目
   */
  abstract update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null>;

  /**
   * 删除记忆条目
   */
  abstract delete(id: string): Promise<boolean>;

  /**
   * 批量删除
   */
  abstract deleteBatch(ids: string[]): Promise<BatchOperationResult>;

  /**
   * 条件删除
   */
  abstract deleteByQuery(options: StorageQueryOptions): Promise<number>;

  // --------------------------------------------------------------------------
  // 管理操作
  // --------------------------------------------------------------------------

  /**
   * 清空存储
   */
  abstract clear(): Promise<void>;

  /**
   * 刷新到持久化存储
   */
  abstract flush(): Promise<void>;

  /**
   * 获取统计信息
   */
  abstract getStats(): Promise<StorageStats>;

  /**
   * 检查存储健康状态
   */
  abstract healthCheck(): Promise<{ healthy: boolean; message?: string }>;

  // --------------------------------------------------------------------------
  // 事务支持（可选）
  // --------------------------------------------------------------------------

  /**
   * 开始事务
   */
  async beginTransaction?(): Promise<void>;

  /**
   * 提交事务
   */
  async commitTransaction?(): Promise<void>;

  /**
   * 回滚事务
   */
  async rollbackTransaction?(): Promise<void>;

  // --------------------------------------------------------------------------
  // 保护方法
  // --------------------------------------------------------------------------

  /**
   * 序列化记忆条目
   */
  protected serialize(item: MemoryItem): string | Buffer {
    const config = this.config.serialization || { format: 'json', includeTypes: true, dateFormat: 'iso' };
    
    switch (config.format) {
      case 'json':
        return JSON.stringify(item);
      case 'msgpack':
        // 需要 msgpack 库支持
        return JSON.stringify(item); // 回退到 JSON
      default:
        return JSON.stringify(item);
    }
  }

  /**
   * 反序列化记忆条目
   */
  protected deserialize(data: string | Buffer): MemoryItem {
    const config = this.config.serialization || { format: 'json', includeTypes: true, dateFormat: 'iso' };
    
    switch (config.format) {
      case 'json':
      case 'msgpack':
      default:
        return JSON.parse(data.toString()) as MemoryItem;
    }
  }

  /**
   * 压缩数据
   */
  protected async compress(data: string | Buffer): Promise<Buffer> {
    const config = this.config.compression;
    if (!config?.enabled) {
      return Buffer.isBuffer(data) ? data : Buffer.from(data);
    }

    if (data.length < (config.threshold || 1024)) {
      return Buffer.isBuffer(data) ? data : Buffer.from(data);
    }

    // 实际压缩实现需要引入 zlib 等库
    // 这里返回原始数据作为占位
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  /**
   * 解压数据
   */
  protected async decompress(data: Buffer): Promise<string> {
    const config = this.config.compression;
    if (!config?.enabled) {
      return data.toString();
    }

    // 实际解压实现
    return data.toString();
  }

  /**
   * 加密数据
   */
  protected async encrypt(data: string | Buffer): Promise<Buffer> {
    const config = this.config.encryption;
    if (!config?.enabled) {
      return Buffer.isBuffer(data) ? data : Buffer.from(data);
    }

    // 实际加密实现需要引入 crypto 库
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  /**
   * 解密数据
   */
  protected async decrypt(data: Buffer): Promise<string> {
    const config = this.config.encryption;
    if (!config?.enabled) {
      return data.toString();
    }

    // 实际解密实现
    return data.toString();
  }

  /**
   * 生成唯一ID
   */
  protected generateId(): string {
    return `${this.config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新统计信息
   */
  protected updateStats(operation: 'add' | 'remove' | 'update', item?: MemoryItem): void {
    if (operation === 'add' && item) {
      this.stats.totalCount++;
      this.stats.tierCounts[item.tier]++;
      this.stats.typeCounts[item.type] = (this.stats.typeCounts[item.type] || 0) + 1;
    } else if (operation === 'remove' && item) {
      this.stats.totalCount = Math.max(0, this.stats.totalCount - 1);
      this.stats.tierCounts[item.tier] = Math.max(0, this.stats.tierCounts[item.tier] - 1);
      this.stats.typeCounts[item.type] = Math.max(0, (this.stats.typeCounts[item.type] || 0) - 1);
    }

    // 重新计算平均大小
    if (this.stats.totalCount > 0) {
      // 简化计算，实际应该跟踪总大小
      this.stats.averageItemSize = this.stats.totalSize / this.stats.totalCount;
    }
  }

  /**
   * 发射存储事件
   */
  protected emitEvent(type: StorageEventType, data?: unknown): void {
    const event: StorageEvent = {
      type,
      timestamp: Date.now(),
      storageType: this.config.type,
      storageName: this.config.name,
      data,
    };
    this.emit('storage:event', event);
  }
}

// ============================================================================
// 存储适配器工厂
// ============================================================================

/**
 * 存储适配器工厂
 */
export class StorageAdapterFactory {
  private static adapters = new Map<string, new (config: StorageConfig) => StorageAdapter>();

  /**
   * 注册存储适配器
   */
  static register(type: StorageType, adapterClass: new (config: StorageConfig) => StorageAdapter): void {
    this.adapters.set(type, adapterClass);
  }

  /**
   * 创建存储适配器
   */
  static create(config: StorageConfig): StorageAdapter {
    const AdapterClass = this.adapters.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Storage adapter not found for type: ${config.type}`);
    }
    return new AdapterClass(config);
  }

  /**
   * 检查是否支持特定存储类型
   */
  static isSupported(type: StorageType): boolean {
    return this.adapters.has(type);
  }

  /**
   * 获取支持的存储类型列表
   */
  static getSupportedTypes(): StorageType[] {
    return Array.from(this.adapters.keys()) as StorageType[];
  }
}

// ============================================================================
// 导出类型
// ============================================================================

export type {
  StorageConfig,
  StorageQueryOptions,
  SemanticQueryOptions,
  StorageQueryResult,
  StorageStats,
  BatchOperationResult,
  MemoryItem,
  MemoryType,
  MemoryMetadata,
  StorageEvent,
  SerializationConfig,
  CompressionConfig,
  EncryptionConfig,
};
