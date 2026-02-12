# React 架构

SDKWork Browser Agent 借鉴 React 的设计理念，实现响应式状态管理和组件化设计。

## 响应式状态

### 状态管理

```typescript
// src/core/state.ts
interface ReactiveState<T> {
  value: T;
  subscribe(listener: (value: T) => void): () => void;
  notify(): void;
}

function createState<T>(initialValue: T): ReactiveState<T> {
  const listeners = new Set<(value: T) => void>();
  let value = initialValue;
  
  return {
    get value() { return value; },
    set value(newValue: T) {
      value = newValue;
      listeners.forEach(listener => listener(value));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      listeners.forEach(listener => listener(value));
    }
  };
}
```

### Agent 状态

```typescript
// src/agent/state.ts
enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  CHATTING = 'chatting',
  EXECUTING = 'executing',
  THINKING = 'thinking',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

class AgentImpl {
  private _state = createState<AgentState>(AgentState.IDLE);
  
  get state(): AgentState {
    return this._state.value;
  }
  
  onStateChange(listener: (state: AgentState) => void): () => void {
    return this._state.subscribe(listener);
  }
  
  async initialize(): Promise<void> {
    this._state.value = AgentState.INITIALIZING;
    // ...
    this._state.value = AgentState.READY;
  }
}
```

## 组件化设计

### TUI 组件

```typescript
// src/tui/components/base.ts
interface Component<P = {}> {
  props: P;
  render(): string;
  mount(container: HTMLElement): void;
  unmount(): void;
}

abstract class BaseComponent<P = {}> implements Component<P> {
  protected element: HTMLElement | null = null;
  
  constructor(public props: P) {}
  
  abstract render(): string;
  
  mount(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.innerHTML = this.render();
    container.appendChild(this.element);
  }
  
  unmount(): void {
    this.element?.remove();
    this.element = null;
  }
  
  update(props: Partial<P>): void {
    Object.assign(this.props, props);
    if (this.element) {
      this.element.innerHTML = this.render();
    }
  }
}
```

### 消息组件

```typescript
// src/tui/components/message.ts
interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

class MessageComponent extends BaseComponent<MessageProps> {
  render(): string {
    const icon = this.props.role === 'user' ? '👤' : '🤖';
    const time = new Date(this.props.timestamp).toLocaleTimeString();
    
    return `
      <div class="message ${this.props.role}">
        <span class="icon">${icon}</span>
        <span class="content">${this.props.content}</span>
        <span class="time">${time}</span>
      </div>
    `;
  }
}
```

## Hooks 模式

### useEffect

```typescript
// src/core/hooks.ts
function useEffect(
  effect: () => void | (() => void),
  deps: unknown[]
): void {
  // 实现类似 React 的 useEffect
  const prevDeps = getPrevDeps();
  
  if (!prevDeps || deps.some((dep, i) => dep !== prevDeps[i])) {
    const cleanup = effect();
    setPrevDeps(deps);
    setCleanup(cleanup);
  }
}
```

### useMemo

```typescript
function useMemo<T>(
  factory: () => T,
  deps: unknown[]
): T {
  const prevDeps = getPrevDeps();
  const prevValue = getPrevValue<T>();
  
  if (!prevDeps || deps.some((dep, i) => dep !== prevDeps[i])) {
    const value = factory();
    setPrevDeps(deps);
    setPrevValue(value);
    return value;
  }
  
  return prevValue!;
}
```

### useCallback

```typescript
function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  return useMemo(() => callback, deps);
}
```

## 事件流

### 事件订阅

```typescript
// 使用类似 React 的订阅模式
class AgentImpl {
  private subscriptions: Set<() => void> = new Set();
  
  on<T>(eventType: string, handler: (event: AgentEvent<T>) => void): () => void {
    const unsubscribe = this.eventBus.subscribe(eventType, handler);
    this.subscriptions.add(unsubscribe);
    
    return () => {
      unsubscribe();
      this.subscriptions.delete(unsubscribe);
    };
  }
  
  // 组件卸载时自动清理
  destroy(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }
}
```

## 渲染优化

### 虚拟滚动

```typescript
// src/tui/components/virtual-list.ts
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => string;
  itemHeight: number;
  containerHeight: number;
}

class VirtualList<T> extends BaseComponent<VirtualListProps<T>> {
  private scrollTop = 0;
  
  render(): string {
    const { items, itemHeight, containerHeight, renderItem } = this.props;
    
    const startIndex = Math.floor(this.scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    const visibleItems = items.slice(startIndex, endIndex);
    
    return `
      <div class="virtual-list" style="height: ${containerHeight}px; overflow-y: auto;">
        <div style="height: ${items.length * itemHeight}px; position: relative;">
          ${visibleItems.map((item, i) => `
            <div style="position: absolute; top: ${(startIndex + i) * itemHeight}px; height: ${itemHeight}px;">
              ${renderItem(item, startIndex + i)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
```

### 批量更新

```typescript
// src/core/batch.ts
let isBatching = false;
let pendingUpdates: Set<() => void> = new Set();

function batchUpdate(update: () => void): void {
  pendingUpdates.add(update);
  
  if (!isBatching) {
    isBatching = true;
    queueMicrotask(() => {
      const updates = [...pendingUpdates];
      pendingUpdates.clear();
      isBatching = false;
      
      updates.forEach(u => u());
    });
  }
}
```

## 最佳实践

1. **单向数据流** - 状态从上往下流动
2. **不可变状态** - 使用不可变数据结构
3. **批量更新** - 合并多个状态更新
4. **清理副作用** - 组件卸载时清理订阅
5. **记忆化** - 缓存计算结果

## 相关文档

- [架构概览](./overview.md) - 整体架构设计
- [DDD 架构](./ddd.md) - 领域驱动设计详解
- [微内核架构](./microkernel.md) - 微内核设计详解
