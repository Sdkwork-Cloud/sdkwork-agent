/**
 * 优先队列实现 - 使用二叉堆
 * 
 * 时间复杂度：
 * - 插入: O(log n)
 * - 弹出: O(log n)
 * - 查看堆顶: O(1)
 * 
 * 相比数组的 O(n) 插入，性能提升显著
 */

export interface QueueItem<T> {
  item: T;
  priority: number;
}

export class PriorityQueue<T> {
  private heap: QueueItem<T>[] = [];

  /**
   * 获取队列大小
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * 入队
   */
  enqueue(item: T, priority: number): void {
    // 验证 priority 是有限数字
    if (!Number.isFinite(priority)) {
      throw new TypeError('Priority must be a finite number');
    }
    this.heap.push({ item, priority });
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * 出队
   */
  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const result = this.heap[0].item;
    const end = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.heapifyDown(0);
    }

    return result;
  }

  /**
   * 查看堆顶元素
   */
  peek(): T | undefined {
    return this.heap[0]?.item;
  }

  /**
   * 查看堆顶优先级
   */
  peekPriority(): number | undefined {
    return this.heap[0]?.priority;
  }

  /**
   * 移除指定元素
   */
  remove(predicate: (item: T) => boolean): T | undefined {
    const index = this.heap.findIndex(h => predicate(h.item));
    if (index === -1) return undefined;

    const result = this.heap[index].item;
    const end = this.heap.pop()!;

    if (index < this.heap.length) {
      this.heap[index] = end;
      this.heapifyDown(index);
      this.heapifyUp(index);
    }

    return result;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * 转换为数组
   */
  toArray(): T[] {
    return this.heap.map(h => h.item);
  }

  /**
   * 查找元素
   */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.heap.find(h => predicate(h.item))?.item;
  }

  /**
   * 过滤元素
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.heap.filter(h => predicate(h.item)).map(h => h.item);
  }

  // ============================================================================
  // Private Methods - 堆操作
  // ============================================================================

  private heapifyUp(index: number): void {
    const item = this.heap[index];

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];

      // 最大堆：父节点优先级 >= 子节点
      if (parent.priority >= item.priority) break;

      this.heap[index] = parent;
      index = parentIndex;
    }

    this.heap[index] = item;
  }

  private heapifyDown(index: number): void {
    const item = this.heap[index];
    const length = this.heap.length;

    while (true) {
      let largestIndex = index;
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;

      if (
        leftChildIndex < length &&
        this.heap[leftChildIndex].priority > this.heap[largestIndex].priority
      ) {
        largestIndex = leftChildIndex;
      }

      if (
        rightChildIndex < length &&
        this.heap[rightChildIndex].priority > this.heap[largestIndex].priority
      ) {
        largestIndex = rightChildIndex;
      }

      if (largestIndex === index) break;

      this.heap[index] = this.heap[largestIndex];
      index = largestIndex;
    }

    this.heap[index] = item;
  }
}

export default PriorityQueue;
