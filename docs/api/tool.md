# Tool API

Tool 是 SDKWork Browser Agent 的原子操作单元，提供文件、网络、系统等基础能力。

## Tool 定义

### Tool 接口

```typescript
interface Tool {
  /** Tool ID */
  id: string;
  /** Tool 名称 */
  name: string;
  /** 描述 */
  description: string;
  
  /** 分类 */
  category: ToolCategory;
  /** 确认级别 */
  confirm: ConfirmLevel;
  
  /** 输入 Schema */
  input?: JSONSchema;
  /** 输出 Schema */
  output?: JSONSchema;
  
  /** 执行函数 */
  execute: (input: unknown, context: ExecutionContext) => Promise<ToolResult>;
}
```

### ToolCategory

```typescript
type ToolCategory = 
  | 'file'      // 文件操作
  | 'network'   // 网络请求
  | 'system'    // 系统命令
  | 'data'      // 数据处理
  | 'llm'       // LLM 调用
  | 'custom';   // 自定义
```

### ConfirmLevel

```typescript
type ConfirmLevel = 
  | 'none'       // 无需确认
  | 'read'       // 读取操作确认
  | 'write'      // 写入操作确认
  | 'destructive'; // 破坏性操作确认
```

### ToolResult

```typescript
interface ToolResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: unknown;
  /** 错误信息 */
  error?: ToolError;
  /** 输出内容 */
  output?: ToolOutput;
}

interface ToolError {
  code: string;
  message: string;
  toolId: string;
  stack?: string;
  recoverable: boolean;
}

interface ToolOutput {
  content: ToolOutputContent[];
}

type ToolOutputContent = 
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'json'; data: unknown };
```

### ExecutionContext

```typescript
interface ExecutionContext {
  /** Agent ID */
  agentId: string;
  /** 会话 ID */
  sessionId?: string;
  /** 执行 ID */
  executionId: string;
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}
```

## 创建 Tool

### 基础示例

```typescript
import type { Tool } from '@sdkwork/browser-agent';

const timestampTool: Tool = {
  id: 'timestamp',
  name: 'Timestamp',
  description: 'Get current timestamp',
  category: 'system',
  confirm: 'none',
  execute: async (input, context) => ({
    success: true,
    data: {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
    },
  }),
};
```

### 文件读取 Tool

```typescript
import type { Tool } from '@sdkwork/browser-agent';
import { readFile } from 'fs/promises';

const fileReadTool: Tool = {
  id: 'file-read',
  name: 'File Read',
  description: 'Read file content from disk',
  category: 'file',
  confirm: 'read',
  input: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read' },
      encoding: { 
        type: 'string', 
        enum: ['utf8', 'base64', 'binary'],
        default: 'utf8',
        description: 'File encoding'
      },
    },
    required: ['path'],
  },
  output: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      size: { type: 'number' },
      path: { type: 'string' },
    },
  },
  execute: async (input, context) => {
    try {
      const { path, encoding = 'utf8' } = input as { path: string; encoding?: string };
      const content = await readFile(path, encoding as BufferEncoding);
      
      return {
        success: true,
        data: {
          content: content.toString(),
          size: content.length,
          path,
        },
        output: {
          content: [{ type: 'text', text: content.toString() }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: `Failed to read file: ${(error as Error).message}`,
          toolId: 'file-read',
          recoverable: true,
        },
      };
    }
  },
};
```

### HTTP 请求 Tool

```typescript
import type { Tool } from '@sdkwork/browser-agent';

const httpRequestTool: Tool = {
  id: 'http-request',
  name: 'HTTP Request',
  description: 'Make HTTP requests',
  category: 'network',
  confirm: 'read',
  input: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Request URL' },
      method: { 
        type: 'string', 
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
        default: 'GET' 
      },
      headers: { type: 'object' },
      body: { type: 'string' },
    },
    required: ['url'],
  },
  output: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      headers: { type: 'object' },
      body: { type: 'string' },
    },
  },
  execute: async (input, context) => {
    const { url, method = 'GET', headers, body } = input as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    };
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });
      
      const responseBody = await response.text();
      
      return {
        success: true,
        data: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: `HTTP request failed: ${(error as Error).message}`,
          toolId: 'http-request',
          recoverable: true,
        },
      };
    }
  },
};
```

## ToolRegistry

### 注册 Tool

```typescript
agent.tools.register(timestampTool);
```

### 注销 Tool

```typescript
agent.tools.unregister('timestamp');
```

### 获取 Tool

```typescript
const tool = agent.tools.get('file-read');
```

### 列出所有 Tool

```typescript
const tools = agent.tools.list();
tools.forEach(t => console.log(t.id, t.name, t.category));
```

### 按分类列出

```typescript
const fileTools = agent.tools.getByCategory('file');
const networkTools = agent.tools.getByCategory('network');
```

## 执行 Tool

### 通过 Agent 执行

```typescript
const result = await agent.executeTool('file-read', JSON.stringify({
  path: './data.txt',
  encoding: 'utf8',
}));

if (result.success) {
  console.log('Content:', result.data.content);
  console.log('Size:', result.data.size);
} else {
  console.error('Error:', result.error.message);
}
```

## 内置 Tool

SDKWork Browser Agent 提供以下内置 Tool：

| Tool ID | 名称 | 分类 | 说明 |
|---------|------|------|------|
| `file-read` | File Read | file | 读取文件 |
| `file-write` | File Write | file | 写入文件 |
| `file-list` | File List | file | 列出目录 |
| `http-request` | HTTP Request | network | HTTP 请求 |
| `execute-command` | Execute Command | system | 执行命令 |
| `json-parse` | JSON Parse | data | JSON 解析 |

## Tool 事件

```typescript
type ToolEventType =
  | 'tool:registered'
  | 'tool:unregistered'
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed';
```

**示例：**

```typescript
agent.on('tool:completed', (event) => {
  console.log(`Tool ${event.payload.toolId} completed`);
  console.log(`Duration: ${event.payload.duration}ms`);
});

agent.on('tool:failed', (event) => {
  console.error(`Tool ${event.payload.toolId} failed:`, event.payload.error);
});
```

## Tool 插件

### 创建插件

```typescript
import type { Tool } from '@sdkwork/browser-agent';

const myTools: Tool[] = [
  timestampTool,
  fileReadTool,
  httpRequestTool,
];

// 注册多个 Tool
for (const tool of myTools) {
  agent.tools.register(tool);
}
```

## 完整示例

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Tool } from '@sdkwork/browser-agent';

// 定义自定义 Tool
const echoTool: Tool = {
  id: 'echo',
  name: 'Echo',
  description: 'Echo the input',
  category: 'custom',
  confirm: 'none',
  input: {
    type: 'object',
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  },
  execute: async (input, context) => ({
    success: true,
    data: input,
    output: {
      content: [{ type: 'text', text: (input as { message: string }).message }],
    },
  }),
};

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'ToolAgent',
    tools: [echoTool],
  });

  await agent.initialize();

  const result = await agent.executeTool('echo', JSON.stringify({
    message: 'Hello, World!',
  }));

  console.log(result.data);

  await agent.destroy();
}

main().catch(console.error);
```

## 最佳实践

1. **合适的分类** - 选择正确的 category 帮助 AI 理解
2. **确认级别** - 根据操作风险设置 confirm 级别
3. **完整的 Schema** - 定义 input 和 output Schema
4. **错误处理** - 返回有意义的错误信息
5. **幂等性** - 尽量设计幂等的 Tool
6. **资源清理** - 确保释放资源（文件句柄、连接等）
