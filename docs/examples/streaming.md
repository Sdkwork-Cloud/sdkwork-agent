# 流式对话示例

本文档展示如何使用 SDKWork Agent 的流式对话功能。

## 基础流式对话

实现打字机效果的实时输出：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'StreamAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  await agent.initialize();

  // 流式对话
  const stream = agent.chatStream({
    messages: [
      { role: 'user', content: '讲一个关于AI的短故事' }
    ]
  });

  console.log('Assistant: ');

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

  await agent.destroy();
}

main().catch(console.error);
```

## 带进度显示的流式对话

显示生成进度：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'ProgressAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  const stream = agent.chatStream({
    messages: [
      { role: 'user', content: '写一段关于TypeScript的介绍' }
    ]
  });

  let fullContent = '';
  let tokenCount = 0;

  console.log('Generating...\n');

  for await (const chunk of stream) {
    const content = chunk.choices[0].delta.content;
    if (content) {
      fullContent += content;
      tokenCount++;
      
      // 每10个token显示一次进度
      if (tokenCount % 10 === 0) {
        process.stdout.write(`\rGenerated ${tokenCount} tokens...`);
      }
    }
  }

  console.log('\n\n--- Generated Content ---');
  console.log(fullContent);
  console.log(`\nTotal tokens: ${tokenCount}`);

  await agent.destroy();
}

main().catch(console.error);
```

## 流式对话带取消

支持中途取消生成：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'CancellableAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  // 创建中止控制器
  const controller = new AbortController();

  // 3秒后取消
  setTimeout(() => {
    console.log('\n\n[Cancelling...]');
    controller.abort();
  }, 3000);

  try {
    const stream = agent.chatStream({
      messages: [
        { role: 'user', content: '写一个很长的故事' }
      ]
    });

    console.log('Assistant: ');

    for await (const chunk of stream) {
      // 检查是否已取消
      if (controller.signal.aborted) {
        break;
      }

      const content = chunk.choices[0].delta.content;
      if (content) {
        process.stdout.write(content);
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('\n[Generation cancelled by user]');
    } else {
      throw error;
    }
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 多轮流式对话

保持上下文的流式对话：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'MultiTurnStreamAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  const messages = [
    { role: 'system', content: '你是一个有帮助的助手。' }
  ];

  // 第一轮
  console.log('User: 你好！');
  messages.push({ role: 'user', content: '你好！' });

  console.log('Assistant: ');
  let response = await streamChat(agent, messages);
  messages.push({ role: 'assistant', content: response });

  // 第二轮
  console.log('\nUser: 今天天气怎么样？');
  messages.push({ role: 'user', content: '今天天气怎么样？' });

  console.log('Assistant: ');
  response = await streamChat(agent, messages);
  messages.push({ role: 'assistant', content: response });

  await agent.destroy();
}

async function streamChat(agent, messages) {
  const stream = agent.chatStream({ messages });
  let fullContent = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0].delta.content;
    if (content) {
      process.stdout.write(content);
      fullContent += content;
    }
  }

  return fullContent;
}

main().catch(console.error);
```

## 流式代码生成

实时显示代码生成过程：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'CodeGenAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  const stream = agent.chatStream({
    messages: [
      {
        role: 'user',
        content: '写一个快速排序算法的TypeScript实现，包含详细注释'
      }
    ]
  });

  console.log('```typescript');

  for await (const chunk of stream) {
    const content = chunk.choices[0].delta.content;
    if (content) {
      process.stdout.write(content);
    }
  }

  console.log('\n```');

  await agent.destroy();
}

main().catch(console.error);
```

## 流式对话事件

监听流式对话事件：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'EventStreamAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  // 监听流式事件
  agent.on('chat:started', (event) => {
    console.log('[Stream Started]');
  });

  agent.on('chat:stream', (event) => {
    // 可以在这里处理每个 chunk
  });

  agent.on('chat:completed', (event) => {
    console.log('\n[Stream Completed]');
    console.log(`Duration: ${event.payload.duration}ms`);
  });

  await agent.initialize();

  const stream = agent.chatStream({
    messages: [
      { role: 'user', content: '解释什么是流式传输' }
    ]
  });

  console.log('Assistant: ');

  for await (const chunk of stream) {
    const content = chunk.choices[0].delta.content;
    if (content) {
      process.stdout.write(content);
    }
  }

  console.log();

  await agent.destroy();
}

main().catch(console.error);
```

## 打字机效果

模拟打字机效果：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function typeWriterEffect(text, delay = 50) {
  for (const char of text) {
    process.stdout.write(char);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function main() {
  const agent = createAgent({
    name: 'TypeWriterAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  const stream = agent.chatStream({
    messages: [
      { role: 'user', content: '用一句话介绍自己' }
    ]
  });

  console.log('Assistant: ');

  // 收集所有内容
  let fullContent = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0].delta.content;
    if (content) {
      fullContent += content;
    }
  }

  // 打字机效果输出
  await typeWriterEffect(fullContent, 50);
  console.log();

  await agent.destroy();
}

main().catch(console.error);
```

## 流式对话保存到文件

将流式输出保存到文件：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';
import { writeFile } from 'fs/promises';

async function main() {
  const agent = createAgent({
    name: 'FileStreamAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  const stream = agent.chatStream({
    messages: [
      { role: 'user', content: '写一篇关于人工智能的短文' }
    ]
  });

  let content = '';

  console.log('Generating and saving...\n');

  for await (const chunk of stream) {
    const text = chunk.choices[0].delta.content;
    if (text) {
      content += text;
      process.stdout.write(text);
    }
  }

  // 保存到文件
  await writeFile('./output.txt', content, 'utf8');
  console.log('\n\n[Saved to output.txt]');

  await agent.destroy();
}

main().catch(console.error);
```

## 实时字数统计

实时显示生成字数：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function main() {
  const agent = createAgent({
    name: 'StatsAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  const stream = agent.chatStream({
    messages: [
      { role: 'user', content: '写一段500字的技术文章' }
    ]
  });

  let charCount = 0;
  let wordCount = 0;
  let content = '';

  console.log('Generating...\n');

  for await (const chunk of stream) {
    const text = chunk.choices[0].delta.content;
    if (text) {
      content += text;
      charCount += text.length;
      wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
      
      process.stdout.write(text);
      
      // 每50个字符更新一次统计
      if (charCount % 50 === 0) {
        process.stdout.write(`\r[Chars: ${charCount}, Words: ${wordCount}] `);
      }
    }
  }

  console.log(`\n\nFinal Stats:`);
  console.log(`- Characters: ${charCount}`);
  console.log(`- Words: ${wordCount}`);

  await agent.destroy();
}

main().catch(console.error);
```

## 最佳实践

1. **错误处理** - 始终使用 try-catch 处理流式对话
2. **资源清理** - 确保在完成后调用 agent.destroy()
3. **取消支持** - 对于长时间生成，提供取消功能
4. **进度反馈** - 给用户实时反馈生成进度
5. **缓冲处理** - 对于大量数据，考虑分批处理
