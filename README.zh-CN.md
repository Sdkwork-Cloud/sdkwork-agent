# SDKWork Agent

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/typescript-100%25-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
</p>

<p align="center">
  <strong>统一智能体架构 - DDD 领域驱动设计</strong><br>
  <em>行业领先的 Skill / Tool / MCP / Plugin / TUI 标准</em>
</p>

<p align="center">
  <a href="#核心特性">核心特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构设计">架构设计</a> •
  <a href="#api文档">API文档</a> •
  <a href="#示例">示例</a>
</p>

---

## 📋 目录

- [简介](#-简介)
- [核心特性](#-核心特性)
- [快速开始](#-快速开始)
- [架构设计](#-架构设计)
- [领域模型](#-领域模型)
- [API文档](#-api文档)
- [配置指南](#-配置指南)
- [行业标准](#-行业标准)
- [示例代码](#-示例代码)
- [开发指南](#-开发指南)
- [许可证](#-许可证)

---

## 🎯 简介

**SDKWork Agent** 是一个基于 **DDD (领域驱动设计)** 的统一智能体架构，实现了行业领先的 Skill、Tool、MCP、Plugin 和 TUI 标准。

### 设计理念

```
┌─────────────────────────────────────────────────────────────┐
│                    设计原则                                  │
├─────────────────────────────────────────────────────────────┤
│  DDD 分层架构  │  高内聚低耦合，清晰的领域边界               │
│  微内核架构    │  服务注册发现、依赖注入、生命周期管理        │
│  OpenAI 兼容  │  标准 Chat API，流式响应支持               │
│  类型安全      │  100% TypeScript，完整的类型推导           │
│  可观测性      │  完整事件模型，执行链路追踪                 │
│  可扩展性      │  插件化设计，模块化扩展                     │
│  TUI 支持      │  专业级终端交互界面                         │
│  ReAct 思考    │  思考-行动-观察循环                         │
└─────────────────────────────────────────────────────────────┘
```

### 核心能力

| 能力 | 描述 | 状态 |
|------|------|------|
| **Skill 执行** | 多语言支持 (JS/TS)，Schema 验证 | ✅ |
| **Tool 调用** | 分类管理、确认级别、执行链 | ✅ |
| **MCP 集成** | Anthropic Model Context Protocol | ✅ |
| **Plugin 系统** | VSCode 风格生命周期管理 | ✅ |
| **记忆系统** | 语义搜索、多维度存储 | ✅ |
| **执行引擎** | 规划-执行分离、重试机制、熔断保护 | ✅ |
| **TUI 界面** | 专业级终端 UI，支持流式输出 | ✅ |
| **ReAct 思考** | 思考-行动-观察循环 | ✅ |

---

## 🚀 快速开始

### 安装

```bash
npm install @sdkwork/agent
```

### 创建你的第一个 Agent

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';

// 创建 LLM 提供者
const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// 创建 Agent (简洁 API)
const agent = createAgent(openai, {
  name: 'MyAssistant',
  description: '一个 helpful AI 助手',
  skills: [],
  tools: [],
});

// 初始化
await agent.initialize();

// 对话
const response = await agent.chat({
  messages: [
    { role: 'user', content: '你好！' }
  ]
});

console.log(response.choices[0].message.content);

// 清理
await agent.destroy();
```

### 流式响应

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: '给我讲个故事' }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### TUI 界面

```typescript
import { main } from '@sdkwork/agent/tui/cli';

// 启动交互式 TUI
main();
```

---

## 🏗️ 架构设计

### DDD 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (Application)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  AgentImpl   │ │SkillExecutor │ │ToolExecutor  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ MCPManager   │ │PluginManager │ │ExecutionEngine│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                        领域层 (Domain)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Agent   │ │  Skill   │ │   Tool   │ │   MCP    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Plugin  │ │  Memory  │ │Execution │ │  Events  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                      基础设施层 (Infrastructure)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Microkernel  │ │EventEmitter  │ │ Logger      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 微内核架构

```typescript
// 服务注册
kernel.registerService({
  id: 'llm-service',
  version: '1.0.0',
  dependencies: [],
  initialize: async () => { /* ... */ },
  destroy: async () => { /* ... */ },
  pause: async () => { /* ... */ },
  resume: async () => { /* ... */ },
});

// 拓扑排序初始化
await kernel.initializeAll();
```

### Agent 生命周期

```
┌─────────┐    initialize()    ┌─────────────┐    destroy()    ┌───────────┐
│  IDLE   │ ─────────────────→ │    READY    │ ──────────────→ │ DESTROYED │
└─────────┘                    └─────────────┘                 └───────────┘
      │                              │
      │ reset()                      │ chat() / execute()
      ↓                              ↓
┌─────────┐                    ┌─────────────┐
│  ERROR  │ ←───────────────── │  CHATTING   │
│ (可恢复) │      错误处理       │  EXECUTING  │
└─────────┘                    └─────────────┘
```

### ReAct 思考引擎

```
┌─────────────────────────────────────────────────────────────┐
│                    ReAct 循环                                │
├─────────────────────────────────────────────────────────────┤
│  1. 思考 (Thought)    → 分析情况并制定计划                   │
│  2. 行动 (Action)     → 选择工具/技能执行                    │
│  3. 观察 (Observation)→ 收集执行结果                         │
│  4. 反思 (Reflection) → 每 N 步进行自我反思                  │
│  5. 重复              → 直到获得答案或达到最大步数            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 领域模型

### Agent 聚合根

```typescript
interface Agent {
  // 身份
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;
  
  // 状态
  readonly state: AgentState;
  
  // 领域服务
  readonly llm: LLMProvider;
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory?: MemoryStore;
  readonly execution: ExecutionEngine;
  readonly kernel: Microkernel;
  
  // 核心能力
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
  
  // 生命周期
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  reset(): Promise<void>; // 错误恢复
}
```

### Skill 领域模型

```typescript
interface Skill {
  readonly id: SkillId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  // 输入/输出 Schema
  readonly inputSchema: z.ZodType<unknown>;
  
  // 执行函数
  execute(input: unknown, context: SkillContext): Promise<SkillResult>;
  
  // 可选流式执行
  executeStream?(input: unknown, context: SkillContext): AsyncIterable<unknown>;
}

// Skill 上下文
interface SkillContext {
  executionId: ExecutionId;
  agentId: AgentId;
  sessionId?: SessionId;
  input: unknown;
  logger: Logger;
  llm: LLMService;
  memory: MemoryService;
  tools: ToolRegistry;
  signal?: AbortSignal;
}
```

### Tool 领域模型

```typescript
interface Tool {
  readonly id: ToolId;
  readonly name: string;
  readonly description: string;
  readonly category: 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
  readonly confirm: 'none' | 'read' | 'write' | 'destructive';
  
  // 输入/输出 Schema
  readonly inputSchema?: z.ZodType<unknown>;
  readonly outputSchema?: z.ZodType<unknown>;
  
  // 执行函数
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

// Tool 上下文
interface ToolContext {
  executionId: ExecutionId;
  agentId: AgentId;
  sessionId?: SessionId;
  toolId: ToolId;
  toolName: string;
  logger: Logger;
  signal?: AbortSignal;
}
```

### MCP 客户端

```typescript
// 配置 MCP 服务器
const agent = createAgent(openai, {
  name: 'MCPAgent',
  mcp: [
    {
      id: 'github-mcp',
      name: 'GitHub MCP',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
      }
    }
  ]
});
```

---

## 📖 API 文档

### 创建 Agent

```typescript
// 简洁 API
function createAgent(
  llmProvider: LLMProvider,
  options?: {
    name?: string;
    description?: string;
    skills?: Skill[];
    tools?: Tool[];
  }
): Agent;

// 示例
const agent = createAgent(openaiProvider, {
  name: 'MyAgent',
  skills: [mySkill],
  tools: [myTool],
});
```

### Agent 配置

```typescript
interface AgentConfig {
  // 身份
  id?: string;
  name: string;
  description?: string;
  
  // LLM 配置
  llm: LLMProvider | LLMConfig;
  
  // 可选能力
  skills?: Skill[];
  tools?: Tool[];
  mcp?: MCPServerConfig[];
  memory?: MemoryConfig;
}

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 
            'minimax' | 'zhipu' | 'qwen' | 'deepseek' | 'doubao';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  defaults?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}
```

### Chat API (OpenAI 兼容)

```typescript
// 请求
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
}

// 响应
interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 流式块
interface ChatStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      toolCalls?: ToolCall[];
    };
    finishReason: string | null;
  }>;
}
```

### 事件系统

```typescript
// 订阅事件
agent.on('chat:completed', (event) => {
  console.log('对话完成:', event.payload);
});

agent.on('skill:completed', (event) => {
  console.log('Skill 执行:', event.payload.skillId);
});

agent.on('tool:completed', (event) => {
  console.log('Tool 调用:', event.payload.toolId);
});

// 所有事件类型
agent.on('agent:initialized', handler);
agent.on('agent:error', handler);
agent.on('execution:step', handler);
agent.on('memory:stored', handler);
```

### ReAct 引擎

```typescript
// 使用 ReAct 模式思考
const result = await agent.think('今天天气怎么样？', {
  sessionId: 'session-1',
  executionId: 'exec-1'
});

// 流式思考过程
for await (const event of agent.thinkStream('复杂问题')) {
  switch (event.type) {
    case 'thought':
      console.log('思考:', event.thought);
      break;
    case 'actions':
      console.log('行动:', event.actions);
      break;
    case 'observations':
      console.log('结果:', event.observations);
      break;
    case 'complete':
      console.log('答案:', event.answer);
      break;
  }
}
```

---

## ⚙️ 配置指南

### 环境变量

```bash
# LLM 提供者
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# MCP
GITHUB_TOKEN=ghp_...
```

### 完整配置示例

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  defaults: {
    temperature: 0.7,
    maxTokens: 4000
  }
});

const agent = createAgent(openai, {
  name: '生产助手',
  description: '企业级 AI 助手',
  
  skills: [
    dataProcessingSkill,
    analysisSkill,
    reportGenerationSkill
  ],
  
  tools: [
    fileReadTool,
    fileWriteTool,
    httpRequestTool,
    databaseQueryTool
  ],
});
```

---

## 🏆 行业标准

### 标准兼容性

| 标准 | 兼容性 | 说明 |
|------|--------|------|
| **OpenAI API** | 100% | Chat Completion API 完全兼容 |
| **Anthropic MCP** | 100% | Model Context Protocol |
| **Claude Code** | 100% | Tool-first 设计哲学 |
| **OpenCode** | 100% | 模块化执行上下文 |
| **OpenClaw** | 100% | 声明式动作定义 |

### 架构对比

```
┌─────────────────────────────────────────────────────────────────┐
│                    SDKWork Agent                                 │
├─────────────────────────────────────────────────────────────────┤
│  DDD 分层      │  领域层/应用层/基础设施层                        │
│  微内核        │  服务注册、依赖注入、生命周期管理                  │
│  事件驱动      │  完整事件模型                                    │
│  类型安全      │  100% TypeScript                                │
│  OpenAI 兼容   │  标准 Chat API                                  │
│  TUI 支持      │  专业级终端界面                                  │
│  ReAct 思考    │  思考-行动-观察循环                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 示例代码

### 示例 1: 数据处理 Agent

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';

// 定义 Skill
const dataProcessorSkill: Skill = {
  id: 'data-processor',
  name: 'Data Processor',
  description: '处理和分析数据',
  version: '1.0.0',
  inputSchema: z.object({ data: z.array(z.any()) }),
  execute: async (input, ctx) => {
    const { data } = input as { data: unknown[] };
    
    // 处理数据
    const processed = data.filter(item => item !== null);
    
    // 使用 LLM 分析
    const response = await ctx.llm.complete({
      messages: [
        { role: 'user', content: `分析: ${JSON.stringify(processed)}`, id: '1', timestamp: Date.now() }
      ]
    });
    
    return {
      success: true,
      data: {
        processed,
        analysis: response.choices[0]?.message?.content
      },
      metadata: {
        executionId: ctx.executionId,
        skillId: 'data-processor',
        skillName: 'Data Processor',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0
      }
    };
  }
};

// 创建 Agent
const agent = createAgent(openai, {
  name: 'DataAgent',
  skills: [dataProcessorSkill]
});

await agent.initialize();

// 执行 skill
const result = await agent.executeSkill('data-processor', {
  data: largeDataset
});
```

### 示例 2: 带记忆的 Agent

```typescript
const agent = createAgent(openai, {
  name: 'MemoryAgent',
  description: '带对话记忆的 Agent'
});

await agent.initialize();

// 第一轮对话
await agent.chat({
  messages: [
    { role: 'user', content: '我叫 Alice' }
  ],
  sessionId: 'session-1'
});

// 第二轮对话 - Agent 记得用户名字
const response = await agent.chat({
  messages: [
    { role: 'user', content: '我叫什么名字？' }
  ],
  sessionId: 'session-1'
});

// 输出: "你的名字是 Alice"
console.log(response.choices[0].message.content);
```

### 示例 3: ReAct 思考

```typescript
const agent = createAgent(openai, {
  name: 'ReasoningAgent',
  skills: [calculatorSkill, searchSkill]
});

await agent.initialize();

// 使用 ReAct 思考
const result = await agent.think(
  '东京的人口乘以 2 是多少？',
  { sessionId: 'session-1', executionId: 'exec-1' }
);

console.log('答案:', result.answer);
console.log('步骤数:', result.steps.length);
console.log('使用工具:', result.toolsUsed);
```

### 示例 4: TUI 界面

```typescript
import { main } from '@sdkwork/agent/tui/cli';

// 启动交互式 TUI，包含：
// - 多提供者支持 (OpenAI, Anthropic 等)
// - 65+ 模型选择
// - 主题切换
// - 会话管理
// - 自动补全
main();
```

---

## 🔧 开发指南

### 项目结构

```
sdkwork-agent/
├── src/
│   ├── index.ts              # 主入口, createAgent
│   ├── core/
│   │   ├── domain/           # 领域层
│   │   │   ├── agent.ts      # Agent 领域模型
│   │   │   ├── skill.ts      # Skill 领域模型
│   │   │   ├── tool.ts       # Tool 领域模型
│   │   │   ├── mcp.ts        # MCP 领域模型
│   │   │   ├── plugin.ts     # Plugin 领域模型
│   │   │   ├── memory.ts     # Memory 领域模型
│   │   │   └── unified.ts    # 统一类型
│   │   ├── application/      # 应用层
│   │   │   ├── agent-impl.ts # Agent 实现
│   │   │   ├── skill-executor.ts
│   │   │   ├── tool-executor.ts
│   │   │   ├── mcp-client.ts
│   │   │   ├── plugin-manager.ts
│   │   │   ├── execution-engine.ts
│   │   │   └── memory-store.ts
│   │   └── microkernel/      # 微内核
│   │       └── index.ts
│   ├── agent/                # 旧版 Agent (ReAct)
│   │   ├── agent.ts          # Agent 类
│   │   ├── thinking/
│   │   │   └── react-engine.ts
│   │   └── skills/
│   │       └── registry.ts
│   ├── llm/                  # LLM 提供者
│   │   ├── provider.ts
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       └── ...
│   ├── skills/               # Skill 系统
│   ├── tools/                # Tool 系统
│   ├── tui/                  # 终端 UI
│   └── utils/                # 工具类
├── tests/
├── docs/
└── examples/
```

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 运行测试
npm run test

# 构建
npm run build

# 代码检查
npm run lint

# 格式化
npm run format
```

---

## 📄 许可证

[MIT](LICENSE) © SDKWork Team

---

<p align="center">
  <strong>Made with ❤️ by SDKWork Team</strong><br>
  <em>Building the future of AI agents</em>
</p>
