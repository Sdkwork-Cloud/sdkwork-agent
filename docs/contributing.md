# 贡献指南

感谢你对 SDKWork Agent 的兴趣！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题

如果你发现了 bug 或有功能建议：

1. 先搜索 [Issues](https://github.com/Sdkwork-Cloud/sdkwork-agent/issues) 看是否已存在
2. 如果没有，创建一个新的 Issue
3. 使用相应的模板（Bug 报告或功能请求）
4. 提供尽可能详细的信息

### 提交代码

#### 1. Fork 仓库

```bash
# Fork 仓库到你的 GitHub 账号
# 然后克隆你的 fork
git clone https://github.com/YOUR_USERNAME/agent.git
cd agent
```

#### 2. 创建分支

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 或修复分支
git checkout -b fix/issue-description
```

#### 3. 安装依赖

```bash
npm install
```

#### 4. 开发

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 检查类型
npm run typecheck

# 检查代码风格
npm run lint
```

#### 5. 提交更改

```bash
# 添加更改
git add .

# 提交（遵循 Conventional Commits 规范）
git commit -m "feat: add new feature"

# 推送到你的 fork
git push origin feature/your-feature-name
```

#### 6. 创建 Pull Request

1. 访问原仓库的 Pull Requests 页面
2. 点击 "New Pull Request"
3. 选择你的分支
4. 填写 PR 描述（使用模板）
5. 提交 PR

## 开发规范

### 代码风格

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 保持代码简洁、可读

### 提交信息规范

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)：**

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**示例：**

```
feat(skill): add Python script support

- Add Python runtime integration
- Support pip dependencies
- Add error handling for Python exceptions

Closes #123
```

### 测试要求

- 所有新功能必须有测试覆盖
- 保持测试通过率 100%
- 使用描述性的测试名称

```typescript
// 好的测试
describe('SkillExecutor', () => {
  it('should execute TypeScript skill successfully', async () => {
    // 测试代码
  });
  
  it('should handle skill execution errors', async () => {
    // 测试代码
  });
});
```

### 文档要求

- 更新 API 文档
- 添加使用示例
- 更新 README（如需要）

## 项目结构

```
sdkwork-agent/
├── src/
│   ├── core/
│   │   ├── domain/          # 领域层
│   │   │   ├── agent.ts
│   │   │   ├── skill.ts
│   │   │   ├── tool.ts
│   │   │   ├── memory.ts
│   │   │   └── events.ts
│   │   ├── application/     # 应用层
│   │   │   ├── agent-impl.ts
│   │   │   ├── skill-executor.ts
│   │   │   └── tool-executor.ts
│   │   └── infrastructure/  # 基础设施层
│   │       ├── microkernel.ts
│   │       └── memory-store.ts
│   ├── llm/                 # LLM Provider
│   │   ├── provider.ts
│   │   └── providers/
│   ├── utils/               # 工具函数
│   └── index.ts            # 入口
├── tests/                   # 测试
├── docs/                    # 文档
└── package.json
```

## 开发工作流

### 1. 设置开发环境

```bash
# 克隆仓库
git clone https://github.com/Sdkwork-Cloud/sdkwork-agent.git
cd agent

# 安装依赖
npm install

# 创建 .env 文件
cp .env.example .env
# 编辑 .env 添加你的 API 密钥
```

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- skill-executor

# 监视模式
npm test -- --watch
```

### 3. 构建项目

```bash
# 构建
npm run build

# 构建文档
npm run docs:build
```

### 4. 代码检查

```bash
# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 自动修复
npm run lint:fix
```

## 代码审查

所有 PR 都需要经过代码审查：

1. 至少一个维护者批准
2. 所有 CI 检查通过
3. 没有冲突

### 审查清单

- [ ] 代码符合项目风格
- [ ] 有适当的测试覆盖
- [ ] 文档已更新
- [ ] 没有 console.log 等调试代码
- [ ] 错误处理完善

## 发布流程

1. 更新版本号
   ```bash
   npm version patch|minor|major
   ```

2. 更新 CHANGELOG.md

3. 创建发布 PR

4. 合并后自动发布

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们作为贡献者和维护者承诺：

- 尊重所有参与者
- 接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性别化语言或图像
- 发表侮辱性评论
- 进行人身攻击或政治攻击
- 公开或私下骚扰
- 发布他人私人信息
- 其他不道德或不专业的行为

## 获取帮助

- [GitHub Discussions](https://github.com/Sdkwork-Cloud/sdkwork-agent/discussions)
- [Discord 社区](https://discord.gg/sdkwork)
- [邮件联系](mailto:team@sdkwork.io)

## 许可证

通过提交代码，你同意你的贡献将在 MIT 许可证下发布。
