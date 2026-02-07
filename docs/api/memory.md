# Memory API

记忆系统提供多维度存储和语义搜索能力。

## Memory 类型

```typescript
type MemoryType = 'episodic' | 'semantic' | 'procedural';
type MemorySource = 'conversation' | 'document' | 'system' | 'user';
```

### Episodic Memory

情景记忆 - 记录具体事件和经历。

```typescript
const memory: Memory = {
  id: 'conv-001',
  content: '用户询问如何学习 TypeScript',
  type: 'episodic',
  source: 'conversation',
  timestamp: Date.now(),
  metadata: {
    sessionId: 'session-1',
    userId: 'user-123'
  }
};
```

### Semantic Memory

语义记忆 - 存储事实和知识。

```typescript
const memory: Memory = {
  id: 'fact-001',
  content: 'TypeScript 是 JavaScript 的超集，添加了类型系统',
  type: 'semantic',
  source: 'document',
  metadata: {
    category: 'programming',
    tags: ['typescript', 'javascript']
  }
};
```

### Procedural Memory

程序记忆 - 存储操作步骤和流程。

```typescript
const memory: Memory = {
  id: 'proc-001',
  content: '创建 Agent 的步骤：1. 配置 LLM 2. 定义 Skills 3. 初始化',
  type: 'procedural',
  source: 'system',
  metadata: {
    task: 'create-agent'
  }
};
```

## MemoryStore

### store

存储记忆。

```typescript
async store(memory: Memory): Promise<void>
```

**示例：**

```typescript
await agent.memory.store({
  id: 'memory-001',
  content: '用户喜欢使用 TypeScript',
  type: 'semantic',
  source: 'conversation',
  timestamp: Date.now(),
  metadata: {
    sessionId: 'session-1',
    userId: 'user-123',
    tags: ['preference', 'typescript']
  }
});
```

### storeBatch

批量存储记忆。

```typescript
async storeBatch(memories: Memory[]): Promise<void>
```

**示例：**

```typescript
await agent.memory.storeBatch([
  { id: 'm1', content: '...', type: 'episodic', source: 'conversation', timestamp: Date.now() },
  { id: 'm2', content: '...', type: 'semantic', source: 'document', timestamp: Date.now() },
  { id: 'm3', content: '...', type: 'procedural', source: 'system', timestamp: Date.now() }
]);
```

### retrieve

根据 ID 检索记忆。

```typescript
async retrieve(id: string): Promise<Memory | undefined>
```

**示例：**

```typescript
const memory = await agent.memory.retrieve('memory-001');
if (memory) {
  console.log(memory.content);
}
```

### search

搜索记忆。

```typescript
async search(query: MemoryQuery): Promise<MemorySearchResult[]>
```

#### MemoryQuery

```typescript
interface MemoryQuery {
  content: string;
  type?: MemoryType;
  source?: MemorySource;
  sessionId?: string;
  limit?: number;
  threshold?: number;
  filters?: MemoryFilters;
}

interface MemoryFilters {
  startTime?: number;
  endTime?: number;
  tags?: string[];
  category?: string;
  sourcePath?: string;
  metadata?: Record<string, unknown>;
}
```

**示例：**

```typescript
// 基础搜索
const results = await agent.memory.search({
  content: 'TypeScript',
  limit: 10
});

// 高级搜索
const results = await agent.memory.search({
  content: '编程语言',
  type: 'semantic',
  source: 'conversation',
  limit: 5,
  threshold: 0.7,
  filters: {
    tags: ['preference'],
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    endTime: Date.now()
  }
});

results.forEach(result => {
  console.log(`Score: ${result.score}, Content: ${result.memory.content}`);
});
```

### semanticSearch

语义搜索（基于向量相似度）。

```typescript
async semanticSearch(query: string, limit?: number): Promise<MemorySearchResult[]>
```

**示例：**

```typescript
const results = await agent.memory.semanticSearch('用户喜欢什么编程语言', 5);
```

### fullTextSearch

全文搜索。

```typescript
async fullTextSearch(query: string, limit?: number): Promise<MemorySearchResult[]>
```

### delete

删除记忆。

```typescript
async delete(id: string): Promise<void>
```

### deleteBySession

删除会话相关的所有记忆。

```typescript
async deleteBySession(sessionId: string): Promise<void>
```

### clear

清空所有记忆。

```typescript
async clear(): Promise<void>
```

### count

获取记忆数量。

```typescript
async count(): Promise<number>
```

### getStats

获取统计信息。

```typescript
async getStats(): Promise<MemoryStats>
```

#### MemoryStats

```typescript
interface MemoryStats {
  totalCount: number;
  byType: Record<MemoryType, number>;
  bySource: Record<MemorySource, number>;
  oldestTimestamp?: number;
  newestTimestamp?: number;
}
```

**示例：**

```typescript
const stats = await agent.memory.getStats();
console.log(`Total memories: ${stats.totalCount}`);
console.log(`Episodic: ${stats.byType.episodic}`);
console.log(`Semantic: ${stats.byType.semantic}`);
console.log(`Procedural: ${stats.byType.procedural}`);
```

## Memory 接口

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

interface MemoryMetadata {
  sessionId?: string;
  agentId?: string;
  userId?: string;
  title?: string;
  category?: string;
  tags?: string[];
  sourcePath?: string;
  sourceType?: string;
  [key: string]: unknown;
}

interface MemorySearchResult {
  memory: Memory;
  score: number;
  relevance: number;
  context?: string;
}
```

## AdvancedMemoryStore

高级记忆存储接口，扩展基础功能。

```typescript
interface AdvancedMemoryStore extends MemoryStore {
  // 批量操作
  storeBatch(memories: Memory[]): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
  
  // 高级搜索
  semanticSearch(query: string, limit?: number): Promise<MemorySearchResult[]>;
  fullTextSearch(query: string, limit?: number): Promise<MemorySearchResult[]>;
  
  // 统计信息
  count(): Promise<number>;
  getStats(): Promise<MemoryStats>;
}
```

## Memory 配置

```typescript
interface MemoryConfig {
  // 存储配置
  maxTokens?: number;
  limit?: number;
  
  // 嵌入配置
  embeddingModel?: string;
  embeddingDimension?: number;
  
  // 搜索配置
  searchThreshold?: number;
  searchLimit?: number;
  
  // 缓存配置
  enableCache?: boolean;
  cacheSize?: number;
  
  // 同步配置
  syncInterval?: number;
  enableAutoSync?: boolean;
}
```

### 示例

```typescript
const agent = createAgent({
  memory: {
    maxTokens: 128000,
    limit: 10000,
    embeddingModel: 'text-embedding-3-small',
    enableCache: true,
    cacheSize: 1000,
    searchThreshold: 0.7,
    searchLimit: 10
  }
});
```

## 在 Skill 中使用

```typescript
const memorySkill = defineSkill({
  id: 'memory-skill',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        // 存储
        await $memory.set('user_name', $input.name);
        
        // 检索
        const name = await $memory.get('user_name');
        
        // 搜索
        const results = await $memory.search('preference');
        
        return { name, preferences: results };
      }
    `
  }
});
```

## Memory 事件

```typescript
interface MemoryEvent {
  type: 'stored' | 'retrieved' | 'searched' | 'deleted' | 'synced';
  memoryId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

type MemoryEventHandler = (event: MemoryEvent) => void | Promise<void>;
```

## 会话记忆

```typescript
interface SessionMemory {
  sessionId: string;
  messages: SessionMessage[];
  metadata?: SessionMetadata;
  createdAt: number;
  updatedAt: number;
}

interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface SessionMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}
```

## 知识记忆

```typescript
interface KnowledgeDocument {
  id: string;
  path: string;
  content: string;
  chunks: DocumentChunk[];
  metadata?: DocumentMetadata;
  hash: string;
  updatedAt: number;
}

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
  hash: string;
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  source?: string;
  category?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
```

## 最佳实践

1. **合理设置记忆类型** - 根据内容选择合适的 type
2. **添加元数据** - 便于后续搜索和过滤
3. **定期清理** - 删除过期或无关的记忆
4. **使用语义搜索** - 比关键词搜索更准确
5. **控制记忆数量** - 避免内存溢出
