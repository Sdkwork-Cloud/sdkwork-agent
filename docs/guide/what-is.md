# 什么是 SDKWork Browser Agent？

SDKWork Browser Agent 是一个企业级浏览器智能体框架，基于 DDD 架构和微内核设计，提供高度可扩展的 AI 智能体能力。

## 概述

SDKWork Browser Agent 是一个现代化的 AI 智能体框架，专为构建企业级浏览器自动化和智能交互应用而设计。它采用领域驱动设计（DDD）和微内核架构，提供高度可扩展的插件系统。

## 核心特性

### 🤖 多 LLM 支持

支持 9+ 主流 LLM 提供者：

- **OpenAI** - GPT-4, GPT-3.5
- **Anthropic** - Claude 3
- **Google** - Gemini
- **DeepSeek** - DeepSeek Chat
- **Moonshot** - Moonshot V1
- **MiniMax** - ABAB 5.5
- **Zhipu** - GLM-4
- **Qwen** - Qwen Turbo
- **Doubao** - Doubao Pro

### 🔌 插件系统

- **Skill** - 可执行代码单元，支持多语言脚本
- **Tool** - 原子操作单元，提供基础能力
- **Plugin** - 功能模块，可热插拔
- **MCP** - Model Context Protocol 支持

### 🧠 智能记忆

- **短期记忆** - 会话级别临时存储
- **长期记忆** - 持久化重要信息
- **情景记忆** - 按时间索引事件
- **语义记忆** - 基于内容检索

### 🎨 专业 TUI

- **多主题** - 内置多种精美主题
- **流式输出** - 实时显示 AI 响应
- **会话管理** - 保存、加载、删除会话
- **Markdown 渲染** - 支持代码高亮

### 🏗️ 企业架构

- **DDD 架构** - 领域驱动设计
- **微内核** - 高度可扩展
- **事件驱动** - 松耦合通信
- **类型安全** - 完整 TypeScript 支持

## 技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Application Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Agent    │  │     TUI     │  │     CLI     │  │   Examples  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Domain Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Skill    │  │    Tool     │  │   Memory    │  │  Execution  │ │
│  │  Aggregate  │  │  Aggregate  │  │  Aggregate  │  │   Engine    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                         Infrastructure Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ LLM Provider│  │   Storage   │  │   Event     │  │   Plugin    │ │
│  │   Adapter   │  │   Adapter   │  │   System    │  │   System    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                           Core Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Types    │  │   Errors    │  │   Events    │  │   Utils     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 适用场景

### 浏览器自动化

- 网页数据采集
- 表单自动填写
- 页面交互测试
- 工作流自动化

### AI 助手

- 智能客服
- 文档问答
- 代码助手
- 数据分析

### 企业应用

- RPA 流程自动化
- 智能审批
- 报告生成
- 知识管理

## 快速开始

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';

const llm = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
});

const agent = createAgent(llm, {
  name: 'MyAgent',
  description: 'A helpful AI assistant',
});

await agent.initialize();

const response = await agent.chat({
  messages: [
    { id: '1', role: 'user', content: '你好！', timestamp: Date.now() }
  ]
});

console.log(response.choices[0].message.content);

await agent.destroy();
```

## 相关文档

- [安装](./installation.md) - 安装指南
- [快速开始](./quick-start.md) - 5 分钟上手
- [核心概念](./concepts.md) - 核心概念介绍
- [架构概览](../architecture/overview.md) - 技术架构
