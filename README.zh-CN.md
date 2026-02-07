# SDKWork Browser Agent

[![npm version](https://img.shields.io/npm/v/sdkwork-browser-agent.svg)](https://www.npmjs.com/package/sdkwork-browser-agent)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个浏览器兼容的 Agent 架构，支持 Skills、MCP、Tools 和灵活的 LLM Provider 体系。

[English](./README.md) | [中文](./README.zh-CN.md)

## ✨ 特性

- 🤖 **智能决策引擎** - 基于嵌入相似度匹配和意图分类自动选择最佳 Skill
- 🧠 **高级决策引擎** - 多阶段决策，带置信度评分和自适应学习
- 🔍 **参数提取器** - 多策略参数提取，支持类型强制转换和验证
- 📊 **评估体系** - 多维度结果评估，支持正确性验证和反馈
- 🔄 **动态 Skill 加载** - 懒加载机制，支持文件、URL、模块多种来源
- 💰 **Token 优化** - 智能压缩和截断，最小化 Token 消耗
- 🔌 **多 LLM 支持** - OpenAI、Anthropic、Google Gemini 等主流模型
- 📦 **MCP 协议** - 完整的 Model Context Protocol 支持
- 🔧 **插件系统** - 可扩展的插件架构
- 🌐 **浏览器兼容** - 同时支持浏览器和 Node.js 环境
- 📘 **TypeScript** - 完整的类型支持

## 🚀 快速开始

### 安装

```bash
npm install sdkwork-browser-agent
# 或
yarn add sdkwork-browser-agent
# 或
pnpm add sdkwork-browser-agent
```

### 基础使用

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

// 创建智能 Agent
const agent = new SmartAgent({
  name: 'my-agent',
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  skills: builtInSkills,
  autoDecide: true,
});

// 初始化
await agent.initialize();

// 自动处理输入
const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
console.log(result.evaluation); // 评估结果
```

### 使用不同的 LLM Provider

```typescript
import { AnthropicProvider, GeminiProvider } from 'sdkwork-browser-agent';

// Anthropic Claude
const claudeAgent = new SmartAgent({
  llmProvider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
});

// Google Gemini
const geminiAgent = new SmartAgent({
  llmProvider: new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
  }),
});
```

## 📚 文档

完整文档请访问：[https://sdkwork-browser-agent.vercel.app](https://sdkwork-browser-agent.vercel.app)

- [快速开始](https://sdkwork-browser-agent.vercel.app/guide/getting-started)
- [核心概念](https://sdkwork-browser-agent.vercel.app/guide/concepts)
- [API 参考](https://sdkwork-browser-agent.vercel.app/api/)
- [示例](https://sdkwork-browser-agent.vercel.app/examples/)

## 🏗️ 架构

```
sdkwork-browser-agent/
├── src/
│   ├── core/                    # Agent 核心
│   │   ├── agent.ts             # 基础 Agent
│   │   ├── smart-agent.ts       # 智能 Agent（自动决策）
│   │   ├── decision-engine.ts   # 决策引擎
│   │   ├── advanced-decision-engine.ts  # 高级决策引擎
│   │   ├── parameter-extractor.ts       # 参数提取
│   │   ├── evaluation-engine.ts         # 评估体系
│   │   ├── skill-loader.ts      # 动态加载
│   │   ├── token-optimizer.ts   # Token 优化
│   │   └── execution-engine.ts  # 执行引擎
│   ├── llm/                     # LLM Provider
│   ├── skills/                  # Skill 系统
│   ├── tools/                   # Tool 系统
│   ├── mcp/                     # MCP 协议
│   └── plugins/                 # 插件系统
```

## 🎯 核心功能

### 1. 智能决策引擎

自动根据输入选择最合适的 Skill：

```typescript
const agent = new SmartAgent({
  decisionEngine: {
    enableEmbeddings: true,  // 启用嵌入相似度
    enableCaching: true,     // 启用决策缓存
    threshold: 0.6,          // 相似度阈值
    maxSkills: 3,            // 最大选择 Skill 数
  },
});
```

### 2. 高级决策引擎

多阶段决策，支持意图分类：

```typescript
import { AdvancedDecisionEngine } from 'sdkwork-browser-agent';

const engine = new AdvancedDecisionEngine({
  enableIntentClassification: true,  // 启用意图分类
  enableContextualMemory: true,      // 启用上下文记忆
  learningRate: 0.1,                 // 学习率
});

const decision = await engine.decide({
  input: 'Calculate sum of 5 and 3',
  availableSkills: ['math', 'calculator'],
  availableTools: [],
});
// 结果: { intent: 'calculation', confidence: 0.95, skills: ['math'] }
```

### 3. 参数提取器

多策略参数提取，支持验证：

```typescript
import { ParameterExtractor } from 'sdkwork-browser-agent';

const extractor = new ParameterExtractor({
  useLLM: true,              // 使用 LLM 提取
  usePatternMatching: true,  // 使用模式匹配
  useContextInference: true, // 使用上下文推断
});

const result = await extractor.extract(
  'Calculate sum: a=5, b=3',
  mathSkill,
  context,
  llmProvider
);
// { params: { a: 5, b: 3 }, confidence: 0.95, missing: [], invalid: [] }
```

### 4. 评估体系

多维度结果评估，支持反馈：

```typescript
const agent = new SmartAgent({
  evaluation: {
    enabled: true,           // 是否启用
    level: 'standard',       // 评估级别: 'none' | 'basic' | 'standard' | 'strict'
    strategies: ['semantic'], // 评估策略
    threshold: 0.7,          // 通过阈值
    autoRetry: true,         // 失败自动重试
    maxRetries: 3,           // 最大重试次数
  },
});

const result = await agent.process('Calculate 5 + 3');
console.log(result.evaluation);
// {
//   passed: true,
//   score: { overall: 0.92, correctness: 0.95, completeness: 0.90, relevance: 0.91 },
//   feedback: 'Good result. Output meets expectations with minor room for improvement.',
//   suggestions: []
// }
```

### 5. 动态 Skill 加载

支持从多种来源懒加载 Skill：

```typescript
// 注册 Skill 源
agent.registerSkillSource('my-skill', 'https://example.com/skills/my-skill.json', 'url');

// 动态加载
const skill = await agent.skillLoader.load('my-skill');
```

### 6. Token 优化

自动优化 Token 消耗：

```typescript
const optimizer = new TokenOptimizer({
  enableCompression: true,
  maxSkillDescriptionLength: 200,
  maxContextTokens: 4000,
});

const optimized = optimizer.optimizeSkills(skills);
const stats = optimizer.getOptimizationStats(skills, optimized);
console.log(`Saved ${stats.savingsPercent}% tokens`);
```

### 7. 自定义 Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

const mySkill: Skill = {
  name: 'translate',
  description: 'Translate text to another language',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to translate' },
      targetLang: { type: 'string', description: 'Target language' },
    },
    required: ['text', 'targetLang'],
  },
  handler: async params => {
    // 实现翻译逻辑
    return { success: true, data: translatedText };
  },
  metadata: {
    category: 'language',
    tags: ['translate', 'nlp'],
  },
};

agent.registerSkill(mySkill);
```

### 8. 执行引擎（带重试）

健壮的执行，支持重试和错误处理：

```typescript
import { ExecutionEngine } from 'sdkwork-browser-agent';

const engine = new ExecutionEngine({
  maxRetries: 3,           // 最大重试次数
  retryDelay: 1000,        // 重试延迟
  timeout: 30000,          // 超时时间
  circuitBreaker: {
    failureThreshold: 5,   // 熔断阈值
    resetTimeout: 60000,   // 熔断重置时间
  },
});

const result = await engine.execute(steps, context);
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck

# 代码格式化
npm run format

# 完整验证
npm run verify
```

## 🤝 贡献

欢迎提交 Issue 和 PR！请阅读 [贡献指南](./CONTRIBUTING.md)。

## 📄 许可证

[MIT](./LICENSE)

## 🙏 致谢

- [Agent Skills Specification](https://agentskills.io/specification)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenCode](https://opencode.ai) - 架构灵感来源

---

<p align="center">
  Made with ❤️ by SDKWork Team
</p>
