# Memory API

Memory 是 SDKWork Browser Agent 的记忆存储系统，提供智能体的记忆能力。

## MemoryStore 接口

### 接口定义

```typescript
interface MemoryStore {
  store(memory: Memory): Promise<void>;
  retrieve(id: string): Promise<Memory | undefined>;
  search(query: MemoryQuery): Promise<MemorySearchResult[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Memory 类型

```typescript
interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  source: MemorySource;
  metadata?: MemoryMetadata;
  timestamp: number;
  score?: number;
  embedding?: number[];
}

type MemoryType = 'episodic' | 'semantic' | 'procedural';
type MemorySource = 'conversation' | 'document' | 'system' | 'user';
```

## 使用方式

Agent 创建时支持三种 Memory 配置方式：

### 1. 使用内置内存存储

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const agent = createAgent(llm, {
  name: 'MemoryAgent',
  // 使用 MemoryConfig 配置内置存储
  memory: {
    limit: 1000,
    maxTokens: 128000,
  }
});
```

### 2. 使用自定义 MemoryStore

```typescript
import { createAgent, type MemoryStore, type Memory, type MemoryQuery, type MemorySearchResult } from '@sdkwork/browser-agent';

// 实现自定义 MemoryStore
class CustomMemoryStore implements MemoryStore {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async store(memory: Memory): Promise<void> {
    await this.db.insert('memories', memory);
  }

  async retrieve(id: string): Promise<Memory | undefined> {
    return this.db.query('memories', { id });
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const results = await this.db.search('memories', query.content, query.limit);
    return results.map(memory => ({
      memory,
      score: 1.0,
      relevance: 1.0,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete('memories', { id });
  }

  async clear(): Promise<void> {
    await this.db.truncate('memories');
  }
}

// 使用自定义存储
const customStore = new CustomMemoryStore(myDatabase);

const agent = createAgent(llm, {
  name: 'CustomMemoryAgent',
  memory: customStore, // 直接传入 MemoryStore 实例
});
```

### 3. 不启用记忆

```typescript
const agent = createAgent(llm, {
  name: 'StatelessAgent',
  // 不配置 memory，不启用记忆功能
});
```

## 内置 Memory 实现

### 1. 默认内存存储

```typescript
import { createMemoryStore } from '@sdkwork/browser-agent';

const memoryStore = createMemoryStore({
  limit: 1000,        // 最大记忆数量
  maxTokens: 128000,  // 最大 Token 数
  enableCache: true,  // 启用缓存
  cacheSize: 100,     // 缓存大小
});
```

### 2. GraphMemory（知识图谱）

```typescript
import { GraphMemory, createGraphMemory } from '@sdkwork/browser-agent';
import { createLogger } from '@sdkwork/browser-agent';

const logger = createLogger({ name: 'GraphMemory' });

const graphMemory = createGraphMemory(logger, {
  maxNodes: 100000,
  maxEdges: 500000,
  autoIndex: true,
  enableInference: true,
});

// 添加节点
const node = graphMemory.addNode('Alice', 'entity', { type: 'person' }, 0.8);

// 添加关系
graphMemory.addEdge(
  node.id,
  targetNode.id,
  'related_to',
  0.9,
  { since: '2024-01-01' }
);

// 多跳查询
const results = graphMemory.multiHopQuery(node.id, { maxDepth: 3 });

// 路径查找
const paths = graphMemory.findPaths(sourceId, targetId, { maxDepth: 5 });

// 关系推理
const inference = graphMemory.inferRelations(node.id);
```

### 3. HierarchicalMemory（分层记忆）

```typescript
import { HierarchicalMemory, createHierarchicalMemory } from '@sdkwork/browser-agent';

const hierarchicalMemory = createHierarchicalMemory({
  levels: ['short-term', 'long-term', 'knowledge'],
  consolidationThreshold: 0.7,
  forgettingRate: 0.1,
});
```

### 4. MemGPTMemory

```typescript
import { MemGPTMemory } from '@sdkwork/browser-agent';

const memgptMemory = new MemGPTMemory({
  coreMemoryLimit: 2000,
  workingMemoryLimit: 10000,
  recallMemoryLimit: 100000,
});
```

## 完整示例

### 使用 GraphMemory 作为 Agent 记忆

```typescript
import { createAgent, GraphMemory, createGraphMemory } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import { createLogger } from '@sdkwork/browser-agent';

const logger = createLogger({ name: 'Agent' });

// 创建 GraphMemory
const graphMemory = createGraphMemory(logger, {
  maxNodes: 50000,
  maxEdges: 200000,
  enableInference: true,
});

// 创建 LLM 提供者
const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

// 创建 Agent，使用 GraphMemory
const agent = createAgent(llm, {
  name: 'KnowledgeAgent',
  description: 'An agent with knowledge graph memory',
  memory: graphMemory,
});

await agent.initialize();

// 对话会自动使用记忆
const response = await agent.chat({
  messages: [
    { id: '1', role: 'user', content: '我叫 Alice', timestamp: Date.now() }
  ]
});

// 后续对话可以记住
const response2 = await agent.chat({
  messages: [
    { id: '2', role: 'user', content: '我叫什么名字？', timestamp: Date.now() }
  ]
});

await agent.destroy();
```

### 实现向量数据库存储

```typescript
import { 
  createAgent, 
  type MemoryStore, 
  type Memory, 
  type MemoryQuery, 
  type MemorySearchResult 
} from '@sdkwork/browser-agent';
import { PineconeClient } from '@pinecone-database/pinecone';

class VectorMemoryStore implements MemoryStore {
  private pinecone: PineconeClient;
  private indexName: string;
  private embeddingModel: EmbeddingModel;

  constructor(pinecone: PineconeClient, indexName: string, embeddingModel: EmbeddingModel) {
    this.pinecone = pinecone;
    this.indexName = indexName;
    this.embeddingModel = embeddingModel;
  }

  async store(memory: Memory): Promise<void> {
    const embedding = await this.embeddingModel.embed(memory.content);
    
    await this.pinecone.Index(this.indexName).upsert({
      vectors: [{
        id: memory.id,
        values: embedding,
        metadata: {
          content: memory.content,
          type: memory.type,
          source: memory.source,
          timestamp: memory.timestamp,
          ...memory.metadata,
        },
      }],
    });
  }

  async retrieve(id: string): Promise<Memory | undefined> {
    const result = await this.pinecone.Index(this.indexName).fetch({
      ids: [id],
    });
    
    if (result.vectors[id]) {
      const vector = result.vectors[id];
      return {
        id,
        content: vector.metadata?.content as string,
        type: vector.metadata?.type as MemoryType,
        source: vector.metadata?.source as MemorySource,
        timestamp: vector.metadata?.timestamp as number,
        metadata: vector.metadata,
      };
    }
    
    return undefined;
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.embeddingModel.embed(query.content);
    
    const results = await this.pinecone.Index(this.indexName).query({
      vector: queryEmbedding,
      topK: query.limit || 10,
      includeMetadata: true,
    });

    return results.matches.map(match => ({
      memory: {
        id: match.id,
        content: match.metadata?.content as string,
        type: match.metadata?.type as MemoryType,
        source: match.metadata?.source as MemorySource,
        timestamp: match.metadata?.timestamp as number,
        metadata: match.metadata,
      },
      score: match.score || 0,
      relevance: match.score || 0,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.pinecone.Index(this.indexName).deleteOne(id);
  }

  async clear(): Promise<void> {
    await this.pinecone.Index(this.indexName).deleteAll();
  }
}

// 使用向量存储
const vectorStore = new VectorMemoryStore(pinecone, 'agent-memory', embeddingModel);

const agent = createAgent(llm, {
  name: 'VectorMemoryAgent',
  memory: vectorStore,
});
```

## 最佳实践

1. **选择合适的存储** - 根据场景选择内存、图谱或向量存储
2. **设置合理的限制** - 避免内存无限增长
3. **定期清理** - 清理过期和低重要性记忆
4. **使用元数据** - 利用 metadata 存储额外信息
5. **实现高效检索** - 对于大量数据使用向量索引

## 相关文档

- [核心概念](../guide/concepts.md) - 核心概念介绍
- [Agent API](./agent.md) - Agent API 参考
- [Skill API](./skill.md) - Skill API 参考
