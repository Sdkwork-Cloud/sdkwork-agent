/**
 * Bloom Filter - 空间效率极高的概率型数据结构
 *
 * 用于快速判断元素是否可能在集合中：
 * - 可能存在：可能有假阳性
 * - 肯定不存在：100% 准确
 *
 * 应用场景：
 * 1. 缓存穿透防护
 * 2. HNSW 索引预过滤
 * 3. 重复数据检测
 * 4. 大规模集合成员测试
 *
 * 空间复杂度：O(n)，仅需 10 位/元素即可达到 1% 误判率
 * 时间复杂度：O(k)，k 为哈希函数数量
 *
 * @module BloomFilter
 * @version 1.0.0
 * @standard Industry Leading
 */

// ============================================================================
// Types
// ============================================================================

export interface BloomFilterConfig {
  /** 预期元素数量 */
  expectedItems: number;
  /** 期望误判率 (默认 0.01 = 1%) */
  falsePositiveRate?: number;
}

export interface BloomFilterStats {
  /** 位数组大小 */
  bitSize: number;
  /** 哈希函数数量 */
  hashCount: number;
  /** 已添加元素数量 */
  itemCount: number;
  /** 当前误判率估计 */
  currentFalsePositiveRate: number;
  /** 内存占用（字节） */
  memoryUsage: number;
}

// ============================================================================
// Bloom Filter Implementation
// ============================================================================

export class BloomFilter {
  private bitArray: Uint8Array;
  private bitSize: number;
  private hashCount: number;
  private itemCount: number = 0;
  private readonly expectedItems: number;
  private readonly targetFalsePositiveRate: number;

  constructor(config: BloomFilterConfig) {
    this.expectedItems = config.expectedItems;
    this.targetFalsePositiveRate = config.falsePositiveRate ?? 0.01;

    // 计算最优参数
    const { bitSize, hashCount } = this.calculateOptimalParams(
      this.expectedItems,
      this.targetFalsePositiveRate
    );

    this.bitSize = bitSize;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(bitSize / 8));
  }

  /**
   * 添加元素
   */
  add(item: string | number | Uint8Array): void {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.bitSize;
      this.setBit(index);
    }

    this.itemCount++;
  }

  /**
   * 检查元素是否可能存在
   * @returns true - 可能存在（可能有假阳性）
   * @returns false - 肯定不存在
   */
  mayContain(item: string | number | Uint8Array): boolean {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.bitSize;
      if (!this.getBit(index)) {
        return false; // 肯定不存在
      }
    }

    return true; // 可能存在
  }

  /**
   * 批量添加元素
   */
  addAll(items: (string | number | Uint8Array)[]): void {
    for (const item of items) {
      this.add(item);
    }
  }

  /**
   * 清空过滤器
   */
  clear(): void {
    this.bitArray.fill(0);
    this.itemCount = 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): BloomFilterStats {
    // 计算当前误判率
    // P = (1 - e^(-kn/m))^k
    const k = this.hashCount;
    const n = this.itemCount;
    const m = this.bitSize;
    const currentFPR = Math.pow(1 - Math.exp((-k * n) / m), k);

    return {
      bitSize: this.bitSize,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      currentFalsePositiveRate: currentFPR,
      memoryUsage: this.bitArray.length,
    };
  }

  /**
   * 序列化为字节数组
   */
  serialize(): Uint8Array {
    // 格式：[version(1)][bitSize(4)][hashCount(1)][itemCount(4)][bitArray...]
    const header = new Uint8Array(10);
    header[0] = 1; // version
    new DataView(header.buffer).setUint32(1, this.bitSize, true);
    header[5] = this.hashCount;
    new DataView(header.buffer).setUint32(6, this.itemCount, true);

    const result = new Uint8Array(header.length + this.bitArray.length);
    result.set(header);
    result.set(this.bitArray, header.length);

    return result;
  }

  /**
   * 从字节数组反序列化
   */
  static deserialize(data: Uint8Array): BloomFilter {
    const version = data[0];
    if (version !== 1) {
      throw new Error(`Unsupported Bloom Filter version: ${version}`);
    }

    const bitSize = new DataView(data.buffer).getUint32(1, true);
    const hashCount = data[5];
    const itemCount = new DataView(data.buffer).getUint32(6, true);

    const filter = new BloomFilter({ expectedItems: 1000 });
    filter.bitSize = bitSize;
    filter.hashCount = hashCount;
    filter.itemCount = itemCount;
    filter.bitArray = data.slice(10);

    return filter;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 计算最优参数
   * m = -n * ln(p) / (ln(2)^2)
   * k = m/n * ln(2)
   */
  private calculateOptimalParams(
    n: number,
    p: number
  ): { bitSize: number; hashCount: number } {
    const ln2 = Math.LN2;
    const bitSize = Math.ceil((-n * Math.log(p)) / (ln2 * ln2));
    const hashCount = Math.max(1, Math.round((bitSize / n) * ln2));

    return { bitSize, hashCount };
  }

  /**
   * 获取多个哈希值（使用双重哈希模拟）
   */
  private getHashes(item: string | number | Uint8Array): number[] {
    const { hash1, hash2 } = this.hash(item);
    const hashes: number[] = [];

    for (let i = 0; i < this.hashCount; i++) {
      // 使用双重哈希公式：h_i = (h1 + i * h2) % m
      hashes.push((hash1 + i * hash2) % this.bitSize);
    }

    return hashes;
  }

  /**
   * FNV-1a 哈希算法（高质量、快速）
   */
  private hash(item: string | number | Uint8Array): { hash1: number; hash2: number } {
    let data: Uint8Array;

    if (typeof item === 'string') {
      data = new TextEncoder().encode(item);
    } else if (typeof item === 'number') {
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setFloat64(0, item, true);
      data = new Uint8Array(buffer);
    } else {
      data = item;
    }

    // FNV-1a 32-bit
    const FNV_OFFSET_BASIS = 2166136261;
    const FNV_PRIME = 16777619;

    let hash1 = FNV_OFFSET_BASIS;
    let hash2 = FNV_OFFSET_BASIS ^ 0xFFFFFFFF;

    for (let i = 0; i < data.length; i++) {
      hash1 ^= data[i];
      hash1 = Math.imul(hash1, FNV_PRIME);

      hash2 ^= data[data.length - 1 - i]; // 反向遍历
      hash2 = Math.imul(hash2, FNV_PRIME);
    }

    // 确保正数
    return {
      hash1: hash1 >>> 0,
      hash2: hash2 >>> 0,
    };
  }

  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    this.bitArray[byteIndex] |= 1 << bitIndex;
  }

  private getBit(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (this.bitArray[byteIndex] & (1 << bitIndex)) !== 0;
  }
}

// ============================================================================
// Scalable Bloom Filter
// ============================================================================

/**
 * 可扩展布隆过滤器
 * 当元素数量超过预期时自动添加新的过滤器
 */
export class ScalableBloomFilter {
  private filters: BloomFilter[] = [];
  private readonly initialExpectedItems: number;
  private readonly falsePositiveRate: number;
  private itemCount: number = 0;

  constructor(config: BloomFilterConfig) {
    this.initialExpectedItems = config.expectedItems;
    this.falsePositiveRate = config.falsePositiveRate ?? 0.01;
    this.addNewFilter();
  }

  add(item: string | number | Uint8Array): void {
    const currentFilter = this.filters[this.filters.length - 1];
    const stats = currentFilter.getStats();

    // 如果当前过滤器已满（达到预期数量的 2 倍），创建新的
    if (stats.itemCount >= this.initialExpectedItems * Math.pow(2, this.filters.length - 1)) {
      this.addNewFilter();
    }

    this.filters[this.filters.length - 1].add(item);
    this.itemCount++;
  }

  mayContain(item: string | number | Uint8Array): boolean {
    // 从最新的过滤器开始检查
    for (let i = this.filters.length - 1; i >= 0; i--) {
      if (this.filters[i].mayContain(item)) {
        return true;
      }
    }
    return false;
  }

  private addNewFilter(): void {
    const expectedItems = this.initialExpectedItems * Math.pow(2, this.filters.length);
    // 每个新过滤器的误判率是前一个的一半
    const fpr = this.falsePositiveRate * Math.pow(0.5, this.filters.length + 1);

    this.filters.push(
      new BloomFilter({
        expectedItems,
        falsePositiveRate: fpr,
      })
    );
  }
}

// ============================================================================
// Counting Bloom Filter
// ============================================================================

/**
 * 计数布隆过滤器
 * 支持删除操作，使用计数器代替位
 */
export class CountingBloomFilter {
  private counters: Uint8Array;
  private bitSize: number;
  private hashCount: number;
  private itemCount: number = 0;

  constructor(config: BloomFilterConfig) {
    const { bitSize, hashCount } = this.calculateOptimalParams(
      config.expectedItems,
      config.falsePositiveRate ?? 0.01
    );

    this.bitSize = bitSize;
    this.hashCount = hashCount;
    this.counters = new Uint8Array(bitSize);
  }

  add(item: string | number | Uint8Array): void {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.bitSize;
      if (this.counters[index] < 255) {
        this.counters[index]++;
      }
    }

    this.itemCount++;
  }

  remove(item: string | number | Uint8Array): void {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.bitSize;
      if (this.counters[index] > 0) {
        this.counters[index]--;
      }
    }

    this.itemCount--;
  }

  mayContain(item: string | number | Uint8Array): boolean {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.bitSize;
      if (this.counters[index] === 0) {
        return false;
      }
    }

    return true;
  }

  private getHashes(item: string | number | Uint8Array): number[] {
    const { hash1, hash2 } = this.hash(item);
    const hashes: number[] = [];

    for (let i = 0; i < this.hashCount; i++) {
      hashes.push((hash1 + i * hash2) % this.bitSize);
    }

    return hashes;
  }

  private hash(item: string | number | Uint8Array): { hash1: number; hash2: number } {
    let data: Uint8Array;

    if (typeof item === 'string') {
      data = new TextEncoder().encode(item);
    } else if (typeof item === 'number') {
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setFloat64(0, item, true);
      data = new Uint8Array(buffer);
    } else {
      data = item;
    }

    const FNV_OFFSET_BASIS = 2166136261;
    const FNV_PRIME = 16777619;

    let hash1 = FNV_OFFSET_BASIS;
    let hash2 = FNV_OFFSET_BASIS ^ 0xFFFFFFFF;

    for (let i = 0; i < data.length; i++) {
      hash1 ^= data[i];
      hash1 = Math.imul(hash1, FNV_PRIME);

      hash2 ^= data[data.length - 1 - i];
      hash2 = Math.imul(hash2, FNV_PRIME);
    }

    return {
      hash1: hash1 >>> 0,
      hash2: hash2 >>> 0,
    };
  }

  private calculateOptimalParams(n: number, p: number): { bitSize: number; hashCount: number } {
    const ln2 = Math.LN2;
    const bitSize = Math.ceil((-n * Math.log(p)) / (ln2 * ln2));
    const hashCount = Math.max(1, Math.round((bitSize / n) * ln2));

    return { bitSize, hashCount };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createBloomFilter(config: BloomFilterConfig): BloomFilter {
  return new BloomFilter(config);
}

export function createScalableBloomFilter(config: BloomFilterConfig): ScalableBloomFilter {
  return new ScalableBloomFilter(config);
}

export function createCountingBloomFilter(config: BloomFilterConfig): CountingBloomFilter {
  return new CountingBloomFilter(config);
}

// ============================================================================
// Benchmark
// ============================================================================

export function benchmarkBloomFilter(
  expectedItems: number = 100000,
  testItems: number = 10000
): {
  bloomFilter: { addTime: number; checkTime: number; memory: number };
  set: { addTime: number; checkTime: number; memory: number };
  falsePositiveRate: number;
} {
  // 生成测试数据
  const items = Array.from({ length: expectedItems }, (_, i) => `item-${i}`);
  const testData = Array.from({ length: testItems }, (_, i) => `test-${i}`);

  // 测试布隆过滤器
  const bloomStart = performance.now();
  const bloom = new BloomFilter({ expectedItems, falsePositiveRate: 0.01 });
  for (const item of items) {
    bloom.add(item);
  }
  const bloomAddTime = performance.now() - bloomStart;

  const bloomCheckStart = performance.now();
  for (const item of testData) {
    bloom.mayContain(item);
  }
  const bloomCheckTime = performance.now() - bloomCheckStart;

  const bloomMemory = bloom.getStats().memoryUsage;

  // 测试 Set
  const setStart = performance.now();
  const set = new Set<string>();
  for (const item of items) {
    set.add(item);
  }
  const setAddTime = performance.now() - setStart;

  const setCheckStart = performance.now();
  for (const item of testData) {
    set.has(item);
  }
  const setCheckTime = performance.now() - setCheckStart;

  const setMemory = set.size * 50; // 估算每个字符串占用 50 字节

  // 计算误判率
  let falsePositives = 0;
  for (let i = 0; i < 10000; i++) {
    if (bloom.mayContain(`nonexistent-${i}`)) {
      falsePositives++;
    }
  }
  const fpr = falsePositives / 10000;

  return {
    bloomFilter: {
      addTime: bloomAddTime,
      checkTime: bloomCheckTime,
      memory: bloomMemory,
    },
    set: {
      addTime: setAddTime,
      checkTime: setCheckTime,
      memory: setMemory,
    },
    falsePositiveRate: fpr,
  };
}
