# 安装指南

本指南介绍如何在不同环境中安装和配置 SDKWork Agent。

## 系统要求

- **Node.js**: >= 18.0.0
- **操作系统**: Windows、macOS、Linux
- **内存**: 建议 4GB 以上
- **磁盘空间**: 至少 100MB 可用空间

## 使用 npm 安装

```bash
npm install sdkwork-agent
```

## 使用 yarn 安装

```bash
yarn add sdkwork-agent
```

## 使用 pnpm 安装

```bash
pnpm add sdkwork-agent
```

## 环境配置

### 1. API 密钥配置

SDKWork Agent 需要 LLM Provider 的 API 密钥。推荐使用环境变量：

```bash
# .env 文件
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
```

### 2. TypeScript 配置

确保你的 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 验证安装

创建一个测试文件 `test.ts`：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

const agent = createAgent({
  name: 'TestAgent',
  llm: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!
  })
});

console.log('SDKWork Agent 安装成功！');
console.log('Agent ID:', agent.id);
```

运行测试：

```bash
npx tsx test.ts
```

## 浏览器环境

SDKWork Agent 支持浏览器环境：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

// 浏览器中使用时，API 密钥应通过安全的方式获取
const agent = createAgent({
  name: 'BrowserAgent',
  llm: new OpenAIProvider({
    apiKey: await getApiKeyFromServer() // 从服务器获取
  })
});
```

## 常见问题

### Q: 安装失败怎么办？

A: 请检查：
1. Node.js 版本是否 >= 18.0.0
2. 网络连接是否正常
3. 是否使用了正确的包管理器

### Q: TypeScript 类型错误？

A: 确保 `tsconfig.json` 中的 `moduleResolution` 设置为 `"bundler"` 或 `"node"`。

### Q: 浏览器中无法使用？

A: 检查是否正确配置了浏览器构建，某些 Node.js 特定的功能在浏览器中不可用。

## 下一步

- [快速开始](./quick-start.md) - 5 分钟上手
- [核心概念](./concepts.md) - 了解架构设计
