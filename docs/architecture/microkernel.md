# 微内核架构

SDKWork Agent 采用微内核架构作为基础设施层的核心，提供服务注册发现、依赖注入和生命周期管理。

## 核心概念

### 微内核设计原则

1. **最小核心** - 内核只提供最基础的服务管理能力
2. **插件化扩展** - 所有功能通过服务插件实现
3. **依赖注入** - 服务间通过依赖注入解耦
4. **生命周期管理** - 统一的服务生命周期管理

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Microkernel Core                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Service Registry                     │   │
│  │  - 服务注册与发现                                     │   │
│  │  - 依赖拓扑排序                                       │   │
│  │  - 循环依赖检测                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dependency Injection                    │   │
│  │  - 依赖解析                                           │   │
│  │  - 延迟加载                                           │   │
│  │  - 单例/多例管理                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Lifecycle Management                      │   │
│  │  - initialize()                                       │   │
│  │  - destroy()                                          │   │
│  │  - pause() / resume()                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Event Bus                            │   │
│  │  - 服务间通信                                         │   │
│  │  - 事件发布订阅                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ LLM Service  │    │Skill Service │    │Tool Service  │
│  (LLM提供者)  │    │ (Skill注册)  │    │ (Tool注册)   │
└──────────────┘    └──────────────┘    └──────────────┘
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│Memory Service│    │Event Service │    │Logger Service│
│ (记忆存储)   │    │ (事件总线)   │    │ (日志服务)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Service 接口

### 基础接口

```typescript
interface Service {
  /** 服务唯一标识 */
  id: string;
  
  /** 服务版本 */
  version: string;
  
  /** 依赖的服务ID列表 */
  dependencies: string[];
  
  /** 初始化服务 */
  initialize(): Promise<void>;
  
  /** 销毁服务 */
  destroy(): Promise<void>;
  
  /** 暂停服务（可选） */
  pause?(): Promise<void>;
  
  /** 恢复服务（可选） */
  resume?(): Promise<void>;
}
```

### 服务示例

```typescript
// LLM 服务
const llmService: Service = {
  id: 'llm-service',
  version: '1.0.0',
  dependencies: [],
  
  async initialize() {
    console.log('Initializing LLM service...');
    // 初始化 LLM Provider
  },
  
  async destroy() {
    console.log('Destroying LLM service...');
    // 清理资源
  }
};

// Skill 执行器服务
const skillExecutorService: Service = {
  id: 'skill-executor-service',
  version: '1.0.0',
  dependencies: ['llm-service', 'tool-executor-service'],
  
  async initialize() {
    console.log('Initializing skill executor...');
    // 依赖 llm-service 和 tool-executor-service
  },
  
  async destroy() {
    console.log('Destroying skill executor...');
  }
};
```

## Microkernel 接口

### 核心方法

```typescript
interface Microkernel {
  /** 注册服务 */
  registerService(service: Service): void;
  
  /** 注销服务 */
  unregisterService(serviceId: string): void;
  
  /** 获取服务实例 */
  getService<T>(serviceId: string): T;
  
  /** 检查服务是否存在 */
  hasService(serviceId: string): boolean;
  
  /** 初始化所有服务 */
  initializeAll(): Promise<void>;
  
  /** 销毁所有服务 */
  destroyAll(): Promise<void>;
  
  /** 暂停所有服务 */
  pauseAll(): Promise<void>;
  
  /** 恢复所有服务 */
  resumeAll(): Promise<void>;
  
  /** 订阅内核事件 */
  subscribeEvent(event: string, handler: (data: unknown) => void): void;
  
  /** 取消订阅内核事件 */
  unsubscribeEvent(event: string, handler: (data: unknown) => void): void;
}
```

### 创建微内核

```typescript
import { createMicrokernel } from 'sdkwork-agent';

const kernel = createMicrokernel({
  // 服务超时时间（毫秒）
  serviceTimeout: 30000,
  
  // 是否启用熔断器
  enableCircuitBreaker: true,
  
  // 熔断器阈值
  circuitBreakerThreshold: 5,
  
  // 重试次数
  retryAttempts: 3,
  
  // 重试延迟（毫秒）
  retryDelay: 1000
});
```

## 服务注册与发现

### 注册服务

```typescript
// 注册 LLM 服务
kernel.registerService({
  id: 'llm-service',
  version: '1.0.0',
  dependencies: [],
  
  async initialize() {
    this.llmProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  },
  
  async destroy() {
    this.llmProvider = null;
  }
});

// 注册 Skill 执行器（依赖 LLM 服务）
kernel.registerService({
  id: 'skill-executor-service',
  version: '1.0.0',
  dependencies: ['llm-service'],
  
  async initialize() {
    // 获取依赖的服务
    const llmService = kernel.getService('llm-service');
    
    this.skillExecutor = new SkillExecutorImpl({
      llm: llmService.llmProvider
    });
  },
  
  async destroy() {
    this.skillExecutor = null;
  }
});
```

### 服务发现

```typescript
// 获取服务
const llmService = kernel.getService('llm-service');
const skillExecutor = kernel.getService('skill-executor-service');

// 检查服务是否存在
if (kernel.hasService('memory-service')) {
  const memoryService = kernel.getService('memory-service');
}
```

## 依赖管理

### 自动拓扑排序

微内核会自动处理服务依赖关系，按正确顺序初始化：

```typescript
// 注册顺序不影响初始化顺序
kernel.registerService({
  id: 'skill-service',
  dependencies: ['llm-service']  // 依赖 llm-service
});

kernel.registerService({
  id: 'llm-service',
  dependencies: []  // 无依赖
});

kernel.registerService({
  id: 'tool-service',
  dependencies: ['llm-service']  // 依赖 llm-service
});

// 初始化顺序：llm-service → tool-service → skill-service
await kernel.initializeAll();
```

### 循环依赖检测

```typescript
// 这会抛出错误，因为存在循环依赖
kernel.registerService({
  id: 'service-a',
  dependencies: ['service-b']
});

kernel.registerService({
  id: 'service-b',
  dependencies: ['service-a']  // 循环依赖！
});

// Error: Circular dependency detected: service-a -> service-b -> service-a
await kernel.initializeAll();
```

## 生命周期管理

### 初始化流程

```
1. 拓扑排序（根据依赖关系）
2. 按顺序调用每个服务的 initialize()
3. 如果失败，回滚已初始化的服务
4. 发布 service:initialized 事件
```

```typescript
try {
  await kernel.initializeAll();
  console.log('All services initialized');
} catch (error) {
  console.error('Failed to initialize services:', error);
  // 已初始化的服务会自动销毁
}
```

### 销毁流程

```
1. 按相反顺序调用每个服务的 destroy()
2. 处理销毁过程中的错误
3. 发布 service:destroyed 事件
```

```typescript
try {
  await kernel.destroyAll();
  console.log('All services destroyed');
} catch (error) {
  console.error('Error during service destruction:', error);
}
```

### 暂停/恢复

```typescript
// 暂停所有服务（用于维护）
await kernel.pauseAll();
console.log('All services paused');

// 恢复所有服务
await kernel.resumeAll();
console.log('All services resumed');
```

## 事件系统

### 内核事件

```typescript
// 订阅服务初始化事件
kernel.subscribeEvent('service:initialized', (event) => {
  console.log(`Service ${event.serviceId} initialized`);
});

// 订阅服务错误事件
kernel.subscribeEvent('service:error', (event) => {
  console.error(`Service ${event.serviceId} error:`, event.error);
});

// 订阅服务销毁事件
kernel.subscribeEvent('service:destroyed', (event) => {
  console.log(`Service ${event.serviceId} destroyed`);
});
```

### 服务间通信

```typescript
// 服务 A 发布事件
class ServiceA {
  async doSomething() {
    // 执行业务逻辑
    
    // 发布事件
    kernel.publishEvent('data:processed', {
      data: processedData,
      timestamp: Date.now()
    });
  }
}

// 服务 B 订阅事件
class ServiceB {
  initialize() {
    kernel.subscribeEvent('data:processed', (event) => {
      console.log('Received processed data:', event.data);
    });
  }
}
```

## 高级特性

### 服务装饰器

```typescript
// 日志装饰器
function withLogging(service: Service): Service {
  const originalInitialize = service.initialize.bind(service);
  const originalDestroy = service.destroy.bind(service);
  
  return {
    ...service,
    async initialize() {
      console.log(`Initializing ${service.id}...`);
      const startTime = Date.now();
      await originalInitialize();
      console.log(`${service.id} initialized in ${Date.now() - startTime}ms`);
    },
    async destroy() {
      console.log(`Destroying ${service.id}...`);
      await originalDestroy();
      console.log(`${service.id} destroyed`);
    }
  };
}

// 使用装饰器
kernel.registerService(withLogging({
  id: 'my-service',
  version: '1.0.0',
  dependencies: [],
  async initialize() { /* ... */ },
  async destroy() { /* ... */ }
}));
```

### 服务健康检查

```typescript
interface HealthCheckable {
  healthCheck(): Promise<HealthStatus>;
}

const healthCheckableService: Service & HealthCheckable = {
  id: 'database-service',
  version: '1.0.0',
  dependencies: [],
  
  async initialize() {
    this.db = createDatabaseConnection();
  },
  
  async destroy() {
    await this.db.close();
  },
  
  async healthCheck() {
    try {
      await this.db.ping();
      return { status: 'healthy', timestamp: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};

// 执行健康检查
const status = await healthCheckableService.healthCheck();
```

### 优雅降级

```typescript
kernel.registerService({
  id: 'optional-service',
  version: '1.0.0',
  dependencies: [],
  
  async initialize() {
    try {
      this.client = await createExpensiveClient();
    } catch (error) {
      console.warn('Optional service failed to initialize, continuing without it');
      this.client = null;  // 优雅降级
    }
  },
  
  async destroy() {
    if (this.client) {
      await this.client.close();
    }
  }
});
```

## 完整示例

```typescript
import { createMicrokernel } from 'sdkwork-agent';

async function main() {
  // 创建微内核
  const kernel = createMicrokernel({
    serviceTimeout: 30000,
    enableCircuitBreaker: true
  });
  
  // 订阅内核事件
  kernel.subscribeEvent('service:initialized', (event) => {
    console.log(`✓ ${event.serviceId} initialized`);
  });
  
  kernel.subscribeEvent('service:error', (event) => {
    console.error(`✗ ${event.serviceId} error:`, event.error);
  });
  
  // 注册 LLM 服务
  kernel.registerService({
    id: 'llm-service',
    version: '1.0.0',
    dependencies: [],
    
    async initialize() {
      this.provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY
      });
    },
    
    async destroy() {
      this.provider = null;
    }
  });
  
  // 注册记忆服务
  kernel.registerService({
    id: 'memory-service',
    version: '1.0.0',
    dependencies: [],
    
    async initialize() {
      this.store = createMemoryStore();
    },
    
    async destroy() {
      await this.store.clear();
    }
  });
  
  // 注册 Skill 执行器（依赖 LLM 和记忆服务）
  kernel.registerService({
    id: 'skill-executor',
    version: '1.0.0',
    dependencies: ['llm-service', 'memory-service'],
    
    async initialize() {
      const llmService = kernel.getService('llm-service');
      const memoryService = kernel.getService('memory-service');
      
      this.executor = new SkillExecutorImpl({
        llm: llmService.provider,
        memory: memoryService.store
      });
    },
    
    async destroy() {
      this.executor = null;
    }
  });
  
  // 初始化所有服务
  console.log('Initializing services...');
  await kernel.initializeAll();
  console.log('All services initialized\n');
  
  // 使用服务
  const skillExecutor = kernel.getService('skill-executor');
  const result = await skillExecutor.execute(skill, input);
  
  // 销毁所有服务
  console.log('\nDestroying services...');
  await kernel.destroyAll();
  console.log('All services destroyed');
}

main().catch(console.error);
```

## 最佳实践

1. **单一职责** - 每个服务只负责一个功能
2. **明确依赖** - 显式声明所有依赖
3. **错误处理** - 在 initialize/destroy 中处理错误
4. **资源清理** - 在 destroy 中释放所有资源
5. **超时控制** - 设置合理的初始化超时时间
6. **优雅降级** - 非关键服务失败时不影响整体
7. **健康检查** - 为关键服务实现健康检查
8. **事件驱动** - 使用事件进行服务间通信
