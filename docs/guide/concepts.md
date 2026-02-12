# 核心概念

本文档介绍 SDKWork Browser Agent 的核心概念和设计理念。

## Agent（智能体）

Agent 是框架的核心抽象，代表一个具有自主决策能力的 AI 智能体。

### 特性

- **自主决策** - 根据上下文自主选择执行路径
- **状态管理** - 维护内部状态和对话上下文
- **能力扩展** - 通过 Skill 和 Tool 扩展能力
- **记忆系统** - 存储和检索历史信息

### 状态

```typescript
enum AgentState {
  IDLE = 'idle',           // 空闲
  INITIALIZING = 'initializing', // 初始化中
  READY = 'ready',         // 就绪
  CHATTING = 'chatting',   // 对话中
  EXECUTING = 'executing', // 执行中
  THINKING = 'thinking',   // 思考中
  ERROR = 'error',         // 错误
  DESTROYED = 'destroyed', // 已销毁
}
```

## Skill（技能）

Skill 是可执行的代码单元，封装特定领域的能力。

### 特性

- **多语言支持** - 支持 TypeScript、JavaScript、Python、Bash
- **引用文件** - 支持引用外部文件和模板
- **注入 API** - 提供 $input、$llm、$tool 等注入 API
- **Schema 验证** - 支持输入输出 JSON Schema 验证

### 执行流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│   Script    │────▶│   Output    │
│ Validation  │     │ Execution   │     │ Validation  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Tool（工具）

Tool 是原子操作单元，提供基础能力。

### 分类

| 分类 | 说明 | 示例 |
|------|------|------|
| file | 文件操作 | 读写文件、列出目录 |
| network | 网络请求 | HTTP 请求、API 调用 |
| system | 系统命令 | 执行命令、环境变量 |
| data | 数据处理 | JSON 解析、数据转换 |
| llm | LLM 调用 | 多模型调用、流式输出 |
| custom | 自定义 | 用户定义的工具 |

### 确认级别

```typescript
type ConfirmLevel = 
  | 'none'       // 无需确认
  | 'read'       // 读取操作确认
  | 'write'      // 写入操作确认
  | 'destructive'; // 破坏性操作确认
```

## Memory（记忆）

Memory 提供智能体的记忆存储和检索能力。

### 记忆类型

| 类型 | 说明 | 持久性 |
|------|------|--------|
| short-term | 短期记忆 | 会话级别 |
| long-term | 长期记忆 | 持久化 |
| episodic | 情景记忆 | 按时间索引 |
| semantic | 语义记忆 | 按内容索引 |

### 记忆算法

- **重要性评分** - 基于使用频率和相关性
- **遗忘曲线** - 模拟人类遗忘机制
- **检索增强** - 基于向量相似度检索

## Execution（执行）

Execution Engine 负责 Skill 和 Tool 的执行。

### 执行上下文

```typescript
interface ExecutionContext {
  agentId: string;
  sessionId?: string;
  executionId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### 沙箱环境

Skill 在隔离的沙箱环境中执行：

- **变量隔离** - 每次执行独立的变量作用域
- **资源限制** - 限制 CPU、内存、时间
- **安全访问** - 受限的文件和网络访问

## Event（事件）

事件系统提供组件间的松耦合通信。

### 事件类型

```typescript
type AgentEventType =
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:destroyed'
  | 'agent:error'
  | 'chat:started'
  | 'chat:completed'
  | 'chat:error'
  | 'skill:invoking'
  | 'skill:completed'
  | 'skill:failed'
  | 'tool:invoking'
  | 'tool:completed'
  | 'tool:failed'
  | 'execution:step'
  | 'execution:failed'
  | 'memory:stored';
```

### 事件流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Producer  │────▶│  Event Bus  │────▶│  Consumer   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Plugin（插件）

插件系统提供可扩展的功能模块。

### 插件组成

- **Skills** - 插件提供的技能
- **Tools** - 插件提供的工具
- **Hooks** - 事件钩子函数
- **Config** - 插件配置

### 生命周期

```
install → initialize → running → shutdown → uninstall
```

## MCP（模型上下文协议）

MCP 提供标准化的工具集成协议。

### 传输类型

- **stdio** - 标准输入输出
- **http** - HTTP 连接
- **websocket** - WebSocket 连接

### 功能

- **工具发现** - 自动发现 MCP 服务器提供的工具
- **工具调用** - 通过标准协议调用工具
- **资源访问** - 访问 MCP 服务器提供的资源

## LLM Provider（语言模型提供者）

LLM Provider 封装不同 LLM 服务的调用。

### 支持的提供者

| 提供者 | 模型 |
|--------|------|
| OpenAI | GPT-4, GPT-3.5 |
| Anthropic | Claude 3 |
| Google | Gemini |
| DeepSeek | DeepSeek Chat |
| Moonshot | Moonshot V1 |
| MiniMax | ABAB 5.5 |
| Zhipu | GLM-4 |
| Qwen | Qwen Turbo |
| Doubao | Doubao Pro |

### 统一接口

```typescript
interface LLMProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
  embed(text: string): Promise<number[]>;
}
```

## 相关文档

- [Agent API](../api/agent.md) - Agent API 参考
- [Skill API](../api/skill.md) - Skill API 参考
- [Tool API](../api/tool.md) - Tool API 参考
- [Memory API](../api/memory.md) - Memory API 参考
- [Events API](../api/events.md) - Events API 参考
