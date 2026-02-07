# Tool API

Tool 是原子操作单元，提供分类管理和确认级别控制。

## defineTool

定义一个新的 Tool。

```typescript
function defineTool(config: ToolConfig): Tool
```

### ToolConfig

```typescript
interface ToolConfig {
  /** Tool ID */
  id: string;
  
  /** Tool 名称 */
  name: string;
  
  /** 描述 */
  description: string;
  
  /** 版本 */
  version?: string;
  
  /** 分类 */
  category: 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
  
  /** 确认级别 */
  confirm: 'none' | 'read' | 'write' | 'destructive';
  
  /** 输入 Schema */
  input?: JSONSchema;
  
  /** 输出 Schema */
  output?: JSONSchema;
  
  /** 执行函数 */
  execute: ToolExecutor;
  
  /** 元数据 */
  meta?: Record<string, unknown>;
}

type ToolExecutor = (
  input: unknown,
  context: ToolExecutionContext
) => Promise<ToolResult>;

interface JSONSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  default?: unknown;
}
```

### 示例

```typescript
import { defineTool } from 'sdkwork-agent';

// 文件读取 Tool
const fileReadTool = defineTool({
  id: 'file-read',
  name: 'File Read',
  description: 'Read file content',
  category: 'file',
  confirm: 'read',
  input: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' }
    },
    required: ['path']
  },
  output: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      size: { type: 'number' }
    }
  },
  execute: async (input, context) => {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(input.path, input.encoding);
      return {
        success: true,
        data: {
          content: content.toString(),
          size: content.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: `Failed to read file: ${error.message}`,
          code: 'FILE_READ_ERROR'
        }
      };
    }
  }
});

// HTTP 请求 Tool
const httpTool = defineTool({
  id: 'http-request',
  name: 'HTTP Request',
  description: 'Make HTTP request',
  category: 'network',
  confirm: 'none',
  input: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Request URL' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
      headers: { type: 'object', description: 'Request headers' },
      body: { type: 'string', description: 'Request body' }
    },
    required: ['url']
  },
  execute: async (input, context) => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body
    });
    return {
      success: response.ok,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        body: await response.text()
      }
    };
  }
});
```

## ToolExecutionContext

Tool 执行上下文。

```typescript
interface ToolExecutionContext {
  /** 执行 ID */
  executionId: string;
  
  /** Agent ID */
  agentId: string;
  
  /** 会话 ID */
  sessionId?: string;
  
  /** Tool ID */
  toolId: string;
  
  /** Tool 名称 */
  toolName: string;
  
  /** 日志 */
  logger: {
    debug: (msg: string, meta?: unknown) => void;
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, error?: Error) => void;
  };
  
  /** 中止信号 */
  signal?: AbortSignal;
}
```

## ToolResult

Tool 执行结果。

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: ToolError;
  metadata?: ToolExecutionMeta;
}

interface ToolError {
  message: string;
  code?: string;
  details?: unknown;
}

interface ToolExecutionMeta {
  executionId: string;
  toolId: string;
  toolName: string;
  startTime: number;
  endTime: number;
  duration: number;
}
```

## ToolRegistry

Tool 注册表。

```typescript
interface ToolRegistry {
  /** 注册 Tool */
  register(tool: Tool): void;
  
  /** 取消注册 */
  unregister(toolId: string): void;
  
  /** 获取 Tool */
  get(toolId: string): Tool | undefined;
  
  /** 根据名称获取 */
  getByName(name: string): Tool | undefined;
  
  /** 列出所有 */
  list(): Tool[];
  
  /** 按分类列出 */
  listByCategory(category: ToolCategory): Tool[];
  
  /** 搜索 */
  search(query: string): Tool[];
  
  /** 清空 */
  clear(): void;
  
  /** 执行 Tool */
  execute(name: string, input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
}
```

### 示例

```typescript
// 注册 Tool
agent.tools.register(fileReadTool);
agent.tools.register(fileWriteTool);

// 按分类列出
const fileTools = agent.tools.listByCategory('file');

// 执行 Tool
const result = await agent.tools.execute('file-read', {
  path: './data.txt'
});

if (result.success) {
  console.log('Content:', result.data.content);
} else {
  console.error('Error:', result.error.message);
}
```

## 确认级别

### none

无需确认，直接执行。

```typescript
const calculatorTool = defineTool({
  id: 'calculator',
  confirm: 'none',
  // ...
});
```

### read

读取操作，低风险。

```typescript
const fileReadTool = defineTool({
  id: 'file-read',
  confirm: 'read',
  // ...
});
```

### write

写入操作，中等风险。

```typescript
const fileWriteTool = defineTool({
  id: 'file-write',
  confirm: 'write',
  // ...
});
```

### destructive

破坏性操作，高风险。

```typescript
const fileDeleteTool = defineTool({
  id: 'file-delete',
  confirm: 'destructive',
  // ...
});
```

## 内置 Tools

### File Tools

```typescript
// 文件读取
agent.tools.execute('file-read', { path: './file.txt' });

// 文件写入
agent.tools.execute('file-write', { 
  path: './file.txt', 
  content: 'Hello' 
});

// 文件删除
agent.tools.execute('file-delete', { path: './file.txt' });

// 目录列表
agent.tools.execute('dir-list', { path: './' });
```

### Network Tools

```typescript
// HTTP 请求
agent.tools.execute('http-request', {
  method: 'GET',
  url: 'https://api.example.com/data'
});

// WebSocket
agent.tools.execute('websocket-connect', {
  url: 'wss://ws.example.com'
});
```

### Data Tools

```typescript
// JSON 处理
agent.tools.execute('json-parse', { text: '{"key": "value"}' });

// CSV 处理
agent.tools.execute('csv-parse', { text: 'a,b,c\n1,2,3' });

// 数据验证
agent.tools.execute('data-validate', {
  data: { name: 'John' },
  schema: { type: 'object', properties: { name: { type: 'string' } } }
});
```

## Tool Chain

Tool 调用链。

```typescript
interface ToolChain {
  id: string;
  nodes: ToolCallNode[];
  strategy: 'sequential' | 'parallel' | 'dag';
}

interface ToolCallNode {
  id: string;
  toolId: string;
  input: unknown;
  dependencies: string[];
  result?: unknown;
  state: 'pending' | 'ready' | 'executing' | 'completed' | 'failed' | 'skipped';
  error?: string;
}
```

### 示例

```typescript
// 执行 Tool 链
const chainResult = await agent.tools.executeChain([
  { toolId: 'file-read', input: { path: './input.txt' } },
  { toolId: 'data-process', input: { data: '{{prev.data.content}}' } },
  { toolId: 'file-write', input: { path: './output.txt', content: '{{prev.data}}' } }
]);
```

## Tool 事件

```typescript
type ToolEventType =
  | 'tool:registered'
  | 'tool:unregistered'
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  | 'tool:aborted'
  | 'tool:chain:started'
  | 'tool:chain:completed'
  | 'tool:chain:failed';

interface ToolEvent<T = unknown> {
  type: ToolEventType;
  timestamp: number;
  payload: T;
  toolId: string;
  executionId?: string;
}
```

## 最佳实践

1. **明确的确认级别** - 根据操作风险设置合适的 confirm 级别
2. **完善的错误处理** - 返回详细的错误信息
3. **输入验证** - 使用 JSON Schema 验证输入
4. **超时控制** - 网络操作设置合理的超时
5. **资源清理** - 确保连接、文件句柄正确关闭
