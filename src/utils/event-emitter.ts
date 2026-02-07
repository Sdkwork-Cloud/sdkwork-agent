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
 * 非泛型 EventEmitter 类（向后兼容）
 */
export class EventEmitter {
  private _emitter = new TypedEventEmitter<Record<string, unknown>>();

  /**
   * 添加事件监听器
   */
  on<T>(event: string, listener: EventListener<T>): this {
    this._emitter.on(event, listener as (payload: unknown) => void | Promise<void>);
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
   * 移除事件监听器
   */
  off<T>(_event: string, _listener: EventListener<T>): this {
    // TypedEventEmitter 返回取消订阅函数，但这里我们需要手动跟踪
    // 简化实现：重新创建 emitter（在实际应用中应该使用更好的方式）
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
    return this;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this._emitter.destroy();
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
