# 性能优化

本文档介绍 SDKWork Browser Agent 的性能优化策略和最佳实践。

## 内存优化

### 会话管理

合理管理会话，避免内存泄漏：

```typescript
// 创建会话
const sessionId = agent.createSession();

// 使用会话
await agent.chat({ messages, sessionId });

// 及时清除会话
agent.clearSession(sessionId);
```

### 记忆清理

定期清理过期和低重要性记忆：

```typescript
// 设置过期时间
await agent.memory.store({
  content: '临时信息',
  type: 'short-term',
  importance: 0.3,
  expiresAt: Date.now() + 3600000 // 1小时后过期
});

// 定期清理
setInterval(async () => {
  const items = await agent.memory.search('', 1000);
  for (const item of items) {
    if (item.expiresAt && item.expiresAt < Date.now()) {
      await agent.memory.delete(item.id);
    }
  }
}, 3600000);
```

### 事件订阅清理

及时取消事件订阅：

```typescript
// 保存取消订阅函数
const subscriptions: (() => void)[] = [];

subscriptions.push(
  agent.on('chat:completed', handler1),
  agent.on('skill:completed', handler2)
);

// 清理所有订阅
function cleanup() {
  subscriptions.forEach(unsub => unsub());
  subscriptions.length = 0;
}
```

## 并发优化

### 批量请求

合并多个请求：

```typescript
// 不推荐：逐个请求
for (const message of messages) {
  await agent.chat({ messages: [message] });
}

// 推荐：批量请求
const responses = await Promise.all(
  messages.map(msg => agent.chat({ messages: [msg] }))
);
```

### 流式输出

使用流式输出减少等待时间：

```typescript
// 不推荐：等待完整响应
const response = await agent.chat({ messages });
console.log(response.choices[0].message.content);

// 推荐：流式输出
for await (const chunk of agent.chatStream({ messages })) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}
```

### 并发限制

控制并发数量：

```typescript
class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];
  
  constructor(private limit: number) {}
  
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.limit) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      this.queue.shift()?.();
    }
  }
}

const limiter = new ConcurrencyLimiter(5);

const results = await Promise.all(
  tasks.map(task => limiter.run(task))
);
```

## 缓存策略

### 响应缓存

缓存重复请求的响应：

```typescript
class ResponseCache {
  private cache = new Map<string, ChatResponse>();
  
  private hash(messages: ChatMessage[]): string {
    return JSON.stringify(messages.map(m => m.content));
  }
  
  async getOrFetch(
    messages: ChatMessage[],
    fetch: () => Promise<ChatResponse>
  ): Promise<ChatResponse> {
    const key = this.hash(messages);
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const response = await fetch();
    this.cache.set(key, response);
    return response;
  }
}
```

### Skill 结果缓存

缓存 Skill 执行结果：

```typescript
const cachedSkill: Skill = {
  id: 'cached-calculator',
  name: 'Cached Calculator',
  description: 'Calculator with caching',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      const cache = new Map();
      
      async function main() {
        const key = JSON.stringify($input);
        
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        const result = calculate($input);
        cache.set(key, result);
        return result;
      }
      
      function calculate(input) {
        // 计算逻辑
      }
    `,
    entry: 'main'
  }
};
```

## 网络优化

### 连接复用

复用 LLM 连接：

```typescript
// 推荐：复用 Provider 实例
const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  // 启用连接复用
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 10
  })
});

// 创建多个 Agent 共享 Provider
const agent1 = createAgent(llm, { name: 'Agent1' });
const agent2 = createAgent(llm, { name: 'Agent2' });
```

### 请求压缩

启用请求压缩：

```typescript
const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  headers: {
    'Accept-Encoding': 'gzip, deflate'
  }
});
```

## 执行优化

### Skill 预编译

预编译 Skill 脚本：

```typescript
import { SkillExecutor } from '@sdkwork/browser-agent';

const executor = new SkillExecutor();

// 预编译
await executor.precompile(skill);

// 执行（使用预编译版本）
const result = await executor.execute(skill, input);
```

### 沙箱优化

优化沙箱环境：

```typescript
// 重用沙箱实例
const sandbox = new Sandbox({
  timeout: 30000,
  memoryLimit: 128 * 1024 * 1024
});

// 多次执行使用同一沙箱
for (const input of inputs) {
  const result = await sandbox.execute(skill.script, { $input: input });
}
```

## 监控指标

### 性能指标收集

```typescript
agent.on('*', (event) => {
  if (event.payload.duration !== undefined) {
    metrics.record(event.type, {
      duration: event.payload.duration,
      success: event.payload.success
    });
  }
});

// 定期报告
setInterval(() => {
  console.log('Performance Metrics:');
  console.log('- Avg Chat Duration:', metrics.getAverage('chat:completed'));
  console.log('- Avg Skill Duration:', metrics.getAverage('skill:completed'));
  console.log('- Avg Tool Duration:', metrics.getAverage('tool:completed'));
}, 60000);
```

### 资源监控

```typescript
function monitorResources() {
  const used = process.memoryUsage();
  
  console.log('Memory Usage:');
  console.log(`- RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
  console.log(`- Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`);
  console.log(`- Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
}

setInterval(monitorResources, 30000);
```

## 最佳实践

1. **及时清理** - 清理会话、订阅、记忆
2. **并发控制** - 合理控制并发数量
3. **流式输出** - 使用流式输出提升体验
4. **缓存复用** - 缓存重复计算结果
5. **连接复用** - 复用网络连接
6. **监控告警** - 监控性能指标

## 相关文档

- [核心概念](./concepts.md) - 核心概念介绍
- [故障排除](./troubleshooting.md) - 故障排除指南
