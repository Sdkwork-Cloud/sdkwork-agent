# 流式输出示例

本文档提供 SDKWork Browser Agent 的流式输出使用示例。

## 基础流式输出

使用 `chatStream` 方法进行流式对话：

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

## 流式输出类型

### ChatStreamChunk

```typescript
interface ChatStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatStreamChoice[];
}

interface ChatStreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    toolCalls?: ToolCall[];
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | null;
}
```

## 带回调的流式输出

使用回调函数处理流式输出：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'CallbackStreamAgent',
    description: 'An agent with callback streaming',
  });

  await agent.initialize();

  let fullContent = '';

  const stream = agent.chatStream({
    messages: [
      { id: '1', role: 'user', content: '解释什么是人工智能', timestamp: Date.now() }
    ]
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      process.stdout.write(content);
    }
  }

  console.log('\n\n--- Full Response ---');
  console.log(fullContent);

  await agent.destroy();
}

main().catch(console.error);
```

## TUI 流式渲染

在终端界面中渲染流式输出：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import { createStreamRenderer } from '@sdkwork/browser-agent/tui';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'TUIStreamAgent',
    description: 'An agent with TUI streaming',
  });

  await agent.initialize();

  const renderer = createStreamRenderer({
    prefix: '> ',
    color: 'green'
  });

  console.log('Assistant:');

  const stream = agent.chatStream({
    messages: [
      { id: '1', role: 'user', content: '写一首关于春天的诗', timestamp: Date.now() }
    ]
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      renderer.write(content);
    }
  }

  renderer.end();
  console.log('\n');

  await agent.destroy();
}

main().catch(console.error);
```

## 流式输出与事件

结合事件系统处理流式输出：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'EventStreamAgent',
    description: 'An agent with event streaming',
  });

  agent.on('chat:started', (event) => {
    console.log(`[Started] Execution ID: ${event.payload.executionId}`);
  });

  agent.on('chat:completed', (event) => {
    console.log(`[Completed] Duration: ${event.payload.duration}ms`);
  });

  await agent.initialize();

  console.log('Assistant: ');

  const stream = agent.chatStream({
    messages: [
      { id: '1', role: 'user', content: '介绍一下 TypeScript', timestamp: Date.now() }
    ]
  });

  let charCount = 0;
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
      charCount += content.length;
    }
  }

  console.log(`\n\n[Stats] Total characters: ${charCount}`);

  await agent.destroy();
}

main().catch(console.error);
```

## 流式输出与 Tool 调用

处理包含 Tool 调用的流式输出：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Tool } from '@sdkwork/browser-agent';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const weatherTool: Tool = {
    id: 'get-weather',
    name: 'Get Weather',
    description: 'Get current weather for a location',
    category: 'network',
    confirm: 'read',
    input: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' }
      },
      required: ['location']
    },
    execute: async (input) => {
      const { location } = input as { location: string };
      return {
        success: true,
        data: {
          location,
          temperature: Math.floor(Math.random() * 30) + 5,
          condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
        }
      };
    }
  };

  const agent = createAgent(llm, {
    name: 'ToolStreamAgent',
    description: 'An agent with tool streaming',
    tools: [weatherTool],
  });

  agent.on('tool:invoking', (event) => {
    console.log(`\n[Tool] Invoking ${event.payload.toolId}...`);
  });

  agent.on('tool:completed', (event) => {
    console.log(`[Tool] Completed: ${JSON.stringify(event.payload.result.data)}`);
  });

  await agent.initialize();

  console.log('User: 北京今天天气怎么样？');
  console.log('Assistant: ');

  const stream = agent.chatStream({
    messages: [
      { id: '1', role: 'user', content: '北京今天天气怎么样？', timestamp: Date.now() }
    ]
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }

    const toolCalls = chunk.choices[0]?.delta?.toolCalls;
    if (toolCalls) {
      for (const toolCall of toolCalls) {
        console.log(`\n[Tool Call] ${toolCall.function.name}`);
      }
    }
  }

  console.log('\n');

  await agent.destroy();
}

main().catch(console.error);
```

## 错误处理

处理流式输出中的错误：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'ErrorStreamAgent',
    description: 'An agent with error handling',
  });

  await agent.initialize();

  try {
    console.log('Assistant: ');

    const stream = agent.chatStream({
      messages: [
        { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
      ]
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }

    console.log('\n');
  } catch (error) {
    console.error('\n[Error]', (error as Error).message);
    
    // 检查是否可恢复
    if ((error as any).recoverable) {
      console.log('Retrying...');
      // 重试逻辑
    }
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 中断流式输出

中断正在进行的流式输出：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'InterruptStreamAgent',
    description: 'An agent with stream interruption',
  });

  await agent.initialize();

  console.log('Assistant: ');

  const stream = agent.chatStream({
    messages: [
      { id: '1', role: 'user', content: '写一篇很长的文章', timestamp: Date.now() }
    ]
  });

  let charCount = 0;
  const maxChars = 100;

  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
        charCount += content.length;

        // 达到限制后中断
        if (charCount >= maxChars) {
          console.log('\n\n[Interrupted] Reached character limit');
          break;
        }
      }
    }
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      console.log('\n\n[Interrupted] Stream was aborted');
    } else {
      throw error;
    }
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 多轮流式对话

实现多轮流式对话：

```typescript
import * as readline from 'readline';
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'ChatStreamAgent',
    description: 'A conversational agent with streaming',
  });

  await agent.initialize();

  const sessionId = agent.createSession();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Chat started. Type "exit" to quit.\n');

  const chat = async () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        await agent.destroy();
        console.log('Goodbye!');
        return;
      }

      process.stdout.write('Assistant: ');

      const stream = agent.chatStream({
        messages: [
          { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() }
        ],
        sessionId
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      }

      console.log('\n');
      chat();
    });
  };

  chat();
}

main().catch(console.error);
```

## 最佳实践

1. **错误处理** - 始终处理流式输出中的错误
2. **资源清理** - 确保在完成后关闭流和释放资源
3. **中断处理** - 提供用户中断流式输出的能力
4. **缓冲管理** - 合理管理输出缓冲区
5. **用户体验** - 提供清晰的输出格式和进度指示
