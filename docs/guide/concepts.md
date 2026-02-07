# 核心概念

本文档介绍 SDKWork Agent 的核心概念和架构设计。

## 领域模型

### Agent

Agent 是系统的核心聚合根，代表一个智能代理实例：

```typescript
interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly state: AgentState;
  
  // 核心能力
  readonly llm: LLMProvider;
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory: MemoryStore;
  readonly execution: ExecutionEngine;
  
  // 业务方法
  chat(request: ChatRequest): Promise<ChatResponse>;
  executeSkill(skillId: string, input?: unknown): Promise<SkillResult>;
  executeTool(toolId: string, input?: unknown): Promise<ToolResult>;
  
  // 生命周期
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  reset(): Promise<void>;
}
```

### Skill

Skill 是可执行的代码单元：

```typescript
interface Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version?: string;
  
  // 执行脚本
  script: {
    code: string;
    lang: 'javascript' | 'typescript' | 'python' | 'bash';
    entry?: string;
    dependencies?: Record<string, string>;
  };
  
  // 引用文件
  references?: Reference[];
  
  // Schema
  input?: JSONSchema;
  output?: JSONSchema;
  
  // 执行
  execute(input: unknown): Promise<SkillResult>;
}
```

### Tool

Tool 是原子操作单元：

```typescript
interface Tool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  // 分类和确认级别
  category: 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
  confirm: 'none' | 'read' | 'write' | 'destructive';
  
  // Schema
  input?: JSONSchema;
  output?: JSONSchema;
  
  // 执行
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}
```

## 架构分层

### Domain Layer（领域层）

包含核心业务逻辑：

- **实体**: Agent、Skill、Tool、MCP、Plugin、Memory
- **值对象**: ExecutionPlan、ChatRequest、ChatResponse
- **领域服务**: ExecutionEngine、EventEmitter
- **领域事件**: AgentInitialized、ChatCompleted、SkillExecuted
- **仓储接口**: MemoryRepository

### Application Layer（应用层）

编排领域对象完成用例：

- **应用服务**: AgentImpl、SkillExecutor、ToolExecutor
- **用例实现**: ChatUseCase、ExecuteSkillUseCase
- **事务管理**: 确保操作的原子性
- **事件发布**: 发布领域事件

### Infrastructure Layer（基础设施层）

技术实现细节：

- **LLM Provider**: OpenAI、Anthropic、Google 等
- **存储实现**: MemoryStoreImpl
- **外部服务**: HTTP Client、WebSocket Client
- **框架配置**: VitePress、Express

## 微内核架构

### 核心服务

```typescript
interface Service {
  id: string;
  version: string;
  dependencies: string[];
  
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
}
```

### 服务注册

```typescript
kernel.registerService({
  id: 'llm-service',
  version: '1.0.0',
  dependencies: [],
  async initialize() { /* ... */ },
  async destroy() { /* ... */ }
});
```

### 依赖管理

- 自动拓扑排序
- 循环依赖检测
- 优雅降级

## 事件系统

### 事件类型

| 类别 | 事件 | 说明 |
|------|------|------|
| 生命周期 | `agent:initialized` | Agent 初始化完成 |
| 对话 | `chat:completed` | 对话完成 |
| 执行 | `execution:started` | 执行开始 |
| Skill | `skill:executed` | Skill 执行完成 |
| Tool | `tool:invoked` | Tool 调用完成 |

### 订阅事件

```typescript
agent.on('chat:completed', (event) => {
  console.log('Duration:', event.payload.duration);
});
```

## 记忆系统

### 记忆类型

- **Episodic**: 情景记忆，记录具体事件
- **Semantic**: 语义记忆，存储事实和知识
- **Procedural**: 程序记忆，存储操作步骤

### 存储和检索

```typescript
// 存储
await agent.memory.store({
  id: 'memory-001',
  content: '用户喜欢 TypeScript',
  type: 'semantic',
  timestamp: Date.now()
});

// 语义搜索
const results = await agent.memory.semanticSearch('编程语言', 5);
```

## 执行引擎

### 执行计划

```typescript
interface ExecutionPlan {
  steps: ExecutionStep[];
  strategy: 'sequential' | 'parallel' | 'fallback';
}
```

### 执行策略

- **Sequential**: 顺序执行
- **Parallel**: 并行执行
- **Fallback**: 失败回退

### 重试机制

- 指数退避
- 最大重试次数
- 熔断保护

## 最佳实践

1. **领域模型优先**: 先设计领域模型，再考虑技术实现
2. **依赖注入**: 通过构造函数注入依赖
3. **事件驱动**: 使用领域事件实现松耦合
4. **错误处理**: 完善的错误处理和日志记录
5. **类型安全**: 100% TypeScript 类型覆盖
