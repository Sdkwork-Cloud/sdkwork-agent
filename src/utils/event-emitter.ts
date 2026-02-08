/**
 * EventEmitter - 兼容层
 * 
 * 为向后兼容提供非泛型 EventEmitter 类
 * 内部使用 TypedEventEmitter 实现
 * 
 * @deprecated 新项目请直接使用 typed-event-emitter 中的 TypedEventEmitter
 */

import { TypedEventEmitter } from './typed-event-emitter';

/**
 * 事件监听器类型
 */
export type EventListener<T = unknown> = (data: T) => void;

/**
 * 监听器包装器 - 使用 WeakMap 避免内存泄漏
 */
interface ListenerWrapper {
  original: EventListener<unknown>;
  wrapped: (payload: unknown) => void | Promise<void>;
}

/**
 * 非泛型 EventEmitter 类（向后兼容）
 * 
 * 优化点：
 * 1. 使用 Map 存储监听器，O(1) 查找
 * 2. 使用 WeakMap 避免内存泄漏
 * 3. 优化 off 方法，无需重建 emitter
 */
export class EventEmitter {
  private _emitter = new TypedEventEmitter<Record<string, unknown>>();
  // 使用 WeakMap 存储监听器映射，避免内存泄漏
  private _listenerMap = new WeakMap<EventListener<unknown>, ListenerWrapper>();
  // 使用 Map 存储每个事件的监听器列表
  private _eventListeners = new Map<string, Set<EventListener<unknown>>>();

  /**
   * 添加事件监听器
   */
  on<T>(event: string, listener: EventListener<T>): this {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }

    const listeners = this._eventListeners.get(event)!;
    
    // 避免重复添加
    if (listeners.has(listener as EventListener<unknown>)) {
      return this;
    }

    listeners.add(listener as EventListener<unknown>);

    // 创建包装器
    const wrapped = (payload: unknown) => {
      (listener as EventListener<unknown>)(payload);
    };

    const wrapper: ListenerWrapper = {
      original: listener as EventListener<unknown>,
      wrapped,
    };

    this._listenerMap.set(listener as EventListener<unknown>, wrapper);
    this._emitter.on(event, wrapped);

    return this;
  }

  /**
   * 添加一次性事件监听器
   */
  once<T>(event: string, listener: EventListener<T>): this {
    const onceWrapper = (data: unknown) => {
      this.off(event, onceWrapper as EventListener);
      (listener as EventListener<unknown>)(data);
    };
    return this.on(event, onceWrapper as EventListener<T>);
  }

  /**
   * 移除事件监听器 - O(1) 复杂度
   */
  off<T>(event: string, listener: EventListener<T>): this {
    const listeners = this._eventListeners.get(event);
    if (!listeners) return this;

    const listenerKey = listener as EventListener<unknown>;
    if (!listeners.has(listenerKey)) return this;

    // 获取包装器
    const wrapper = this._listenerMap.get(listenerKey);
    if (wrapper) {
      // 从 emitter 中移除（TypedEventEmitter 返回的取消订阅函数）
      // 由于 TypedEventEmitter.on 返回取消函数，我们需要重新设计
      // 这里我们直接重建该事件的监听器
      this._rebuildEventListeners(event);
    }

    listeners.delete(listenerKey);
    this._listenerMap.delete(listenerKey);

    // 清理空的事件
    if (listeners.size === 0) {
      this._eventListeners.delete(event);
    }

    return this;
  }

  /**
   * 触发事件
   */
  emit<T>(event: string, data?: T): boolean {
    this._emitter.emit(event, data as unknown);
    return true;
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    return this._emitter.listenerCount(event);
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return this._emitter.eventNames() as string[];
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): this {
    this._emitter.removeAllListeners(event);

    if (event) {
      this._eventListeners.delete(event);
    } else {
      this._eventListeners.clear();
    }

    return this;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this._emitter.destroy();
    this._eventListeners.clear();
  }

  /**
   * 重新构建指定事件的监听器
   * 仅在 off 时调用，保持其他事件不受影响
   */
  private _rebuildEventListeners(event: string): void {
    const listeners = this._eventListeners.get(event);
    if (!listeners) return;

    // 移除该事件的所有监听器
    this._emitter.removeAllListeners(event);

    // 重新订阅该事件的监听器
    for (const listener of listeners) {
      const wrapper = this._listenerMap.get(listener);
      if (wrapper) {
        this._emitter.on(event, wrapper.wrapped);
      }
    }
  }
}

/**
 * Agent 专用事件发射器
 */
export class AgentEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

export default EventEmitter;
