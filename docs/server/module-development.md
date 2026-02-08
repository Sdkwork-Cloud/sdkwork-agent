# 模块开发指南

本指南将帮助你创建自定义模块，扩展 SDKWork Agent Server 的功能。

## 模块概述

模块是系统的基本组成单元，每个模块负责一个独立的业务领域。模块遵循**六边形架构**，包含以下层次：

```
my-module/
├── types.ts              # 领域模型 + DTO + Zod Schema
├── repository.interface.ts # 仓库接口 + 实现
├── service.ts            # 业务服务
└── index.ts              # 模块入口（生命周期管理）
```

## 创建模块步骤

### 1. 定义领域模型

创建 `types.ts`：

```typescript
import { z } from 'zod'

// ============================================
// 值对象
// ============================================

export class MyEntityId {
  constructor(public readonly value: string) {
    if (!value) throw new Error('ID cannot be empty')
  }

  equals(other: MyEntityId): boolean {
    return this.value === other.value
  }
}

// ============================================
// 枚举
// ============================================

export enum MyEntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// ============================================
// Zod Schema
// ============================================

export const MyEntityConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.nativeEnum(MyEntityStatus).default(MyEntityStatus.ACTIVE),
  metadata: z.record(z.unknown()).optional(),
})

// ============================================
// 类型推断
// ============================================

export type MyEntityConfig = z.infer<typeof MyEntityConfigSchema>

// ============================================
// 领域实体
// ============================================

export interface MyEntity {
  readonly id: MyEntityId
  readonly config: MyEntityConfig
  readonly status: MyEntityStatus
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly version: number
}

// ============================================
// DTO
// ============================================

export interface CreateMyEntityDto {
  name: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface UpdateMyEntityDto {
  name?: string
  description?: string
  status?: MyEntityStatus
}

export interface MyEntityResponseDto {
  id: string
  name: string
  status: MyEntityStatus
  createdAt: string
  updatedAt: string
}

// ============================================
// 查询参数
// ============================================

export interface MyEntityQueryParams {
  page?: number
  pageSize?: number
  status?: MyEntityStatus
  search?: string
}

// ============================================
// 领域事件
// ============================================

export interface MyEntityCreatedEvent {
  type: 'myentity:created'
  entityId: string
  config: MyEntityConfig
  timestamp: Date
}

export interface MyEntityStatusChangedEvent {
  type: 'myentity:status-changed'
  entityId: string
  previousStatus: MyEntityStatus
  currentStatus: MyEntityStatus
  timestamp: Date
}

export type MyEntityEvent = MyEntityCreatedEvent | MyEntityStatusChangedEvent
```

### 2. 定义仓库接口

创建 `repository.interface.ts`：

```typescript
import type { MyEntity, MyEntityId, MyEntityQueryParams, MyEntityStatus } from './types'

export interface IMyEntityRepository {
  findById(id: MyEntityId): Promise<MyEntity | null>
  findByName(name: string): Promise<MyEntity | null>
  findAll(params: MyEntityQueryParams): Promise<{ entities: MyEntity[]; total: number }>
  findByStatus(status: MyEntityStatus): Promise<MyEntity[]>
  create(entity: MyEntity): Promise<MyEntity>
  update(id: MyEntityId, updates: Partial<MyEntity>): Promise<MyEntity | null>
  delete(id: MyEntityId): Promise<boolean>
  exists(id: MyEntityId): Promise<boolean>
  existsByName(name: string): Promise<boolean>
  count(): Promise<number>
}

// 内存实现
export class InMemoryMyEntityRepository implements IMyEntityRepository {
  private entities = new Map<string, MyEntity>()

  async findById(id: MyEntityId): Promise<MyEntity | null> {
    return this.entities.get(id.value) || null
  }

  async findByName(name: string): Promise<MyEntity | null> {
    for (const entity of this.entities.values()) {
      if (entity.config.name === name) {
        return entity
      }
    }
    return null
  }

  async findAll(params: MyEntityQueryParams): Promise<{ entities: MyEntity[]; total: number }> {
    let result = Array.from(this.entities.values())

    if (params.status) {
      result = result.filter((e) => e.status === params.status)
    }

    if (params.search) {
      const search = params.search.toLowerCase()
      result = result.filter(
        (e) =>
          e.config.name.toLowerCase().includes(search) ||
          e.config.description?.toLowerCase().includes(search)
      )
    }

    const total = result.length
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const start = (page - 1) * pageSize

    return {
      entities: result.slice(start, start + pageSize),
      total,
    }
  }

  async findByStatus(status: MyEntityStatus): Promise<MyEntity[]> {
    return Array.from(this.entities.values()).filter((e) => e.status === status)
  }

  async create(entity: MyEntity): Promise<MyEntity> {
    this.entities.set(entity.id.value, entity)
    return entity
  }

  async update(id: MyEntityId, updates: Partial<MyEntity>): Promise<MyEntity | null> {
    const existing = this.entities.get(id.value)
    if (!existing) return null

    const updated: MyEntity = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    }

    this.entities.set(id.value, updated)
    return updated
  }

  async delete(id: MyEntityId): Promise<boolean> {
    return this.entities.delete(id.value)
  }

  async exists(id: MyEntityId): Promise<boolean> {
    return this.entities.has(id.value)
  }

  async existsByName(name: string): Promise<boolean> {
    for (const entity of this.entities.values()) {
      if (entity.config.name === name) {
        return true
      }
    }
    return false
  }

  async count(): Promise<number> {
    return this.entities.size
  }

  clear(): void {
    this.entities.clear()
  }
}

export const myEntityRepository = new InMemoryMyEntityRepository()
```

### 3. 实现业务服务

创建 `service.ts`：

```typescript
import { v4 as uuidv4 } from 'uuid'
import type {
  MyEntity,
  MyEntityId,
  MyEntityConfig,
  MyEntityStatus,
  CreateMyEntityDto,
  UpdateMyEntityDto,
  MyEntityResponseDto,
  MyEntityQueryParams,
  MyEntityEvent,
} from './types'
import { MyEntityConfigSchema, MyEntityStatus as StatusEnum } from './types'
import type { IMyEntityRepository } from './repository.interface'
import { myEntityRepository } from './repository.interface'

export class MyEntityServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'MyEntityServiceError'
  }

  static notFound(id: string): MyEntityServiceError {
    return new MyEntityServiceError('ENTITY_NOT_FOUND', `Entity not found: ${id}`, 404)
  }

  static alreadyExists(name: string): MyEntityServiceError {
    return new MyEntityServiceError(
      'ENTITY_ALREADY_EXISTS',
      `Entity with name '${name}' already exists`,
      409
    )
  }
}

export interface IMyEntityService {
  createEntity(dto: CreateMyEntityDto): Promise<MyEntityResponseDto>
  getEntity(id: string): Promise<MyEntityResponseDto>
  listEntities(params: MyEntityQueryParams): Promise<{ entities: MyEntityResponseDto[]; total: number }>
  updateEntity(id: string, dto: UpdateMyEntityDto): Promise<MyEntityResponseDto>
  deleteEntity(id: string): Promise<void>
  activateEntity(id: string): Promise<MyEntityResponseDto>
  deactivateEntity(id: string): Promise<MyEntityResponseDto>
  onEvent(handler: (event: MyEntityEvent) => void): void
}

export class MyEntityService implements IMyEntityService {
  private repository: IMyEntityRepository
  private eventHandlers: Array<(event: MyEntityEvent) => void> = []

  constructor(repository: IMyEntityRepository = myEntityRepository) {
    this.repository = repository
  }

  async createEntity(dto: CreateMyEntityDto): Promise<MyEntityResponseDto> {
    // 验证配置
    const validationResult = MyEntityConfigSchema.safeParse(dto)
    if (!validationResult.success) {
      throw new Error('Invalid config')
    }

    // 检查名称是否已存在
    const exists = await this.repository.existsByName(dto.name)
    if (exists) {
      throw MyEntityServiceError.alreadyExists(dto.name)
    }

    const now = new Date()
    const entity: MyEntity = {
      id: new MyEntityId(uuidv4()),
      config: validationResult.data,
      status: StatusEnum.ACTIVE,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }

    const created = await this.repository.create(entity)

    // 触发事件
    this.emitEvent({
      type: 'myentity:created',
      entityId: created.id.value,
      config: created.config,
      timestamp: new Date(),
    })

    return this.toResponseDto(created)
  }

  async getEntity(id: string): Promise<MyEntityResponseDto> {
    const entityId = new MyEntityId(id)
    const entity = await this.repository.findById(entityId)

    if (!entity) {
      throw MyEntityServiceError.notFound(id)
    }

    return this.toResponseDto(entity)
  }

  async listEntities(
    params: MyEntityQueryParams
  ): Promise<{ entities: MyEntityResponseDto[]; total: number }> {
    const { entities, total } = await this.repository.findAll(params)

    return {
      entities: entities.map((e) => this.toResponseDto(e)),
      total,
    }
  }

  async updateEntity(id: string, dto: UpdateMyEntityDto): Promise<MyEntityResponseDto> {
    const entityId = new MyEntityId(id)
    const existing = await this.repository.findById(entityId)

    if (!existing) {
      throw MyEntityServiceError.notFound(id)
    }

    const updates: Partial<MyEntity> = {
      config: { ...existing.config, ...dto } as MyEntityConfig,
    }

    const updated = await this.repository.update(entityId, updates)
    if (!updated) {
      throw MyEntityServiceError.notFound(id)
    }

    return this.toResponseDto(updated)
  }

  async deleteEntity(id: string): Promise<void> {
    const entityId = new MyEntityId(id)
    const deleted = await this.repository.delete(entityId)
    if (!deleted) {
      throw MyEntityServiceError.notFound(id)
    }
  }

  async activateEntity(id: string): Promise<MyEntityResponseDto> {
    return this.updateStatus(id, StatusEnum.ACTIVE)
  }

  async deactivateEntity(id: string): Promise<MyEntityResponseDto> {
    return this.updateStatus(id, StatusEnum.INACTIVE)
  }

  onEvent(handler: (event: MyEntityEvent) => void): void {
    this.eventHandlers.push(handler)
  }

  private async updateStatus(id: string, status: MyEntityStatus): Promise<MyEntityResponseDto> {
    const entityId = new MyEntityId(id)
    const entity = await this.repository.findById(entityId)

    if (!entity) {
      throw MyEntityServiceError.notFound(id)
    }

    const previousStatus = entity.status

    const updated = await this.repository.update(entityId, { status })
    if (!updated) {
      throw MyEntityServiceError.notFound(id)
    }

    this.emitEvent({
      type: 'myentity:status-changed',
      entityId: id,
      previousStatus,
      currentStatus: status,
      timestamp: new Date(),
    })

    return this.toResponseDto(updated)
  }

  private emitEvent(event: MyEntityEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch (error) {
        console.error('Error handling event:', error)
      }
    }
  }

  private toResponseDto(entity: MyEntity): MyEntityResponseDto {
    return {
      id: entity.id.value,
      name: entity.config.name,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }
}

export const myEntityService = new MyEntityService()
```

### 4. 创建模块入口

创建 `index.ts`：

```typescript
import { BaseModule, type ModuleApi } from '@sdkwork/agent-server/modules/core'
import { MyEntityService, type IMyEntityService, MyEntityServiceError } from './service'
import { myEntityRepository, type IMyEntityRepository } from './repository.interface'
import { MyEntityStatus } from './types'

export interface MyModuleConfig {
  defaultRepository?: IMyEntityRepository
  maxEntities?: number
}

export class MyModule extends BaseModule {
  private service?: IMyEntityService
  private repository: IMyEntityRepository
  private moduleConfig: MyModuleConfig

  constructor(config: MyModuleConfig = {}) {
    super({
      name: 'my-module',
      version: '1.0.0',
      enabled: true,
      dependencies: [], // 声明依赖的其他模块
    })
    this.moduleConfig = config
    this.repository = config.defaultRepository || myEntityRepository
  }

  protected async onInitialize(): Promise<void> {
    // 初始化服务
    this.service = new MyEntityService(this.repository)

    // 注册服务到上下文
    this.registerService('myEntityService', this.service)

    // 订阅事件
    this.on('agent:created', (event) => {
      this.logger.info(`Agent created: ${event.payload.agentId}`)
    })

    this.logger.info('MyModule initialized')
  }

  protected async onStart(): Promise<void> {
    // 启动逻辑
    const count = await this.repository.count()
    this.logger.info(`Found ${count} entities`)

    this.logger.info('MyModule started')
  }

  protected async onStop(): Promise<void> {
    this.logger.info('MyModule stopped')
  }

  protected async onDestroy(): Promise<void> {
    this.service = undefined
    this.logger.info('MyModule destroyed')
  }

  protected getExports(): string[] {
    return ['MyEntityService', 'createEntity', 'getEntity', 'listEntities']
  }

  protected getApis(): ModuleApi[] {
    return [
      { name: 'createEntity', type: 'command', description: 'Create a new entity' },
      { name: 'getEntity', type: 'query', description: 'Get entity by ID' },
      { name: 'listEntities', type: 'query', description: 'List all entities' },
      { name: 'updateEntity', type: 'command', description: 'Update entity' },
      { name: 'deleteEntity', type: 'command', description: 'Delete entity' },
    ]
  }

  getService(): IMyEntityService {
    if (!this.service) {
      throw new Error('MyModule not initialized')
    }
    return this.service
  }

  async healthCheck() {
    const base = await super.healthCheck()

    try {
      const count = await this.repository.count()
      return {
        ...base,
        details: {
          totalEntities: count,
          serviceInitialized: !!this.service,
        },
      }
    } catch (error) {
      return {
        ...base,
        status: 'unhealthy' as const,
        message: error instanceof Error ? error.message : 'Health check failed',
      }
    }
  }
}

// 导出所有类型和服务
export * from './types'
export * from './repository.interface'
export * from './service'

// 单例实例
export const myModule = new MyModule()
```

## 注册和使用模块

### 注册模块

```typescript
import { createApp, AgentModule } from '@sdkwork/agent-server'
import { MyModule } from './my-module'

const app = createApp({
  modules: {
    agent: true,
    task: true,
  },
})

// 注册自定义模块
app.getModuleManager().register(new MyModule())

// 初始化并启动
await app.initialize()
await app.start()
```

### 使用模块服务

```typescript
import { getApp } from '@sdkwork/agent-server'

const app = getApp()
const myModule = app.getModuleManager().getByName<MyModule>('my-module')
const service = myModule.getService()

// 使用服务
const entity = await service.createEntity({
  name: 'My Entity',
  description: 'Description',
})
```

## 最佳实践

### 1. 错误处理

```typescript
// 定义专门的错误类
export class MyServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
  }
}

// 使用错误工厂方法
static notFound(id: string): MyServiceError {
  return new MyServiceError('NOT_FOUND', `Entity not found: ${id}`, 404)
}
```

### 2. 事件发布

```typescript
// 在状态变更时发布事件
private emitEvent(event: MyEntityEvent): void {
  for (const handler of this.eventHandlers) {
    try {
      handler(event)
    } catch (error) {
      this.logger.error('Error handling event:', error as Error)
    }
  }
}
```

### 3. 日志记录

```typescript
// 使用模块上下文的日志记录器
this.logger.info('Operation completed', { entityId: entity.id })
this.logger.error('Operation failed', error)
```

### 4. 健康检查

```typescript
async healthCheck() {
  const base = await super.healthCheck()

  try {
    // 检查数据库连接
    await this.repository.count()
    return { ...base, details: { healthy: true } }
  } catch (error) {
    return {
      ...base,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Health check failed',
    }
  }
}
```

## 测试模块

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MyModule } from './my-module'

describe('MyModule', () => {
  let module: MyModule

  beforeEach(() => {
    module = new MyModule()
  })

  it('should create entity', async () => {
    const service = module.getService()
    const entity = await service.createEntity({
      name: 'Test Entity',
    })

    expect(entity.name).toBe('Test Entity')
    expect(entity.status).toBe('active')
  })
})
```
