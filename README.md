# SDKWork Agent

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/typescript-100%25-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/ESM-Ready-brightgreen.svg" alt="ESM">
</p>

<p align="center">
  <strong>Enterprise-Grade AI Agent Framework</strong><br>
  <em>DDD Architecture • Microkernel • ReAct Thinking • Multi-LLM Support</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-examples">Examples</a>
</p>

---

## 📋 Table of Contents

- [Introduction](#-introduction)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [LLM Providers](#-llm-providers)
- [Domain Models](#-domain-models)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Memory System](#-memory-system)
- [Skills System](#-skills-system)
- [Examples](#-examples)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [License](#-license)

---

## 🎯 Introduction

**SDKWork Agent** is an enterprise-grade AI agent framework built with **Domain-Driven Design (DDD)** and **Microkernel Architecture**. It provides a unified, type-safe, and extensible platform for building intelligent AI applications.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Core Design Principles                        │
├─────────────────────────────────────────────────────────────────┤
│  DDD Layered       │  High cohesion, low coupling               │
│  Microkernel       │  Service registry, DI, lifecycle           │
│  Type Safe         │  100% TypeScript, full type inference      │
│  Event-Driven      │  Complete event model, execution tracing   │
│  Security First    │  Multi-layer sandbox, injection detection  │
│  Observable        │  Metrics, logging, performance monitoring  │
│  Extensible        │  Plugin system, modular architecture       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### Core Capabilities

| Capability | Description | Status |
|------------|-------------|--------|
| **Multi-LLM Support** | OpenAI, Anthropic, Google, DeepSeek, Moonshot, MiniMax, ZhiPu, Qwen, Doubao | ✅ |
| **ReAct Thinking** | Thought-Action-Observation loop with reflection | ✅ |
| **Skill Execution** | Multi-language (JS/TS/Python), Schema validation, Hot reload | ✅ |
| **Tool Calling** | Category management, Confirmation levels, Intelligent selection | ✅ |
| **MCP Integration** | Anthropic Model Context Protocol (stdio/HTTP/SSE) | ✅ |
| **Memory System** | HNSW vector search, Hierarchical memory, Semantic cache | ✅ |
| **Security Sandbox** | Node VM isolation, Prompt injection detection, Code validation | ✅ |
| **Plugin System** | VSCode-style lifecycle, Dependency injection | ✅ |
| **Execution Engine** | Plan-execute separation, Retry, Circuit breaker | ✅ |
| **TUI Interface** | Professional terminal UI with streaming, Themes, Auto-completion | ✅ |

### Advanced Features

```
┌─────────────────────────────────────────────────────────────────┐
│                    Advanced Capabilities                         │
├─────────────────────────────────────────────────────────────────┤
│  Algorithms        │  MCTS, HTN, Tree-of-Thoughts, Transformer  │
│  Caching           │  LRU, Bloom Filter, Roaring Bitmap, SIMD   │
│  Streaming         │  SSE, WebSocket, Chunked transfer          │
│  Multi-Agent       │  Negotiation, Orchestration, Coordination  │
│  Multimodal        │  Image, Audio, Video processing           │
│  A/B Testing       │  Experiment management, Variant selection  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Installation

```bash
npm install @sdkwork/agent
```

### Create Your First Agent

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const agent = createAgent(llm, {
  name: 'MyAssistant',
  description: 'A helpful AI assistant',
});

await agent.initialize();

const response = await agent.chat({
  messages: [{ role: 'user', content: 'Hello, world!' }],
});

console.log(response.choices[0].message.content);

await agent.destroy();
```

### Streaming Response

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: 'Tell me a story' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### CLI Interface

```bash
npx @sdkwork/agent
```

---

## 🏗️ Architecture

### DDD Layered Architecture

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
│  │ Microkernel  │ │EventEmitter  │ │   Logger     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Sandbox    │ │VectorStore   │ │   Cache      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Lifecycle

```
┌─────────┐    initialize()    ┌─────────────┐    destroy()    ┌───────────┐
│  IDLE   │ ─────────────────→ │    READY    │ ──────────────→ │ DESTROYED │
└─────────┘                    └─────────────┘                 └───────────┘
      │                              │
      │ reset()                      │ chat() / execute()
      ↓                              ↓
┌─────────┐                    ┌─────────────┐
│  ERROR  │ ←───────────────── │  EXECUTING  │
│(recover)│      error         │   THINKING  │
└─────────┘                    └─────────────┘
```

### ReAct Thinking Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                      ReAct Loop                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. Thought      → Analyze situation and plan next action       │
│  2. Action       → Select and execute tools/skills              │
│  3. Observation  → Collect and interpret results                │
│  4. Reflection   → Self-reflect every N steps (optional)        │
│  5. Repeat       → Continue until answer or max steps           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 LLM Providers

### Supported Providers

| Provider | Models | Features |
|----------|--------|----------|
| **OpenAI** | GPT-4, GPT-4-Turbo, GPT-3.5 | Streaming, Function calling |
| **Anthropic** | Claude 3 (Opus/Sonnet/Haiku) | Vision, Long context |
| **Google** | Gemini Pro, Gemini Ultra | Multimodal, Safety |
| **DeepSeek** | DeepSeek Chat, Coder | Code generation |
| **Moonshot** | Moonshot v1 | Long context (128K) |
| **MiniMax** | abab5.5-chat | Chinese optimized |
| **ZhiPu** | glm-4 | Bilingual support |
| **Qwen** | qwen-turbo, qwen-max | Alibaba Cloud |
| **Doubao** | doubao-pro | ByteDance |

### Provider Configuration

```typescript
import { OpenAIProvider } from '@sdkwork/agent/llm';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  baseUrl: 'https://api.openai.com/v1',  // Optional: custom endpoint
  organization: 'org-xxx',               // Optional: organization ID
  defaults: {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
  },
});
```

---

## 📐 Domain Models

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

## 📖 API Reference

### Create Agent

```typescript
import { createAgent } from '@sdkwork/agent';

const agent = createAgent(llmProvider, {
  id: 'my-agent',
  name: 'MyAgent',
  description: 'A powerful AI assistant',
  
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
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 4096,
  sessionId: 'session-1',
});

console.log(response.choices[0].message.content);
console.log(`Tokens: ${response.usage.totalTokens}`);
```

### Event System

```typescript
agent.on('agent:initialized', (event) => {
  console.log('Agent ready:', event.payload.agentId);
});

agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload.responseId);
});

agent.on('skill:completed', (event) => {
  console.log('Skill executed:', event.payload.skillId);
});

agent.on('tool:completed', (event) => {
  console.log('Tool invoked:', event.payload.toolId);
});

agent.on('execution:step', (event) => {
  console.log('Execution step:', event.payload);
});

agent.on('agent:error', (event) => {
  console.error('Agent error:', event.payload.error);
});
```

### ReAct Thinking

```typescript
const result = await agent.think(
  'What is the population of Tokyo multiplied by 2?',
  { sessionId: 'session-1', executionId: 'exec-1' }
);

console.log('Answer:', result.answer);
console.log('Steps:', result.steps.length);
console.log('Tools used:', Array.from(result.toolsUsed));

for await (const event of agent.thinkStream('Complex question')) {
  switch (event.type) {
    case 'thought':
      console.log('Thinking:', event.thought);
      break;
    case 'action':
      console.log('Action:', event.action);
      break;
    case 'observation':
      console.log('Result:', event.observation);
      break;
    case 'complete':
      console.log('Answer:', event.answer);
      break;
  }
}
```

---

## 🔒 Security

### Multi-Layer Sandbox

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Static Analysis                                       │
│  ├── Code validation (AST parsing)                              │
│  ├── Dangerous pattern detection                                │
│  └── Import/require filtering                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Runtime Sandbox                                       │
│  ├── Node VM isolation                                          │
│  ├── Memory limits (configurable)                               │
│  ├── Execution timeout                                          │
│  └── Call stack depth limit                                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Prompt Injection Detection                            │
│  ├── Pattern matching                                           │
│  ├── Semantic analysis                                          │
│  └── Constitutional AI checks                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Sandbox Configuration

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
    console.error('Security violation:', violation);
  },
};
```

### Execution Limits

```typescript
const executionLimits = {
  maxDepth: 10,           // Maximum recursion depth
  maxSteps: 50,           // Maximum execution steps
  maxSameActionRepeat: 3, // Maximum same action repeats
  timeout: 60000,         // Step timeout (ms)
  maxTotalTime: 300000,   // Total execution time (ms)
};
```

---

## 🧠 Memory System

### Memory Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory System                                 │
├─────────────────────────────────────────────────────────────────┤
│  Short-Term Memory                                              │
│  ├── Conversation history                                       │
│  ├── Working memory (context window)                            │
│  └── Temporary cache                                            │
├─────────────────────────────────────────────────────────────────┤
│  Long-Term Memory                                               │
│  ├── Vector storage (HNSW)                                      │
│  ├── Semantic search                                            │
│  └── Episodic memory                                            │
├─────────────────────────────────────────────────────────────────┤
│  Knowledge Base                                                 │
│  ├── Document storage                                           │
│  ├── Graph memory (relationships)                               │
│  └── Hierarchical memory                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Usage

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
  messages: [{ role: 'user', content: 'My name is Alice' }],
  sessionId: 'session-1',
});

const response = await agent.chat({
  messages: [{ role: 'user', content: 'What is my name?' }],
  sessionId: 'session-1',
});

console.log(response.choices[0].message.content);
```

---

## 🛠️ Skills System

### Built-in Skills

| Category | Skills |
|----------|--------|
| **Film Production** | 50+ skills for video generation pipeline |
| **Translation** | Multi-language translation |
| **Math** | Mathematical computations |
| **PDF Processing** | PDF parsing and extraction |
| **Prompt Optimization** | Image/Video/Code prompt enhancement |
| **Lyrics Generation** | Creative lyrics writing |

### Custom Skill Definition

```typescript
import { z } from 'zod';

const mySkill: Skill = {
  id: 'data-processor',
  name: 'Data Processor',
  description: 'Process and analyze data',
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
        content: `Process data with ${operation}: ${JSON.stringify(data)}`,
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

### Skill from Markdown

```markdown
---
id: my-skill
name: My Skill
version: 1.0.0
description: A custom skill
inputSchema:
  type: object
  properties:
    input:
      type: string
  required:
    - input
---

# My Skill

Process the input: {{input}}
```

---

## 💡 Examples

### Example 1: Multi-Provider Agent

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

### Example 2: MCP Integration

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
console.log(`Available MCP tools: ${tools.length}`);
```

### Example 3: Streaming with Events

```typescript
agent.on('chat:chunk', (event) => {
  process.stdout.write(event.payload.content);
});

agent.on('chat:tool_call', (event) => {
  console.log(`\nCalling tool: ${event.payload.name}`);
});

const stream = agent.chatStream({
  messages: [{ role: 'user', content: 'Analyze this data and create a report' }],
});

for await (const chunk of stream) {
  // Chunks are also emitted as events
}
```

### Example 4: Error Recovery

```typescript
agent.on('agent:error', async (event) => {
  console.error('Error:', event.payload.error);
  
  if (event.payload.recoverable) {
    console.log('Attempting recovery...');
    await agent.reset();
  }
});

try {
  await agent.chat({
    messages: [{ role: 'user', content: 'Complex task' }],
  });
} catch (error) {
  console.error('Chat failed:', error);
  await agent.reset();
}
```

---

## 📁 Project Structure

```
@sdkwork/agent/
├── src/
│   ├── index.ts                    # Main entry point
│   │
│   ├── core/                       # Core architecture
│   │   ├── domain/                 # Domain models
│   │   │   ├── agent.ts            # Agent aggregate
│   │   │   ├── skill.ts            # Skill domain
│   │   │   ├── tool.ts             # Tool domain
│   │   │   ├── mcp.ts              # MCP domain
│   │   │   ├── plugin.ts           # Plugin domain
│   │   │   ├── memory.ts           # Memory domain
│   │   │   └── events.ts           # Domain events
│   │   ├── application/            # Application services
│   │   │   ├── agent-impl.ts       # Agent implementation
│   │   │   ├── skill-executor.ts   # Skill execution
│   │   │   ├── tool-executor.ts    # Tool execution
│   │   │   ├── mcp-client.ts       # MCP client
│   │   │   ├── plugin-manager.ts   # Plugin management
│   │   │   └── execution-engine.ts # Execution engine
│   │   └── microkernel/            # Microkernel core
│   │       └── index.ts
│   │
│   ├── agent/                      # Agent module
│   │   ├── agent.ts                # Agent class
│   │   ├── thinking/               # Thinking engines
│   │   │   └── react-engine.ts     # ReAct implementation
│   │   └── domain/                 # Agent domain
│   │
│   ├── llm/                        # LLM providers
│   │   ├── provider.ts             # Base provider
│   │   └── providers/              # Provider implementations
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
│   ├── skills/                     # Skills system
│   │   ├── core/                   # Core skill infrastructure
│   │   ├── builtin/                # Built-in skills
│   │   ├── interaction/            # Interaction management
│   │   └── registry.ts             # Skill registry
│   │
│   ├── tools/                      # Tools system
│   │   ├── core/                   # Core tool infrastructure
│   │   ├── builtin.ts              # Built-in tools
│   │   └── registry.ts             # Tool registry
│   │
│   ├── memory/                     # Memory system
│   │   ├── storage/                # Storage backends
│   │   ├── hnsw-vector-database.ts # HNSW implementation
│   │   ├── hierarchical-memory.ts  # Hierarchical memory
│   │   └── graph-memory.ts         # Graph-based memory
│   │
│   ├── security/                   # Security layer
│   │   ├── node-sandbox.ts         # Node VM sandbox
│   │   ├── secure-sandbox.ts       # Secure execution
│   │   ├── prompt-injection-detector.ts
│   │   └── constitutional-ai.ts    # Constitutional AI
│   │
│   ├── execution/                  # Execution engine
│   │   ├── execution-context.ts    # Execution context
│   │   ├── process-manager.ts      # Process management
│   │   └── script-executor.ts      # Script execution
│   │
│   ├── algorithms/                 # AI algorithms
│   │   ├── mcts.ts                 # Monte Carlo Tree Search
│   │   ├── transformer-decision.ts # Transformer-based
│   │   └── tree-of-thoughts.ts     # Tree of Thoughts
│   │
│   ├── utils/                      # Utilities
│   │   ├── logger.ts               # Logging system
│   │   ├── errors.ts               # Error handling
│   │   ├── cache/                  # Caching utilities
│   │   └── performance-monitor.ts  # Performance monitoring
│   │
│   └── tui/                        # Terminal UI
│       ├── cli.ts                  # CLI entry
│       ├── renderer.ts             # Output rendering
│       └── selector.ts             # Interactive selector
│
├── dist/                           # Compiled output
├── tests/                          # Test suites
├── docs/                           # Documentation
└── examples/                       # Example code
```

---

## 🔧 Development

### Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

### Commands

```bash
# Install dependencies
npm install

# Development mode with watch
npm run dev

# Type checking
npm run typecheck

# Build
npm run build

# Run tests
npm run test

# Linting
npm run lint

# Format code
npm run format
```

### Module Exports

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';
import { SkillRegistry } from '@sdkwork/agent/skills';
import { ToolRegistry } from '@sdkwork/agent/tools';
import { MCPManager } from '@sdkwork/agent/mcp';
import { MemoryStore } from '@sdkwork/agent/storage';
```

---

## 📄 License

[MIT](LICENSE) © SDKWork Team

---

<p align="center">
  <strong>Built with ❤️ by SDKWork Team</strong><br>
  <em>Empowering developers to build intelligent AI applications</em>
</p>
