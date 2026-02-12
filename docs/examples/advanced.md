# 高级示例

本文档提供 SDKWork Browser Agent 的高级使用示例。

## 多 LLM 提供者

SDKWork Browser Agent 支持多种 LLM 提供者：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import { AnthropicProvider } from '@sdkwork/browser-agent/llm';
import { GeminiProvider } from '@sdkwork/browser-agent/llm';
import { DeepSeekProvider } from '@sdkwork/browser-agent/llm';
import { MoonshotProvider } from '@sdkwork/browser-agent/llm';
import { MiniMaxProvider } from '@sdkwork/browser-agent/llm';
import { ZhipuProvider } from '@sdkwork/browser-agent/llm';
import { QwenProvider } from '@sdkwork/browser-agent/llm';
import { DoubaoProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  // OpenAI
  const openai = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  // Anthropic
  const anthropic = new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-opus-20240229',
  });

  // Google Gemini
  const gemini = new GeminiProvider({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-pro',
  });

  // DeepSeek
  const deepseek = new DeepSeekProvider({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: 'deepseek-chat',
  });

  // Moonshot
  const moonshot = new MoonshotProvider({
    apiKey: process.env.MOONSHOT_API_KEY!,
    model: 'moonshot-v1-8k',
  });

  // MiniMax
  const minimax = new MiniMaxProvider({
    apiKey: process.env.MINIMAX_API_KEY!,
    model: 'abab5.5-chat',
    groupId: process.env.MINIMAX_GROUP_ID!,
  });

  // Zhipu
  const zhipu = new ZhipuProvider({
    apiKey: process.env.ZHIPU_API_KEY!,
    model: 'glm-4',
  });

  // Qwen
  const qwen = new QwenProvider({
    apiKey: process.env.QWEN_API_KEY!,
    model: 'qwen-turbo',
  });

  // Doubao
  const doubao = new DoubaoProvider({
    apiKey: process.env.DOUBAO_API_KEY!,
    model: 'doubao-pro-4k',
    endpointId: process.env.DOUBAO_ENDPOINT_ID!,
  });

  const agent = createAgent(openai, {
    name: 'MultiLLMAgent',
    description: 'An agent supporting multiple LLM providers',
  });

  await agent.initialize();
  await agent.destroy();
}

main().catch(console.error);
```

## 插件系统

创建和使用插件：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { PluginConfig, Skill, Tool } from '@sdkwork/browser-agent';

// 定义插件
const myPlugin: PluginConfig = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'A custom plugin',
  skills: [
    {
      id: 'plugin-skill',
      name: 'Plugin Skill',
      description: 'A skill from plugin',
      version: '1.0.0',
      script: {
        lang: 'typescript',
        code: `
          async function main() {
            return { message: 'Hello from plugin!' };
          }
        `,
        entry: 'main'
      }
    }
  ],
  tools: [
    {
      id: 'plugin-tool',
      name: 'Plugin Tool',
      description: 'A tool from plugin',
      category: 'custom',
      confirm: 'none',
      execute: async () => ({
        success: true,
        data: { message: 'Tool from plugin' }
      })
    }
  ],
  hooks: {
    'agent:initialized': async (event, agent) => {
      console.log('Plugin: Agent initialized');
    },
    'chat:completed': async (event, agent) => {
      console.log('Plugin: Chat completed');
    }
  }
};

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'PluginAgent',
    description: 'An agent with plugins',
  });

  await agent.initialize();

  // 加载插件
  await agent.loadPlugin(myPlugin);

  // 使用插件提供的 Skill
  const skillResult = await agent.executeSkill('plugin-skill', '{}');
  console.log(skillResult.data);

  // 使用插件提供的 Tool
  const toolResult = await agent.executeTool('plugin-tool', '{}');
  console.log(toolResult.data);

  // 卸载插件
  await agent.unloadPlugin('my-plugin');

  await agent.destroy();
}

main().catch(console.error);
```

## MCP 服务器

连接 Model Context Protocol 服务器：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { MCPServerConfig } from '@sdkwork/browser-agent';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'MCPAgent',
    description: 'An agent connected to MCP servers',
  });

  await agent.initialize();

  // 连接 MCP 服务器
  const mcpConfig: MCPServerConfig = {
    id: 'filesystem-mcp',
    name: 'Filesystem MCP',
    transport: {
      type: 'stdio',
      command: 'node',
      args: ['mcp-server-filesystem', '/path/to/allowed/dir']
    }
  };

  await agent.connectMCP(mcpConfig);

  // 使用 MCP 提供的工具
  const response = await agent.chat({
    messages: [
      { id: '1', role: 'user', content: 'List files in the current directory', timestamp: Date.now() }
    ]
  });

  console.log(response.choices[0].message.content);

  // 断开 MCP 服务器
  await agent.disconnectMCP('filesystem-mcp');

  await agent.destroy();
}

main().catch(console.error);
```

## 高级 Skill

使用引用文件和依赖：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Skill } from '@sdkwork/browser-agent';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const advancedSkill: Skill = {
    id: 'data-processor',
    name: 'Data Processor',
    description: 'Process data with templates',
    version: '1.0.0',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const data = $input;
          const template = $ref('template');
          
          // 使用 LLM 处理数据
          const analysis = await $llm(\`
            Analyze this data and provide insights:
            \${JSON.stringify(data)}
          \`);
          
          // 渲染模板
          let rendered = template;
          for (const [key, value] of Object.entries(data)) {
            rendered = rendered.replace(new RegExp(\`{{\${key}}}\`, 'g'), String(value));
          }
          
          // 存储到内存
          await $memory.set('last-analysis', {
            data,
            analysis,
            timestamp: Date.now()
          });
          
          return {
            rendered,
            analysis,
            timestamp: Date.now()
          };
        }
      `,
      entry: 'main',
      dependencies: {
        'lodash': '^4.17.21'
      }
    },
    references: [
      {
        name: 'template',
        path: './templates/report.md',
        content: `# Report
Date: {{date}}
Status: {{status}}

## Summary
{{summary}}
`,
        type: 'template'
      }
    ],
    input: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        status: { type: 'string' },
        summary: { type: 'string' }
      },
      required: ['date', 'status', 'summary']
    },
    output: {
      type: 'object',
      properties: {
        rendered: { type: 'string' },
        analysis: { type: 'string' },
        timestamp: { type: 'number' }
      }
    }
  };

  const agent = createAgent(llm, {
    name: 'AdvancedAgent',
    skills: [advancedSkill],
  });

  await agent.initialize();

  const result = await agent.executeSkill('data-processor', JSON.stringify({
    date: '2024-01-15',
    status: 'Completed',
    summary: 'All tasks finished successfully'
  }));

  console.log(result.data);

  await agent.destroy();
}

main().catch(console.error);
```

## 错误恢复

处理错误和恢复：

```typescript
import { createAgent, AgentState } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'ResilientAgent',
    description: 'An agent with error recovery',
  });

  // 监听错误事件
  agent.on('agent:error', async (event) => {
    console.error('Agent error:', event.payload.error);
    
    // 尝试恢复
    if (agent.state === AgentState.ERROR) {
      console.log('Attempting recovery...');
      await agent.reset();
      console.log('Agent recovered');
    }
  });

  await agent.initialize();

  try {
    const response = await agent.chat({
      messages: [
        { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
      ]
    });
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error('Chat failed:', error);
    
    // 检查状态并恢复
    if (agent.state === AgentState.ERROR) {
      await agent.reset();
      
      // 重试
      const retryResponse = await agent.chat({
        messages: [
          { id: '2', role: 'user', content: 'Hello again!', timestamp: Date.now() }
        ]
      });
      console.log(retryResponse.choices[0].message.content);
    }
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 并发控制

控制并发执行：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'ConcurrentAgent',
    description: 'An agent with concurrent execution',
  });

  await agent.initialize();

  // 并发执行多个任务
  const tasks = [
    agent.chat({
      messages: [{ id: '1', role: 'user', content: 'Task 1', timestamp: Date.now() }]
    }),
    agent.chat({
      messages: [{ id: '2', role: 'user', content: 'Task 2', timestamp: Date.now() }]
    }),
    agent.chat({
      messages: [{ id: '3', role: 'user', content: 'Task 3', timestamp: Date.now() }]
    }),
  ];

  const results = await Promise.all(tasks);
  
  results.forEach((result, index) => {
    console.log(`Task ${index + 1}:`, result.choices[0].message.content);
  });

  await agent.destroy();
}

main().catch(console.error);
```

## 自定义记忆存储

实现自定义记忆存储：

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { MemoryStore, MemoryItem } from '@sdkwork/browser-agent';

// 自定义记忆存储
class CustomMemoryStore implements MemoryStore {
  private items: Map<string, MemoryItem> = new Map();

  async store(item: Omit<MemoryItem, 'id'>): Promise<string> {
    const id = `mem-${Date.now()}`;
    this.items.set(id, { ...item, id });
    return id;
  }

  async retrieve(id: string): Promise<MemoryItem | null> {
    return this.items.get(id) || null;
  }

  async search(query: string, limit?: number): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    for (const item of this.items.values()) {
      if (item.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(item);
        if (limit && results.length >= limit) break;
      }
    }
    return results;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'CustomMemoryAgent',
    description: 'An agent with custom memory',
  });

  await agent.initialize();

  // 使用自定义记忆存储
  const memory = new CustomMemoryStore();
  
  await memory.store({
    content: 'User prefers concise responses',
    type: 'preference',
    importance: 0.8,
    metadata: { source: 'user-feedback' }
  });

  const results = await memory.search('preference');
  console.log('Found memories:', results);

  await agent.destroy();
}

main().catch(console.error);
```

## 最佳实践

1. **插件隔离** - 插件应该独立、可卸载
2. **错误处理** - 实现完善的错误恢复机制
3. **资源管理** - 合理管理并发和资源
4. **记忆优化** - 实现高效的记忆存储和检索
5. **安全考虑** - 验证和清理所有外部输入
