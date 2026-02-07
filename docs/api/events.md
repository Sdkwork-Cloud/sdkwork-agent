# Events API

SDKWork 提供完整的事件系统，支持可观测性和异步处理。

## 事件类型

### 生命周期事件

| 事件 | 描述 | 载荷 |
|------|------|------|
| `agent:initialized` | Agent 初始化完成 | `{ agentId, timestamp }` |
| `agent:started` | Agent 启动完成 | `{ agentId, timestamp, capabilities }` |
| `agent:stopped` | Agent 停止 | `{ agentId, timestamp }` |
| `agent:destroyed` | Agent 销毁 | `{ agentId, timestamp }` |
| `agent:error` | Agent 发生错误 | `{ agentId, timestamp, error, stack }` |
| `agent:reset` | Agent 重置 | `{ agentId, timestamp }` |

### 对话事件

| 事件 | 描述 | 载荷 |
|------|------|------|
| `chat:started` | 对话开始 | `{ executionId, sessionId, messageCount, timestamp }` |
| `chat:message` | 新消息 | `{ message, timestamp }` |
| `chat:stream` | 流式块 | `{ chunk, timestamp }` |
| `chat:completed` | 对话完成 | `{ executionId, sessionId, timestamp, tokenUsage }` |
| `chat:aborted` | 对话中止 | `{ executionId, sessionId, timestamp }` |
| `chat:error` | 对话错误 | `{ executionId, sessionId, timestamp, error }` |

### 执行事件

| 事件 | 描述 | 载荷 |
|------|------|------|
| `execution:started` | 执行开始 | `{ executionId, type, timestamp }` |
| `execution:step` | 执行步骤 | `{ step, data, timestamp }` |
| `execution:progress` | 执行进度 | `{ executionId, progress, timestamp }` |
| `execution:completed` | 执行完成 | `{ executionId, type, timestamp, duration }` |
| `execution:failed` | 执行失败 | `{ executionId, type, timestamp, error }` |

### Skill 事件

| 事件 | 描述 | 载荷 |
|------|------|------|
| `skill:invoking` | Skill 调用中 | `{ executionId, skillId, timestamp }` |
| `skill:invoked` | Skill 调用完成 | `{ executionId, skillId, timestamp }` |
| `skill:completed` | Skill 执行完成 | `{ executionId, skillId, timestamp, duration, success }` |
| `skill:failed` | Skill 执行错误 | `{ executionId, skillId, timestamp, error }` |

### Tool 事件

| 事件 | 描述 | 载荷 |
|------|------|------|
| `tool:invoking` | Tool 调用中 | `{ executionId, toolId, timestamp, input }` |
| `tool:invoked` | Tool 调用完成 | `{ executionId, toolId, timestamp, duration, success }` |
| `tool:completed` | Tool 执行完成 | `{ executionId, toolId, timestamp, success }` |
| `tool:failed` | Tool 调用错误 | `{ executionId, toolId, timestamp, error }` |

### 记忆事件

| 事件 | 描述 | 载荷 |
|------|------|------|
| `memory:stored` | 记忆存储 | `{ memoryId, timestamp }` |
| `memory:retrieved` | 记忆检索 | `{ memoryId, timestamp }` |
| `memory:searched` | 记忆搜索 | `{ query, results, timestamp }` |

## 订阅事件

### on

订阅事件。

```typescript
on<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void
```

### 示例

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

const agent = createAgent({
  name: 'EventAgent',
  llm: openaiProvider
});

// 生命周期事件
agent.on('agent:initialized', (event) => {
  console.log('Agent initialized:', event.payload.agentId);
});

agent.on('agent:error', (event) => {
  console.error('Agent error:', event.payload.error);
});

// 对话事件
agent.on('chat:started', (event) => {
  console.log('Chat started:', event.payload.executionId);
});

agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload.duration + 'ms');
  console.log('Token usage:', event.payload.tokenUsage);
});

// Skill 事件
agent.on('skill:completed', (event) => {
  console.log(`Skill ${event.payload.skillId} executed in ${event.payload.duration}ms`);
});

// Tool 事件
agent.on('tool:completed', (event) => {
  console.log(`Tool ${event.payload.toolId} invoked`);
});
```

## 一次性事件

### once

只订阅一次事件。

```typescript
once<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void
```

**示例：**

```typescript
agent.once('agent:initialized', (event) => {
  console.log('This will only fire once');
});
```

## 取消订阅

### off

取消订阅事件。

```typescript
off<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void
```

**示例：**

```typescript
const handler = (event) => {
  console.log('Event:', event);
};

agent.on('chat:completed', handler);

// 稍后取消订阅
agent.off('chat:completed', handler);
```

## 触发自定义事件

### emit

触发自定义事件。

```typescript
emit<T>(event: AgentEventType, payload: T): void
```

**示例：**

```typescript
agent.emit('custom:event', {
  data: 'custom data',
  timestamp: Date.now()
});
```

## AgentEvent 结构

```typescript
interface AgentEvent<T = unknown> {
  type: AgentEventType;
  payload: T;
  timestamp: number;
  metadata: {
    agentId: string;
    sessionId?: string;
    executionId?: string;
  };
}

type AgentEventType =
  // 生命周期事件
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:destroyed'
  | 'agent:error'
  | 'agent:reset'
  // 对话事件
  | 'chat:started'
  | 'chat:message'
  | 'chat:stream'
  | 'chat:completed'
  | 'chat:aborted'
  | 'chat:error'
  // 执行事件
  | 'execution:started'
  | 'execution:step'
  | 'execution:progress'
  | 'execution:completed'
  | 'execution:failed'
  // 工具事件
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  // Skill 事件
  | 'skill:invoking'
  | 'skill:invoked'
  | 'skill:completed'
  | 'skill:failed'
  // 记忆事件
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:searched';
```

## 事件过滤

```typescript
// 只监听特定 Skill 的事件
agent.on('skill:completed', (event) => {
  if (event.payload.skillId === 'my-skill') {
    // 处理
  }
});

// 只监听特定会话的对话
agent.on('chat:completed', (event) => {
  if (event.payload.sessionId === 'my-session') {
    // 处理
  }
});
```

## 异步事件处理

```typescript
agent.on('chat:completed', async (event) => {
  // 异步保存对话历史
  await saveToDatabase({
    sessionId: event.payload.sessionId,
    duration: event.payload.duration,
    tokenUsage: event.payload.tokenUsage
  });
});
```

## 事件链

```typescript
// 记录执行链
const executionChain = [];

agent.on('execution:started', (event) => {
  executionChain.push({
    id: event.payload.executionId,
    type: event.payload.type,
    startTime: event.timestamp
  });
});

agent.on('execution:completed', (event) => {
  const execution = executionChain.find(e => e.id === event.payload.executionId);
  if (execution) {
    execution.endTime = event.timestamp;
    execution.duration = event.payload.duration;
  }
});
```

## 性能监控

```typescript
// 监控执行时间
const executionTimes = {};

agent.on('execution:started', (event) => {
  executionTimes[event.payload.executionId] = Date.now();
});

agent.on('execution:completed', (event) => {
  const startTime = executionTimes[event.payload.executionId];
  const actualDuration = Date.now() - startTime;
  
  console.log(`Execution ${event.payload.executionId} took ${actualDuration}ms`);
  
  // 慢查询警告
  if (actualDuration > 5000) {
    console.warn('Slow execution detected!');
  }
});
```

## 错误追踪

```typescript
// 集中错误处理
agent.on('agent:error', (event) => {
  reportToErrorTracking({
    agentId: event.payload.agentId,
    error: event.payload.error,
    stack: event.payload.stack,
    timestamp: event.timestamp
  });
});

agent.on('skill:failed', (event) => {
  reportToErrorTracking({
    executionId: event.payload.executionId,
    skillId: event.payload.skillId,
    error: event.payload.error,
    timestamp: event.timestamp
  });
});

agent.on('tool:failed', (event) => {
  reportToErrorTracking({
    executionId: event.payload.executionId,
    toolId: event.payload.toolId,
    error: event.payload.error,
    timestamp: event.timestamp
  });
});
```

## 监听所有事件

```typescript
// 使用通配符监听所有事件
agent.on('*', (event) => {
  console.log(`[${event.type}]`, event.payload);
});
```

## 最佳实践

1. **及时取消订阅** - 避免内存泄漏
2. **错误处理** - 事件处理器中使用 try-catch
3. **异步操作** - 长时间操作使用异步处理
4. **事件过滤** - 只处理需要的事件
5. **性能考虑** - 避免在事件处理器中执行耗时操作
