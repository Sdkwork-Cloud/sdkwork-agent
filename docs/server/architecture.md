# 服务端架构

SDKWork Agent Server 采用先进的**模块化封装架构**设计，提供高性能、可扩展的智能体服务端能力。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│                    ┌──────────────────┐                         │
│                    │   Application    │  应用启动器              │
│                    │   (app.ts)       │  生命周期管理            │
│                    └────────┬─────────┘                         │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                      Module System Layer                         │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                     Module Manager                         │  │
│  │              (依赖解析、生命周期管理)                       │  │
│  └───────────────────────────┼───────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────┐  ┌─────────┴──────────┐  ┌─────────────────┐  │
│  │ AgentModule  │  │    TaskModule      │  │ CapabilityModule│  │
│  │ 智能体模块    │  │    任务模块         │  │   能力模块       │  │
│  └──────────────┘  └────────────────────┘  └─────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                      Core Module                           │  │
│  │              (模块接口、基类、管理器)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        Shared Layer                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Error Handling                         │  │
│  │              (AppError、ErrorCode、Validation)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 核心特性

### 1. 模块化生命周期管理

每个模块都有完整的生命周期：

```typescript
class MyModule extends BaseModule {
  protected async onInitialize() {
    // 初始化逻辑
  }
  
  protected async onStart() {
    // 启动逻辑
  }
  
  protected async onStop() {
    // 停止逻辑
  }
  
  protected async onDestroy() {
    // 销毁逻辑
  }
}
```

### 2. 依赖注入与解耦

模块间通过接口通信，完全解耦：

```typescript
class TaskModule extends BaseModule {
  dependencies = ['agent'] // 声明依赖
  
  async onInitialize() {
    // 从上下文获取其他模块服务
    const agentService = this.getService<IAgentService>('agentService')
  }
}
```

### 3. 事件驱动架构

模块间通过事件总线通信：

```typescript
// 发布事件
context.emit('agent:created', { agentId: '123' })

// 订阅事件
context.on('agent:created', (event) => {
  console.log(`Agent created: ${event.payload.agentId}`)
})
```

### 4. 领域事件存储

支持事件溯源模式：

```typescript
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
```

## 模块结构

每个业务模块遵循**六边形架构**原则：

```
modules/[module-name]/
├── types.ts              # 领域模型 + DTO + Zod Schema
├── repository.interface.ts # 仓库接口 + 实现
├── service.ts            # 业务服务
└── index.ts              # 模块入口
```

### 模块内部架构

```
┌─────────────────────────────────────────────┐
│              Module (index.ts)              │
│  ┌───────────────────────────────────────┐  │
│  │         生命周期管理                   │  │
│  │  - initialize()                       │  │
│  │  - start()                            │  │
│  │  - stop()                             │  │
│  │  - destroy()                          │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │         服务导出                       │  │
│  │  - getService()                       │  │
│  │  - registerService()                  │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│           Service (service.ts)              │
│  ┌───────────────────────────────────────┐  │
│  │         业务逻辑                       │  │
│  │  - 领域操作                            │  │
│  │  - 状态管理                            │  │
│  │  - 事件发布                            │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│            Types (types.ts)                 │
│  ┌───────────────────────────────────────┐  │
│  │         领域模型                       │  │
│  │  - Entity (实体)                      │  │
│  │  - Value Object (值对象)              │  │
│  │  - DTO (数据传输对象)                 │  │
│  │  - Zod Schema (验证)                  │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│     Repository (repository.interface.ts)    │
│  ┌───────────────────────────────────────┐  │
│  │         数据访问                       │  │
│  │  - Interface (接口)                   │  │
│  │  - Implementation (实现)              │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 数据流

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  API    │────▶│ Service │────▶│ Domain  │────▶│Repository│
│ Request │     │  Layer  │     │  Model  │     │  Layer   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                              │
                                              ▼
                                        ┌─────────┐
                                        │  Event  │
                                        │  Store  │
                                        └─────────┘
```

## 设计原则

1. **单一职责**: 每个模块只负责一个业务领域
2. **接口隔离**: 模块间通过接口通信，不依赖具体实现
3. **依赖倒置**: 高层模块依赖抽象，不依赖低层实现
4. **开闭原则**: 对扩展开放，对修改关闭
5. **高内聚低耦合**: 模块内部高内聚，模块间低耦合

## 扩展点

### 添加新模块

```typescript
export class MyModule extends BaseModule {
  constructor() {
    super({
      name: 'my-module',
      version: '1.0.0',
      dependencies: ['agent']
    })
  }
  
  protected async onInitialize() {
    this.service = new MyService()
    this.registerService('myService', this.service)
  }
  
  protected getExports() {
    return ['MyService']
  }
  
  protected getApis() {
    return [
      { name: 'createEntity', type: 'command' }
    ]
  }
}
```

### 自定义仓储实现

```typescript
export class MyRepository extends BaseRepository<MyEntity> {
  constructor() {
    super(new MyPersistenceAdapter())
  }
  
  async findByName(name: string): Promise<MyEntity | null> {
    // 自定义查询逻辑
  }
}
```
