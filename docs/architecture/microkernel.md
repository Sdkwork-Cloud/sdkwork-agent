# 微内核架构

SDKWork Browser Agent 采用微内核架构（Microkernel Architecture），提供高度可扩展的插件化系统。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Applications                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   CLI App   │  │   TUI App   │  │  Web App    │  │ Custom App  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Plugin System                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Skills   │  │    Tools    │  │   Plugins   │  │    MCPs     │ │
│  │   Plugin    │  │   Plugin    │  │   Plugin    │  │   Plugin    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Extension Points                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  - SkillRegistry                                                │ │
│  │  - ToolRegistry                                                 │ │
│  │  - PluginManager                                                │ │
│  │  - MCPClient                                                    │ │
│  │  - EventSystem                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Core System                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Agent    │  │   Events    │  │    Types    │  │   Errors    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 核心系统

核心系统提供最小功能集，确保系统可运行：

### 核心组件

```typescript
// src/core/index.ts
export * from './types';
export * from './errors';
export * from './events';

// 核心类型
export interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly state: AgentState;
  
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

// 核心事件
export interface AgentEvent<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: number;
}

// 核心错误
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
  }
}
```

### 最小核心

```typescript
// src/agent/agent.ts
export class AgentImpl implements Agent {
  private _state: AgentState = AgentState.IDLE;
  private readonly eventBus: EventBus;
  
  constructor(
    public readonly id: AgentId,
    public readonly name: string,
    public readonly llm: LLMProvider
  ) {
    this.eventBus = new EventBus();
  }
  
  async initialize(): Promise<void> {
    this._state = AgentState.INITIALIZING;
    // 核心初始化逻辑
    this._state = AgentState.READY;
    this.eventBus.emit({ type: 'agent:initialized', payload: { agentId: this.id } });
  }
  
  async destroy(): Promise<void> {
    this._state = AgentState.DESTROYED;
    this.eventBus.emit({ type: 'agent:destroyed', payload: { agentId: this.id } });
  }
  
  on<T>(eventType: string, handler: (event: AgentEvent<T>) => void): () => void {
    return this.eventBus.subscribe(eventType, handler);
  }
}
```

## 扩展点

扩展点定义了插件可以扩展的接口：

### SkillRegistry 扩展点

```typescript
// src/skills/registry.ts
export interface SkillRegistryExtension {
  register(skill: Skill): void;
  unregister(skillId: string): void;
  get(skillId: string): Skill | undefined;
  list(): Skill[];
  search(query: string): Skill[];
}

export class SkillRegistry implements SkillRegistryExtension {
  private readonly skills: Map<string, Skill> = new Map();
  
  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }
  
  unregister(skillId: string): void {
    this.skills.delete(skillId);
  }
  
  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }
  
  list(): Skill[] {
    return Array.from(this.skills.values());
  }
  
  search(query: string): Skill[] {
    return this.list().filter(s => 
      s.name.includes(query) || s.description.includes(query)
    );
  }
}
```

### ToolRegistry 扩展点

```typescript
// src/tools/registry.ts
export interface ToolRegistryExtension {
  register(tool: Tool): void;
  unregister(toolId: string): void;
  get(toolId: string): Tool | undefined;
  list(): Tool[];
  getByCategory(category: ToolCategory): Tool[];
}

export class ToolRegistry implements ToolRegistryExtension {
  private readonly tools: Map<string, Tool> = new Map();
  private readonly byCategory: Map<ToolCategory, Set<string>> = new Map();
  
  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
    
    if (!this.byCategory.has(tool.category)) {
      this.byCategory.set(tool.category, new Set());
    }
    this.byCategory.get(tool.category)!.add(tool.id);
  }
  
  getByCategory(category: ToolCategory): Tool[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.tools.get(id)!);
  }
}
```

## 插件系统

### Plugin 接口

```typescript
// src/plugin/types.ts
export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  
  skills?: Skill[];
  tools?: Tool[];
  hooks?: PluginHooks;
  
  install(agent: Agent): Promise<void>;
  uninstall(agent: Agent): Promise<void>;
}

export interface PluginHooks {
  'agent:initialized'?: (event: AgentEvent, agent: Agent) => Promise<void>;
  'chat:started'?: (event: AgentEvent, agent: Agent) => Promise<void>;
  'chat:completed'?: (event: AgentEvent, agent: Agent) => Promise<void>;
  'skill:executing'?: (event: AgentEvent, agent: Agent) => Promise<void>;
  'tool:invoking'?: (event: AgentEvent, agent: Agent) => Promise<void>;
}
```

### PluginManager

```typescript
// src/plugin/manager.ts
export class PluginManager {
  private readonly plugins: Map<string, Plugin> = new Map();
  private readonly agent: Agent;
  
  constructor(agent: Agent) {
    this.agent = agent;
  }
  
  async load(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new PluginAlreadyLoadedError(plugin.id);
    }
    
    // 注册 Skills
    if (plugin.skills) {
      for (const skill of plugin.skills) {
        this.agent.skills.register(skill);
      }
    }
    
    // 注册 Tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.agent.tools.register(tool);
      }
    }
    
    // 注册 Hooks
    if (plugin.hooks) {
      for (const [eventType, handler] of Object.entries(plugin.hooks)) {
        this.agent.on(eventType, (event) => handler(event, this.agent));
      }
    }
    
    // 调用安装钩子
    await plugin.install(this.agent);
    
    this.plugins.set(plugin.id, plugin);
  }
  
  async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundError(pluginId);
    }
    
    // 调用卸载钩子
    await plugin.uninstall(this.agent);
    
    // 注销 Skills
    if (plugin.skills) {
      for (const skill of plugin.skills) {
        this.agent.skills.unregister(skill.id);
      }
    }
    
    // 注销 Tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.agent.tools.unregister(tool.id);
      }
    }
    
    this.plugins.delete(pluginId);
  }
}
```

### 创建插件

```typescript
import type { Plugin, Skill, Tool } from '@sdkwork/browser-agent';

const myPlugin: Plugin = {
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
        code: `async function main() { return { message: 'Hello from plugin!' }; }`,
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
      execute: async () => ({ success: true, data: { message: 'Tool from plugin' } })
    }
  ],
  
  hooks: {
    'agent:initialized': async (event, agent) => {
      console.log('Plugin: Agent initialized');
    },
    'chat:completed': async (event, agent) => {
      console.log('Plugin: Chat completed');
    }
  },
  
  async install(agent) {
    console.log('Plugin installed');
  },
  
  async uninstall(agent) {
    console.log('Plugin uninstalled');
  }
};
```

## MCP 协议

Model Context Protocol (MCP) 提供标准化的工具集成：

### MCPClient

```typescript
// src/mcp/client.ts
export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransport;
}

export class MCPClient {
  private readonly servers: Map<string, MCPServerConnection> = new Map();
  
  async connect(config: MCPServerConfig): Promise<void> {
    const connection = await this.createConnection(config.transport);
    this.servers.set(config.id, connection);
    
    // 发现并注册工具
    const tools = await connection.listTools();
    for (const tool of tools) {
      this.agent.tools.register(this.convertTool(tool));
    }
  }
  
  async disconnect(serverId: string): Promise<void> {
    const connection = this.servers.get(serverId);
    if (connection) {
      await connection.close();
      this.servers.delete(serverId);
    }
  }
}
```

### 连接 MCP 服务器

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const agent = createAgent(llm, { name: 'MCPAgent' });
await agent.initialize();

// 连接 MCP 服务器
await agent.connectMCP({
  id: 'filesystem-mcp',
  name: 'Filesystem MCP',
  transport: {
    type: 'stdio',
    command: 'node',
    args: ['mcp-server-filesystem', '/path/to/allowed/dir']
  }
});

// 使用 MCP 提供的工具
const response = await agent.chat({
  messages: [{ id: '1', role: 'user', content: 'List files', timestamp: Date.now() }]
});
```

## 生命周期

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Created   │────▶│ Initializing│────▶│    Ready    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               │
    ┌──────────────────────────────────────────┘
    │
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Loading   │────▶│  Running    │────▶│  Unloading  │
│   Plugins   │     │   Plugins   │     │   Plugins   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Destroyed  │
                                        └─────────────┘
```

## 最佳实践

1. **最小核心** - 核心系统只包含必要功能
2. **明确扩展点** - 通过接口定义扩展点
3. **插件隔离** - 插件之间相互独立
4. **版本兼容** - 插件声明兼容的核心版本
5. **错误隔离** - 插件错误不影响核心系统
6. **热插拔** - 支持运行时加载/卸载插件

## 相关文档

- [架构概览](./overview.md) - 整体架构设计
- [DDD 架构](./ddd.md) - 领域驱动设计详解
