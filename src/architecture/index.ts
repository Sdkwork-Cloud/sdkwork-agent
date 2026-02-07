/**
 * SDKWork Browser Agent - 统一智能体架构
 *
 * 完美架构设计原则：
 * 1. 高内聚低耦合 - 各模块职责清晰，通过标准接口通信
 * 2. 插件化设计 - 所有功能都可插拔，支持动态加载
 * 3. 统一抽象层 - Skills/Tools/MCP 统一抽象为 Capability
 * 4. 响应式架构 - 支持事件驱动和流式处理
 * 5. 类型安全 - 完整的 TypeScript 类型支持
 * 6. 可观测性 - 内置日志、追踪、监控
 */

// ============================================
// 核心架构导出
// ============================================

// 统一能力系统 (Skills + Tools + MCP)
// export * from './capability';

// 智能体运行时
// export * from './runtime';

// 插件系统
// export * from './plugin-system';

// UI 交互系统
// export * from './ui-bridge';

// 事件总线
// export * from './event-bus';

// 上下文管理
// export * from './context-manager';

// 中间件系统
// export * from './middleware';

// 配置管理
// export * from './config-manager';

// 监控与可观测性
// export * from './observability';

// ============================================
// 架构类型定义
// ============================================

export interface Capability {
  id: string;
  name: string;
  description: string;
  version: string;
  type: 'skill' | 'tool' | 'mcp';
  execute(input: unknown, context: unknown): Promise<unknown>;
}

export interface RuntimeConfig {
  maxConcurrentTasks: number;
  timeout: number;
  retryAttempts: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  dependencies: string[];
}

export interface EventBus {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
}

export interface Context {
  id: string;
  data: Map<string, unknown>;
  parent?: Context;
}

export interface Middleware {
  name: string;
  priority: number;
  execute(context: unknown, next: () => Promise<unknown>): Promise<unknown>;
}

export interface Config {
  name: string;
  value: unknown;
  schema?: unknown;
}

export interface Observability {
  log(level: string, message: string, meta?: unknown): void;
  trace(operation: string, fn: () => Promise<unknown>): Promise<unknown>;
  metric(name: string, value: number): void;
}
