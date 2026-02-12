# 快速开始

本指南将帮助你在 5 分钟内上手 SDKWork Agent。

## 安装

::: code-group

```bash [npm]
npm install @sdkwork/browser-agent
```

```bash [yarn]
yarn add @sdkwork/browser-agent
```

```bash [pnpm]
pnpm add @sdkwork/browser-agent
```

:::

## 创建你的第一个 Agent

### 1. 基础示例

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

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
  messages: [
    { id: '1', role: 'user', content: 'Hello, who are you?', timestamp: Date.now() }
  ]
});

console.log(response.choices[0].message.content);

await agent.destroy();
```

### 2. 流式响应

```typescript
const stream = agent.chatStream({
  messages: [
    { id: '1', role: 'user', content: 'Tell me a story', timestamp: Date.now() }
  ]
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

### 3. 会话管理

```typescript
// 创建会话
const sessionId = agent.createSession();

// 第一轮对话
const response1 = await agent.chat({
  messages: [
    { id: '1', role: 'user', content: 'My name is Alice', timestamp: Date.now() }
  ],
  sessionId
});

// 第二轮对话（会记住上下文）
const response2 = await agent.chat({
  messages: [
    { id: '2', role: 'user', content: 'What is my name?', timestamp: Date.now() }
  ],
  sessionId
});

// 清除会话
agent.clearSession(sessionId);
```

## 添加 Skills

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Skill } from '@sdkwork/browser-agent';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const calculatorSkill: Skill = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform mathematical calculations',
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
          default: throw new Error('Unknown operation');
        }
        
        return { result, operation };
      }
    `,
    entry: 'main'
  },
  input: {
    type: 'object',
    properties: {
      a: { type: 'number' },
      b: { type: 'number' },
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] }
    },
    required: ['a', 'b', 'operation']
  }
};

const agent = createAgent(llm, {
  name: 'MathAgent',
  skills: [calculatorSkill],
});

await agent.initialize();

const result = await agent.executeSkill('calculator', JSON.stringify({
  a: 10,
  b: 5,
  operation: 'multiply'
}));

console.log(result.data);
```

## 添加 Tools

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Tool } from '@sdkwork/browser-agent';
import { readFile } from 'fs/promises';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const fileReaderTool: Tool = {
  id: 'file-reader',
  name: 'FileReader',
  description: 'Read file contents',
  category: 'file',
  confirm: 'read',
  input: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  execute: async (input) => {
    const { path } = input as { path: string };
    const content = await readFile(path, 'utf-8');
    return {
      success: true,
      data: { content, path }
    };
  }
};

const agent = createAgent(llm, {
  name: 'FileAgent',
  tools: [fileReaderTool],
});

await agent.initialize();

const result = await agent.executeTool('file-reader', JSON.stringify({ path: './README.md' }));

console.log(result.data.content);
```

## 事件监听

```typescript
agent.on('agent:initialized', (event) => {
  console.log('Agent initialized:', event.payload.agentId);
});

agent.on('chat:completed', (event) => {
  console.log('Chat completed');
});

agent.on('skill:completed', (event) => {
  console.log('Skill executed:', event.payload.skillId);
});

agent.on('tool:completed', (event) => {
  console.log('Tool invoked:', event.payload.toolId);
});

agent.on('agent:error', (event) => {
  console.error('Agent error:', event.payload.error);
});
```

## 错误处理

```typescript
try {
  await agent.initialize();
} catch (error) {
  console.error('Failed to initialize agent:', error);
}

try {
  const result = await agent.executeSkill('unknown-skill', '{}');
  if (!result.success) {
    console.error('Skill failed:', result.error);
  }
} catch (error) {
  console.error('Skill execution failed:', error);
}
```

## CLI 使用

```bash
npx @sdkwork/browser-agent
```

功能包括：
- 多 LLM 提供者支持（OpenAI, Anthropic, Google 等）
- 65+ 模型选择
- 9 种主题切换
- 会话管理（保存/加载/删除）
- 自动补全和历史记录
- Markdown 渲染
- 流式输出

## 下一步

- [核心概念](./concepts) - 了解 DDD 架构设计
- [API 参考](../api/agent) - 查看完整 API 文档
- [示例代码](../examples/basic) - 学习更多使用案例
- [TUI 界面](./tui) - 专业级终端交互
