/**
 * Tools Module - 工具模块
 *
 * 统一的工具系统，支持插件化架构
 *
 * @module Tools
 * @version 2.0.0
 *
 * @example
 * ```typescript
 * import { createToolRegistry, builtinPlugin, type Tool } from '@sdkwork/tools';
 *
 * // 创建注册表
 * const registry = createToolRegistry();
 *
 * // 加载内置插件
 * await registry.loadPlugin(builtinPlugin);
 *
 * // 注册自定义工具
 * registry.register({
 *   id: 'custom:echo',
 *   name: 'echo',
 *   description: 'Echo input',
 *   category: 'custom',
 *   parameters: z.object({ text: z.string() }),
 *   execute: async (input) => ({
 *     success: true,
 *     data: input,
 *     output: { content: [{ type: 'text', text: input.text }] }
 *   }),
 * });
 *
 * // 执行工具
 * const result = await registry.execute('custom:echo', { text: 'Hello' }, context);
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  ToolId,
  ToolName,
  ToolCategory,
  ToolOutputContent,
  ToolOutput,
  ToolError,
  ToolResult,
  ExecutionContext,
  Tool,
  ToolExecutionOptions,
  IToolRegistry,
  ToolPlugin,
  ToolFactory,
} from './core/types.js';

// ============================================================================
// Registry
// ============================================================================

export {
  ToolRegistry,
  createToolRegistry,
  getGlobalToolRegistry,
  resetGlobalToolRegistry,
} from './registry.js';

// ============================================================================
// Built-in Tools
// ============================================================================

export {
  fileReadTool,
  fileWriteTool,
  fileListTool,
  httpRequestTool,
  executeCommandTool,
  jsonParseTool,
  builtinTools,
  builtinPlugin,
} from './builtin.js';

// ============================================================================
// Default
// ============================================================================

export { ToolRegistry as default } from './registry.js';
