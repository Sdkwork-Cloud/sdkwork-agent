# Server 快速开始

本指南将帮助你在几分钟内启动并运行 SDKWork Agent Server。

## 环境要求

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **包管理器**: npm, yarn, 或 pnpm

## 安装

### 1. 克隆仓库

```bash
git clone https://github.com/Sdkwork-Cloud/sdkwork-agent.git
cd agent-server
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量（可选）

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## 快速启动

### 基础示例

创建一个 `index.ts` 文件：

```typescript
import {
  createApp,
  setupGracefulShutdown,
  agentService,
  taskService,
  AgentType,
  TaskType,
  TaskPriority,
} from '@sdkwork/agent-server'

async function main() {
  // 1. 创建应用
  const app = createApp({
    name: 'my-agent-server',
    modules: {
      agent: true,
      task: true,
    },
  })

  // 2. 设置优雅关闭
  setupGracefulShutdown(app)

  // 3. 初始化并启动
  await app.initialize()
  await app.start()

  console.log('🚀 Server started successfully!')

  // 4. 创建智能体
  const agent = await agentService.createAgent({
    name: 'My Assistant',
    type: AgentType.ASSISTANT,
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
    },
  })

  console.log(`✅ Created agent: ${agent.id}`)

  // 5. 启动智能体
  await agentService.startAgent(agent.id)
  console.log('✅ Agent started')

  // 6. 创建任务
  const task = await taskService.createTask({
    agentId: agent.id,
    name: 'Hello Task',
    type: TaskType.CHAT,
    input: { message: 'Hello, World!' },
    priority: TaskPriority.NORMAL,
  })

  console.log(`✅ Created task: ${task.id}`)

  // 7. 健康检查
  const health = await app.healthCheck()
  console.log(`🏥 Health: ${health.status}`)
}

main().catch(console.error)
```

### 运行

```bash
npx ts-node index.ts
```

## 核心概念

### 智能体 (Agent)

智能体是系统的核心实体，代表一个 AI 助手：

```typescript
// 创建智能体
const agent = await agentService.createAgent({
  name: 'Code Assistant',
  description: 'Helps with coding tasks',
  type: AgentType.ASSISTANT,
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
  },
  tools: ['search', 'code-executor'],
  skills: ['javascript', 'typescript'],
})

// 生命周期管理
await agentService.startAgent(agent.id)
await agentService.pauseAgent(agent.id)
await agentService.resumeAgent(agent.id)
await agentService.stopAgent(agent.id)
```

### 任务 (Task)

任务是智能体执行的工作单元：

```typescript
// 创建任务
const task = await taskService.createTask({
  agentId: agent.id,
  name: 'Review Code',
  type: TaskType.CHAT,
  input: {
    code: 'function add(a, b) { return a + b }',
  },
  priority: TaskPriority.HIGH,
})

// 执行任务
await taskService.startTask(task.id)

// 更新进度
await taskService.updateProgress(task.id, 50, 'Analyzing code...')

// 完成任务
await taskService.completeTask(task.id, {
  success: true,
  output: { review: 'Code looks good!' },
  metrics: {
    startTime: new Date(),
    endTime: new Date(),
    duration: 5000,
  },
})
```

### 事件系统

使用事件总线进行模块间通信：

```typescript
import { eventBus } from '@sdkwork/agent-server'

// 订阅事件
const unsubscribe = eventBus.on('task:completed', (event) => {
  console.log(`Task completed: ${event.payload.taskId}`)
})

// 发布事件
eventBus.emit('custom:event', { data: 'value' })

// 取消订阅
unsubscribe()
```

## 配置选项

### 应用配置

```typescript
const app = createApp({
  // 基本信息
  name: 'my-agent-server',
  version: '1.0.0',
  env: 'development', // 'development' | 'staging' | 'production'
  
  // 服务器配置
  port: 3000,
  host: '0.0.0.0',
  
  // 模块配置
  modules: {
    agent: true,
    task: true,
    capability: false,
  },
  
  // 日志配置
  logging: {
    level: 'info',    // 'debug' | 'info' | 'warn' | 'error'
    format: 'pretty', // 'json' | 'pretty'
  },
})
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `3000` |
| `HOST` | 服务主机 | `0.0.0.0` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `LOG_FORMAT` | 日志格式 | `pretty` |

## 高级用法

### 自定义模块

```typescript
import { BaseModule } from '@sdkwork/agent-server'

class MyModule extends BaseModule {
  constructor() {
    super({
      name: 'my-module',
      version: '1.0.0',
      dependencies: ['agent'],
    })
  }

  protected async onInitialize() {
    // 初始化逻辑
    this.logger.info('MyModule initialized')
  }

  protected async onStart() {
    // 启动逻辑
  }

  protected async onStop() {
    // 停止逻辑
  }

  protected getExports() {
    return ['MyService']
  }
}

// 注册模块
const app = createApp()
app.getModuleManager().register(new MyModule())
```

### 事件溯源

```typescript
import { eventStore } from '@sdkwork/agent-server'

// 存储事件
await eventStore.append({
  type: 'agent:created',
  aggregateId: agent.id,
  aggregateType: 'agent',
  payload: { name: 'Assistant' },
  timestamp: new Date(),
})

// 回放事件
const events = await eventStore.getEvents(agent.id)
for (const event of events) {
  console.log(`${event.type}: ${JSON.stringify(event.payload)}`)
}
```

### 性能监控

```typescript
import { metricsCollector } from '@sdkwork/agent-server'

// 记录指标
metricsCollector.counter('requests_total', 1)
metricsCollector.timer('response_time', 100)

// 自动计时
const result = await metricsCollector.time('operation', async () => {
  return await performOperation()
})

// 查看统计
const stats = metricsCollector.getStats()
console.log(`Total metrics: ${stats.totalMetrics}`)
```

## 最佳实践

### 1. 错误处理

```typescript
import { AppError, ErrorCode } from '@sdkwork/agent-server'

try {
  await agentService.createAgent(config)
} catch (error) {
  if (error instanceof AppError) {
    console.error(`Error ${error.code}: ${error.message}`)
  }
}
```

### 2. 验证输入

```typescript
import { validate, AgentConfigSchema } from '@sdkwork/agent-server'

try {
  const config = validate(AgentConfigSchema, inputData)
} catch (error) {
  console.error('Validation failed:', error)
}
```

### 3. 日志记录

```typescript
import { logger } from '@sdkwork/agent-server'

const moduleLogger = logger.child('my-module')

moduleLogger.info('Operation started')
moduleLogger.debug('Debug info', { detail: 'value' })
moduleLogger.error('Error occurred', error)
```

### 4. 重试机制

```typescript
import { retry } from '@sdkwork/agent-server'

const result = await retry(
  async () => await fetchData(),
  {
    attempts: 3,
    delay: 1000,
    backoff: 2,
    onRetry: (error, attempt) => {
      console.log(`Retry ${attempt}: ${error.message}`)
    },
  }
)
```

## 故障排除

### 常见问题

#### 1. 模块初始化失败

```
Error: Dependency 'agent' not found
```

**解决方案**: 确保依赖的模块已注册

```typescript
app.getModuleManager().register(new AgentModule())
app.getModuleManager().register(new TaskModule()) // 依赖 agent
```

#### 2. 循环依赖

```
Error: Circular dependency detected: agent -> task -> agent
```

**解决方案**: 重新设计模块结构，消除循环依赖

#### 3. 服务未找到

```
Error: Service not found: agentService
```

**解决方案**: 确保模块已正确初始化

```typescript
await app.initialize() // 在获取服务前初始化
```

## 下一步

- 阅读 [架构文档](./architecture.md) 深入了解系统设计
- 查看 [API Reference](./api-reference.md) 了解所有可用 API
- 学习 [模块开发指南](./module-development.md) 创建自定义模块
