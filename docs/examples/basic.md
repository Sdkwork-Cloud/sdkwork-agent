# 基础示例

本文档提供 SDKWork Agent 的基础使用示例。

## Hello World

最简单的 Agent 示例：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  // 创建 Agent
  const agent = createAgent({
    name: 'HelloAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  // 初始化
  await agent.initialize();

  // 对话
  const response = await agent.chat({
    messages: [
      { role: 'user', content: '你好！' }
    ]
  });

  console.log(response.choices[0].message.content);

  // 清理
  await agent.destroy();
}

main().catch(console.error);
```

## 使用 Skill

创建一个简单的问候 Skill：

```typescript
import { createAgent, defineSkill } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'SkillAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  // 定义并注册 Skill
  const greetingSkill = defineSkill({
    id: 'greeting',
    name: 'Greeting',
    description: 'Generate personalized greeting',
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
      `
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
  });

  agent.skills.register(greetingSkill);

  // 执行 Skill
  const result = await agent.executeSkill('greeting', JSON.stringify({
    name: 'Alice'
  }));

  if (result.success) {
    console.log(result.data.message);
    // 输出: Good morning, Alice! (根据时间变化)
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 使用 Tool

创建文件读取 Tool：

```typescript
import { createAgent, defineTool } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';
import { readFile } from 'fs/promises';

async function main() {
  const agent = createAgent({
    name: 'ToolAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  // 定义文件读取 Tool
  const fileReadTool = defineTool({
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
    execute: async (input, context) => {
      try {
        const content = await readFile(input.path, input.encoding);
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

  agent.tools.register(fileReadTool);

  // 执行 Tool
  const result = await agent.executeTool('file-read', JSON.stringify({
    path: './package.json',
    encoding: 'utf8'
  }));

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
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'EventAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  // 监听生命周期事件
  agent.on('agent:initialized', (event) => {
    console.log('✓ Agent initialized:', event.payload.agentId);
  });

  agent.on('agent:started', (event) => {
    console.log('✓ Agent started');
    console.log('  Capabilities:', event.payload.capabilities);
  });

  // 监听对话事件
  agent.on('chat:started', (event) => {
    console.log('→ Chat started:', event.payload.executionId);
  });

  agent.on('chat:completed', (event) => {
    console.log('✓ Chat completed');
    console.log('  Duration:', event.payload.duration, 'ms');
    console.log('  Token usage:', event.payload.tokenUsage);
  });

  // 监听错误事件
  agent.on('agent:error', (event) => {
    console.error('✗ Agent error:', event.payload.error);
  });

  // 初始化
  await agent.initialize();

  // 对话
  const response = await agent.chat({
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  });

  console.log('Response:', response.choices[0].message.content);

  await agent.destroy();
}

main().catch(console.error);
```

## 使用记忆系统

存储和检索记忆：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'MemoryAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    }),
    memory: {
      maxTokens: 8000,
      limit: 1000
    }
  });

  await agent.initialize();

  // 存储记忆
  await agent.memory.store({
    id: 'user-preference-1',
    content: '用户喜欢使用 TypeScript 编程',
    type: 'semantic',
    source: 'conversation',
    timestamp: Date.now(),
    metadata: {
      userId: 'user-123',
      tags: ['preference', 'typescript', 'programming']
    }
  });

  await agent.memory.store({
    id: 'conversation-1',
    content: '用户询问如何学习 TypeScript',
    type: 'episodic',
    source: 'conversation',
    timestamp: Date.now(),
    metadata: {
      sessionId: 'session-1',
      userId: 'user-123'
    }
  });

  // 搜索记忆
  const results = await agent.memory.search({
    content: 'TypeScript',
    type: 'semantic',
    limit: 5
  });

  console.log('Found memories:');
  results.forEach(result => {
    console.log(`  [${result.memory.type}] ${result.memory.content}`);
    console.log(`  Score: ${result.score}`);
  });

  // 获取统计
  const stats = await agent.memory.getStats();
  console.log('Memory stats:', stats);

  await agent.destroy();
}

main().catch(console.error);
```

## 多轮对话

维护对话上下文：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'ChatAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  await agent.initialize();

  // 创建会话
  const sessionId = agent.createSession();
  console.log('Session created:', sessionId);

  // 对话历史
  const messages = [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user', content: '我叫 Alice' }
  ];

  // 第一轮对话
  let response = await agent.chat({
    messages,
    sessionId
  });

  console.log('Assistant:', response.choices[0].message.content);
  messages.push(response.choices[0].message);

  // 第二轮对话（保持上下文）
  messages.push({ role: 'user', content: '我叫什么名字？' });

  response = await agent.chat({
    messages,
    sessionId
  });

  console.log('Assistant:', response.choices[0].message.content);
  // 应该回答：你叫 Alice

  // 获取会话历史
  const session = agent.getSession(sessionId);
  console.log('Session messages:', session?.length);

  await agent.destroy();
}

main().catch(console.error);
```

## 完整示例

综合使用所有功能：

```typescript
import { createAgent, defineSkill, defineTool } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  // 创建 Agent
  const agent = createAgent({
    name: 'FullFeaturedAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    }),
    memory: { maxTokens: 8000 }
  });

  // 监听事件
  agent.on('chat:completed', (event) => {
    console.log(`[Event] Chat completed in ${event.payload.duration}ms`);
  });

  agent.on('skill:completed', (event) => {
    console.log(`[Event] Skill ${event.payload.skillId} executed`);
  });

  // 初始化
  await agent.initialize();
  console.log('✓ Agent initialized\n');

  // 注册 Skill
  agent.skills.register(defineSkill({
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform calculations',
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
      `
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
  console.log('→ Chat');
  const response = await agent.chat({
    messages: [
      { role: 'system', content: '你是一个数学助手。' },
      { role: 'user', content: '你好！' }
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

  // 存储记忆
  console.log('→ Store Memory');
  await agent.memory.store({
    id: 'calc-result',
    content: `计算结果: 10 * 5 = ${skillResult.data.result}`,
    type: 'episodic',
    source: 'system',
    timestamp: Date.now()
  });

  // 搜索记忆
  console.log('→ Search Memory');
  const memories = await agent.memory.search({
    content: '计算',
    limit: 5
  });
  console.log('Found:', memories.length, 'memories\n');

  // 清理
  await agent.destroy();
  console.log('✓ Agent destroyed');
}

main().catch(console.error);
```
