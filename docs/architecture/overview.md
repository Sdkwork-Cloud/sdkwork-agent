# 架构概览

SDKWork Browser Agent 采用领域驱动设计（DDD）和微内核架构，提供高度可扩展的智能体框架。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Application Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Agent    │  │     TUI     │  │     CLI     │  │   Examples  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Domain Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Skill    │  │    Tool     │  │   Memory    │  │  Execution  │ │
│  │  Aggregate  │  │  Aggregate  │  │  Aggregate  │  │   Engine    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                         Infrastructure Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ LLM Provider│  │   Storage   │  │   Event     │  │   Plugin    │ │
│  │   Adapter   │  │   Adapter   │  │   System    │  │   System    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Core Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Types    │  │   Errors    │  │   Events    │  │   Utils     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. Agent 模块

Agent 是框架的核心智能体实现，负责协调所有组件：

```typescript
// src/agent/agent.ts
export class AgentImpl implements Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;
  
  private _state: AgentState = AgentState.IDLE;
  readonly llm: LLMProvider;
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory: MemoryStore;
  readonly execution: ExecutionEngine;
  
  async initialize(): Promise<void>;
  async destroy(): Promise<void>;
  async chat(request: ChatRequest): Promise<ChatResponse>;
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
  async executeSkill(skillId: string, input: string): Promise<SkillResult>;
  async executeTool(toolId: string, input: string): Promise<ToolResult>;
}
```

### 2. Skill 模块

Skill 是可执行的代码单元，支持多语言脚本：

```typescript
// src/skills/types.ts
interface Skill {
  id: string;
  name: string;
  description: string;
  version?: string;
  script: SkillScript;
  references?: Reference[];
  input?: JSONSchema;
  output?: JSONSchema;
}
```

### 3. Tool 模块

Tool 是原子操作单元，提供基础能力：

```typescript
// src/tools/types.ts
interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  confirm: ConfirmLevel;
  input?: JSONSchema;
  output?: JSONSchema;
  execute: (input: unknown, context: ExecutionContext) => Promise<ToolResult>;
}
```

### 4. Memory 模块

Memory 提供记忆存储和检索能力：

```typescript
// src/memory/types.ts
interface MemoryStore {
  store(item: Omit<MemoryItem, 'id'>): Promise<string>;
  retrieve(id: string): Promise<MemoryItem | null>;
  search(query: string, limit?: number): Promise<MemoryItem[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

### 5. Execution 模块

Execution Engine 负责执行 Skill 和 Tool：

```typescript
// src/execution/engine.ts
interface ExecutionEngine {
  executeSkill(skill: Skill, input: unknown): Promise<SkillResult>;
  executeTool(tool: Tool, input: unknown): Promise<ToolResult>;
  createContext(): ExecutionContext;
}
```

## 目录结构

```
src/
├── core/                    # 核心层
│   ├── types.ts            # 类型定义
│   ├── errors.ts           # 错误类型
│   ├── events.ts           # 事件系统
│   └── utils.ts            # 工具函数
│
├── agent/                   # Agent 模块
│   ├── agent.ts            # Agent 实现
│   ├── registry.ts         # 注册表
│   └── session.ts          # 会话管理
│
├── skills/                  # Skill 模块
│   ├── types.ts            # 类型定义
│   ├── registry.ts         # Skill 注册表
│   └── executor.ts         # Skill 执行器
│
├── tools/                   # Tool 模块
│   ├── types.ts            # 类型定义
│   ├── registry.ts         # Tool 注册表
│   └── executor.ts         # Tool 执行器
│
├── memory/                  # Memory 模块
│   ├── types.ts            # 类型定义
│   ├── store.ts            # 内存存储
│   └── algorithms/         # 记忆算法
│
├── execution/               # Execution 模块
│   ├── engine.ts           # 执行引擎
│   ├── context.ts          # 执行上下文
│   └── sandbox.ts          # 沙箱环境
│
├── llm/                     # LLM 提供者
│   ├── types.ts            # 类型定义
│   ├── openai.ts           # OpenAI
│   ├── anthropic.ts        # Anthropic
│   ├── gemini.ts           # Google Gemini
│   └── ...                 # 其他提供者
│
├── plugin/                  # 插件系统
│   ├── types.ts            # 类型定义
│   ├── manager.ts          # 插件管理器
│   └── loader.ts           # 插件加载器
│
├── mcp/                     # MCP 协议
│   ├── types.ts            # 类型定义
│   ├── client.ts           # MCP 客户端
│   └── transport/          # 传输层
│
├── algorithms/              # 算法模块
│   ├── reasoning/          # 推理算法
│   ├── planning/           # 规划算法
│   └── memory/             # 记忆算法
│
├── tui/                     # TUI 界面
│   ├── index.ts            # 入口
│   ├── renderer.ts         # 渲染器
│   ├── components/         # 组件
│   └── themes/             # 主题
│
└── index.ts                 # 主入口
```

## 设计原则

### 1. 领域驱动设计（DDD）

- **聚合根**：Agent 是聚合根，协调 Skill、Tool、Memory 等实体
- **值对象**：ChatMessage、SkillResult 等是不可变值对象
- **领域服务**：ExecutionEngine 是领域服务
- **仓储模式**：SkillRegistry、ToolRegistry 实现仓储模式

### 2. 微内核架构

- **核心系统**：Agent、Event、Types 构成最小核心
- **插件系统**：Skill、Tool、Plugin 是可插拔扩展
- **扩展点**：通过接口定义扩展点

### 3. 事件驱动

- 所有操作都产生事件
- 组件间通过事件通信
- 支持事件溯源

### 4. 依赖注入

- 通过构造函数注入依赖
- 支持依赖替换和模拟

## 相关文档

- [DDD 架构](./ddd.md) - 领域驱动设计详解
- [微内核架构](./microkernel.md) - 微内核设计详解
- [React 架构](./react.md) - React 风格的状态管理
