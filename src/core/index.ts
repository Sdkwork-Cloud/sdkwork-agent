/**
 * Core Module Exports
 * DDD Architecture - Domain + Application Layer
 */

// ============================================================================
// Domain Layer Exports
// ============================================================================

// Agent Domain
export type {
  Agent,
  AgentId,
  AgentConfig,
  AgentState,
  AgentEvent,
  AgentEventType,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatMessage,
  SessionId,
  ExecutionId,
} from './domain/agent.js';

// Skill Domain
export type {
  Skill,
  SkillScript,
  SkillLanguage,
  Reference,
  ReferenceType,
  SkillInjectedAPI,
  SkillExecutionContext,
  SkillResult,
  SkillRegistry,
  SkillExecutor,
  SkillMemoryAPI,
  SkillLogger,
} from './domain/skill.js';

// Tool Domain
export type {
  Tool,
  ToolCategory,
  ConfirmLevel,
  ToolExecutor,
  ToolExecutionContext,
  ToolResult,
  ToolRegistry,
  ToolChain,
  ToolChainStrategy,
  ToolChainResult,
  BuiltInToolDefinition,
} from './domain/tool.js';
export { BUILT_IN_TOOLS } from './domain/tool.js';

// MCP Domain
export type {
  MCPClient,
  MCPServerConfig,
  MCPTransport,
  MCPTransportType,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPRequestMethod,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPCapabilities,
  MCPImplementation,
  MCPTool,
  MCPToolList,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPResource,
  MCPResourceList,
  MCPResourceContents,
  MCPPrompt,
  MCPPromptList,
  MCPPromptMessage,
  MCPPromptGetResult,
  MCPContentItem,
  MCPRegistry,
  MCPManager,
  MCPExecutionContext,
  MCPExecutionResult,
} from './domain/mcp.js';

// Plugin Domain
export type {
  Plugin,
  PluginConfig,
  PluginType,
  PluginState,
  PluginContributes,
  PluginContext,
  PluginStorage,
  PluginLogger,
  PluginRegistry,
  PluginManager,
  Disposable,
  HookHandler,
  HookContext,
  CommandHandler,
  CommandContext,
  HookResult,
  PluginFactory,
  PluginModule,
  PluginLoader,
  PluginValidationResult,
  PluginValidator,
} from './domain/plugin.js';

// Memory Domain
export type {
  Memory,
  MemoryType,
  MemorySource,
  MemoryMetadata,
  MemoryQuery,
  MemoryFilters,
  MemorySearchResult,
  MemoryStore,
  MemoryStats,
  MemoryConfig,
  EmbeddingProvider,
  VectorStore,
  MemoryEvent,
  MemoryEventHandler,
  SessionMemory,
  SessionMessage,
  SessionMetadata,
  KnowledgeDocument,
  DocumentChunk,
  DocumentMetadata,
  MemorySyncConfig,
  MemorySyncResult,
} from './domain/memory.js';

// ============================================================================
// Application Layer Exports
// ============================================================================

// Agent Implementation
export { AgentImpl } from './application/agent-impl.js';

// Skill Executor
export {
  SkillExecutorImpl,
  createSkillExecutor,
} from './application/skill-executor.js';

// Tool Executor
export {
  ToolExecutorImpl,
} from './application/tool-executor.js';

// MCP Client
export {
  MCPClientImpl,
  MCPRegistryImpl,
  MCPManagerImpl,
} from './application/mcp-client.js';

// Plugin Manager
export {
  PluginManagerImpl,
  PluginRegistryImpl,
  createPluginManager,
} from './application/plugin-manager.js';

// Memory System
export {
  // Core Memory Store
  MemoryStoreImpl,
  createMemoryStore,
  InMemoryVectorStore,
  SimpleEmbeddingProvider,
  type MemoryStoreConfig,
  // HNSW Vector Index
  HNSWIndex,
  createHNSWIndex,
  DEFAULT_HNSW_CONFIG,
  type HNSWConfig,
  // BM25 Full-Text Search
  BM25SearchEngine,
  createBM25SearchEngine,
  DEFAULT_BM25_CONFIG,
  type BM25Config,
  // Hybrid Search with RRF
  HybridSearchEngine,
  createHybridSearchEngine,
  fuseWithRRF,
  fuseWithWeights,
  DEFAULT_RRF_CONFIG,
  type RRFConfig,
  type SearchSourceResult,
  type RRFResult,
  // Hierarchical Memory
  HierarchicalMemoryStore,
  createHierarchicalMemoryStore,
  DEFAULT_HIERARCHICAL_CONFIG,
  type MemoryTier,
  type HierarchicalMemory,
  type MemoryImportance,
  type MemoryLifecycle,
  type MemoryCompression,
  type HierarchicalMemoryConfig,
  type TierStats,
} from './application/memory';

// Execution Engine
export {
  ExecutionEngineImpl,
  createExecutionEngine,
  type ExecutionEngine,
  type TaskConfig,
  type TaskContext,
  type TaskResult,
  type TaskStatus,
  type ExecutionPlan,
  type ExecutionContext,
  type ExecutionResult,
  type ExecutionStrategy,
} from './application/execution-engine.js';

// ============================================================================
// Algorithms Exports
// ============================================================================

export * from './application/algorithms';

// ============================================================================
// Microkernel Architecture Exports
// ============================================================================

export {
  Microkernel,
  createMicrokernel,
} from './microkernel';
export type {
  Service,
  ServiceMetadata,
  KernelEvent,
  EventHandler,
  MicrokernelConfig,
} from './microkernel';

// ============================================================================
// Advanced Plugin System Exports
// ============================================================================

export {
  PluginSystem,
  createPluginSystem,
} from './plugin-system';
export type {
  PluginManifest,
  PluginPermission,
  ResourceQuota,
  PluginInstance,
  PluginAPI,
  PluginEvent,
  PluginStatus,
  PluginSystemConfig,
} from './plugin-system';
