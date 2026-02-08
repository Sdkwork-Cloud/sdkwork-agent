# Server API Reference

SDKWork Agent Server 提供完整的 API 接口，用于管理智能体、任务和能力。

## 智能体 API (Agent API)

### 创建智能体

```typescript
import { agentService, AgentType } from '@sdkwork/agent-server'

const agent = await agentService.createAgent({
  name: 'My Assistant',
  description: 'A helpful AI assistant',
  type: AgentType.ASSISTANT,
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  },
  memory: {
    enabled: true,
    maxTokens: 4000,
    strategy: 'sliding',
  },
  tools: ['search', 'calculator'],
  skills: ['summarize', 'translate'],
})
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 智能体名称 |
| description | string | 否 | 智能体描述 |
| type | AgentType | 是 | 智能体类型 |
| llm | LLMConfig | 是 | LLM 配置 |
| memory | MemoryConfig | 否 | 内存配置 |
| tools | string[] | 否 | 工具列表 |
| skills | string[] | 否 | 技能列表 |

**LLMConfig**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| provider | string | 是 | - | 提供商: 'openai', 'anthropic', 'google', 'azure', 'local' |
| model | string | 是 | - | 模型名称 |
| temperature | number | 否 | 0.7 | 温度参数 (0-2) |
| maxTokens | number | 否 | - | 最大 token 数 |
| apiKey | string | 否 | - | API 密钥 |
| baseUrl | string | 否 | - | 基础 URL |

### 获取智能体

```typescript
const agent = await agentService.getAgent(agentId)
```

### 列出智能体

```typescript
const { agents, total } = await agentService.listAgents({
  page: 1,
  pageSize: 20,
  status: AgentStatus.RUNNING,
  type: AgentType.ASSISTANT,
  search: 'assistant',
  sortBy: 'createdAt',
  sortOrder: 'desc',
})
```

### 更新智能体

```typescript
const updated = await agentService.updateAgent(agentId, {
  name: 'New Name',
  description: 'New description',
  llm: { temperature: 0.5 },
})
```

### 删除智能体

```typescript
await agentService.deleteAgent(agentId)
```

### 智能体生命周期

```typescript
// 启动
await agentService.startAgent(agentId)

// 暂停
await agentService.pauseAgent(agentId)

// 恢复
await agentService.resumeAgent(agentId)

// 停止
await agentService.stopAgent(agentId)

// 获取状态
const { status, runtimeState } = await agentService.getAgentStatus(agentId)
```

### 订阅事件

```typescript
agentService.onEvent((event) => {
  switch (event.type) {
    case 'agent:created':
      console.log(`Agent created: ${event.agentId}`)
      break
    case 'agent:status-changed':
      console.log(`Status changed: ${event.previousStatus} -> ${event.currentStatus}`)
      break
    case 'agent:deleted':
      console.log(`Agent deleted: ${event.agentId}`)
      break
  }
})
```

## 任务 API (Task API)

### 创建任务

```typescript
import { taskService, TaskType, TaskPriority } from '@sdkwork/agent-server'

const task = await taskService.createTask({
  agentId: agent.id,
  name: 'Summarize Document',
  description: 'Summarize a long document',
  type: TaskType.CHAT,
  input: {
    document: 'This is a long document...',
    maxLength: 200,
  },
  priority: TaskPriority.HIGH,
  execution: {
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },
})
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | 所属智能体 ID |
| name | string | 是 | 任务名称 |
| description | string | 否 | 任务描述 |
| type | TaskType | 是 | 任务类型 |
| input | object | 是 | 任务输入 |
| priority | TaskPriority | 否 | 优先级 |
| execution | TaskExecutionConfig | 否 | 执行配置 |
| dependencies | string[] | 否 | 依赖任务 ID |

**TaskType**

- `CHAT` - 对话任务
- `COMPLETION` - 补全任务
- `WORKFLOW` - 工作流任务
- `SKILL` - 技能任务
- `CUSTOM` - 自定义任务

**TaskPriority**

- `CRITICAL` (0) - 关键
- `HIGH` (1) - 高
- `NORMAL` (2) - 正常
- `LOW` (3) - 低
- `BACKGROUND` (4) - 后台

### 批量创建任务

```typescript
const results = await taskService.createBatchTasks({
  agentId: agent.id,
  tasks: [
    { name: 'Task 1', type: TaskType.CHAT, input: {} },
    { name: 'Task 2', type: TaskType.CHAT, input: {} },
  ],
})
```

### 任务生命周期

```typescript
// 启动任务
await taskService.startTask(taskId)

// 暂停任务
await taskService.pauseTask(taskId)

// 恢复任务
await taskService.resumeTask(taskId)

// 取消任务
await taskService.cancelTask(taskId)

// 完成任务
await taskService.completeTask(taskId, {
  success: true,
  output: { result: '...' },
  metrics: {
    startTime: new Date(),
    endTime: new Date(),
    duration: 5000,
    tokensUsed: 150,
  },
})

// 标记失败
await taskService.failTask(taskId, {
  code: 'ERROR_CODE',
  message: 'Error message',
})
```

### 更新进度

```typescript
await taskService.updateProgress(taskId, 50, 'Processing...')
```

### 查询任务

```typescript
const { tasks, total } = await taskService.listTasks({
  page: 1,
  pageSize: 20,
  agentId: agent.id,
  status: TaskStatus.RUNNING,
  priority: TaskPriority.HIGH,
  sortBy: 'createdAt',
})
```

## 应用 API (Application API)

### 创建应用

```typescript
import { createApp, setupGracefulShutdown } from '@sdkwork/agent-server'

const app = createApp({
  name: 'my-agent-server',
  version: '1.0.0',
  env: 'development',
  port: 3000,
  modules: {
    agent: true,
    task: true,
    capability: false,
  },
})

// 设置优雅关闭
setupGracefulShutdown(app)
```

### 生命周期管理

```typescript
// 初始化
await app.initialize()

// 启动
await app.start()

// 停止
await app.stop()

// 销毁
await app.destroy()
```

### 健康检查

```typescript
const health = await app.healthCheck()
// {
//   status: 'healthy',
//   timestamp: '2024-01-01T00:00:00Z',
//   version: '1.0.0',
//   modules: [
//     { name: 'agent', status: 'healthy', details: {...} },
//     { name: 'task', status: 'healthy', details: {...} }
//   ]
// }
```

### 获取模块管理器

```typescript
const manager = app.getModuleManager()

// 获取模块统计
const stats = manager.getStats()
// { total: 2, running: 2, initialized: 0, error: 0 }

// 检查依赖
const { satisfied, missing } = manager.checkDependencies()
```

## 事件总线 API (Event Bus API)

### 发布事件

```typescript
import { eventBus } from '@sdkwork/agent-server'

eventBus.emit('custom:event', { data: 'value' }, 'source-module')
```

### 订阅事件

```typescript
// 普通订阅
const unsubscribe = eventBus.on('custom:event', (event) => {
  console.log(event.payload)
})

// 一次性订阅
const unsubscribeOnce = eventBus.once('custom:event', (event) => {
  console.log('Once:', event.payload)
})

// 取消订阅
unsubscribe()
```

## 事件存储 API (Event Store API)

### 存储事件

```typescript
import { eventStore } from '@sdkwork/agent-server'

await eventStore.append({
  type: 'agent:created',
  aggregateId: agent.id,
  aggregateType: 'agent',
  payload: { name: 'Assistant' },
  timestamp: new Date(),
  source: 'agent-module',
})
```

### 查询事件

```typescript
// 获取聚合的所有事件
const events = await eventStore.getEvents(agent.id)

// 获取特定类型的事件
const agentEvents = await eventStore.getEventsByType('agent')

// 获取所有事件
const allEvents = await eventStore.getAllEvents({
  fromVersion: 0,
  limit: 100,
})

// 获取最新事件
const lastEvent = await eventStore.getLastEvent(agent.id)

// 获取版本号
const version = await eventStore.getVersion(agent.id)
```

## 指标收集 API (Metrics API)

### 记录指标

```typescript
import { metricsCollector } from '@sdkwork/agent-server'

// 计数器
metricsCollector.counter('requests_total', 1, { method: 'GET' })

// 仪表盘
metricsCollector.gauge('active_connections', 5)

// 直方图
metricsCollector.histogram('request_duration', 100)

// 计时器
metricsCollector.timer('db_query_time', 50)

// 自动计时
const result = await metricsCollector.time('operation', async () => {
  return await performOperation()
})
```

### 查询指标

```typescript
// 获取所有指标
const metrics = metricsCollector.getMetrics()

// 获取特定名称的指标
const requestMetrics = metricsCollector.getMetricsByName('requests_total')

// 获取最新指标
const latest = metricsCollector.getLatestMetric('requests_total')

// 获取统计
const stats = metricsCollector.getStats()
// { totalMetrics: 100, counters: 40, gauges: 20, histograms: 20, timers: 20 }
```

## 工具函数 API (Utils API)

### 验证工具

```typescript
import { validate, validateSafe, isValidUUID, isValidEmail } from '@sdkwork/agent-server'

// 验证数据
const data = validate(MySchema, input)

// 安全验证
const result = validateSafe(MySchema, input)
if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error)
}

// 检查 UUID
const isUUID = isValidUUID('123e4567-e89b-12d3-a456-426614174000')

// 检查邮箱
const isEmail = isValidEmail('test@example.com')
```

### 辅助函数

```typescript
import { delay, retry, deepClone, deepMerge, formatDate } from '@sdkwork/agent-server'

// 延迟
await delay(1000)

// 重试
const data = await retry(fetchData, { attempts: 3, delay: 1000 })

// 深度克隆
const cloned = deepClone({ a: { b: 1 } })

// 深度合并
const merged = deepMerge({ a: 1 }, { b: 2 })

// 格式化日期
const formatted = formatDate(new Date()) // "2024-01-01 12:00:00"
```

### 日志工具

```typescript
import { logger, createLogger } from '@sdkwork/agent-server'

// 使用默认日志
logger.info('Application started')
logger.error('Error occurred', error)

// 创建子日志
const moduleLogger = logger.child('module-name')
moduleLogger.debug('Debug message')

// 创建自定义日志
const customLogger = createLogger({
  level: LogLevel.DEBUG,
  prefix: 'custom',
})
```
