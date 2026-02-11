# 更新日志

所有重要的变更都会记录在这个文件中。

## [3.0.0] - 2024-01-15

### 🎉 正式发布

SDKWork Agent 3.0.0 正式发布！这是一个基于 DDD 领域驱动设计的统一智能体架构，专注于 Node.js 服务端环境。

### ✨ 新特性

#### 核心架构
- **DDD 分层架构** - 清晰的 Domain/Application/Infrastructure 分层
- **微内核架构** - 服务注册发现、依赖注入、生命周期管理
- **事件驱动** - 完整的事件模型，支持可观测性

#### Agent 能力
- **OpenAI 兼容 API** - 标准 Chat Completion 接口
- **流式对话** - 支持实时流式响应
- **多会话管理** - 支持多个独立对话会话
- **状态管理** - 完整的生命周期状态管理

#### Skill 系统
- **多语言支持** - JavaScript/TypeScript/Python/Bash
- **Reference 文件系统** - 模板、配置、文档分离
- **注入式 API** - $llm, $tool, $skill, $memory, $log
- **Schema 验证** - 输入输出 JSON Schema 验证

#### Tool 系统
- **分类管理** - file/network/system/data/llm/custom
- **确认级别** - none/read/write/destructive
- **内置工具** - file-read, file-write, http-request 等
- **执行链** - 支持 Tool 链式调用

#### MCP 协议
- **完整实现** - Anthropic Model Context Protocol
- **多传输** - stdio/sse/http/websocket
- **自动发现** - Tools/Resources/Prompts 自动发现

#### Plugin 系统
- **VSCode 风格** - activate/deactivate 生命周期
- **Hook 系统** - 扩展核心功能
- **命令系统** - 注册自定义命令

#### 记忆系统
- **多维度存储** - episodic/semantic/procedural
- **语义搜索** - 基于向量相似度的搜索
- **时间衰减** - 智能记忆衰减算法

#### LLM 支持
- **OpenAI** - GPT-4, GPT-3.5-turbo
- **Anthropic** - Claude 系列
- **Google** - Gemini
- **国内模型** - 文心一言、通义千问、智谱、Moonshot、DeepSeek、豆包

### 🔧 技术特性

- **TypeScript 5.0+** - 100% 类型安全
- **ESM 支持** - 原生 ES 模块
- **Node.js 18+** - 现代 Node.js 支持
- **服务端专用** - 专注于 Node.js 服务端环境

### 📚 文档

- 完整的 API 文档
- 丰富的示例代码
- 详细的架构说明
- 最佳实践指南

---

## 版本说明

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修复

## 升级指南

### 从 0.x 升级到 1.0

1. 更新依赖
   ```bash
   npm install sdkwork-agent@latest
   ```

2. 检查 API 变更
   - `createAgent` 配置格式更新
   - `Skill` 定义方式更新
   - `Tool` 定义方式更新

3. 迁移代码
   参考迁移指南（即将推出）

## 贡献

感谢所有为 SDKWork Agent 做出贡献的开发者！

[查看贡献者列表](https://github.com/Sdkwork-Cloud/sdkwork-agent/graphs/contributors)
