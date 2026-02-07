# DDD 分层架构

SDKWork Agent 采用领域驱动设计（Domain-Driven Design）的分层架构，确保业务逻辑与技术实现分离。

## 架构分层

### 分层概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  - 应用服务编排                                               │
│  - 用例实现                                                   │
│  - 事务管理                                                   │
│  - 事件发布                                                   │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  - 领域模型（实体、值对象）                                     │
│  - 领域服务                                                   │
│  - 领域事件                                                   │
│  - 仓储接口                                                   │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│  - 技术实现                                                   │
│  - 数据持久化                                                 │
│  - 外部服务集成                                               │
│  - 框架配置                                                   │
└─────────────────────────────────────────────────────────────┘
```

## Domain Layer（领域层）

领域层是系统的核心，包含业务逻辑和领域模型。

### 实体（Entities）

具有唯一标识的领域对象：

```typescript
// Agent - 聚合根
interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly state: AgentState;
  
  chat(request: ChatRequest): Promise<ChatResponse>;
  executeSkill(skillId: string, input: unknown): Promise<SkillResult>;
  executeTool(toolId: string, input: unknown): Promise<ToolResult>;
}

// Skill - 实体
interface Skill {
  readonly id: string;
  readonly name: string;
  readonly script: SkillScript;
  
  execute(input: unknown, context: SkillExecutionContext): Promise<SkillResult>;
}

// Tool - 实体
interface Tool {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly confirm: ConfirmLevel;
  
  execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
}
```

### 值对象（Value Objects）

无唯一标识的对象：

```typescript
// 执行计划
interface ExecutionPlan {
  steps: ExecutionStep[];
  strategy: 'sequential' | 'parallel' | 'fallback';
}

// 对话请求
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// 对话响应
interface ChatResponse {
  id: string;
  choices: ChatChoice[];
  usage: ChatUsage;
}
```

### 领域服务（Domain Services）

跨实体的业务逻辑：

```typescript
// 执行引擎
interface ExecutionEngine {
  execute(plan: ExecutionPlan): Promise<ExecutionResult>;
  abort(executionId: string): void;
  pause(executionId: string): void;
  resume(executionId: string): void;
}

// 事件发射器
interface EventEmitter {
  on<T>(event: string, handler: (payload: T) => void): void;
  off<T>(event: string, handler: (payload: T) => void): void;
  emit<T>(event: string, payload: T): void;
}
```

### 领域事件（Domain Events）

业务发生的事件：

```typescript
type DomainEvent =
  | AgentInitializedEvent
  | AgentStartedEvent
  | ChatCompletedEvent
  | SkillExecutedEvent
  | ToolInvokedEvent;

interface AgentInitializedEvent {
  type: 'agent:initialized';
  payload: {
    agentId: string;
    timestamp: number;
  };
}
```

### 仓储接口（Repository Interfaces）

```typescript
interface MemoryRepository {
  save(memory: Memory): Promise<void>;
  findById(id: string): Promise<Memory | null>;
  search(query: MemoryQuery): Promise<Memory[]>;
  delete(id: string): Promise<void>;
}
```

## Application Layer（应用层）

应用层负责编排领域对象完成用例。

### 应用服务

```typescript
// Agent 实现
class AgentImpl implements Agent {
  constructor(
    private config: AgentConfig,
    private skillExecutor: SkillExecutor,
    private toolExecutor: ToolExecutor,
    private eventEmitter: EventEmitter
  ) {}
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. 验证请求
    this.validateRequest(request);
    
    // 2. 发布事件
    this.eventEmitter.emit('chat:started', { request });
    
    // 3. 执行对话
    const response = await this.executeChat(request);
    
    // 4. 发布完成事件
    this.eventEmitter.emit('chat:completed', { response });
    
    return response;
  }
}

// Skill 执行器
class SkillExecutorImpl implements SkillExecutor {
  async execute(skill: Skill, input: unknown, context: SkillExecutionContext): Promise<SkillResult> {
    // 1. 验证 Skill
    this.validateSkill(skill);
    
    // 2. 准备上下文
    const executionContext = this.prepareContext(context);
    
    // 3. 执行脚本
    const result = await this.runScript(skill.script, input, executionContext);
    
    // 4. 验证输出
    this.validateOutput(skill, result);
    
    return result;
  }
}

// Tool 执行器
class ToolExecutorImpl implements ToolExecutor {
  async execute(tool: Tool, input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    // 1. 检查确认级别
    if (this.needsConfirmation(tool)) {
      await this.requestConfirmation(tool, input);
    }
    
    // 2. 验证输入
    this.validateInput(tool, input);
    
    // 3. 执行 Tool
    const result = await tool.execute(input, context);
    
    // 4. 记录日志
    this.logExecution(tool, result);
    
    return result;
  }
}
```

### 用例实现

```typescript
// 对话用例
class ChatUseCase {
  constructor(
    private agent: Agent,
    private memoryStore: MemoryStore
  ) {}
  
  async execute(request: ChatRequest): Promise<ChatResponse> {
    // 1. 检索相关记忆
    const memories = await this.memoryStore.search({
      content: request.messages[request.messages.length - 1].content
    });
    
    // 2. 增强请求
    const enhancedRequest = this.enhanceWithMemories(request, memories);
    
    // 3. 执行对话
    const response = await this.agent.chat(enhancedRequest);
    
    // 4. 存储对话
    await this.storeConversation(request, response);
    
    return response;
  }
}
```

## Infrastructure Layer（基础设施层）

基础设施层提供技术实现。

### 微内核

```typescript
interface Microkernel {
  registerService(service: Service): void;
  unregisterService(serviceId: string): void;
  getService<T>(serviceId: string): T;
  initializeAll(): Promise<void>;
  destroyAll(): Promise<void>;
}

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

### LLM Provider

```typescript
interface LLMProvider {
  complete(params: CompletionParams): Promise<CompletionResult>;
  stream(params: CompletionParams): AsyncGenerator<StreamChunk>;
}

class OpenAIProvider implements LLMProvider {
  constructor(private config: OpenAIConfig) {}
  
  async complete(params: CompletionParams): Promise<CompletionResult> {
    // 调用 OpenAI API
  }
  
  async *stream(params: CompletionParams): AsyncGenerator<StreamChunk> {
    // 流式调用 OpenAI API
  }
}
```

### 存储实现

```typescript
class MemoryStoreImpl implements MemoryStore {
  constructor(
    private vectorStore: VectorStore,
    private embeddingProvider: EmbeddingProvider
  ) {}
  
  async store(memory: Memory): Promise<void> {
    // 1. 生成嵌入向量
    const embedding = await this.embeddingProvider.embed(memory.content);
    
    // 2. 存储到向量数据库
    await this.vectorStore.add(memory.id, embedding, memory);
  }
  
  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // 1. 生成查询向量
    const queryEmbedding = await this.embeddingProvider.embed(query.content);
    
    // 2. 向量搜索
    const results = await this.vectorStore.search(queryEmbedding, query.limit);
    
    return results;
  }
}
```

## 依赖关系

### 依赖规则

```
Application Layer → Domain Layer
Infrastructure Layer → Domain Layer
Infrastructure Layer → Application Layer
```

**禁止反向依赖**：
- Domain Layer 不能依赖 Application Layer
- Domain Layer 不能依赖 Infrastructure Layer
- Application Layer 不能依赖 Infrastructure Layer

### 依赖注入

```typescript
// 构造函数注入
class AgentImpl implements Agent {
  constructor(
    private config: AgentConfig,
    private skillExecutor: SkillExecutor,
    private toolExecutor: ToolExecutor,
    private eventEmitter: EventEmitter,
    private memoryStore: MemoryStore
  ) {}
}

// 工厂函数
function createAgent(config: AgentConfig): Agent {
  const eventEmitter = new EventEmitterImpl();
  const skillExecutor = new SkillExecutorImpl();
  const toolExecutor = new ToolExecutorImpl();
  const memoryStore = new MemoryStoreImpl();
  
  return new AgentImpl(
    config,
    skillExecutor,
    toolExecutor,
    eventEmitter,
    memoryStore
  );
}
```

## 设计原则

### 1. 领域模型优先

先设计领域模型，再考虑技术实现。

```typescript
// 好的做法：先定义领域模型
interface Order {
  id: OrderId;
  items: OrderItem[];
  total: Money;
  
  addItem(item: OrderItem): void;
  removeItem(itemId: string): void;
  calculateTotal(): Money;
}

// 不好的做法：直接考虑数据库表结构
interface OrderTable {
  id: string;
  item_ids: string[];
  total_amount: number;
}
```

### 2. 富领域模型

将业务逻辑放在领域模型中。

```typescript
// 好的做法：领域模型包含业务逻辑
class Order {
  addItem(item: OrderItem): void {
    // 业务规则验证
    if (this.items.length >= 100) {
      throw new Error('Order cannot have more than 100 items');
    }
    
    this.items.push(item);
    this.recalculateTotal();
  }
}

// 不好的做法：业务逻辑在服务中
class OrderService {
  addItem(order: Order, item: OrderItem): void {
    if (order.items.length >= 100) {
      throw new Error('Order cannot have more than 100 items');
    }
    
    order.items.push(item);
  }
}
```

### 3. 聚合根

通过聚合根维护业务一致性。

```typescript
// Agent 是聚合根
class Agent {
  private skills: Map<string, Skill>;
  private tools: Map<string, Tool>;
  
  // 通过 Agent 管理 Skill
  registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
    this.emit('skill:registered', { skillId: skill.id });
  }
  
  // 通过 Agent 管理 Tool
  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
    this.emit('tool:registered', { toolId: tool.id });
  }
}
```

### 4. 领域事件

使用领域事件实现松耦合。

```typescript
// 发布事件
class Agent {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.executeChat(request);
    
    // 发布领域事件
    this.emit('chat:completed', {
      executionId: response.id,
      tokenUsage: response.usage
    });
    
    return response;
  }
}

// 订阅事件
class AnalyticsService {
  constructor(agent: Agent) {
    agent.on('chat:completed', (event) => {
      this.recordTokenUsage(event.payload.tokenUsage);
    });
  }
}
```

## 最佳实践

1. **保持领域层纯净** - 不依赖任何框架或技术细节
2. **使用接口定义契约** - 通过接口定义层间契约
3. **避免贫血模型** - 领域模型应该包含业务逻辑
4. **合理使用领域服务** - 跨实体的逻辑放在服务中
5. **事件驱动** - 使用领域事件实现松耦合
6. **依赖注入** - 通过构造函数注入依赖，便于测试
