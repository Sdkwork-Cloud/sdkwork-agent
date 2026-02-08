# 性能优化指南

本文档提供 SDKWork Agent 的性能优化建议和最佳实践。

## 概述

SDKWork Agent 在设计时已经考虑了性能，但在实际使用中，根据场景进行优化可以显著提升体验。

## LLM 调用优化

### 1. 使用流式响应

对于长文本生成，使用流式响应可以显著改善用户体验：

```typescript
// 不好的做法：等待完整响应
const response = await agent.chat({
  messages: [{ role: 'user', content: '写一篇文章' }]
});
console.log(response.choices[0].message.content);

// 好的做法：流式输出
const stream = agent.chatStream({
  messages: [{ role: 'user', content: '写一篇文章' }]
});

for await (const chunk of stream) {
  const content = chunk.choices[0].delta.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

### 2. 控制上下文长度

过长的上下文会增加 token 消耗和响应时间：

```typescript
// 限制对话历史长度
const MAX_HISTORY = 10;

const response = await agent.chat({
  messages: [
    { role: 'system', content: '你是一个助手' },
    ...messages.slice(-MAX_HISTORY)  // 只保留最近的消息
  ]
});
```

### 3. 使用合适的模型

根据任务复杂度选择合适的模型：

```typescript
// 简单任务使用轻量级模型
const simpleAgent = createAgent({
  name: 'SimpleAgent',
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-3.5-turbo'  // 更快、更便宜
  })
});

// 复杂任务使用更强的模型
const complexAgent = createAgent({
  name: 'ComplexAgent',
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'  // 更强的能力
  })
});
```

## 记忆系统优化

### 1. 合理设置记忆限制

```typescript
const agent = createAgent({
  memory: {
    maxTokens: 8000,    // 根据需求调整
    limit: 1000,        // 最大记忆数量
    enableCache: true,  // 启用缓存
    cacheSize: 100      // 缓存大小
  }
});
```

### 2. 定期清理过期记忆

```typescript
// 清理 7 天前的记忆
async function cleanupOldMemories(agent: Agent) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const allMemories = await agent.memory.list();
  for (const memory of allMemories) {
    if (memory.timestamp < oneWeekAgo) {
      await agent.memory.delete(memory.id);
    }
  }
}

// 定期执行
setInterval(() => cleanupOldMemories(agent), 24 * 60 * 60 * 1000);
```

### 3. 使用语义搜索优化

```typescript
// 使用语义搜索而不是全文搜索
const results = await agent.memory.semanticSearch(query, 5);

// 结合阈值过滤
const filtered = results.filter(r => r.score > 0.7);
```

## Skill 执行优化

### 1. 缓存 Skill 结果

```typescript
const skillCache = new Map<string, { result: any; timestamp: number }>();

async function executeSkillWithCache(
  agent: Agent,
  skillId: string,
  input: any,
  ttl: number = 60000
) {
  const cacheKey = `${skillId}:${JSON.stringify(input)}`;
  const cached = skillCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.result;
  }
  
  const result = await agent.executeSkill(skillId, JSON.stringify(input));
  skillCache.set(cacheKey, { result, timestamp: Date.now() });
  
  return result;
}
```

### 2. 并行执行独立 Skill

```typescript
// 并行执行多个独立的 Skill
const [result1, result2, result3] = await Promise.all([
  agent.executeSkill('skill-a', input1),
  agent.executeSkill('skill-b', input2),
  agent.executeSkill('skill-c', input3)
]);
```

### 3. 优化 Skill 脚本

```typescript
// 不好的做法：每次执行都重新计算
const skill = defineSkill({
  id: 'heavy-computation',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        // 每次执行都重新计算
        const result = heavyComputation($input.data);
        return result;
      }
    `
  }
});

// 好的做法：使用记忆缓存结果
const skill = defineSkill({
  id: 'heavy-computation',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const cacheKey = 'computation:' + $input.data.hash;
        let result = await $memory.get(cacheKey);
        
        if (!result) {
          result = heavyComputation($input.data);
          await $memory.set(cacheKey, result);
        }
        
        return result;
      }
    `
  }
});
```

## Tool 执行优化

### 1. 批量处理

```typescript
// 不好的做法：逐个执行
for (const file of files) {
  await agent.executeTool('file-read', { path: file });
}

// 好的做法：批量执行
const results = await Promise.all(
  files.map(file => agent.executeTool('file-read', { path: file }))
);
```

### 2. 使用合适的确认级别

```typescript
// 对于只读操作，使用 'none' 或 'read' 级别
const readTool = defineTool({
  id: 'file-read',
  confirm: 'read',  // 不需要用户确认
  // ...
});

// 对于写操作，使用 'write' 或 'destructive' 级别
const writeTool = defineTool({
  id: 'file-write',
  confirm: 'write',  // 需要用户确认
  // ...
});
```

## 资源管理优化

### 1. 及时释放资源

```typescript
// 使用 try-finally 确保资源释放
const agent = createAgent({ ... });

try {
  await agent.initialize();
  // 执行业务逻辑
} finally {
  await agent.destroy();  // 确保资源被释放
}
```

### 2. 使用连接池

```typescript
// 对于需要频繁创建 Agent 的场景，使用连接池
class AgentPool {
  private pool: Agent[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }
  
  async acquire(): Promise<Agent> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    const agent = createAgent({ ... });
    await agent.initialize();
    return agent;
  }
  
  async release(agent: Agent) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(agent);
    } else {
      await agent.destroy();
    }
  }
}
```

### 3. 监控资源使用

```typescript
// 监听资源使用事件
agent.on('execution:completed', (event) => {
  console.log('Execution duration:', event.payload.duration);
  console.log('Memory usage:', process.memoryUsage());
});

agent.on('chat:completed', (event) => {
  console.log('Token usage:', event.payload.tokenUsage);
});
```

## 网络优化

### 1. 使用 HTTP/2

```typescript
// 配置 LLM Provider 使用 HTTP/2
const agent = createAgent({
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    http2: true  // 启用 HTTP/2
  })
});
```

### 2. 配置超时和重试

```typescript
const agent = createAgent({
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 30000,      // 30秒超时
    retries: 3,          // 重试3次
    retryDelay: 1000     // 重试间隔1秒
  })
});
```

### 3. 使用 CDN 加速

对于浏览器环境，使用 CDN 加速静态资源加载：

```html
<script type="module">
  import { createAgent } from 'https://cdn.jsdelivr.net/npm/sdkwork-agent@latest/dist/browser/index.js';
</script>
```

## 性能监控

### 1. 集成 APM 工具

```typescript
import { createAgent } from 'sdkwork-agent';
import * as Sentry from '@sentry/node';

const agent = createAgent({ ... });

// 监听性能事件
agent.on('chat:completed', (event) => {
  Sentry.addBreadcrumb({
    category: 'llm',
    message: 'Chat completed',
    data: {
      duration: event.payload.duration,
      tokenUsage: event.payload.tokenUsage
    }
  });
});
```

### 2. 自定义性能指标

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(value);
  }
  
  getStats(metric: string) {
    const values = this.metrics.get(metric) || [];
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
}

const monitor = new PerformanceMonitor();

agent.on('chat:completed', (event) => {
  monitor.record('chat_duration', event.payload.duration);
  monitor.record('chat_tokens', event.payload.tokenUsage.totalTokens);
});

// 定期输出统计
setInterval(() => {
  console.log('Chat duration stats:', monitor.getStats('chat_duration'));
  console.log('Chat tokens stats:', monitor.getStats('chat_tokens'));
}, 60000);
```

## 最佳实践总结

1. **使用流式响应** - 改善用户体验
2. **控制上下文长度** - 减少 token 消耗
3. **选择合适的模型** - 平衡能力和成本
4. **启用记忆缓存** - 减少重复计算
5. **并行执行** - 提高吞吐量
6. **及时释放资源** - 防止内存泄漏
7. **监控性能指标** - 持续优化
8. **使用连接池** - 减少创建开销

## 性能基准

以下是 SDKWork Agent 在不同场景下的性能基准：

| 场景 | 延迟 | 吞吐量 | 内存占用 |
|------|------|--------|----------|
| 简单对话 | < 500ms | 10 req/s | ~50MB |
| 流式对话 | 首 token < 200ms | - | ~50MB |
| Skill 执行 | < 100ms | 50 req/s | ~30MB |
| Tool 调用 | < 50ms | 100 req/s | ~20MB |
| 记忆搜索 | < 100ms | 20 req/s | ~100MB |

*测试环境：Node.js 18, 4GB RAM, SSD*
