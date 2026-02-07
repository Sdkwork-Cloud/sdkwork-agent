/**
 * Object Pool - 对象池模式
 *
 * 用于高频创建/销毁对象的场景，减少 GC 压力
 * 应用场景：
 * 1. HNSW 搜索的候选队列
 * 2. 执行上下文对象
 * 3. 向量计算缓冲区
 *
 * @module ObjectPool
 * @version 1.0.0
 * @standard Industry Leading
 */

// ============================================================================
// Types
// ============================================================================

export interface PoolConfig<T> {
  /** 工厂函数 */
  factory: () => T;
  /** 重置函数 */
  reset?: (obj: T) => void;
  /** 初始容量 */
  initialCapacity?: number;
  /** 最大容量 */
  maxCapacity?: number;
  /** 对象存活时间（毫秒） */
  maxIdleTime?: number;
  /** 是否启用统计 */
  enableStats?: boolean;
}

export interface PoolStats {
  /** 池大小 */
  size: number;
  /** 可用对象数 */
  available: number;
  /** 已借出对象数 */
  borrowed: number;
  /** 总创建数 */
  totalCreated: number;
  /** 总销毁数 */
  totalDestroyed: number;
  /** 总借用数 */
  totalBorrowed: number;
  /** 总归还数 */
  totalReturned: number;
  /** 命中率 */
  hitRate: number;
}

// ============================================================================
// Pooled Object Wrapper
// ============================================================================

interface PooledObject<T> {
  obj: T;
  borrowedAt: number;
  createdAt: number;
}

// ============================================================================
// Object Pool Implementation
// ============================================================================

export class ObjectPool<T> {
  private pool: PooledObject<T>[] = [];
  private borrowed = new Set<T>();
  private config: Required<PoolConfig<T>>;
  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    totalBorrowed: 0,
    totalReturned: 0,
  };
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: PoolConfig<T>) {
    this.config = {
      factory: config.factory,
      reset: config.reset || (() => {}),
      initialCapacity: config.initialCapacity || 10,
      maxCapacity: config.maxCapacity || 100,
      maxIdleTime: config.maxIdleTime || 60000,
      enableStats: config.enableStats ?? true,
    };

    // 预创建对象
    for (let i = 0; i < this.config.initialCapacity; i++) {
      this.pool.push(this.createPooledObject());
    }

    // 启动清理定时器
    this.startCleanupTimer();
  }

  /**
   * 借用对象
   */
  borrow(): T {
    let pooledObj: PooledObject<T> | undefined;

    // 尝试从池中获取
    while (this.pool.length > 0) {
      pooledObj = this.pool.pop()!;
      
      // 检查对象是否过期
      if (this.config.maxIdleTime > 0) {
        const idleTime = Date.now() - pooledObj.createdAt;
        if (idleTime > this.config.maxIdleTime) {
          this.stats.totalDestroyed++;
          continue; // 对象过期，继续获取下一个
        }
      }
      
      break;
    }

    // 池为空，创建新对象
    if (!pooledObj) {
      pooledObj = this.createPooledObject();
    }

    pooledObj.borrowedAt = Date.now();
    this.borrowed.add(pooledObj.obj);
    this.stats.totalBorrowed++;

    return pooledObj.obj;
  }

  /**
   * 归还对象
   */
  return(obj: T): void {
    if (!this.borrowed.has(obj)) {
      throw new Error('Object was not borrowed from this pool');
    }

    this.borrowed.delete(obj);
    this.stats.totalReturned++;

    // 重置对象状态
    this.config.reset(obj);

    // 如果池未满，归还到池中
    if (this.pool.length < this.config.maxCapacity) {
      this.pool.push({
        obj,
        borrowedAt: 0,
        createdAt: Date.now(),
      });
    } else {
      // 池已满，销毁对象
      this.stats.totalDestroyed++;
    }
  }

  /**
   * 获取池统计信息
   */
  getStats(): PoolStats {
    const totalRequests = this.stats.totalBorrowed;
    const hits = totalRequests - this.stats.totalCreated;
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

    return {
      size: this.pool.length + this.borrowed.size,
      available: this.pool.length,
      borrowed: this.borrowed.size,
      totalCreated: this.stats.totalCreated,
      totalDestroyed: this.stats.totalDestroyed,
      totalBorrowed: this.stats.totalBorrowed,
      totalReturned: this.stats.totalReturned,
      hitRate,
    };
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool = [];
    this.borrowed.clear();
    this.stats.totalDestroyed += this.pool.length;
  }

  /**
   * 销毁池
   */
  destroy(): void {
    this.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private createPooledObject(): PooledObject<T> {
    this.stats.totalCreated++;
    return {
      obj: this.config.factory(),
      borrowedAt: 0,
      createdAt: Date.now(),
    };
  }

  private startCleanupTimer(): void {
    if (this.config.maxIdleTime <= 0) return;

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const expired: PooledObject<T>[] = [];
      const valid: PooledObject<T>[] = [];

      for (const pooledObj of this.pool) {
        if (now - pooledObj.createdAt > this.config.maxIdleTime) {
          expired.push(pooledObj);
        } else {
          valid.push(pooledObj);
        }
      }

      this.pool = valid;
      this.stats.totalDestroyed += expired.length;
    }, this.config.maxIdleTime);
  }
}

// ============================================================================
// Generic Object Pool
// ============================================================================

export class GenericObjectPool<T> extends ObjectPool<T> {
  constructor(factory: () => T, reset?: (obj: T) => void, initialCapacity = 10) {
    super({
      factory,
      reset,
      initialCapacity,
    });
  }
}

// ============================================================================
// Array Pool
// ============================================================================

export class ArrayPool<T> extends ObjectPool<T[]> {
  constructor(arraySize: number, initialCapacity = 10) {
    super({
      factory: () => new Array<T>(arraySize),
      reset: (arr) => {
        arr.length = 0;
      },
      initialCapacity,
    });
  }
}

// ============================================================================
// TypedArray Pool
// ============================================================================

export class Float32ArrayPool extends ObjectPool<Float32Array> {
  constructor(arraySize: number, initialCapacity = 10) {
    super({
      factory: () => new Float32Array(arraySize),
      reset: (arr) => {
        arr.fill(0);
      },
      initialCapacity,
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createObjectPool<T>(config: PoolConfig<T>): ObjectPool<T> {
  return new ObjectPool<T>(config);
}

export function createArrayPool<T>(arraySize: number, initialCapacity = 10): ArrayPool<T> {
  return new ArrayPool<T>(arraySize, initialCapacity);
}

export function createFloat32ArrayPool(arraySize: number, initialCapacity = 10): Float32ArrayPool {
  return new Float32ArrayPool(arraySize, initialCapacity);
}

// Types are already exported as interfaces above
