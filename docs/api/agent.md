# Agent API

Agent 是 SDKWork Browser Agent 的核心智能体实现，基于 DDD 架构和微内核设计。

## createAgent

创建 Agent 实例的工厂函数。

### 签名

```typescript
function createAgent(
  llmProvider: LLMProvider, 
  options?: CreateAgentOptions
): AgentImpl
```

### 参数

#### LLMProvider

LLM 提供者实例，支持多种 LLM 服务：

```typescript
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import { AnthropicProvider } from '@sdkwork/browser-agent/llm';
import { GeminiProvider } from '@sdkwork/browser-agent/llm';
import { DeepSeekProvider } from '@sdkwork/browser-agent/llm';
import { MoonshotProvider } from '@sdkwork/browser-agent/llm';
import { MiniMaxProvider } from '@sdkwork/browser-agent/llm';
import { ZhipuProvider } from '@sdkwork/browser-agent/llm';
import { QwenProvider } from '@sdkwork/browser-agent/llm';
import { DoubaoProvider } from '@sdkwork/browser-agent/llm';
```

#### CreateAgentOptions

```typescript
interface CreateAgentOptions {
  /** Agent 名称 */
  name?: string;
  /** Agent 描述 */
  description?: string;
  /** 技能列表 */
  skills?: Skill[];
  /** 工具列表 */
  tools?: Tool[];
}
```

### 示例

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const agent = createAgent(llm, {
  name: 'MyAgent',
  description: 'A helpful AI assistant',
});

await agent.initialize();
```

## AgentImpl

Agent 实现类，提供完整的智能体功能。

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `AgentId` | Agent 唯一标识 |
| `name` | `string` | Agent 名称 |
| `description` | `string \| undefined` | Agent 描述 |
| `state` | `AgentState` | 当前状态 |
| `llm` | `LLMProvider` | LLM 提供者 |
| `skills` | `SkillRegistry` | 技能注册表 |
| `tools` | `ToolRegistry` | 工具注册表 |
| `memory` | `MemoryStore` | 记忆存储 |
| `execution` | `ExecutionEngine` | 执行引擎 |

### AgentState

```typescript
enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  CHATTING = 'chatting',
  EXECUTING = 'executing',
  THINKING = 'thinking',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}
```

### 生命周期方法

#### initialize

初始化 Agent。

```typescript
async initialize(): Promise<void>
```

**示例：**

```typescript
await agent.initialize();
```

#### destroy

销毁 Agent，释放所有资源。

```typescript
async destroy(): Promise<void>
```

**示例：**

```typescript
await agent.destroy();
```

#### reset

重置 Agent 状态，用于从 ERROR 状态恢复。

```typescript
async reset(): Promise<void>
```

**示例：**

```typescript
if (agent.state === AgentState.ERROR) {
  await agent.reset();
}
```

### 对话方法

#### chat

执行对话，返回完整响应。

```typescript
async chat(request: ChatRequest): Promise<ChatResponse>
```

#### ChatRequest

```typescript
interface ChatRequest {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 模型名称 */
  model?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 Token 数 */
  maxTokens?: number;
}
```

#### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContentPart[];
  name?: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
}
```

#### ChatResponse

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
}
```

**示例：**

```typescript
const response = await agent.chat({
  messages: [
    { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
  ],
});

console.log(response.choices[0].message.content);
```

#### chatStream

执行流式对话。

```typescript
async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>
```

**示例：**

```typescript
const stream = agent.chatStream({
  messages: [
    { id: '1', role: 'user', content: 'Tell me a story', timestamp: Date.now() }
  ],
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

### Skill 方法

#### executeSkill

执行指定 Skill。

```typescript
async executeSkill(
  skillId: string, 
  input: string, 
  context?: Partial<SkillExecutionContext>
): Promise<SkillResult>
```

**示例：**

```typescript
const result = await agent.executeSkill('calculator', JSON.stringify({
  a: 10,
  b: 5,
  operation: 'multiply'
}));

if (result.success) {
  console.log('Result:', result.data);
}
```

### Tool 方法

#### executeTool

执行指定 Tool。

```typescript
async executeTool(
  toolId: string, 
  input: string, 
  context?: Partial<ToolExecutionContext>
): Promise<ToolResult>
```

**示例：**

```typescript
const result = await agent.executeTool('file-read', JSON.stringify({
  path: './data.txt'
}));

if (result.success) {
  console.log('Content:', result.data);
}
```

### 会话管理

#### createSession

创建新会话。

```typescript
createSession(): SessionId
```

#### getSession

获取会话历史。

```typescript
getSession(sessionId: SessionId): ChatMessage[] | undefined
```

#### clearSession

清除会话。

```typescript
clearSession(sessionId: SessionId): void
```

**示例：**

```typescript
const sessionId = agent.createSession();

const response1 = await agent.chat({
  messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: Date.now() }],
  sessionId,
});

const response2 = await agent.chat({
  messages: [{ id: '2', role: 'user', content: 'What did I say?', timestamp: Date.now() }],
  sessionId,
});

const history = agent.getSession(sessionId);
console.log('History length:', history?.length);

agent.clearSession(sessionId);
```

### 事件系统

#### on

订阅事件。

```typescript
on<T>(
  eventType: AgentEventType, 
  handler: (event: AgentEvent<T>) => void
): () => void
```

#### AgentEventType

```typescript
type AgentEventType =
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:destroyed'
  | 'agent:error'
  | 'agent:reset'
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
  | 'memory:stored'
  | '*';
```

**示例：**

```typescript
// 订阅特定事件
agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload);
});

// 订阅所有事件
agent.on('*', (event) => {
  console.log('Event:', event.type, event.payload);
});
```

### Plugin 管理

#### loadPlugin

加载插件。

```typescript
async loadPlugin(config: PluginConfig): Promise<void>
```

#### unloadPlugin

卸载插件。

```typescript
async unloadPlugin(pluginId: string): Promise<void>
```

### MCP 管理

#### connectMCP

连接 MCP 服务器。

```typescript
async connectMCP(config: MCPServerConfig): Promise<void>
```

#### disconnectMCP

断开 MCP 服务器连接。

```typescript
async disconnectMCP(serverId: string): Promise<void>
```

## 完整示例

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Skill, Tool } from '@sdkwork/browser-agent';

async function main() {
  // 创建 LLM 提供者
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  // 定义 Skill
  const calculatorSkill: Skill = {
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform calculations',
    version: '1.0.0',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const { a, b, operation } = $input;
          let result;
          switch (operation) {
            case 'add': result = a + b; break;
            case 'subtract': result = a - b; break;
            case 'multiply': result = a * b; break;
            case 'divide': result = a / b; break;
          }
          return { result };
        }
      `,
      entry: 'main',
    },
    input: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
        operation: { type: 'string' },
      },
      required: ['a', 'b', 'operation'],
    },
  };

  // 定义 Tool
  const timestampTool: Tool = {
    id: 'timestamp',
    name: 'Timestamp',
    description: 'Get current timestamp',
    category: 'system',
    confirm: 'none',
    execute: async () => ({
      success: true,
      data: { timestamp: Date.now() },
    }),
  };

  // 创建 Agent
  const agent = createAgent(llm, {
    name: 'DemoAgent',
    description: 'A demo agent',
    skills: [calculatorSkill],
    tools: [timestampTool],
  });

  // 订阅事件
  agent.on('chat:completed', (event) => {
    console.log('Chat completed');
  });

  // 初始化
  await agent.initialize();

  // 对话
  const response = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
    ],
  });
  console.log('Response:', response.choices[0].message.content);

  // 执行 Skill
  const skillResult = await agent.executeSkill('calculator', JSON.stringify({
    a: 10,
    b: 5,
    operation: 'multiply',
  }));
  console.log('Skill result:', skillResult.data);

  // 执行 Tool
  const toolResult = await agent.executeTool('timestamp', '{}');
  console.log('Tool result:', toolResult.data);

  // 销毁
  await agent.destroy();
}

main().catch(console.error);
```

## 最佳实践

1. **资源管理** - 始终在完成后调用 `destroy()` 释放资源
2. **错误处理** - 使用 try-catch 处理可能的错误
3. **状态检查** - 在执行操作前检查 `agent.state`
4. **会话管理** - 使用 sessionId 维护对话上下文
5. **事件监听** - 利用事件系统实现可观测性
