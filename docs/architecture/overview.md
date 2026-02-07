# 架构总览

SDKWork Agent 采用分层架构设计，结合 DDD（领域驱动设计）和微内核架构，实现高内聚、低耦合的系统结构。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        SDKWork Agent                             │
├─────────────────────────────────────────────────────────────────┤
│                      Application Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  AgentImpl   │ │SkillExecutor │ │ToolExecutor  │            │
│  │  (应用服务)   │ │  (Skill执行)  │ │  (Tool执行)  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ MCPManager   │ │PluginManager │ │ExecutionEngine│            │
│  │  (MCP管理)   │ │  (插件管理)   │ │  (执行引擎)   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                        Domain Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Agent   │ │  Skill   │ │   Tool   │ │   MCP    │          │
│  │ (聚合根)  │ │  (实体)  │ │  (实体)  │ │ (实体)   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Plugin  │ │  Memory  │ │Execution │ │  Events  │          │
│  │  (实体)  │ │  (实体)  │ │ (值对象)  │ │ (领域事件)│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                     Infrastructure Layer                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Microkernel Core                       │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ LLM Service  │ │Skill Service │ │Tool Service  │    │   │
│  │  │ (LLM提供者)  │ │ (Skill注册)  │ │ (Tool注册)   │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │Memory Service│ │Event Service │ │Logger Service│    │   │
│  │  │ (记忆存储)   │ │ (事件总线)   │ │ (日志服务)   │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     External Services                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  OpenAI  │ │Anthropic │ │  Google  │ │  Others  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 分层说明

### Domain Layer（领域层）

领域层是系统的核心，包含业务逻辑和领域模型：

- **实体（Entities）**: 具有唯一标识的对象
  - `Agent`: 智能代理聚合根
  - `Skill`: 可执行技能
  - `Tool`: 原子工具
  - `MCP`: MCP 连接
  - `Plugin`: 插件
  - `Memory`: 记忆单元

- **值对象（Value Objects）**: 无唯一标识的对象
  - `ExecutionPlan`: 执行计划
  - `ChatRequest`: 对话请求
  - `ChatResponse`: 对话响应

- **领域服务（Domain Services）**: 跨实体的业务逻辑
  - `ExecutionEngine`: 执行引擎
  - `EventEmitter`: 事件发射器

- **领域事件（Domain Events）**: 业务发生的事件
  - `AgentInitialized`: Agent 初始化完成
  - `ChatCompleted`: 对话完成
  - `SkillExecuted`: Skill 执行完成

### Application Layer（应用层）

应用层负责编排领域对象完成用例：

- **应用服务**: 实现用例，协调领域对象
  - `AgentImpl`: Agent 实现
  - `SkillExecutor`: Skill 执行器
  - `ToolExecutor`: Tool 执行器

- **用例实现**: 具体的业务用例
  - `ChatUseCase`: 对话用例
  - `ExecuteSkillUseCase`: 执行 Skill 用例
  - `ExecuteToolUseCase`: 执行 Tool 用例

### Infrastructure Layer（基础设施层）

基础设施层提供技术实现：

- **微内核（Microkernel）**: 服务管理核心
  - 服务注册与发现
  - 依赖注入
  - 生命周期管理
  - 事件总线

- **LLM Provider**: 大语言模型提供者
  - OpenAI Provider
  - Anthropic Provider
  - Google Provider
  - 其他 Provider

- **存储实现**: 数据持久化
  - Memory Store 实现
  - 缓存实现

## 微内核架构

微内核架构是 SDKWork Agent 的核心设计：

### 核心原则

1. **最小核心**: 内核只提供最基础的服务管理能力
2. **插件化扩展**: 所有功能通过服务插件实现
3. **依赖注入**: 服务间通过依赖注入解耦
4. **生命周期管理**: 统一的服务生命周期管理

### 服务接口

```typescript
interface Service {
  id: string;
  version: string;
  dependencies: string[];
  
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
}
```

### 服务注册

```typescript
kernel.registerService({
  id: 'llm-service',
  version: '1.0.0',
  dependencies: [],
  async initialize() {
    // 初始化 LLM 服务
  },
  async destroy() {
    // 清理资源
  }
});
```

## 数据流

### 对话流程

```
用户输入 → Agent.chat() → LLM Provider → 生成响应 → 返回给用户
                ↓
         触发事件(chat:started)
                ↓
         执行 Skill/Tool(如果需要)
                ↓
         触发事件(chat:completed)
```

### Skill 执行流程

```
调用 Skill → 准备上下文 → 注入依赖($llm, $tool, $memory)
                ↓
         执行脚本代码
                ↓
         验证输出 → 返回结果
```

### Tool 执行流程

```
调用 Tool → 检查确认级别 → 用户确认(如果需要)
                ↓
         执行 Tool 逻辑
                ↓
         记录日志 → 返回结果
```

## 扩展点

SDKWork Agent 提供多个扩展点：

### 1. 自定义 LLM Provider

```typescript
class CustomProvider implements LLMProvider {
  async complete(params: CompletionParams): Promise<CompletionResult> {
    // 自定义实现
  }
}
```

### 2. 自定义 Skill

```typescript
const customSkill = defineSkill({
  id: 'custom-skill',
  script: {
    lang: 'typescript',
    code: `async function main() { /* ... */ }`
  }
});
```

### 3. 自定义 Tool

```typescript
const customTool = defineTool({
  id: 'custom-tool',
  execute: async (input, context) => {
    // 自定义实现
  }
});
```

### 4. 自定义 Plugin

```typescript
const customPlugin: Plugin = {
  id: 'custom-plugin',
  async activate(context) {
    // 插件激活逻辑
  }
};
```

## 设计原则

1. **单一职责**: 每个模块只负责一个功能
2. **开闭原则**: 对扩展开放，对修改关闭
3. **依赖倒置**: 依赖抽象，不依赖具体实现
4. **接口隔离**: 客户端不依赖不需要的接口
5. **里氏替换**: 子类可以替换父类

## 相关文档

- [DDD 分层架构](./ddd.md) - 深入了解 DDD 实现
- [微内核架构](./microkernel.md) - 深入了解微内核设计
