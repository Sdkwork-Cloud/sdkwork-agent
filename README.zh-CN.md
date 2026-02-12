# SDKWork Agent

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/typescript-100%25-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/ESM-Ready-brightgreen.svg" alt="ESM">
</p>

<p align="center">
  <strong>企业级 AI 智能体框架</strong><br>
  <em>DDD 架构 • 微内核 • ReAct 思考 • 多 LLM 支持</em>
</p>

<p align="center">
  <a href="#-核心特性">核心特性</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-架构设计">架构设计</a> •
  <a href="#-api-文档">API 文档</a> •
  <a href="#-示例代码">示例代码</a>
</p>

---

## 📋 目录

- [简介](#-简介)
- [核心特性](#-核心特性)
- [快速开始](#-快速开始)
- [架构设计](#-架构设计)
- [LLM 提供者](#-llm-提供者)
- [领域模型](#-领域模型)
- [API 文档](#-api-文档)
- [安全机制](#-安全机制)
- [记忆系统](#-记忆系统)
- [技能系统](#-技能系统)
- [示例代码](#-示例代码)
- [项目结构](#-项目结构)
- [开发指南](#-开发指南)
- [许可证](#-许可证)

---

## 🎯 简介

**SDKWork Agent** 是一个基于 **DDD (领域驱动设计)** 和 **微内核架构** 的企业级 AI 智能体框架，提供统一、类型安全、可扩展的智能应用开发平台。

### 设计理念

```
┌─────────────────────────────────────────────────────────────────┐
│                      核心设计原则                                 │
├─────────────────────────────────────────────────────────────────┤
│  DDD 分层架构   │  高内聚低耦合，清晰的领域边界                    │
│  微内核架构     │  服务注册发现、依赖注入、生命周期管理             │
│  类型安全       │  100% TypeScript，完整的类型推导                 │
│  事件驱动       │  完整事件模型，执行链路追踪                       │
│  安全优先       │  多层沙箱隔离，注入攻击检测                       │
│  可观测性       │  指标监控、日志记录、性能追踪                     │
│  可扩展性       │  插件化设计，模块化架构                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ 核心特性

### 核心能力

| 能力 | 描述 | 状态 |
|------|------|------|
| **多 LLM 支持** | OpenAI、Anthropic、Google、DeepSeek、Moonshot、MiniMax、智谱、通义千问、豆包 | ✅ |
| **ReAct 思考** | 思考-行动-观察循环，支持反思机制 | ✅ |
| **Skill 执行** | 多语言支持 (JS/TS/Python)、Schema 验证、热重载 | ✅ |
| **Tool 调用** | 分类管理、确认级别、智能选择 | ✅ |
| **MCP 集成** | Anthropic Model Context Protocol (stdio/HTTP/SSE) | ✅ |
| **记忆系统** | HNSW 向量搜索、分层记忆、语义缓存 | ✅ |
| **安全沙箱** | Node VM 隔离、Prompt 注入检测、代码验证 | ✅ |
| **插件系统** | VSCode 风格生命周期、依赖注入 | ✅ |
| **执行引擎** | 规划-执行分离、重试机制、熔断保护 | ✅ |
| **TUI 界面** | 专业级终端 UI、流式输出、主题切换、自动补全 | ✅ |

### 高级特性

```
┌─────────────────────────────────────────────────────────────────┐
│                      高级能力                                    │
├─────────────────────────────────────────────────────────────────┤
│  算法引擎       │  MCTS、HTN、思维树、Transformer 决策            │
│  缓存系统       │  LRU、布隆过滤器、Roaring Bitmap、SIMD 向量     │
│  流式传输       │  SSE、WebSocket、分块传输                      │
│  多智能体       │  协商机制、编排调度、协调合作                    │
│  多模态         │  图像、音频、视频处理                           │
│  A/B 测试       │  实验管理、变体选择                             │
└─────────────────────────────────────────────────────────────────┘
```

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

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const agent = createAgent(llm, {
  name: 'MyAssistant',
  description: '一个 helpful AI 助手',
});

await agent.initialize();

const response = await agent.chat({
  messages: [{ role: 'user', content: '你好，世界！' }],
});

console.log(response.choices[0].message.content);

await agent.destroy();
```

### 流式响应

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: '给我讲个故事' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### 命令行界面

```bash
npx @sdkwork/agent
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
│  │ Microkernel  │ │EventEmitter  │ │   Logger     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Sandbox    │ │VectorStore   │ │   Cache      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
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
│  ERROR  │ ←───────────────── │  EXECUTING  │
│ (可恢复) │      错误处理       │   THINKING  │
└─────────┘                    └─────────────┘
```

### ReAct 思考引擎

```
┌─────────────────────────────────────────────────────────────────┐
│                      ReAct 循环                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. 思考 (Thought)    → 分析情况并规划下一步行动                  │
│  2. 行动 (Action)     → 选择并执行工具/技能                       │
│  3. 观察 (Observation)→ 收集并解释执行结果                        │
│  4. 反思 (Reflection) → 每 N 步进行自我反思（可选）               │
│  5. 重复              → 直到获得答案或达到最大步数                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 LLM 提供者

### 支持的提供者

| 提供者 | 模型 | 特性 |
|--------|------|------|
| **OpenAI** | GPT-4, GPT-4-Turbo, GPT-3.5 | 流式输出、函数调用 |
| **Anthropic** | Claude 3 (Opus/Sonnet/Haiku) | 视觉理解、长上下文 |
| **Google** | Gemini Pro, Gemini Ultra | 多模态、安全特性 |
| **DeepSeek** | DeepSeek Chat, Coder | 代码生成 |
| **Moonshot** | Moonshot v1 | 长上下文 (128K) |
| **MiniMax** | abab5.5-chat | 中文优化 |
| **智谱 AI** | glm-4 | 双语支持 |
| **通义千问** | qwen-turbo, qwen-max | 阿里云 |
| **豆包** | doubao-pro | 字节跳动 |

### 提供者配置

```typescript
import { OpenAIProvider } from '@sdkwork/agent/llm';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  baseUrl: 'https://api.openai.com/v1',  // 可选：自定义端点
  organization: 'org-xxx',               // 可选：组织 ID
  defaults: {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
  },
});
```

---

## 📐 领域模型

### Agent

```typescript
interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;
  readonly state: AgentState;
  
  readonly llm: LLMProvider;
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory?: MemoryStore;
  readonly execution: ExecutionEngine;
  
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
  think(input: string, context: ThinkContext): Promise<ThinkResult>;
  thinkStream(input: string, context: ThinkContext): AsyncGenerator<ThinkEvent>;
  
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  reset(): Promise<void>;
}
```

### Skill

```typescript
interface Skill {
  readonly id: SkillId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly inputSchema: z.ZodType<unknown>;
  readonly metadata?: SkillMetadata;
  
  execute(input: unknown, context: SkillContext): Promise<SkillResult>;
  executeStream?(input: unknown, context: SkillContext): AsyncIterable<unknown>;
}

interface SkillContext {
  executionId: ExecutionId;
  agentId: AgentId;
  sessionId?: SessionId;
  logger: Logger;
  llm: LLMService;
  memory: MemoryService;
  tools: ToolRegistry;
  signal?: AbortSignal;
}
```

### Tool

```typescript
interface Tool {
  readonly id: ToolId;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly confirm: ConfirmLevel;
  readonly parameters: z.ZodType<unknown>;
  
  execute(input: unknown, context: ExecutionContext): Promise<ToolResult>;
}

type ToolCategory = 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
type ConfirmLevel = 'none' | 'read' | 'write' | 'destructive';
```

---

## 📖 API 文档

### 创建 Agent

```typescript
import { createAgent } from '@sdkwork/agent';

const agent = createAgent(llmProvider, {
  id: 'my-agent',
  name: 'MyAgent',
  description: '一个强大的 AI 助手',
  
  skills: [mySkill1, mySkill2],
  tools: [myTool1, myTool2],
  
  mcp: [{
    id: 'github-mcp',
    name: 'GitHub MCP',
    transport: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
    }
  }],
  
  memory: {
    type: 'hierarchical',
    config: { maxEntries: 10000 }
  },
  
  executionLimits: {
    maxDepth: 10,
    maxSteps: 50,
    maxSameActionRepeat: 3,
    timeout: 60000,
    maxTotalTime: 300000,
  },
});
```

### Chat API

```typescript
const response = await agent.chat({
  messages: [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user', content: '你好！' }
  ],
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 4096,
  sessionId: 'session-1',
});

console.log(response.choices[0].message.content);
console.log(`Token 用量: ${response.usage.totalTokens}`);
```

### 事件系统

```typescript
agent.on('agent:initialized', (event) => {
  console.log('Agent 就绪:', event.payload.agentId);
});

agent.on('chat:completed', (event) => {
  console.log('对话完成:', event.payload.responseId);
});

agent.on('skill:completed', (event) => {
  console.log('Skill 执行:', event.payload.skillId);
});

agent.on('tool:completed', (event) => {
  console.log('Tool 调用:', event.payload.toolId);
});

agent.on('execution:step', (event) => {
  console.log('执行步骤:', event.payload);
});

agent.on('agent:error', (event) => {
  console.error('Agent 错误:', event.payload.error);
});
```

### ReAct 思考

```typescript
const result = await agent.think(
  '东京的人口乘以 2 是多少？',
  { sessionId: 'session-1', executionId: 'exec-1' }
);

console.log('答案:', result.answer);
console.log('步骤数:', result.steps.length);
console.log('使用工具:', Array.from(result.toolsUsed));

for await (const event of agent.thinkStream('复杂问题')) {
  switch (event.type) {
    case 'thought':
      console.log('思考:', event.thought);
      break;
    case 'action':
      console.log('行动:', event.action);
      break;
    case 'observation':
      console.log('结果:', event.observation);
      break;
    case 'complete':
      console.log('答案:', event.answer);
      break;
  }
}
```

---

## 🔒 安全机制

### 多层沙箱架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      安全架构                                    │
├─────────────────────────────────────────────────────────────────┤
│  第一层：静态分析                                                │
│  ├── 代码验证 (AST 解析)                                        │
│  ├── 危险模式检测                                                │
│  └── 导入/请求过滤                                               │
├─────────────────────────────────────────────────────────────────┤
│  第二层：运行时沙箱                                              │
│  ├── Node VM 隔离                                               │
│  ├── 内存限制 (可配置)                                           │
│  ├── 执行超时                                                    │
│  └── 调用栈深度限制                                               │
├─────────────────────────────────────────────────────────────────┤
│  第三层：Prompt 注入检测                                         │
│  ├── 模式匹配                                                    │
│  ├── 语义分析                                                    │
│  └── Constitutional AI 检查                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 沙箱配置

```typescript
const sandboxConfig = {
  timeout: 30000,
  memoryLimit: 128 * 1024 * 1024,
  maxCallStackSize: 1000,
  useContextIsolation: true,
  cacheCompiledCode: true,
  allowedModules: ['lodash', 'moment'],
  deniedModules: ['fs', 'child_process', 'eval'],
  onViolation: (violation) => {
    console.error('安全违规:', violation);
  },
};
```

### 执行限制

```typescript
const executionLimits = {
  maxDepth: 10,           // 最大递归深度
  maxSteps: 50,           // 最大执行步骤
  maxSameActionRepeat: 3, // 最大相同动作重复次数
  timeout: 60000,         // 步骤超时 (ms)
  maxTotalTime: 300000,   // 总执行时间 (ms)
};
```

---

## 🧠 记忆系统

### 记忆架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      记忆系统                                    │
├─────────────────────────────────────────────────────────────────┤
│  短期记忆                                                        │
│  ├── 对话历史                                                    │
│  ├── 工作记忆 (上下文窗口)                                        │
│  └── 临时缓存                                                    │
├─────────────────────────────────────────────────────────────────┤
│  长期记忆                                                        │
│  ├── 向量存储 (HNSW)                                             │
│  ├── 语义搜索                                                    │
│  └── 情景记忆                                                    │
├─────────────────────────────────────────────────────────────────┤
│  知识库                                                          │
│  ├── 文档存储                                                    │
│  ├── 图记忆 (关系网络)                                            │
│  └── 分层记忆                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 记忆使用

```typescript
const agent = createAgent(llm, {
  name: 'MemoryAgent',
  memory: {
    type: 'hierarchical',
    config: {
      maxEntries: 10000,
      vectorDimension: 128,
      similarityThreshold: 0.8,
    },
  },
});

await agent.initialize();

await agent.chat({
  messages: [{ role: 'user', content: '我叫 Alice' }],
  sessionId: 'session-1',
});

const response = await agent.chat({
  messages: [{ role: 'user', content: '我叫什么名字？' }],
  sessionId: 'session-1',
});

console.log(response.choices[0].message.content);
```

---

## 🛠️ 技能系统

### 内置技能

| 分类 | 技能 |
|------|------|
| **影视制作** | 50+ 视频生成流水线技能 |
| **翻译** | 多语言翻译 |
| **数学** | 数学计算 |
| **PDF 处理** | PDF 解析和提取 |
| **Prompt 优化** | 图像/视频/代码 Prompt 增强 |
| **歌词生成** | 创意歌词写作 |

### 自定义技能定义

```typescript
import { z } from 'zod';

const mySkill: Skill = {
  id: 'data-processor',
  name: 'Data Processor',
  description: '处理和分析数据',
  version: '1.0.0',
  inputSchema: z.object({
    data: z.array(z.any()),
    operation: z.enum(['filter', 'map', 'reduce']),
  }),
  metadata: {
    category: 'data',
    tags: ['processing', 'analysis'],
    author: 'SDKWork Team',
  },
  execute: async (input, ctx) => {
    const { data, operation } = input as { data: unknown[]; operation: string };
    
    const result = await ctx.llm.complete({
      messages: [{
        role: 'user',
        content: `使用 ${operation} 处理数据: ${JSON.stringify(data)}`,
        id: '1',
        timestamp: Date.now(),
      }],
    });
    
    return {
      success: true,
      data: result.choices[0]?.message?.content,
      metadata: {
        executionId: ctx.executionId,
        skillId: 'data-processor',
        skillName: 'Data Processor',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
      },
    };
  },
};
```

### Markdown 技能定义

```markdown
---
id: my-skill
name: My Skill
version: 1.0.0
description: 一个自定义技能
inputSchema:
  type: object
  properties:
    input:
      type: string
  required:
    - input
---

# My Skill

处理输入: {{input}}
```

---

## 💡 示例代码

### 示例 1：多提供者 Agent

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';
import { AnthropicProvider } from '@sdkwork/agent/llm';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo',
});

const claude = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
});

const agent = createAgent(openai, {
  name: 'MultiModelAgent',
  skills: [analysisSkill, generationSkill],
  tools: [fileTool, webTool],
});

await agent.initialize();
```

### 示例 2：MCP 集成

```typescript
const agent = createAgent(llm, {
  name: 'MCPAgent',
  mcp: [
    {
      id: 'github',
      name: 'GitHub MCP',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
      },
    },
    {
      id: 'filesystem',
      name: 'Filesystem MCP',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'],
      },
    },
  ],
});

await agent.initialize();

const tools = agent.mcp.aggregateTools();
console.log(`可用的 MCP 工具: ${tools.length}`);
```

### 示例 3：流式事件

```typescript
agent.on('chat:chunk', (event) => {
  process.stdout.write(event.payload.content);
});

agent.on('chat:tool_call', (event) => {
  console.log(`\n调用工具: ${event.payload.name}`);
});

const stream = agent.chatStream({
  messages: [{ role: 'user', content: '分析这些数据并创建报告' }],
});

for await (const chunk of stream) {
  // 数据块也会作为事件发送
}
```

### 示例 4：错误恢复

```typescript
agent.on('agent:error', async (event) => {
  console.error('错误:', event.payload.error);
  
  if (event.payload.recoverable) {
    console.log('尝试恢复...');
    await agent.reset();
  }
});

try {
  await agent.chat({
    messages: [{ role: 'user', content: '复杂任务' }],
  });
} catch (error) {
  console.error('对话失败:', error);
  await agent.reset();
}
```

---

## 📁 项目结构

```
@sdkwork/agent/
├── src/
│   ├── index.ts                    # 主入口
│   │
│   ├── core/                       # 核心架构
│   │   ├── domain/                 # 领域模型
│   │   │   ├── agent.ts            # Agent 聚合
│   │   │   ├── skill.ts            # Skill 领域
│   │   │   ├── tool.ts             # Tool 领域
│   │   │   ├── mcp.ts              # MCP 领域
│   │   │   ├── plugin.ts           # Plugin 领域
│   │   │   ├── memory.ts           # Memory 领域
│   │   │   └── events.ts           # 领域事件
│   │   ├── application/            # 应用服务
│   │   │   ├── agent-impl.ts       # Agent 实现
│   │   │   ├── skill-executor.ts   # Skill 执行
│   │   │   ├── tool-executor.ts    # Tool 执行
│   │   │   ├── mcp-client.ts       # MCP 客户端
│   │   │   ├── plugin-manager.ts   # 插件管理
│   │   │   └── execution-engine.ts # 执行引擎
│   │   └── microkernel/            # 微内核核心
│   │       └── index.ts
│   │
│   ├── agent/                      # Agent 模块
│   │   ├── agent.ts                # Agent 类
│   │   ├── thinking/               # 思考引擎
│   │   │   └── react-engine.ts     # ReAct 实现
│   │   └── domain/                 # Agent 领域
│   │
│   ├── llm/                        # LLM 提供者
│   │   ├── provider.ts             # 基础提供者
│   │   └── providers/              # 提供者实现
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       ├── gemini.ts
│   │       ├── deepseek.ts
│   │       ├── moonshot.ts
│   │       ├── minimax.ts
│   │       ├── zhipu.ts
│   │       ├── qwen.ts
│   │       └── doubao.ts
│   │
│   ├── skills/                     # 技能系统
│   │   ├── core/                   # 核心技能基础设施
│   │   ├── builtin/                # 内置技能
│   │   ├── interaction/            # 交互管理
│   │   └── registry.ts             # 技能注册表
│   │
│   ├── tools/                      # 工具系统
│   │   ├── core/                   # 核心工具基础设施
│   │   ├── builtin.ts              # 内置工具
│   │   └── registry.ts             # 工具注册表
│   │
│   ├── memory/                     # 记忆系统
│   │   ├── storage/                # 存储后端
│   │   ├── hnsw-vector-database.ts # HNSW 实现
│   │   ├── hierarchical-memory.ts  # 分层记忆
│   │   └── graph-memory.ts         # 图记忆
│   │
│   ├── security/                   # 安全层
│   │   ├── node-sandbox.ts         # Node VM 沙箱
│   │   ├── secure-sandbox.ts       # 安全执行
│   │   ├── prompt-injection-detector.ts
│   │   └── constitutional-ai.ts    # Constitutional AI
│   │
│   ├── execution/                  # 执行引擎
│   │   ├── execution-context.ts    # 执行上下文
│   │   ├── process-manager.ts      # 进程管理
│   │   └── script-executor.ts      # 脚本执行
│   │
│   ├── algorithms/                 # AI 算法
│   │   ├── mcts.ts                 # 蒙特卡洛树搜索
│   │   ├── transformer-decision.ts # Transformer 决策
│   │   └── tree-of-thoughts.ts     # 思维树
│   │
│   ├── utils/                      # 工具类
│   │   ├── logger.ts               # 日志系统
│   │   ├── errors.ts               # 错误处理
│   │   ├── cache/                  # 缓存工具
│   │   └── performance-monitor.ts  # 性能监控
│   │
│   └── tui/                        # 终端 UI
│       ├── cli.ts                  # CLI 入口
│       ├── renderer.ts             # 输出渲染
│       └── selector.ts             # 交互选择器
│
├── dist/                           # 编译输出
├── tests/                          # 测试套件
├── docs/                           # 文档
└── examples/                       # 示例代码
```

---

## 🔧 开发指南

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式 (监听变化)
npm run dev

# 类型检查
npm run typecheck

# 构建
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint

# 格式化代码
npm run format
```

### 模块导出

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';
import { SkillRegistry } from '@sdkwork/agent/skills';
import { ToolRegistry } from '@sdkwork/agent/tools';
import { MCPManager } from '@sdkwork/agent/mcp';
import { MemoryStore } from '@sdkwork/agent/storage';
```

---

## 📄 许可证

[MIT](LICENSE) © SDKWork Team

---

<p align="center">
  <strong>用 ❤️ 构建于 SDKWork Team</strong><br>
  <em>赋能开发者构建智能 AI 应用</em>
</p>
