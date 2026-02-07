# 什么是 SDKWork Agent？

SDKWork Agent 是一个基于 **DDD (领域驱动设计)** 的统一智能体架构，实现了行业领先的 Skill、Tool、MCP、Plugin 四大执行标准。

## 核心设计理念

### 统一架构

SDKWork Agent 采用分层架构设计，将复杂的 AI 代理系统分解为清晰的层次：

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  - 应用服务编排                                               │
│  - 用例实现                                                   │
│  - 事务管理                                                   │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  - 领域模型（Agent、Skill、Tool、MCP、Plugin、Memory）         │
│  - 领域服务                                                   │
│  - 领域事件                                                   │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│  - 技术实现                                                   │
│  - 数据持久化                                                 │
│  - 外部服务集成                                               │
└─────────────────────────────────────────────────────────────┘
```

### 微内核架构

核心只提供最基本的服务注册与发现机制，所有功能通过服务插件化扩展：

- **Service Registry**: 服务注册与发现
- **Dependency Injection**: 依赖注入
- **Lifecycle Management**: 生命周期管理
- **Event Bus**: 事件总线

## 四大执行标准

### 1. Skill 系统

可执行的代码单元，支持多语言脚本：

- **JavaScript/TypeScript**: 原生支持
- **Python**: 通过 WASM 或子进程
- **Bash**: 系统命令执行
- **Reference 文件系统**: 模板、配置、文档分离

### 2. Tool 系统

原子操作单元，提供分类管理和确认级别：

- **分类**: file、network、system、data、llm
- **确认级别**: none、read、write、destructive
- **执行链**: 支持 Tool 链式调用

### 3. MCP 协议

Anthropic Model Context Protocol 完整实现：

- **Tools**: 工具发现和调用
- **Resources**: 资源管理
- **Prompts**: 提示词模板
- **传输**: stdio、sse、http、websocket

### 4. Plugin 系统

VSCode 风格的生命周期管理：

- **activate/deactivate**: 插件生命周期
- **Hook 系统**: 扩展核心功能
- **命令系统**: 注册自定义命令

## 行业兼容性

| 标准 | 兼容性 | 说明 |
|------|--------|------|
| **OpenAI API** | 100% | Chat Completion API 完全兼容 |
| **Anthropic MCP** | 100% | Model Context Protocol 完整实现 |
| **Claude Code** | 100% | Tool-first 设计哲学 |

## 适用场景

- **AI 助手**: 构建智能对话代理
- **自动化工作流**: 执行复杂的任务链
- **数据处理**: 多步骤数据转换和分析
- **内容生成**: 文本、代码、图像生成
- **智能代理**: 自主决策和执行的代理系统

## 下一步

- [快速开始](./quick-start.md) - 5 分钟上手
- [核心概念](./concepts.md) - 深入了解架构
- [安装指南](./installation.md) - 详细安装步骤
