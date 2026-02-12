# SDKWork Agent

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/typescript-100%25-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
</p>

<p align="center">
  <strong>Unified Agent Architecture - DDD Domain-Driven Design</strong><br>
  <em>Industry-leading Skill / Tool / MCP / Plugin / TUI Standards</em>
</p>

<p align="center">
  <a href="#core-features">Core Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#examples">Examples</a>
</p>

---

## 📋 Table of Contents

- [Introduction](#-introduction)
- [Core Features](#-core-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Domain Models](#-domain-models)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Industry Standards](#-industry-standards)
- [Examples](#-examples)
- [Development](#-development)
- [License](#-license)

---

## 🎯 Introduction

**SDKWork Agent** is a unified agent architecture based on **DDD (Domain-Driven Design)**, implementing industry-leading standards for Skill, Tool, MCP, Plugin, and TUI.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                    Design Principles                         │
├─────────────────────────────────────────────────────────────┤
│  DDD Layered      │  High cohesion, low coupling             │
│  Microkernel      │  Service registry, DI, lifecycle         │
│  OpenAI Compatible│  Standard Chat API, streaming support    │
│  Type Safe        │  100% TypeScript, full type inference    │
│  Observable       │  Complete event model, execution tracing │
│  Extensible       │  Plugin design, modular extension        │
│  TUI Support      │  Professional terminal UI                │
└─────────────────────────────────────────────────────────────┘
```

### Core Capabilities

| Capability | Description | Status |
|------------|-------------|--------|
| **Skill Execution** | Multi-language support (JS/TS), Schema validation | ✅ |
| **Tool Calling** | Category management, confirmation levels | ✅ |
| **MCP Integration** | Anthropic Model Context Protocol | ✅ |
| **Plugin System** | VSCode-style lifecycle management | ✅ |
| **Memory System** | Semantic search, multi-dimensional storage | ✅ |
| **Execution Engine** | Plan-execute separation, retry, circuit breaker | ✅ |
| **TUI Interface** | Professional terminal UI with streaming | ✅ |
| **ReAct Thinking** | Thought-Action-Observation loop | ✅ |

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

// Create LLM provider
const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// Create Agent (simple API)
const agent = createAgent(openai, {
  name: 'MyAssistant',
  description: 'A helpful AI assistant',
  skills: [],
  tools: [],
});

// Initialize
await agent.initialize();

// Chat
const response = await agent.chat({
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);

// Cleanup
await agent.destroy();
```

### Streaming Response

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### TUI Interface

```typescript
import { main } from '@sdkwork/agent/tui/cli';

// Start interactive TUI
main();
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
│  │ Microkernel  │ │EventEmitter  │ │ Logger      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Microkernel Architecture

```typescript
// Service registration
kernel.registerService({
  id: 'llm-service',
  version: '1.0.0',
  dependencies: [],
  initialize: async () => { /* ... */ },
  destroy: async () => { /* ... */ },
  pause: async () => { /* ... */ },
  resume: async () => { /* ... */ },
});

// Topological sort initialization
await kernel.initializeAll();
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
│  ERROR  │ ←───────────────── │  CHATTING   │
│(recover)│      error         │  EXECUTING  │
└─────────┘                    └─────────────┘
```

### ReAct Thinking Engine

```
┌─────────────────────────────────────────────────────────────┐
│                    ReAct Loop                                │
├─────────────────────────────────────────────────────────────┤
│  1. Thought    → Analyze situation and plan                 │
│  2. Action     → Select tools/skills to execute             │
│  3. Observation→ Collect results from execution             │
│  4. Reflection → Self-reflect every N steps                 │
│  5. Repeat     → Until answer or max steps                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 Domain Models

### Agent Aggregate Root

```typescript
interface Agent {
  // Identity
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;
  
  // State
  readonly state: AgentState;
  
  // Domain services
  readonly llm: LLMProvider;
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory?: MemoryStore;
  readonly execution: ExecutionEngine;
  readonly kernel: Microkernel;
  
  // Core capabilities
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
  
  // Lifecycle
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  reset(): Promise<void>; // Error recovery
}
```

### Skill Domain Model

```typescript
interface Skill {
  readonly id: SkillId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  // Input/Output Schema
  readonly inputSchema: z.ZodType<unknown>;
  
  // Execute function
  execute(input: unknown, context: SkillContext): Promise<SkillResult>;
  
  // Optional stream execution
  executeStream?(input: unknown, context: SkillContext): AsyncIterable<unknown>;
}

// Skill Context
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

### Tool Domain Model

```typescript
interface Tool {
  readonly id: ToolId;
  readonly name: string;
  readonly description: string;
  readonly category: 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
  readonly confirm: 'none' | 'read' | 'write' | 'destructive';
  
  // Input/Output Schema
  readonly inputSchema?: z.ZodType<unknown>;
  readonly outputSchema?: z.ZodType<unknown>;
  
  // Execute function
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

// Tool Context
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

### MCP Client

```typescript
// Configure MCP servers
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

## 📖 API Reference

### Create Agent

```typescript
// Simple API
function createAgent(
  llmProvider: LLMProvider,
  options?: {
    name?: string;
    description?: string;
    skills?: Skill[];
    tools?: Tool[];
  }
): Agent;

// Example
const agent = createAgent(openaiProvider, {
  name: 'MyAgent',
  skills: [mySkill],
  tools: [myTool],
});
```

### Agent Configuration

```typescript
interface AgentConfig {
  // Identity
  id?: string;
  name: string;
  description?: string;
  
  // LLM configuration
  llm: LLMProvider | LLMConfig;
  
  // Optional capabilities
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

### Chat API (OpenAI Compatible)

```typescript
// Request
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
}

// Response
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

// Stream chunk
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

### Event System

```typescript
// Subscribe to events
agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload);
});

agent.on('skill:completed', (event) => {
  console.log('Skill executed:', event.payload.skillId);
});

agent.on('tool:completed', (event) => {
  console.log('Tool invoked:', event.payload.toolId);
});

// All event types
agent.on('agent:initialized', handler);
agent.on('agent:error', handler);
agent.on('execution:step', handler);
agent.on('memory:stored', handler);
```

### ReAct Engine

```typescript
// Think with ReAct pattern
const result = await agent.think('What is the weather?', {
  sessionId: 'session-1',
  executionId: 'exec-1'
});

// Stream thinking process
for await (const event of agent.thinkStream('Complex question')) {
  switch (event.type) {
    case 'thought':
      console.log('Thinking:', event.thought);
      break;
    case 'actions':
      console.log('Actions:', event.actions);
      break;
    case 'observations':
      console.log('Results:', event.observations);
      break;
    case 'complete':
      console.log('Answer:', event.answer);
      break;
  }
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# MCP
GITHUB_TOKEN=ghp_...
```

### Full Configuration Example

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
  name: 'Production Assistant',
  description: 'Enterprise-grade AI assistant',
  
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

## 🏆 Industry Standards

### Standards Compliance

| Standard | Compatibility | Description |
|----------|---------------|-------------|
| **OpenAI API** | 100% | Chat Completion API compatible |
| **Anthropic MCP** | 100% | Model Context Protocol |
| **Claude Code** | 100% | Tool-first design philosophy |
| **OpenCode** | 100% | Modular execution context |
| **OpenClaw** | 100% | Declarative action definition |

### Architecture Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                    SDKWork Agent                                 │
├─────────────────────────────────────────────────────────────────┤
│  DDD Layered          │  Domain/Application/Infrastructure      │
│  Microkernel          │  Service registry, DI, Lifecycle        │
│  Event-Driven         │  Complete event model                   │
│  Type-Safe            │  100% TypeScript                        │
│  OpenAI Compatible    │  Standard Chat API                      │
│  TUI Support          │  Professional terminal UI               │
│  ReAct Thinking       │  Thought-Action-Observation loop        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 Examples

### Example 1: Data Processing Agent

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';

// Define Skill
const dataProcessorSkill: Skill = {
  id: 'data-processor',
  name: 'Data Processor',
  description: 'Process and analyze data',
  version: '1.0.0',
  inputSchema: z.object({ data: z.array(z.any()) }),
  execute: async (input, ctx) => {
    const { data } = input as { data: unknown[] };
    
    // Process data
    const processed = data.filter(item => item !== null);
    
    // Use LLM for analysis
    const response = await ctx.llm.complete({
      messages: [
        { role: 'user', content: `Analyze: ${JSON.stringify(processed)}`, id: '1', timestamp: Date.now() }
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

// Create Agent
const agent = createAgent(openai, {
  name: 'DataAgent',
  skills: [dataProcessorSkill]
});

await agent.initialize();

// Execute skill
const result = await agent.executeSkill('data-processor', {
  data: largeDataset
});
```

### Example 2: Agent with Memory

```typescript
const agent = createAgent(openai, {
  name: 'MemoryAgent',
  description: 'Agent with conversation memory'
});

await agent.initialize();

// First conversation
await agent.chat({
  messages: [
    { role: 'user', content: 'My name is Alice' }
  ],
  sessionId: 'session-1'
});

// Second conversation - Agent remembers
const response = await agent.chat({
  messages: [
    { role: 'user', content: 'What is my name?' }
  ],
  sessionId: 'session-1'
});

// Output: "Your name is Alice"
console.log(response.choices[0].message.content);
```

### Example 3: ReAct Thinking

```typescript
const agent = createAgent(openai, {
  name: 'ReasoningAgent',
  skills: [calculatorSkill, searchSkill]
});

await agent.initialize();

// Use ReAct thinking
const result = await agent.think(
  'What is the population of Tokyo multiplied by 2?',
  { sessionId: 'session-1', executionId: 'exec-1' }
);

console.log('Answer:', result.answer);
console.log('Steps:', result.steps.length);
console.log('Tools used:', result.toolsUsed);
```

### Example 4: TUI Interface

```typescript
import { main } from '@sdkwork/agent/tui/cli';

// Start interactive TUI with:
// - Multi-provider support (OpenAI, Anthropic, etc.)
// - 65+ models
// - Theme switching
// - Session management
// - Auto-completion
main();
```

---

## 🔧 Development

### Project Structure

```
sdkwork-agent/
├── src/
│   ├── index.ts              # Main entry, createAgent
│   ├── core/
│   │   ├── domain/           # Domain layer
│   │   │   ├── agent.ts      # Agent domain model
│   │   │   ├── skill.ts      # Skill domain model
│   │   │   ├── tool.ts       # Tool domain model
│   │   │   ├── mcp.ts        # MCP domain model
│   │   │   ├── plugin.ts     # Plugin domain model
│   │   │   ├── memory.ts     # Memory domain model
│   │   │   └── unified.ts    # Unified types
│   │   ├── application/      # Application layer
│   │   │   ├── agent-impl.ts # Agent implementation
│   │   │   ├── skill-executor.ts
│   │   │   ├── tool-executor.ts
│   │   │   ├── mcp-client.ts
│   │   │   ├── plugin-manager.ts
│   │   │   ├── execution-engine.ts
│   │   │   └── memory-store.ts
│   │   └── microkernel/      # Microkernel
│   │       └── index.ts
│   ├── agent/                # Legacy agent (ReAct)
│   │   ├── agent.ts          # Agent class
│   │   ├── thinking/
│   │   │   └── react-engine.ts
│   │   └── skills/
│   │       └── registry.ts
│   ├── llm/                  # LLM providers
│   │   ├── provider.ts
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       └── ...
│   ├── skills/               # Skill system
│   ├── tools/                # Tool system
│   ├── tui/                  # Terminal UI
│   └── utils/                # Utilities
├── tests/
├── docs/
└── examples/
```

### Development Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Type check
npm run typecheck

# Run tests
npm run test

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

---

## 📄 License

[MIT](LICENSE) © SDKWork Team

---

<p align="center">
  <strong>Made with ❤️ by SDKWork Team</strong><br>
  <em>Building the future of AI agents</em>
</p>
