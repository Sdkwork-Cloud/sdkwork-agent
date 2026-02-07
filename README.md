# SDKWork Agent

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/typescript-100%25-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
</p>

<p align="center">
  <strong>统一智能体架构 - DDD Domain-Driven Design</strong><br>
  <em>行业领先的 Skill / Tool / MCP / Plugin 执行标准</em>
</p>

<p align="center">
  <a href="#核心特性">核心特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构设计">架构设计</a> •
  <a href="#api文档">API文档</a> •
  <a href="#示例">示例</a> •
  <a href="#贡献指南">贡献</a>
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
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 🎯 简介

**SDKWork Agent** 是一个基于 **DDD (领域驱动设计)** 的统一智能体架构，实现了行业领先的 Skill、Tool、MCP、Plugin 四大执行标准。

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
└─────────────────────────────────────────────────────────────┘
```

### 核心能力

| 能力 | 描述 | 状态 |
|------|------|------|
| **Skill 执行** | 多语言脚本支持 (JS/TS/Python)，Reference 文件系统 | ✅ |
| **Tool 调用** | 分类管理、确认级别、执行链 | ✅ |
| **MCP 集成** | Anthropic Model Context Protocol 完整实现 | ✅ |
| **Plugin 系统** | VSCode 风格生命周期管理 | ✅ |
| **记忆系统** | 语义搜索、多维度存储 | ✅ |
| **执行引擎** | 规划-执行分离、重试机制、熔断保护 | ✅ |

---

## 🚀 快速开始

### 安装

```bash
npm install sdkwork-agent
```

### 创建你的第一个 Agent

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

// 创建 Agent
const agent = createAgent({
  name: 'MyAssistant',
  description: 'A helpful AI assistant',
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }),
  skills: [],
  tools: [],
});

// 初始化
await agent.initialize();

// 对话
const response = await agent.chat({
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);

// 清理
await agent.destroy();
```

### 流式响应

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

---

## 🏗️ 架构设计

### DDD 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  AgentImpl   │ │SkillExecutor │ │ToolExecutor  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ MCPManager   │ │PluginManager │ │ExecutionEngine│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                         Domain Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Agent   │ │  Skill   │ │   Tool   │ │   MCP    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Plugin  │ │  Memory  │ │Execution │ │  Events  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                        │
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
  readonly memory: MemoryStore;
  readonly execution: ExecutionEngine;
  
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
  id: string;
  name: string;
  description: string;
  version?: string;
  
  // 执行脚本
  script: {
    code: string;
    lang: 'javascript' | 'typescript' | 'python' | 'bash';
    entry?: string;
    dependencies?: Record<string, string>;
  };
  
  // 引用文件
  references?: Array<{
    name: string;
    path: string;
    content: string;
    type: 'code' | 'data' | 'template' | 'doc' | 'config';
  }>;
  
  // Schema 定义
  input?: JSONSchema;
  output?: JSONSchema;
}
```

### Skill 注入 API

在 Skill Script 中通过 `$` 前缀访问 Agent 能力：

```typescript
// skill.ts
const skill: Skill = {
  id: 'data-processor',
  name: 'Data Processor',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        // 调用 LLM
        const analysis = await $llm('分析数据: ' + $input.data);
        
        // 调用 Tool
        const validated = await $tool('validator', analysis);
        
        // 内存操作
        await $memory.set('result', validated);
        const history = await $memory.search('previous');
        
        // 访问引用文件
        const template = $references.template;
        
        // 日志
        $log.info('Processing completed');
        
        return validated;
      }
    `
  }
};
```

### Tool 领域模型

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
  confirm: 'none' | 'read' | 'write' | 'destructive';
  
  input?: JSONSchema;
  output?: JSONSchema;
  
  execute: (input: unknown, context: ToolExecutionContext) => Promise<ToolResult>;
}
```

### MCP 客户端

```typescript
// 配置 MCP 服务器
const agent = createAgent({
  name: 'MCPAgent',
  llm: openaiProvider,
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

### Agent 配置

```typescript
interface AgentConfig {
  // 身份
  id?: string;
  name: string;
  description?: string;
  
  // LLM 配置
  llm: LLMProvider | LLMConfig;
  
  // 可选能力 - 配置即启用
  skills?: Skill[];
  tools?: Tool[];
  mcp?: MCPServerConfig[];
  memory?: MemoryConfig;
}

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 
            'minimax' | 'zhipu' | 'qwen' | 'deepseek' | 'doubao' | 'custom';
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
  tools?: ToolDefinition[];
  toolChoice?: 'none' | 'auto' | 'required';
  responseFormat?: { 
    type: 'text' | 'json_object' | 'json_schema'; 
    schema?: unknown 
  };
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
```

### 事件系统

```typescript
// 订阅事件
agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload);
});

agent.on('skill:executed', (event) => {
  console.log('Skill executed:', event.payload.skillId);
});

agent.on('tool:invoked', (event) => {
  console.log('Tool invoked:', event.payload.toolId);
});

// 所有事件类型
agent.on('agent:initialized', handler);
agent.on('agent:error', handler);
agent.on('execution:started', handler);
agent.on('execution:completed', handler);
agent.on('memory:stored', handler);
```

---

## ⚙️ 配置指南

### 环境变量

```bash
# LLM Provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# MCP
GITHUB_TOKEN=ghp_...
```

### 完整配置示例

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

const agent = createAgent({
  id: 'production-agent',
  name: 'Production Assistant',
  description: 'Enterprise-grade AI assistant',
  
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
    defaults: {
      temperature: 0.7,
      maxTokens: 4000
    }
  }),
  
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
  
  mcp: [
    {
      id: 'github',
      name: 'GitHub',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github']
      }
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      transport: {
        type: 'sse',
        endpoint: 'http://localhost:3001/sse'
      }
    }
  ],
  
  memory: {
    maxTokens: 128000,
    limit: 10000,
    embeddingModel: 'text-embedding-3-small',
    enableCache: true
  }
});
```

---

## 🏆 行业标准

### 遵循标准

| 标准 | 兼容性 | 说明 |
|------|--------|------|
| **OpenAI API** | 100% | Chat Completion API 完全兼容 |
| **Anthropic MCP** | 100% | Model Context Protocol 完整实现 |
| **Claude Code** | 100% | Tool-first 设计哲学 |
| **OpenCode** | 100% | 模块化执行上下文 |
| **OpenClaw** | 100% | 声明式动作定义 |

### 架构对比

```
┌─────────────────────────────────────────────────────────────────┐
│                    SDKWork Browser Agent                         │
├─────────────────────────────────────────────────────────────────┤
│  DDD Layered          │  Domain/Application/Infrastructure      │
│  Microkernel          │  Service registry, DI, Lifecycle        │
│  Event-Driven         │  Complete event model                   │
│  Type-Safe            │  100% TypeScript                        │
│  OpenAI Compatible    │  Standard Chat API                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 示例代码

### 示例 1: 数据处理 Agent

```typescript
import { createAgent, defineSkill, defineTool } from 'sdkwork-agent';

// 定义数据处理 Skill
const dataProcessorSkill = defineSkill({
  id: 'data-processor',
  name: 'Data Processor',
  description: 'Process and analyze data',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const data = $input.rawData;
        
        // 数据清洗
        const cleaned = await $tool('data-cleaner', data);
        
        // 分析
        const analysis = await $llm('Analyze this data: ' + JSON.stringify(cleaned));
        
        // 保存结果
        await $memory.set('analysis_' + Date.now(), analysis);
        
        return { cleaned, analysis };
      }
    `
  }
});

// 定义数据清洗 Tool
const dataCleanerTool = defineTool({
  id: 'data-cleaner',
  name: 'Data Cleaner',
  category: 'data',
  confirm: 'none',
  execute: async (input, context) => {
    // 实现数据清洗逻辑
    return { success: true, data: cleanedData };
  }
});

// 创建 Agent
const agent = createAgent({
  name: 'DataAgent',
  llm: openaiProvider,
  skills: [dataProcessorSkill],
  tools: [dataCleanerTool]
});

await agent.initialize();

// 执行
const result = await agent.executeSkill('data-processor', {
  rawData: largeDataset
});
```

### 示例 2: 带记忆的对话 Agent

```typescript
const agent = createAgent({
  name: 'MemoryAgent',
  llm: openaiProvider,
  memory: { maxTokens: 32000 }
});

await agent.initialize();

// 第一轮对话
await agent.chat({
  messages: [
    { role: 'user', content: 'My name is Alice' }
  ],
  sessionId: 'session-1'
});

// 第二轮对话 - Agent 记得用户名字
const response = await agent.chat({
  messages: [
    { role: 'user', content: 'What is my name?' }
  ],
  sessionId: 'session-1'
});

// 输出: "Your name is Alice"
console.log(response.choices[0].message.content);
```

### 示例 3: MCP 工具调用

```typescript
const agent = createAgent({
  name: 'GitHubAgent',
  llm: openaiProvider,
  mcp: [{
    id: 'github',
    name: 'GitHub',
    transport: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github']
    }
  }]
});

await agent.initialize();

// Agent 可以自动使用 GitHub MCP 工具
const response = await agent.chat({
  messages: [
    { role: 'user', content: 'Search for TypeScript repositories about AI agents' }
  ]
});
```

---

## 🔧 开发指南

### 项目结构

```
sdkwork-agent/
├── src/
│   ├── core/
│   │   ├── domain/           # 领域层
│   │   │   ├── agent.ts      # Agent 领域模型
│   │   │   ├── skill.ts      # Skill 领域模型
│   │   │   ├── tool.ts       # Tool 领域模型
│   │   │   ├── mcp.ts        # MCP 领域模型
│   │   │   ├── plugin.ts     # Plugin 领域模型
│   │   │   ├── memory.ts     # Memory 领域模型
│   │   │   ├── execution.ts  # Execution 领域模型
│   │   │   └── events.ts     # 统一事件中心
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
│   ├── llm/                  # LLM 提供者
│   │   ├── provider.ts
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       └── ...
│   └── utils/                # 工具类
│       ├── logger.ts
│       └── event-emitter.ts
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

# 验证（lint + typecheck + test + build）
npm run verify
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建你的 **Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** 你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. **Push** 到 Branch (`git push origin feature/AmazingFeature`)
5. 打开 **Pull Request**

### 开发规范

- 遵循 **DDD** 架构原则
- 保持 **100% TypeScript** 类型覆盖
- 添加完整的 **JSDoc** 注释
- 编写 **单元测试** 和 **集成测试**
- 遵循 **Conventional Commits** 规范

### 代码审查清单

- [ ] 代码符合架构设计
- [ ] 类型安全无错误
- [ ] 添加/更新测试用例
- [ ] 更新相关文档
- [ ] 通过所有 CI 检查

---

## 📄 许可证

[MIT](LICENSE) © SDKWork Team

---

## 🔗 相关资源

- **文档**: https://docs.sdkwork.io
- **GitHub**: https://github.com/sdkwork/agent
- **npm**: https://www.npmjs.com/package/sdkwork-agent
- **Issues**: https://github.com/sdkwork/agent/issues

---

<p align="center">
  <strong>Made with ❤️ by SDKWork Team</strong><br>
  <em>Building the future of AI agents</em>
</p>
