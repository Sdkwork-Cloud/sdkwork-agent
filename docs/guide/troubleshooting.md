# 故障排除

本文档提供 SDKWork Browser Agent 的常见问题和解决方案。

## 安装问题

### 包安装失败

**问题**：npm install 失败

**解决方案**：

```bash
# 清除缓存
npm cache clean --force

# 使用镜像源
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install @sdkwork/browser-agent
```

### 类型定义缺失

**问题**：TypeScript 报错找不到类型定义

**解决方案**：

```bash
# 安装类型依赖
npm install -D @types/node

# 检查 tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

## 初始化问题

### Agent 初始化失败

**问题**：`agent.initialize()` 抛出错误

**可能原因**：
1. API Key 无效
2. 网络连接问题
3. 模型不可用

**解决方案**：

```typescript
try {
  await agent.initialize();
} catch (error) {
  if (error.code === 'INVALID_API_KEY') {
    console.error('API Key 无效');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('网络连接失败');
  } else if (error.code === 'MODEL_NOT_FOUND') {
    console.error('模型不可用');
  }
}
```

### LLM Provider 错误

**问题**：LLM Provider 初始化失败

**解决方案**：

```typescript
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

// 检查 API Key
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY 环境变量未设置');
}

// 检查模型名称
const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview', // 确保模型名称正确
});
```

## 对话问题

### 对话超时

**问题**：`agent.chat()` 超时

**解决方案**：

```typescript
// 增加超时时间
const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  timeout: 60000, // 60秒
});

// 或使用 AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await agent.chat({
    messages,
    signal: controller.signal
  });
} finally {
  clearTimeout(timeoutId);
}
```

### 流式输出中断

**问题**：流式输出中途停止

**解决方案**：

```typescript
let fullContent = '';

try {
  for await (const chunk of agent.chatStream({ messages })) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      process.stdout.write(content);
    }
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('\n流式输出被中断');
    console.log('已接收内容:', fullContent);
  } else {
    throw error;
  }
}
```

## Skill 问题

### Skill 执行失败

**问题**：`agent.executeSkill()` 返回失败

**解决方案**：

```typescript
const result = await agent.executeSkill('my-skill', JSON.stringify(input));

if (!result.success) {
  console.error('Skill 执行失败:', result.error);
  
  if (result.error.recoverable) {
    // 可恢复错误，重试
    console.log('重试中...');
    const retryResult = await agent.executeSkill('my-skill', JSON.stringify(input));
  } else {
    // 不可恢复错误
    console.error('不可恢复错误:', result.error.message);
  }
}
```

### 脚本语法错误

**问题**：Skill 脚本报语法错误

**解决方案**：

```typescript
const skill: Skill = {
  id: 'test-skill',
  name: 'Test',
  description: 'Test skill',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        try {
          // 你的代码
          return { success: true };
        } catch (error) {
          $log.error('Error:', error);
          return { success: false, error: error.message };
        }
      }
    `,
    entry: 'main'
  }
};
```

### 注入 API 不可用

**问题**：`$llm`、`$tool` 等 API 不可用

**解决方案**：

确保 Skill 脚本正确使用注入 API：

```typescript
// 正确使用
const response = await $llm('Hello');

// 错误使用（未 await）
const response = $llm('Hello'); // 返回 Promise
```

## Tool 问题

### Tool 执行超时

**问题**：Tool 执行时间过长

**解决方案**：

```typescript
const tool: Tool = {
  id: 'long-running-tool',
  name: 'Long Running Tool',
  description: 'A tool that takes time',
  category: 'custom',
  confirm: 'none',
  execute: async (input, context) => {
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 30000);
    });
    
    try {
      const result = await Promise.race([
        doWork(input),
        timeoutPromise
      ]);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: { code: 'TIMEOUT', message: error.message } };
    }
  }
};
```

### Tool 权限问题

**问题**：Tool 执行被拒绝

**解决方案**：

```typescript
// 检查确认级别
const tool: Tool = {
  id: 'file-write',
  name: 'File Write',
  description: 'Write to file',
  category: 'file',
  confirm: 'write', // 需要确认
  // ...
};

// 处理确认
agent.on('tool:confirm', async (event) => {
  const { toolId, input } = event.payload;
  const confirmed = await askUser(`确认执行 ${toolId}?`);
  event.resolve(confirmed);
});
```

## 内存问题

### 内存泄漏

**问题**：内存使用持续增长

**解决方案**：

```typescript
// 1. 及时销毁 Agent
await agent.destroy();

// 2. 清理会话
agent.clearSession(sessionId);

// 3. 清理记忆
await agent.memory.clear();

// 4. 取消事件订阅
const unsubscribers: (() => void)[] = [];
unsubscribers.push(agent.on('event', handler));
// 清理时
unsubscribers.forEach(unsub => unsub());
```

### 记忆检索慢

**问题**：`memory.search()` 响应慢

**解决方案**：

```typescript
// 1. 限制返回数量
const results = await agent.memory.search(query, 10);

// 2. 定期清理过期记忆
setInterval(async () => {
  const items = await agent.memory.search('', 1000);
  const now = Date.now();
  for (const item of items) {
    if (item.expiresAt && item.expiresAt < now) {
      await agent.memory.delete(item.id);
    }
  }
}, 3600000);

// 3. 使用更具体的搜索词
const results = await agent.memory.search('用户偏好 颜色', 10);
```

## 网络问题

### API 请求失败

**问题**：LLM API 请求失败

**解决方案**：

```typescript
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  // 配置重试
  maxRetries: 3,
  retryDelay: 1000,
  // 配置代理
  httpAgent: new HttpsProxyAgent('http://proxy:8080')
});
```

### 连接超时

**问题**：网络连接超时

**解决方案**：

```typescript
const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  timeout: 60000, // 60秒
  // 配置超时重试
  maxRetries: 3
});
```

## 调试技巧

### 启用调试日志

```typescript
agent.on('*', (event) => {
  console.log(`[${event.type}]`, JSON.stringify(event.payload, null, 2));
});
```

### 检查 Agent 状态

```typescript
import { AgentState } from '@sdkwork/browser-agent';

console.log('Agent state:', agent.state);

if (agent.state === AgentState.ERROR) {
  await agent.reset();
}
```

### 错误堆栈

```typescript
agent.on('agent:error', (event) => {
  console.error('Error:', event.payload.error.message);
  console.error('Stack:', event.payload.error.stack);
});
```

## 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| `INVALID_API_KEY` | API Key 无效 | 检查 API Key 配置 |
| `MODEL_NOT_FOUND` | 模型不存在 | 检查模型名称 |
| `RATE_LIMITED` | 请求频率限制 | 降低请求频率 |
| `NETWORK_ERROR` | 网络错误 | 检查网络连接 |
| `TIMEOUT` | 请求超时 | 增加超时时间 |
| `SKILL_NOT_FOUND` | Skill 不存在 | 检查 Skill ID |
| `TOOL_NOT_FOUND` | Tool 不存在 | 检查 Tool ID |
| `EXECUTION_ERROR` | 执行错误 | 检查脚本语法 |

## 获取帮助

- [GitHub Issues](https://github.com/sdkwork/browser-agent/issues)
- [文档](https://sdkwork.github.io/browser-agent/)
- [示例代码](../examples/basic.md)

## 相关文档

- [性能优化](./performance.md) - 性能优化指南
- [核心概念](./concepts.md) - 核心概念介绍
