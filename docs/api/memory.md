# Memory API

Memory 是 SDKWork Browser Agent 的记忆存储系统，提供智能体的记忆能力。

## MemoryStore

### 接口定义

```typescript
interface MemoryStore {
  store(item: Omit<MemoryItem, 'id'>): Promise<string>;
  retrieve(id: string): Promise<MemoryItem | null>;
  search(query: string, limit?: number): Promise<MemoryItem[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

### MemoryItem

```typescript
interface MemoryItem {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

type MemoryType = 
  | 'short-term'    // 短期记忆
  | 'long-term'     // 长期记忆
  | 'episodic'      // 情景记忆
  | 'semantic'      // 语义记忆
  | 'preference'    // 偏好记忆
  | 'fact';         // 事实记忆
```

## 使用示例

### 基础使用

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const agent = createAgent(llm, { name: 'MemoryAgent' });
await agent.initialize();

// 存储记忆
const memoryId = await agent.memory.store({
  content: '用户喜欢简洁的回答',
  type: 'preference',
  importance: 0.8,
  metadata: { source: 'user-feedback' }
});

// 检索记忆
const memory = await agent.memory.retrieve(memoryId);
console.log(memory?.content);

// 搜索记忆
const results = await agent.memory.search('偏好');
console.log(results);

// 删除记忆
await agent.memory.delete(memoryId);

await agent.destroy();
```

### 在 Skill 中使用

```typescript
const memorySkill: Skill = {
  id: 'remember',
  name: 'Remember',
  description: 'Store and retrieve memories',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const { action, content, query } = $input;
        
        switch (action) {
          case 'store':
            const id = await $memory.store({
              content,
              type: 'fact',
              importance: 0.7
            });
            return { stored: true, id };
            
          case 'search':
            const results = await $memory.search(query, 10);
            return { results };
            
          case 'get':
            const memory = await $memory.get(content);
            return { memory };
        }
      }
    `,
    entry: 'main'
  },
  input: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['store', 'search', 'get'] },
      content: { type: 'string' },
      query: { type: 'string' }
    },
    required: ['action']
  }
};
```

## 记忆类型

### 短期记忆

会话级别的临时记忆：

```typescript
await agent.memory.store({
  content: '当前对话主题是编程',
  type: 'short-term',
  importance: 0.5,
  expiresAt: Date.now() + 3600000 // 1小时后过期
});
```

### 长期记忆

持久化的重要记忆：

```typescript
await agent.memory.store({
  content: '用户的名字是 Alice',
  type: 'long-term',
  importance: 0.9
});
```

### 情景记忆

按时间索引的事件记忆：

```typescript
await agent.memory.store({
  content: '2024-01-15 用户询问了关于 TypeScript 的问题',
  type: 'episodic',
  importance: 0.6,
  metadata: { date: '2024-01-15', topic: 'TypeScript' }
});
```

### 语义记忆

基于内容的记忆：

```typescript
await agent.memory.store({
  content: 'TypeScript 是 JavaScript 的超集',
  type: 'semantic',
  importance: 0.7,
  metadata: { category: 'programming' }
});
```

## 记忆算法

### 重要性评分

```typescript
interface ImportanceScorer {
  score(item: MemoryItem): number;
}

class FrequencyImportanceScorer implements ImportanceScorer {
  private accessCounts: Map<string, number> = new Map();
  
  score(item: MemoryItem): number {
    const accessCount = this.accessCounts.get(item.id) || 0;
    const recency = (Date.now() - item.timestamp) / (1000 * 60 * 60 * 24);
    
    return item.importance * 0.5 + 
           Math.min(accessCount / 10, 0.3) + 
           Math.max(0, 0.2 - recency * 0.01);
  }
}
```

### 遗忘曲线

```typescript
interface ForgettingCurve {
  calculate(item: MemoryItem): number;
}

class EbbinghausForgettingCurve implements ForgettingCurve {
  calculate(item: MemoryItem): number {
    const age = (Date.now() - item.timestamp) / (1000 * 60 * 60);
    const retention = Math.exp(-age / 24);
    return retention * item.importance;
  }
}
```

### 向量检索

```typescript
interface VectorRetriever {
  search(query: string, limit: number): Promise<MemoryItem[]>;
}

class EmbeddingRetriever implements VectorRetriever {
  constructor(private embedder: Embedder) {}
  
  async search(query: string, limit: number): Promise<MemoryItem[]> {
    const queryEmbedding = await this.embedder.embed(query);
    
    const items = await this.getAllItems();
    const scored = items.map(item => ({
      item,
      score: this.cosineSimilarity(queryEmbedding, item.embedding || [])
    }));
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.item);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return dot / (magA * magB);
  }
}
```

## 自定义存储

实现自定义记忆存储：

```typescript
import type { MemoryStore, MemoryItem } from '@sdkwork/browser-agent';

class DatabaseMemoryStore implements MemoryStore {
  constructor(private db: Database) {}
  
  async store(item: Omit<MemoryItem, 'id'>): Promise<string> {
    const id = generateId();
    await this.db.insert('memories', { ...item, id });
    return id;
  }
  
  async retrieve(id: string): Promise<MemoryItem | null> {
    return this.db.query('memories', { id });
  }
  
  async search(query: string, limit?: number): Promise<MemoryItem[]> {
    return this.db.search('memories', query, limit);
  }
  
  async delete(id: string): Promise<void> {
    await this.db.delete('memories', { id });
  }
  
  async clear(): Promise<void> {
    await this.db.truncate('memories');
  }
}
```

## 最佳实践

1. **合理设置重要性** - 根据记忆价值设置 importance
2. **设置过期时间** - 短期记忆应设置 expiresAt
3. **添加元数据** - 使用 metadata 存储额外信息
4. **定期清理** - 清理过期和低重要性记忆
5. **向量索引** - 为语义搜索启用向量嵌入

## 相关文档

- [核心概念](../guide/concepts.md) - 核心概念介绍
- [Agent API](./agent.md) - Agent API 参考
- [Skill API](./skill.md) - Skill API 参考
