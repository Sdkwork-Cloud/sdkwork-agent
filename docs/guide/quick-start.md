# 快速开始

本指南将帮助你在 5 分钟内上手 SDKWork Agent。

## 环境要求

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0 (推荐)

## 安装

::: code-group

```bash [npm]
npm install sdkwork-agent
```

```bash [yarn]
yarn add sdkwork-agent
```

```bash [pnpm]
pnpm add sdkwork-agent
```

:::

## 第一个 Agent

创建一个简单的 AI 助手：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

// 创建 Agent
const agent = createAgent({
  name: 'MyAssistant',
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
    { role: 'user', content: '你好，请介绍一下自己' }
  ]
});

console.log(response.choices[0].message.content);

// 清理资源
await agent.destroy();
```

## 使用 Skill

定义并执行一个自定义 Skill：

```typescript
import { defineSkill } from 'sdkwork-agent';

// 定义 Skill
const greetingSkill = defineSkill({
  id: 'greeting',
  name: 'Greeting Skill',
  description: 'Generate personalized greeting',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const name = $input.name || 'Guest';
        const language = $input.language || 'zh';
        
        const greetings = {
          zh: \`你好，\${name}！欢迎使用 SDKWork Agent。\`,
          en: \`Hello, \${name}! Welcome to SDKWork Agent.\`
        };
        
        return {
          greeting: greetings[language],
          timestamp: Date.now()
        };
      }
    `
  },
  input: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      language: { type: 'string', enum: ['zh', 'en'] }
    }
  },
  output: {
    type: 'object',
    properties: {
      greeting: { type: 'string' },
      timestamp: { type: 'number' }
    }
  }
});

// 注册 Skill
agent.skills.register(greetingSkill);

// 执行 Skill
const result = await agent.executeSkill('greeting', JSON.stringify({
  name: '张三',
  language: 'zh'
}));

console.log(result.data.greeting);
// 输出: 你好，张三！欢迎使用 SDKWork Agent。
```

## 使用 Tool

定义并使用一个自定义 Tool：

```typescript
import { defineTool } from 'sdkwork-agent';

// 定义 Tool
const calculatorTool = defineTool({
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform basic calculations',
  category: 'data',
  confirm: 'none',
  input: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression' }
    },
    required: ['expression']
  },
  output: {
    type: 'object',
    properties: {
      result: { type: 'number' }
    }
  },
  execute: async (input) => {
    try {
      // 注意：实际使用时应使用安全的计算库
      const result = eval(input.expression);
      return {
        success: true,
        data: { result }
      };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Invalid expression' }
      };
    }
  }
});

// 注册 Tool
agent.tools.register(calculatorTool);

// 执行 Tool
const result = await agent.executeTool('calculator', JSON.stringify({
  expression: '2 + 2 * 3'
}));

console.log(result.data.result); // 8
```

## 流式对话

实现打字机效果的流式输出：

```typescript
// 流式对话
const stream = agent.chatStream({
  messages: [
    { role: 'user', content: '讲一个短故事' }
  ]
});

// 实时输出
for await (const chunk of stream) {
  const content = chunk.choices[0].delta.content;
  if (content) {
    process.stdout.write(content);
    // 模拟打字延迟
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

console.log('\n\n[故事结束]');
```

## 事件监听

监听 Agent 的各种事件：

```typescript
// 监听对话事件
agent.on('chat:completed', (event) => {
  console.log(`对话完成，耗时: ${event.payload.duration}ms`);
  console.log(`Token 使用: ${JSON.stringify(event.payload.tokenUsage)}`);
});

// 监听 Skill 事件
agent.on('skill:executed', (event) => {
  console.log(`Skill ${event.payload.skillId} 执行完成`);
});

// 监听 Tool 事件
agent.on('tool:invoked', (event) => {
  console.log(`Tool ${event.payload.toolId} 被调用`);
});

// 监听错误事件
agent.on('agent:error', (event) => {
  console.error('Agent 错误:', event.payload.error);
});
```

## 完整示例

一个包含所有功能的完整示例：

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
    }),
    memory: { maxTokens: 8000 }
  });

  // 监听事件
  agent.on('chat:completed', (event) => {
    console.log(`\n[耗时: ${event.payload.duration}ms]`);
  });

  // 初始化
  await agent.initialize();
  console.log('Agent 已初始化\n');

  // 注册 Skill
  agent.skills.register(defineSkill({
    id: 'echo',
    name: 'Echo',
    script: {
      lang: 'typescript',
      code: `async function main() { return $input; }`
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
    messages: [
      { role: 'system', content: '你是一个有帮助的助手。' },
      { role: 'user', content: '你好！' }
    ]
  });

  console.log('Assistant:', response.choices[0].message.content);

  // 执行 Skill
  const skillResult = await agent.executeSkill('echo', JSON.stringify({ message: 'Hello' }));
  console.log('Skill 结果:', skillResult.data);

  // 执行 Tool
  const toolResult = await agent.executeTool('timestamp', '{}');
  console.log('Tool 结果:', toolResult.data);

  // 清理
  await agent.destroy();
  console.log('\nAgent 已销毁');
}

main().catch(console.error);
```

## 下一步

- [核心概念](./concepts) - 深入了解架构设计
- [API 参考](../api/agent) - 查看完整 API 文档
- [示例代码](../examples/basic) - 学习更多实际使用案例
- [流式对话](../examples/streaming) - 实现打字机效果
