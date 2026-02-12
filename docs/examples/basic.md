# 基础示例

本文档提供 SDKWork Browser Agent 的基础使用示例。

## Hello World

最简单的 Agent 示例：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'HelloAgent',
    description: 'A simple greeting agent',
  });

  await agent.initialize();

  const response = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: '你好！', timestamp: Date.now() }
    ]
  });

  console.log(response.choices[0].message.content);

  await agent.destroy();
}

main().catch(console.error);
```

## 使用 Skill

创建一个简单的问候 Skill：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Skill } from '@sdkwork/browser-agent';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const greetingSkill: Skill = {
    id: 'greeting',
    name: 'Greeting',
    description: 'Generate personalized greeting',
    version: '1.0.0',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const name = $input.name || 'Guest';
          const hour = new Date().getHours();
          
          let greeting = 'Hello';
          if (hour < 12) greeting = 'Good morning';
          else if (hour < 18) greeting = 'Good afternoon';
          else greeting = 'Good evening';
          
          return {
            message: \`\${greeting}, \${name}!\`,
            timestamp: Date.now()
          };
        }
      `,
      entry: 'main'
    },
    input: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    },
    output: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'number' }
      }
    }
  };

  const agent = createAgent(llm, {
    name: 'SkillAgent',
    skills: [greetingSkill],
  });

  await agent.initialize();

  const result = await agent.executeSkill('greeting', JSON.stringify({ name: 'Alice' }));

  if (result.success) {
    console.log(result.data);
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 使用 Tool

创建文件读取 Tool：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Tool } from '@sdkwork/browser-agent';
import { readFile } from 'fs/promises';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const fileReadTool: Tool = {
    id: 'file-read',
    name: 'File Read',
    description: 'Read file content',
    category: 'file',
    confirm: 'read',
    input: {
      type: 'object',
      properties: {
        path: { type: 'string' },
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
    execute: async (input) => {
      try {
        const { path, encoding = 'utf8' } = input as { path: string; encoding?: string };
        const content = await readFile(path, encoding as BufferEncoding);
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
            code: 'FILE_READ_ERROR',
            message: `Failed to read file: ${(error as Error).message}`,
            toolId: 'file-read',
            recoverable: true
          }
        };
      }
    }
  };

  const agent = createAgent(llm, {
    name: 'ToolAgent',
    tools: [fileReadTool],
  });

  await agent.initialize();

  const result = await agent.executeTool('file-read', JSON.stringify({ path: './package.json' }));

  if (result.success) {
    console.log('File content:', result.data.content);
    console.log('File size:', result.data.size);
  } else {
    console.error('Error:', result.error.message);
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 事件监听

监听 Agent 的各种事件：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'EventAgent',
    description: 'An agent with event monitoring',
  });

  agent.on('agent:initialized', (event) => {
    console.log('✓ Agent initialized:', event.payload.agentId);
  });

  agent.on('chat:started', (event) => {
    console.log('→ Chat started:', event.payload.executionId);
  });

  agent.on('chat:completed', (event) => {
    console.log('✓ Chat completed');
  });

  agent.on('agent:error', (event) => {
    console.error('✗ Agent error:', event.payload.error);
  });

  await agent.initialize();

  const response = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
    ]
  });

  console.log('Response:', response.choices[0].message.content);

  await agent.destroy();
}

main().catch(console.error);
```

## 流式对话

使用流式输出：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'StreamAgent',
    description: 'An agent with streaming support',
  });

  await agent.initialize();

  console.log('Assistant: ');

  const stream = agent.chatStream({
    messages: [
      { id: '1', role: 'user', content: '讲一个简短的故事', timestamp: Date.now() }
    ]
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }
  }

  console.log('\n');

  await agent.destroy();
}

main().catch(console.error);
```

## 会话管理

维护对话上下文：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'ChatAgent',
    description: 'A conversational agent',
  });

  await agent.initialize();

  // 创建会话
  const sessionId = agent.createSession();

  // 第一轮对话
  const response1 = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: '我叫 Alice', timestamp: Date.now() }
    ],
    sessionId
  });
  console.log('Assistant:', response1.choices[0].message.content);

  // 第二轮对话（会记住上下文）
  const response2 = await agent.chat({
    messages: [
      { id: '2', role: 'user', content: '我叫什么名字？', timestamp: Date.now() }
    ],
    sessionId
  });
  console.log('Assistant:', response2.choices[0].message.content);

  // 获取会话历史
  const history = agent.getSession(sessionId);
  console.log('History length:', history?.length);

  // 清除会话
  agent.clearSession(sessionId);

  await agent.destroy();
}

main().catch(console.error);
```

## 完整示例

综合使用所有功能：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Skill, Tool } from '@sdkwork/browser-agent';

async function main() {
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

  // 定义 Tool
  const timestampTool: Tool = {
    id: 'timestamp',
    name: 'Timestamp',
    description: 'Get current timestamp',
    category: 'system',
    confirm: 'none',
    execute: async () => ({
      success: true,
      data: { timestamp: Date.now() }
    })
  };

  // 创建 Agent
  const agent = createAgent(llm, {
    name: 'FullFeaturedAgent',
    skills: [calculatorSkill],
    tools: [timestampTool],
  });

  // 事件监听
  agent.on('chat:completed', (event) => {
    console.log(`[Event] Chat completed`);
  });

  agent.on('skill:completed', (event) => {
    console.log(`[Event] Skill ${event.payload.skillId} executed`);
  });

  await agent.initialize();
  console.log('✓ Agent initialized\n');

  // 对话
  console.log('→ Chat');
  const response = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: '你好！', timestamp: Date.now() }
    ]
  });
  console.log('Assistant:', response.choices[0].message.content, '\n');

  // 执行 Skill
  console.log('→ Execute Skill');
  const skillResult = await agent.executeSkill('calculator', JSON.stringify({
    a: 10,
    b: 5,
    operation: 'multiply'
  }));
  console.log('Result:', skillResult.data, '\n');

  // 执行 Tool
  console.log('→ Execute Tool');
  const toolResult = await agent.executeTool('timestamp', '{}');
  console.log('Timestamp:', toolResult.data, '\n');

  await agent.destroy();
  console.log('✓ Agent destroyed');
}

main().catch(console.error);
```

## 最佳实践

1. **资源管理** - 始终在完成后调用 `destroy()` 释放资源
2. **错误处理** - 使用 try-catch 处理可能的错误
3. **状态检查** - 在执行操作前检查 `agent.state`
4. **会话管理** - 使用 sessionId 维护对话上下文
5. **事件监听** - 利用事件系统实现可观测性
