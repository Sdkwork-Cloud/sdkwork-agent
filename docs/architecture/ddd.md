# DDD 架构

SDKWork Browser Agent 采用领域驱动设计（Domain-Driven Design），将业务逻辑封装在领域层，实现高内聚、低耦合的架构。

## 分层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Layer                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Application Services                                           │ │
│  │  - AgentService                                                 │ │
│  │  - ChatService                                                  │ │
│  │  - SessionService                                               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                          Domain Layer                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Aggregates          │  Entities        │  Value Objects        │ │
│  │  - Agent             │  - Skill         │  - ChatMessage        │ │
│  │  - Session           │  - Tool          │  - SkillResult        │ │
│  │                      │  - MemoryItem    │  - ToolResult         │ │
│  │                      │                  │  - ExecutionId        │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  Domain Services                                                  │ │
│  │  - ExecutionEngine                                               │ │
│  │  - ReasoningEngine                                               │ │
│  │  - PlanningEngine                                                │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  Domain Events                                                    │ │
│  │  - AgentInitialized                                              │ │
│  │  - ChatCompleted                                                 │ │
│  │  - SkillExecuted                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Repositories           │  Adapters           │  External       │ │
│  │  - SkillRegistry        │  - LLMProvider      │  - OpenAI API   │ │
│  │  - ToolRegistry         │  - StorageAdapter   │  - FileSystem   │ │
│  │  - MemoryStore          │  - EventPublisher   │  - Database     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 聚合设计

### Agent 聚合

Agent 是核心聚合根，管理 Skill、Tool、Memory 等实体：

```typescript
// src/agent/agent.ts
export class AgentImpl implements Agent {
  // 聚合根标识
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;
  
  // 聚合内部实体
  private _state: AgentState;
  private _sessions: Map<SessionId, Session>;
  
  // 仓储引用
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory: MemoryStore;
  
  // 领域服务
  readonly execution: ExecutionEngine;
  
  // 聚合根保证一致性
  async initialize(): Promise<void> {
    this._state = AgentState.INITIALIZING;
    await this.skills.initialize();
    await this.tools.initialize();
    await this.memory.initialize();
    this._state = AgentState.READY;
    this.emit(new AgentInitializedEvent(this.id));
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 验证聚合状态
    if (this._state !== AgentState.READY) {
      throw new AgentNotReadyError(this._state);
    }
    
    this._state = AgentState.CHATTING;
    try {
      const response = await this.execution.executeChat(request);
      this._state = AgentState.READY;
      return response;
    } catch (error) {
      this._state = AgentState.ERROR;
      throw error;
    }
  }
}
```

### Session 聚合

Session 管理对话历史和上下文：

```typescript
// src/agent/session.ts
export class Session {
  readonly id: SessionId;
  readonly agentId: AgentId;
  readonly createdAt: number;
  
  private _messages: ChatMessage[] = [];
  private _metadata: Map<string, unknown> = new Map();
  
  addMessage(message: ChatMessage): void {
    this._messages.push(message);
    this.emit(new MessageAddedEvent(this.id, message));
  }
  
  getMessages(): readonly ChatMessage[] {
    return Object.freeze([...this._messages]);
  }
  
  setMetadata(key: string, value: unknown): void {
    this._metadata.set(key, value);
  }
}
```

## 值对象

### ChatMessage

不可变的消息值对象：

```typescript
// src/core/types.ts
export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string | MessageContentPart[];
  readonly name?: string;
  readonly timestamp: number;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolCallId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// 创建值对象的工厂函数
export function createMessage(
  role: ChatMessage['role'],
  content: string | MessageContentPart[]
): ChatMessage {
  return Object.freeze({
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  });
}
```

### SkillResult

不可变的执行结果：

```typescript
// src/skills/types.ts
export interface SkillResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: SkillError;
  readonly metadata?: SkillExecutionMeta;
}

export interface SkillExecutionMeta {
  readonly executionId: string;
  readonly skillId: string;
  readonly skillName: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
}
```

## 领域服务

### ExecutionEngine

执行 Skill 和 Tool 的领域服务：

```typescript
// src/execution/engine.ts
export class ExecutionEngine {
  constructor(
    private readonly sandbox: Sandbox,
    private readonly eventBus: EventBus
  ) {}
  
  async executeSkill(
    skill: Skill, 
    input: unknown,
    context: ExecutionContext
  ): Promise<SkillResult> {
    const executionId = generateExecutionId();
    const startTime = Date.now();
    
    this.eventBus.emit(new SkillInvokingEvent(executionId, skill.id));
    
    try {
      const result = await this.sandbox.execute(skill.script, {
        $input: input,
        $context: context,
      });
      
      const meta: SkillExecutionMeta = {
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      };
      
      this.eventBus.emit(new SkillCompletedEvent(executionId, skill.id, result));
      
      return { success: true, data: result, metadata: meta };
    } catch (error) {
      this.eventBus.emit(new SkillFailedEvent(executionId, skill.id, error));
      return { success: false, error: this.toSkillError(error) };
    }
  }
}
```

## 仓储模式

### SkillRegistry

Skill 仓储实现：

```typescript
// src/skills/registry.ts
export class SkillRegistry {
  private readonly skills: Map<string, Skill> = new Map();
  
  register(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      throw new SkillAlreadyExistsError(skill.id);
    }
    this.skills.set(skill.id, skill);
  }
  
  unregister(skillId: string): void {
    this.skills.delete(skillId);
  }
  
  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }
  
  list(): Skill[] {
    return Array.from(this.skills.values());
  }
  
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(skill => 
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery)
    );
  }
}
```

### ToolRegistry

Tool 仓储实现：

```typescript
// src/tools/registry.ts
export class ToolRegistry {
  private readonly tools: Map<string, Tool> = new Map();
  private readonly byCategory: Map<ToolCategory, Set<string>> = new Map();
  
  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
    
    if (!this.byCategory.has(tool.category)) {
      this.byCategory.set(tool.category, new Set());
    }
    this.byCategory.get(tool.category)!.add(tool.id);
  }
  
  getByCategory(category: ToolCategory): Tool[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.tools.get(id)!);
  }
}
```

## 领域事件

### 事件定义

```typescript
// src/core/events.ts
export interface DomainEvent<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

export class AgentInitializedEvent implements DomainEvent {
  readonly type = 'agent:initialized';
  readonly timestamp = Date.now();
  
  constructor(readonly payload: { agentId: AgentId }) {}
}

export class ChatCompletedEvent implements DomainEvent {
  readonly type = 'chat:completed';
  readonly timestamp = Date.now();
  
  constructor(readonly payload: {
    agentId: AgentId;
    executionId: string;
    duration: number;
  }) {}
}
```

### 事件发布

```typescript
// src/core/event-bus.ts
export class EventBus {
  private readonly handlers: Map<string, Set<EventHandler>> = new Map();
  
  subscribe<T>(
    eventType: string, 
    handler: (event: DomainEvent<T>) => void
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }
  
  emit<T>(event: DomainEvent<T>): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    
    // 通配符处理器
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(event);
      }
    }
  }
}
```

## 限界上下文

SDKWork Browser Agent 定义以下限界上下文：

| 上下文 | 职责 | 核心实体 |
|--------|------|----------|
| Agent | 智能体管理 | Agent, Session |
| Skill | 技能执行 | Skill, SkillResult |
| Tool | 工具调用 | Tool, ToolResult |
| Memory | 记忆存储 | MemoryItem, MemoryQuery |
| Execution | 执行管理 | ExecutionContext, Sandbox |
| LLM | 语言模型 | LLMProvider, ChatResponse |

## 最佳实践

1. **聚合根保护不变性** - 通过聚合根保证内部一致性
2. **值对象不可变** - 所有值对象使用 `Object.freeze`
3. **领域事件解耦** - 使用事件进行跨聚合通信
4. **仓储封装持久化** - 隐藏存储实现细节
5. **领域服务无状态** - 领域服务不持有状态

## 相关文档

- [架构概览](./overview.md) - 整体架构设计
- [微内核架构](./microkernel.md) - 微内核设计详解
