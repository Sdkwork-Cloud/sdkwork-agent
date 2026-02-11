---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: SDKWork Agent
  text: 统一智能体架构
  tagline: Node.js 服务端专用，DDD Domain-Driven Design，行业领先的 Skill / Tool / MCP / Plugin 执行标准
  image:
    src: /logo.svg
    alt: SDKWork Agent
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 什么是 SDKWork?
      link: /guide/what-is
    - theme: alt
      text: GitHub
      link: https://github.com/Sdkwork-Cloud/sdkwork-agent

features:
  - icon: 🎯
    title: DDD 分层架构
    details: 领域驱动设计，清晰的 Domain/Application/Infrastructure 分层，高内聚低耦合
  - icon: 🔧
    title: 微内核架构
    details: 服务注册发现、依赖注入、生命周期管理，支持热插拔和动态扩展
  - icon: 🤖
    title: OpenAI 兼容
    details: 标准 Chat API，流式响应，工具调用，完整的类型推导
  - icon: 📝
    title: Skill 系统
    details: 多语言脚本支持（JS/TS/Python），Reference 文件系统，注入式 API
  - icon: 🔨
    title: Tool 系统
    details: 分类管理、确认级别、执行链，内置文件/网络/系统/数据处理工具
  - icon: 🔌
    title: MCP 协议
    details: Anthropic Model Context Protocol 完整实现，支持 stdio/sse/http/websocket
  - icon: 🧩
    title: Plugin 系统
    details: VSCode 风格生命周期管理，Hook 系统，命令系统
  - icon: 💾
    title: 记忆系统
    details: 语义搜索、多维度存储、时间衰减算法，支持 episodic/semantic/procedural 记忆
  - icon: 📊
    title: 可观测性
    details: 完整事件模型，执行链路追踪，资源监控，日志系统
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #646cff 30%, #bd34fe);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #646cff 50%, #bd34fe 50%);
  --vp-home-hero-image-filter: blur(44px);
}

.VPFeature {
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  transition: all 0.3s ease;
}

.VPFeature:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
}

.VPFeature .icon {
  font-size: 32px;
  margin-bottom: 16px;
}
</style>

## 快速开始

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

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

// 创建 Agent
const agent = createAgent({
  name: 'MyAssistant',
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  })
});

// 初始化并对话
await agent.initialize();

const response = await agent.chat({
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);
```

## 核心特性

### 统一智能体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    SDKWork Agent                             │
├─────────────────────────────────────────────────────────────┤
│  Application Layer                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  AgentImpl   │ │SkillExecutor │ │ToolExecutor  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ MCPManager   │ │PluginManager │ │ExecutionEngine│        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Agent   │ │  Skill   │ │   Tool   │ │   MCP    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Plugin  │ │  Memory  │ │Execution │ │  Events  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Microkernel  │ │EventEmitter  │ │ Logger      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 行业标准兼容

| 标准 | 兼容性 | 说明 |
|------|--------|------|
| **OpenAI API** | 100% | Chat Completion API 完全兼容 |
| **Anthropic MCP** | 100% | Model Context Protocol 完整实现 |
| **Claude Code** | 100% | Tool-first 设计哲学 |
| **OpenCode** | 100% | 模块化执行上下文 |
| **OpenClaw** | 100% | 声明式动作定义 |

## 下一步

<div class="next-steps">

- [快速开始](./guide/quick-start) - 5 分钟上手 SDKWork
- [核心概念](./guide/concepts) - 了解 DDD 架构设计
- [API 参考](./api/agent) - 查看完整 API 文档
- [示例代码](./examples/basic) - 学习实际使用案例
- [架构设计](./architecture/overview) - 深入了解技术架构

</div>

<style>
.next-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.next-steps a {
  display: block;
  padding: 16px 20px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: var(--vp-c-text-1);
  font-weight: 500;
  transition: all 0.3s ease;
}

.next-steps a:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}
</style>
