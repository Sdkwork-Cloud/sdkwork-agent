# 快速开始

本指南将帮助你在 5 分钟内上手 SDKWork Agent。

## 安装

::: code-group

```bash [npm]
npm install @sdkwork/agent
```

```bash [yarn]
yarn add @sdkwork/agent
```

```bash [pnpm]
pnpm add @sdkwork/agent
```

:::

## 创建你的第一个 Agent

### 1. 基础示例

```typescript
import { createAgent } from '@sdkwork/agent';
import { OpenAIProvider } from '@sdkwork/agent/llm';

// 创建 LLM Provider
const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// 创建 Agent
const agent = createAgent(openai, {
  name: 'MyAssistant',
  description: 'A helpful AI assistant'
});

// 初始化
await agent.initialize();

// 对话
const response = await agent.chat({
  messages: [
    { role: 'user', content: 'Hello, who are you?' }
  ]
});

console.log(response.choices[0].message.content);

// 清理资源
await agent.destroy();
```

### 2. 流式响应

```typescript
const stream = agent.chatStream({
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

### 3. 带记忆的对话

```typescript
// 第一轮对话
await agent.chat({
  messages: [{ role: 'user', content: 'My name is Alice' }],
  sessionId: 'session-1'
});

// 第二轮对话 - Agent 会记住你的名字
const response = await agent.chat({
  messages: [{ role: 'user', content: 'What is my name?' }],
  sessionId: 'session-1'
});

console.log(response.choices[0].message.content);
// 输出: "Your name is Alice."
```

## 添加 Skills

```typescript
import { z } from 'zod';

// 定义 Skill
const calculatorSkill = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform mathematical calculations',
  version: '1.0.0',
  inputSchema: z.object({
    expression: z.string()
  }),
  execute: async (input, context) => {
    const { expression } = input as { expression: string };
    
    // 安全地计算表达式
    const result = eval(expression); // 实际使用应使用更安全的计算方式
    
    return {
      success: true,
      data: { result, expression },
      metadata: {
        executionId: context.executionId,
        skillId: 'calculator',
        skillName: 'Calculator',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0
      }
    };
  }
};

// 创建带 Skills 的 Agent
const agent = createAgent(openai, {
  name: 'MathAgent',
  skills: [calculatorSkill]
});

await agent.initialize();

// 执行 Skill
const result = await agent.executeSkill('calculator', {
  expression: '2 + 2'
});

console.log(result.data); // { result: 4, expression: '2 + 2' }
```

## 添加 Tools

```typescript
// 定义 Tool
const fileReaderTool = {
  id: 'file-reader',
  name: 'FileReader',
  description: 'Read file contents',
  category: 'file' as const,
  confirm: 'read' as const,
  inputSchema: z.object({
    path: z.string()
  }),
  execute: async (input, context) => {
    const { path } = input as { path: string };
    
    const fs = await import('fs/promises');
    const content = await fs.readFile(path, 'utf-8');
    
    return {
      success: true,
      data: { content, path },
      metadata: {
        executionId: context.executionId,
        toolId: 'file-reader',
        toolName: 'FileReader',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0
      }
    };
  }
};

// 创建带 Tools 的 Agent
const agent = createAgent(openai, {
  name: 'FileAgent',
  tools: [fileReaderTool]
});

await agent.initialize();

// 执行 Tool
const result = await agent.executeTool('file-reader', {
  path: './README.md'
});

console.log(result.data.content);
```

## 使用 ReAct 思考引擎

```typescript
const agent = createAgent(openai, {
  name: 'ReasoningAgent',
  skills: [calculatorSkill, searchSkill]
});

await agent.initialize();

// 使用 ReAct 思考模式
const result = await agent.think(
  'What is the population of Tokyo multiplied by 2?',
  { sessionId: 'session-1', executionId: 'exec-1' }
);

console.log('Answer:', result.answer);
console.log('Steps:', result.steps.length);
console.log('Tools used:', result.toolsUsed);

// 流式思考过程
for await (const event of agent.thinkStream('Complex question')) {
  switch (event.type) {
    case 'thought':
      console.log('🧠 Thinking:', event.thought);
      break;
    case 'actions':
      console.log('🔧 Actions:', event.actions.map(a => `${a.type}:${a.name}`).join(', '));
      break;
    case 'observations':
      console.log('👁️ Results:', event.observations);
      break;
    case 'reflection':
      console.log('💭 Reflection:', event.reflection);
      break;
    case 'complete':
      console.log('✅ Answer:', event.answer);
      break;
  }
}
```

## 使用 TUI 界面

```typescript
import { main } from '@sdkwork/agent/tui/cli';

// 启动交互式 TUI
// 功能包括：
// - 多 LLM 提供者支持（OpenAI, Anthropic, Google 等）
// - 65+ 模型选择
// - 9 种主题切换
// - 会话管理（保存/加载/删除）
// - 自动补全和历史记录
// - Markdown 渲染
// - 流式输出
main();
```

## 事件监听

```typescript
// 监听 Agent 事件
agent.on('agent:initialized', (event) => {
  console.log('Agent initialized:', event.payload.agentId);
});

agent.on('chat:completed', (event) => {
  console.log('Chat completed:', event.payload.executionId);
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
  
  // 尝试重置
  await agent.reset();
}

// 执行过程中的错误处理
try {
  const result = await agent.executeSkill('unknown-skill', {});
} catch (error) {
  console.error('Skill execution failed:', error);
}
```

## 下一步

- [核心概念](./concepts.md) - 了解 DDD 架构设计
- [API 参考](../api/agent.md) - 查看完整 API 文档
- [示例代码](../examples/basic.md) - 学习更多使用案例
- [ReAct 引擎](../architecture/react.md) - 深入了解思考引擎
- [TUI 界面](./tui.md) - 专业级终端交互
