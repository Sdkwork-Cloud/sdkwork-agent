---
layout: home

hero:
  name: SDKWork Agent
  text: 企业级 AI 智能体框架
  tagline: DDD 架构 • 微内核 • ReAct 思考 • 多 LLM 支持 • 安全沙箱
  image:
    src: /logo.svg
    alt: SDKWork Agent
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 什么是 SDKWork Agent?
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
  - icon: 🧠
    title: ReAct 思考引擎
    details: Thought-Action-Observation 循环，支持并行工具调用和自我反思
  - icon: 🤖
    title: 多 LLM 支持
    details: OpenAI、Anthropic、Google、DeepSeek、Moonshot、MiniMax、智谱、通义千问、豆包
  - icon: 📝
    title: Skill 系统
    details: 多语言脚本支持（JS/TS/Python），Zod Schema 验证，热重载
  - icon: 🔨
    title: Tool 系统
    details: 分类管理、确认级别、执行链，内置文件/网络/系统/数据处理工具
  - icon: 🔌
    title: MCP 协议
    details: Anthropic Model Context Protocol 完整实现，支持 stdio/HTTP/SSE
  - icon: 🔒
    title: 安全沙箱
    details: Node VM 隔离、Prompt 注入检测、代码验证、多层安全防护
  - icon: 🧩
    title: Plugin 系统
    details: VSCode 风格生命周期管理，Hook 系统，命令系统
  - icon: 💾
    title: 记忆系统
    details: HNSW 向量搜索、分层记忆、语义缓存、多维度存储
  - icon: 🖥️
    title: TUI 界面
    details: 专业级终端 UI，支持 65+ 模型、多主题、流式输出、会话管理
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
npm install @sdkwork/browser-agent
```

```bash [yarn]
yarn add @sdkwork/browser-agent
```

```bash [pnpm]
pnpm add @sdkwork/browser-agent
```

:::

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const agent = createAgent(llm, {
  name: 'MyAssistant',
  description: '一个有帮助的 AI 助手',
});

await agent.initialize();

const response = await agent.chat({
  messages: [{ id: '1', role: 'user', content: '你好，世界！', timestamp: Date.now() }],
});

console.log(response.choices[0].message.content);

await agent.destroy();
```

## 核心特性

### 企业级架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  AgentImpl   │ │SkillExecutor │ │ToolExecutor  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ MCPManager   │ │PluginManager │ │ExecutionEngine│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                          Domain Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Agent   │ │  Skill   │ │   Tool   │ │   MCP    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Plugin  │ │  Memory  │ │Execution │ │  Events  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Microkernel  │ │EventEmitter  │ │   Logger     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Sandbox    │ │VectorStore   │ │   Cache      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 支持的 LLM 提供者

| 提供者 | 模型 | 特性 |
|--------|------|------|
| **OpenAI** | GPT-4, GPT-4-Turbo, GPT-3.5 | 流式输出、函数调用 |
| **Anthropic** | Claude 3 (Opus/Sonnet/Haiku) | 视觉理解、长上下文 |
| **Google** | Gemini Pro, Gemini Ultra | 多模态、安全特性 |
| **DeepSeek** | DeepSeek Chat, Coder | 代码生成 |
| **Moonshot** | Moonshot v1 | 长上下文 (128K) |
| **MiniMax** | abab5.5-chat | 中文优化 |
| **智谱 AI** | glm-4 | 双语支持 |
| **通义千问** | qwen-turbo, qwen-max | 阿里云 |
| **豆包** | doubao-pro | 字节跳动 |

## 下一步

<div class="next-steps">

- [快速开始](./guide/quick-start) - 5 分钟上手 SDKWork Agent
- [核心概念](./guide/concepts) - 了解 DDD 架构设计
- [API 参考](./api/agent) - 查看完整 API 文档
- [示例代码](./examples/basic) - 学习实际使用案例
- [架构设计](./architecture/overview) - 深入了解技术架构
- [ReAct 引擎](./architecture/react) - 思考-行动-观察循环

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
