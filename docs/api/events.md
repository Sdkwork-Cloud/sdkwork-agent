# Events API

Events 是 SDKWork Browser Agent 的事件系统，提供组件间的松耦合通信。

## 事件系统

### AgentEvent

```typescript
interface AgentEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### 事件类型

```typescript
type AgentEventType =
  // Agent 生命周期事件
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:destroyed'
  | 'agent:error'
  | 'agent:reset'
  
  // Chat 事件
  | 'chat:started'
  | 'chat:completed'
  | 'chat:error'
  
  // Skill 事件
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:invoking'
  | 'skill:invoked'
  | 'skill:completed'
  | 'skill:failed'
  | 'skill:aborted'
  
  // Tool 事件
  | 'tool:registered'
  | 'tool:unregistered'
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  
  // Execution 事件
  | 'execution:started'
  | 'execution:step'
  | 'execution:completed'
  | 'execution:failed'
  
  // Memory 事件
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:deleted'
  | 'memory:cleared'
  
  // Plugin 事件
  | 'plugin:loaded'
  | 'plugin:unloaded'
  
  // MCP 事件
  | 'mcp:connected'
  | 'mcp:disconnected'
  
  // 通配符
  | '*';
```

## 使用示例

### 订阅事件

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const agent = createAgent(llm, { name: 'EventAgent' });

// 订阅特定事件
const unsubscribe = agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload);
});

// 取消订阅
unsubscribe();
```

### 订阅所有事件

```typescript
agent.on('*', (event) => {
  console.log(`[${event.type}]`, event.payload);
});
```

### 事件负载

#### agent:initialized

```typescript
{
  agentId: string;
  name: string;
  timestamp: number;
}
```

#### chat:completed

```typescript
{
  agentId: string;
  executionId: string;
  duration: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

#### skill:completed

```typescript
{
  agentId: string;
  executionId: string;
  skillId: string;
  skillName: string;
  duration: number;
  success: boolean;
}
```

#### tool:completed

```typescript
{
  agentId: string;
  executionId: string;
  toolId: string;
  toolName: string;
  duration: number;
  success: boolean;
}
```

#### agent:error

```typescript
{
  agentId: string;
  error: {
    code: string;
    message: string;
    stack?: string;
    recoverable: boolean;
  };
}
```

## 完整示例

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'MonitoredAgent',
    description: 'An agent with comprehensive event monitoring',
  });

  // Agent 生命周期事件
  agent.on('agent:initialized', (event) => {
    console.log('✓ Agent initialized:', event.payload.agentId);
  });

  agent.on('agent:destroyed', (event) => {
    console.log('✗ Agent destroyed:', event.payload.agentId);
  });

  agent.on('agent:error', (event) => {
    console.error('✗ Agent error:', event.payload.error);
  });

  // Chat 事件
  agent.on('chat:started', (event) => {
    console.log('→ Chat started:', event.payload.executionId);
  });

  agent.on('chat:completed', (event) => {
    console.log('✓ Chat completed in', event.payload.duration, 'ms');
    console.log('  Tokens:', event.payload.tokenUsage);
  });

  agent.on('chat:error', (event) => {
    console.error('✗ Chat error:', event.payload.error);
  });

  // Skill 事件
  agent.on('skill:invoking', (event) => {
    console.log('→ Skill invoking:', event.payload.skillId);
  });

  agent.on('skill:completed', (event) => {
    console.log('✓ Skill completed:', event.payload.skillName);
  });

  agent.on('skill:failed', (event) => {
    console.error('✗ Skill failed:', event.payload.skillId, event.payload.error);
  });

  // Tool 事件
  agent.on('tool:invoking', (event) => {
    console.log('→ Tool invoking:', event.payload.toolId);
  });

  agent.on('tool:completed', (event) => {
    console.log('✓ Tool completed:', event.payload.toolName);
  });

  agent.on('tool:failed', (event) => {
    console.error('✗ Tool failed:', event.payload.toolId, event.payload.error);
  });

  // Memory 事件
  agent.on('memory:stored', (event) => {
    console.log('💾 Memory stored:', event.payload.id);
  });

  agent.on('memory:retrieved', (event) => {
    console.log('📖 Memory retrieved:', event.payload.id);
  });

  await agent.initialize();

  const response = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
    ]
  });

  console.log('Response:', response.choices[0].message.content);

  await agent.destroy();
}

main().catch(console.error);
```

## 事件日志

### 创建事件日志器

```typescript
class EventLogger {
  constructor(private agent: Agent) {
    this.setupLogging();
  }
  
  private setupLogging(): void {
    this.agent.on('*', (event) => {
      const timestamp = new Date(event.timestamp).toISOString();
      console.log(`[${timestamp}] ${event.type}:`, event.payload);
    });
  }
}

const logger = new EventLogger(agent);
```

### 过滤事件

```typescript
agent.on('*', (event) => {
  // 只记录错误事件
  if (event.type.includes('error') || event.type.includes('failed')) {
    console.error('Error event:', event);
  }
  
  // 只记录性能事件
  if (event.payload.duration !== undefined) {
    console.log('Performance:', event.type, event.payload.duration, 'ms');
  }
});
```

## 事件溯源

### 实现事件溯源

```typescript
interface EventStore {
  append(event: AgentEvent): Promise<void>;
  getEvents(aggregateId: string): Promise<AgentEvent[]>;
  replay(aggregateId: string): Promise<void>;
}

class FileEventStore implements EventStore {
  private events: AgentEvent[] = [];
  
  async append(event: AgentEvent): Promise<void> {
    this.events.push(event);
    await this.persist();
  }
  
  async getEvents(aggregateId: string): Promise<AgentEvent[]> {
    return this.events.filter(e => 
      e.payload.agentId === aggregateId
    );
  }
  
  async replay(aggregateId: string): Promise<void> {
    const events = await this.getEvents(aggregateId);
    for (const event of events) {
      // 重放事件
      console.log('Replaying:', event.type);
    }
  }
  
  private async persist(): Promise<void> {
    // 持久化事件
  }
}
```

## 最佳实践

1. **及时取消订阅** - 避免内存泄漏
2. **错误处理** - 事件处理器中处理错误
3. **异步处理** - 避免阻塞主流程
4. **事件过滤** - 使用通配符时过滤事件
5. **日志记录** - 记录关键事件用于调试

## 相关文档

- [核心概念](../guide/concepts.md) - 核心概念介绍
- [Agent API](./agent.md) - Agent API 参考
- [DDD 架构](../architecture/ddd.md) - 领域事件详解
