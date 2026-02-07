# SDKWork Skills - 完美 Skill 体系

> 参考业界最佳实践 (OpenCode / Codex / Claude Code / AgentSkills.io)
> 
> 构建业界领先的 Skill 生态系统

## 🎯 设计哲学

### 1. 渐进式披露 (Progressive Disclosure)

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill 加载层级                            │
├─────────────────────────────────────────────────────────────┤
│ Level 1: Metadata (~100 tokens)                             │
│          └── 名称、描述、标签 (启动时加载)                     │
│                                                             │
│ Level 2: Instructions (< 5000 tokens)                       │
│          └── SKILL.md 主体内容 (激活时加载)                   │
│                                                             │
│ Level 3: Resources (按需加载)                                │
│          ├── scripts/     - 可执行脚本                        │
│          ├── references/  - 参考文档                          │
│          └── assets/      - 静态资源                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. 智能调度 (Intelligent Scheduling)

```typescript
// 自动 Skill 发现与匹配
const result = await scheduler.schedule({
  skillName: 'pdf-processing',  // 精确匹配
  input: { file: 'document.pdf' },
  priority: 8,                  // 高优先级
  dependencies: ['file-validation'], // 自动解析依赖
});

// 或让系统智能选择
const result = await scheduler.schedule({
  skillName: 'extract-text-from-document', // 语义匹配
  input: { file: 'document.pdf' },
});
```

### 3. 动态按需加载 (Dynamic On-Demand Loading)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│   Router    │────▶│   Loader    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                    ┌───────────────────────────┼───────────┐
                    │                           ▼           │
                    │  ┌─────────┐    ┌─────────────┐      │
                    │  │  Cache  │◀──▶│   Skill     │      │
                    │  │  Hit?   │    │   Registry  │      │
                    │  └────┬────┘    └─────────────┘      │
                    │       │                               │
                    │       ▼                               │
                    │  ┌─────────┐    ┌─────────────┐      │
                    │  │  Load   │───▶│   Execute   │      │
                    │  │  Full   │    │   Skill     │      │
                    │  └─────────┘    └─────────────┘      │
                    └───────────────────────────────────────┘
```

## 📁 目录结构

```
src/skills/
├── README.md                 # 本文档
├── SPECIFICATION.md          # Skill 规范 (AgentSkills.io 标准)
├── core/                     # Skill 核心系统
│   ├── types.ts             # 类型定义
│   ├── loader.ts            # 动态加载器
│   ├── scheduler.ts         # 调度器
│   ├── registry.ts          # 注册表
│   └── executor.ts          # 执行器
├── builtin/                  # 内置 Skills
│   ├── pdf-processor/
│   │   ├── SKILL.md         # Skill 定义
│   │   ├── scripts/         # 执行脚本
│   │   ├── references/      # 参考文档
│   │   └── assets/          # 静态资源
│   ├── code-analysis/
│   ├── web-search/
│   └── ...
└── registry/                 # Skill 注册中心
    ├── index.ts
    └── validators.ts
```

## 🚀 快速开始

### 1. 创建 Skill

```yaml
# my-skill/SKILL.md
---
name: my-skill
description: |
  描述这个 Skill 做什么，以及什么时候使用它。
  包含关键词帮助 Agent 识别相关任务。
version: "1.0.0"
license: MIT
metadata:
  author: your-name
  category: data-processing
  tags: ["pdf", "text", "extraction"]
allowed-tools: Read Write Bash(pdf2txt:*)
---

# 使用说明

## 步骤
1. 验证输入文件
2. 执行处理逻辑
3. 返回结果

## 示例
```typescript
// 调用示例
const result = await skill.execute({
  file: "input.pdf",
  options: { extractTables: true }
});
```

## 边界情况
- 文件不存在时抛出错误
- 大文件 (>100MB) 使用流式处理
```

### 2. 注册 Skill

```typescript
import { SkillRegistry } from './core/registry';

const registry = new SkillRegistry();

// 注册本地 Skill
await registry.registerFromPath('./my-skill');

// 或注册已加载的 Skill
registry.register({
  name: 'my-skill',
  description: 'My custom skill',
  version: '1.0.0',
  inputSchema: z.object({
    file: z.string(),
    options: z.object({
      extractTables: z.boolean().optional(),
    }).optional(),
  }),
  async execute(input, context) {
    // Skill 逻辑
    return { success: true, data: result };
  },
});
```

### 3. 调度执行

```typescript
import { SkillScheduler } from './core/scheduler';

const scheduler = new SkillScheduler(loader, logger);

// 简单执行
const result = await scheduler.schedule({
  skillName: 'my-skill',
  input: { file: 'data.pdf' },
});

// 高级调度
const result = await scheduler.schedule({
  skillName: 'my-skill',
  input: { file: 'data.pdf' },
  priority: 9,                    // 高优先级
  timeout: 60000,                 // 60秒超时
  dependencies: ['validate-file'], // 依赖
  tags: ['batch-job', 'urgent'],  // 标签
});
```

## 🏗️ 架构设计

### Skill 生命周期

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Load   │───▶│ Validate│───▶│ Compile │───▶│ Execute │───▶│ Cleanup │
│ Metadata│    │  Schema │    │  Script │    │  Skill  │    │ Resources│
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  ~100 tokens   Check deps    Lazy compile   Run in sandbox  Auto cleanup
```

### 调度流程

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ Find Skill  │────▶│  Not Found  │──▶ Error
│   Match     │     └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ Check Cache │────▶│    Hit      │──▶ Return Cached
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│Resolve Deps │──▶ (递归执行依赖)
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Concurrency│────▶│   Queue     │──▶ Wait
│    Check    │     └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Execute   │
│   Skill     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Return    │
│   Result    │
└─────────────┘
```

## 📊 性能优化

### 1. 多级缓存策略

```typescript
// L1: 元数据缓存 (内存)
const metadataCache = new Map<string, SkillManifest>();

// L2: 指令缓存 (内存 + 磁盘)
const instructionCache = new BoundedCache<string, string>({
  maxSize: 100,
  ttl: 1000 * 60 * 60, // 1 hour
});

// L3: 执行结果缓存
const executionCache = new BoundedCache<string, SkillResult>({
  maxSize: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});
```

### 2. 并发控制

```typescript
interface ConcurrencyConfig {
  maxConcurrentExecutions: 5;    // 最大并发执行数
  maxConcurrentLoads: 3;         // 最大并发加载数
  queueSize: 100;                // 队列长度
  priorityLevels: 10;            // 优先级层级
}
```

### 3. 资源配额

```typescript
interface ResourceQuota {
  maxMemoryMB: 512;              // 最大内存使用
  maxCPUPercent: 80;             // 最大 CPU 使用率
  maxExecutionTimeMs: 30000;     // 最大执行时间
  maxTokens: 100000;             // 最大 Token 使用量
}
```

## 🔒 安全设计

### 1. 沙箱执行

```typescript
// 隔离执行环境
const sandbox = {
  // 受限的 console
  console: {
    log: (...args) => logger.info(args.join(' ')),
    error: (...args) => logger.error(args.join(' ')),
  },
  
  // 受控的 API 访问
  context: {
    executionId,
    sessionId,
    skillName,
  },
  
  // 注入的服务
  llm: createLLMProxy(),
  memory: createMemoryProxy(),
  tools: createToolProxy(allowedTools),
};

// 在沙箱中执行
const fn = new Function('sandbox', `
  with (sandbox) {
    ${script.content}
    return typeof main === 'function' ? main(input, context) : undefined;
  }
`);
```

### 2. 代码验证

```typescript
// 危险代码检测
const DANGEROUS_PATTERNS = [
  /eval\s*\(/,
  /new\s+Function\s*\(/,
  /process\.exit/,
  /require\s*\(\s*['"]`child_process/,
  /__proto__/,
  /constructor\s*\.\s*prototype/,
];

// 语法验证
function validateScript(code: string): ValidationResult {
  // 1. 语法检查
  // 2. 危险模式检测
  // 3. 依赖分析
  // 4. 返回验证结果
}
```

### 3. 权限控制

```yaml
# SKILL.md
allowed-tools:
  - Read              # 只读文件
  - Write:./output/*  # 只允许写入 output 目录
  - Bash:git:*        # 只允许 git 命令
  - LLM:complete      # LLM 补全权限
```

## 📈 监控与可观测性

### 1. 执行追踪

```typescript
// 事件流
scheduler.on('execution:started', ({ skillName, executionId }) => {
  tracer.startSpan(skillName, { executionId });
});

scheduler.on('execution:completed', ({ skillName, executionId, duration }) => {
  metrics.record('skill.execution.duration', duration, { skillName });
  tracer.endSpan(executionId);
});

scheduler.on('execution:failed', ({ skillName, executionId, error }) => {
  metrics.increment('skill.execution.errors', { skillName, errorCode: error.code });
});
```

### 2. 性能指标

```typescript
interface SkillMetrics {
  // 执行统计
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cachedExecutions: number;
  
  // 时间统计
  averageExecutionTime: number;
  averageQueueTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  
  // 资源使用
  averageMemoryUsage: number;
  averageTokenUsage: number;
  
  // 缓存统计
  cacheHitRate: number;
  cacheSize: number;
}
```

## 🧪 测试策略

### 1. 单元测试

```typescript
describe('SkillScheduler', () => {
  it('should schedule skill execution', async () => {
    const result = await scheduler.schedule({
      skillName: 'test-skill',
      input: { test: true },
    });
    
    expect(result.success).toBe(true);
    expect(result.metadata).toBeDefined();
  });
  
  it('should handle skill not found', async () => {
    const result = await scheduler.schedule({
      skillName: 'non-existent',
      input: {},
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SKILL_NOT_FOUND');
  });
  
  it('should respect priority queue', async () => {
    const results: number[] = [];
    
    // 低优先级先提交
    scheduler.schedule({ skillName: 'skill', input: {}, priority: 1 })
      .then(() => results.push(1));
    
    // 高优先级后提交
    scheduler.schedule({ skillName: 'skill', input: {}, priority: 10 })
      .then(() => results.push(10));
    
    await waitForAll();
    
    // 高优先级应该先执行
    expect(results[0]).toBe(10);
  });
});
```

### 2. 集成测试

```typescript
describe('Skill E2E', () => {
  it('should execute complete skill workflow', async () => {
    // 1. 加载 Skill
    await registry.registerFromPath('./test-skill');
    
    // 2. 调度执行
    const result = await scheduler.schedule({
      skillName: 'test-skill',
      input: { file: 'test.pdf' },
    });
    
    // 3. 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toMatchSnapshot();
  });
});
```

## 📚 最佳实践

### 1. Skill 设计原则

- **单一职责**: 每个 Skill 只做一件事
- **清晰描述**: description 包含关键词和使用场景
- **输入验证**: 使用 Zod Schema 严格验证输入
- **错误处理**: 返回结构化的错误信息
- **资源清理**: 执行完毕后清理临时资源

### 2. 性能优化建议

- **延迟加载**: 使用 lazyLoad 配置减少启动时间
- **结果缓存**: 对于幂等操作启用执行缓存
- **流式处理**: 大文件使用 executeStream
- **依赖管理**: 明确声明依赖，避免循环依赖

### 3. 安全建议

- **最小权限**: 只申请必要的工具权限
- **输入消毒**: 所有外部输入都要验证和消毒
- **沙箱执行**: 不信任的代码在沙箱中运行
- **资源限制**: 设置合理的资源配额

## 🔗 相关链接

- [AgentSkills.io 规范](https://agentskills.io/specification)
- [OpenCode 文档](https://opencode.ai/docs)
- [Claude Code 最佳实践](https://docs.anthropic.com/claude-code)
- [核心类型定义](./core/types.ts)
- [调度器实现](./core/scheduler.ts)

## 📄 许可证

MIT License - 详见 [LICENSE](../../LICENSE)
