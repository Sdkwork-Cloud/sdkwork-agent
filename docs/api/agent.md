# Agent API

Agent 是 SDKWork 的核心聚合根，提供完整的智能体能力。

## createAgent

创建一个新的 Agent 实例。

```typescript
function createAgent(config: AgentConfig): Agent
```

### AgentConfig

```typescript
interface AgentConfig {
  // 身份
  id?: string;                   // 可选，自动生成
  name: string;                  // 必需，Agent 名称
  description?: string;          // 可选，描述
  
  // LLM 配置 - 支持两种方式
  // 方式1：使用 Provider 实例
  llm: LLMProvider;
  
  // 方式2：使用配置对象
  llm: {
    provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 'minimax' | 'zhipu' | 'qwen' | 'deepseek' | 'doubao';
    apiKey: string;
    model?: string;
    baseUrl?: string;
    defaults?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    };
  };
  
  // 可选能力 - 配置即启用
  skills?: Skill[];              // 初始 Skill 列表
  tools?: Tool[];                // 初始 Tool 列表
  mcp?: MCPServerConfig[];       // MCP 服务器配置
  memory?: MemoryConfig;         // 记忆系统配置
}
```

### 示例

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

// 方式1：使用 Provider 实例
const agent1 = createAgent({
  name: 'MyAgent',
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  })
});

// 方式2：使用配置对象
const agent2 = createAgent({
  name: 'MyAgent',
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    defaults: {
      temperature: 0.7,
      maxTokens: 2000
    }
  }
});

// 完整配置
const agent3 = createAgent({
  id: 'agent-001',
  name: 'FullFeaturedAgent',
  description: 'A full-featured agent',
  llm: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! }),
  skills: [skill1, skill2],
  tools: [tool1, tool2],
  memory: { maxTokens: 8000 }
});
```

## Agent 属性

### id

Agent 的唯一标识符。

```typescript
readonly id: string;
```

### name

Agent 的名称。

```typescript
readonly name: string;
```

### description

Agent 的描述。

```typescript
readonly description?: string;
```

### state

Agent 的当前状态。

```typescript
readonly state: AgentState;

type AgentState = 
  | 'idle'           // 空闲
  | 'initializing'   // 初始化中
  | 'ready'          // 就绪
  | 'chatting'       // 对话中
  | 'executing'      // 执行中
  | 'error'          // 错误
  | 'destroyed';     // 已销毁
```

### llm

LLM Provider 实例。

```typescript
readonly llm: LLMProvider;
```

### skills

Skill 注册表。

```typescript
readonly skills: SkillRegistry;
```

### tools

Tool 注册表。

```typescript
readonly tools: ToolRegistry;
```

### memory

记忆存储。

```typescript
readonly memory: MemoryStore;
```

### execution

执行引擎。

```typescript
readonly execution: ExecutionEngine;
```

### kernel

微内核实例（高级）。

```typescript
readonly kernel: Microkernel;
```

## 生命周期方法

### initialize

初始化 Agent，启动所有服务。

```typescript
async initialize(): Promise<void>
```

**状态流转**: `idle` → `initializing` → `ready`

**示例**:

```typescript
try {
  await agent.initialize();
  console.log('Agent initialized successfully');
} catch (error) {
  console.error('Failed to initialize agent:', error);
}
```

**事件触发**:
- `agent:initialized` - 初始化完成
- `agent:started` - 启动完成
- `agent:error` - 初始化失败

### reset

重置 Agent 状态，用于从错误状态恢复。

```typescript
async reset(): Promise<void>
```

**状态流转**: `error` → `idle` → `initializing` → `ready`

**示例**:

```typescript
if (agent.state === 'error') {
  await agent.reset();
  console.log('Agent reset and reinitialized');
}
```

**事件触发**:
- `agent:reset` - 重置完成

### destroy

销毁 Agent，释放所有资源。

```typescript
async destroy(): Promise<void>
```

**状态流转**: `*` → `destroyed`

**示例**:

```typescript
await agent.destroy();
console.log('Agent destroyed');
```

**事件触发**:
- `agent:destroyed` - 销毁完成

## 对话方法

### chat

进行对话，返回完整响应。

```typescript
async chat(request: ChatRequest): Promise<ChatResponse>
```

### ChatRequest

```typescript
interface ChatRequest {
  // 必需
  messages: ChatMessage[];
  
  // 可选
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  tools?: ToolDefinition[];
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' | 'json_object' | 'json_schema'; schema?: unknown };
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ChatContentPart[];
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; imageUrl: { url: string; detail?: 'low' | 'high' | 'auto' } }
  | { type: 'file'; file: { name: string; content: string; mimeType: string } };
```

### ChatResponse

```typescript
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
  systemFingerprint?: string;
}

interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}
```

**示例**:

```typescript
const response = await agent.chat({
  messages: [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user', content: '你好！' }
  ],
  temperature: 0.7,
  maxTokens: 1000
});

console.log(response.choices[0].message.content);
console.log(`Token usage: ${response.usage.totalTokens}`);
```

**事件触发**:
- `chat:started` - 对话开始
- `chat:completed` - 对话完成
- `chat:error` - 对话错误

### chatStream

进行流式对话，返回异步生成器。

```typescript
async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>
```

### ChatStreamChunk

```typescript
interface ChatStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

interface StreamChoice {
  index: number;
  delta: {
    role?: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    toolCalls?: ToolCall[];
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}
```

**示例**:

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: '讲一个故事' }]
});

for await (const chunk of stream) {
  const content = chunk.choices[0].delta.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

## Skill 管理

### executeSkill

执行指定的 Skill。

```typescript
async executeSkill(
  skillId: string, 
  input: string, 
  context?: Partial<SkillExecutionContext>
): Promise<SkillResult>
```

**示例**:

```typescript
const result = await agent.executeSkill('data-processor', '{"data": [1, 2, 3]}');

if (result.success) {
  console.log('Result:', result.data);
} else {
  console.error('Error:', result.error);
}
```

**事件触发**:
- `skill:invoking` - 开始执行
- `skill:completed` - 执行完成
- `skill:failed` - 执行失败

## Tool 管理

### executeTool

执行指定的 Tool。

```typescript
async executeTool(
  toolId: string, 
  input: string, 
  context?: Partial<ToolExecutionContext>
): Promise<ToolResult>
```

**示例**:

```typescript
const result = await agent.executeTool('file-read', '{"path": "./data.txt"}');

if (result.success) {
  console.log('Content:', result.data.content);
}
```

**事件触发**:
- `tool:invoking` - 开始执行
- `tool:completed` - 执行完成
- `tool:failed` - 执行失败

## Plugin 管理

### loadPlugin

加载并激活插件。

```typescript
async loadPlugin(config: PluginConfig): Promise<void>
```

**示例**:

```typescript
await agent.loadPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  activate: async (context) => {
    // 插件激活逻辑
  }
});
```

### unloadPlugin

卸载插件。

```typescript
async unloadPlugin(pluginId: string): Promise<void>
```

## MCP 管理

### connectMCP

连接 MCP 服务器。

```typescript
async connectMCP(config: MCPServerConfig): Promise<void>
```

**示例**:

```typescript
await agent.connectMCP({
  id: 'my-mcp-server',
  transport: 'stdio',
  command: 'node',
  args: ['./mcp-server.js']
});
```

### disconnectMCP

断开 MCP 服务器连接。

```typescript
async disconnectMCP(serverId: string): Promise<void>
```

## 会话管理

### createSession

创建新会话。

```typescript
createSession(): string
```

**示例**:

```typescript
const sessionId = agent.createSession();
console.log('New session:', sessionId);
```

### getSession

获取会话消息历史。

```typescript
getSession(sessionId: string): ChatMessage[] | undefined
```

### clearSession

清空会话。

```typescript
clearSession(sessionId: string): void
```

## 事件系统

### on

订阅事件。

```typescript
on<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void
```

### off

取消订阅事件。

```typescript
off<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void
```

### emit

触发自定义事件。

```typescript
emit<T>(event: AgentEventType, payload: T): void
```

### 事件类型

```typescript
type AgentEventType =
  // 生命周期
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:destroyed'
  | 'agent:error'
  | 'agent:reset'
  // 对话
  | 'chat:started'
  | 'chat:message'
  | 'chat:stream'
  | 'chat:completed'
  | 'chat:aborted'
  | 'chat:error'
  // 执行
  | 'execution:started'
  | 'execution:step'
  | 'execution:progress'
  | 'execution:completed'
  | 'execution:failed'
  // 工具
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  // Skill
  | 'skill:invoking'
  | 'skill:invoked'
  | 'skill:completed'
  | 'skill:failed'
  // 记忆
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:searched';
```

**示例**:

```typescript
// 监听对话完成
agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload);
});

// 监听所有事件
agent.on('*', (event) => {
  console.log('Event:', event.type, event.payload);
});
```

## 完整示例

```typescript
import { createAgent, defineSkill, defineTool } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  // 创建 Agent
  const agent = createAgent({
    name: 'DemoAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  // 监听事件
  agent.on('chat:completed', (event) => {
    console.log(`Chat completed in ${event.payload.duration}ms`);
  });

  // 初始化
  await agent.initialize();

  // 注册 Skill
  agent.skills.register(defineSkill({
    id: 'greeting',
    name: 'Greeting',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          return { message: 'Hello, ' + $input.name };
        }
      `
    }
  }));

  // 注册 Tool
  agent.tools.register(defineTool({
    id: 'timestamp',
    name: 'Timestamp',
    category: 'system',
    confirm: 'none',
    execute: async () => ({
      success: true,
      data: { timestamp: Date.now() }
    })
  }));

  // 对话
  const response = await agent.chat({
    messages: [{ role: 'user', content: '你好！' }]
  });
  console.log(response.choices[0].message.content);

  // 执行 Skill
  const skillResult = await agent.executeSkill('greeting', '{"name": "World"}');
  console.log(skillResult.data);

  // 执行 Tool
  const toolResult = await agent.executeTool('timestamp', '{}');
  console.log(toolResult.data);

  // 销毁
  await agent.destroy();
}

main().catch(console.error);
```
