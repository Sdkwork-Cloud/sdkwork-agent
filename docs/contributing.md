# 贡献指南

感谢您对 SDKWork Browser Agent 的关注！本文档将帮助您了解如何为项目做出贡献。

## 开发环境

### 环境要求

- Node.js 18+
- pnpm 8+
- TypeScript 5+

### 克隆项目

```bash
git clone https://github.com/sdkwork/browser-agent.git
cd browser-agent
```

### 安装依赖

```bash
pnpm install
```

### 运行测试

```bash
pnpm test
```

### 构建项目

```bash
pnpm build
```

## 项目结构

```
src/
├── core/           # 核心层
├── agent/          # Agent 模块
├── skills/         # Skill 模块
├── tools/          # Tool 模块
├── memory/         # Memory 模块
├── execution/      # Execution 模块
├── llm/            # LLM 提供者
├── plugin/         # 插件系统
├── mcp/            # MCP 协议
├── algorithms/     # 算法模块
├── tui/            # TUI 界面
└── index.ts        # 主入口
```

## 代码规范

### TypeScript

- 使用 TypeScript 编写所有代码
- 遵循现有的代码风格
- 添加适当的类型注解

### 命名规范

- 文件名：kebab-case
- 类名：PascalCase
- 函数名：camelCase
- 常量：UPPER_SNAKE_CASE

### 注释

- 为公共 API 添加 JSDoc 注释
- 为复杂逻辑添加解释性注释

## 提交规范

### Commit 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新特性
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

### 示例

```
feat(agent): add streaming support

Add streaming support for chat method.

Closes #123
```

## Pull Request

### PR 流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### PR 检查清单

- [ ] 代码通过所有测试
- [ ] 代码符合项目规范
- [ ] 添加了必要的文档
- [ ] 更新了 CHANGELOG.md

## 问题反馈

### Bug 报告

请提供以下信息：

- 操作系统和版本
- Node.js 版本
- 复现步骤
- 预期行为
- 实际行为
- 错误日志

### 功能请求

请描述：

- 功能描述
- 使用场景
- 期望实现

## 许可证

本项目基于 MIT 许可证发布。贡献的代码将采用相同的许可证。
