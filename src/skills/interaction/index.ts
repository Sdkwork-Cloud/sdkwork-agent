/**
 * Skill交互优化模块
 * 
 * 本模块提供了一套完整的Skill交互优化方案，包括：
 * 
 * 1. **意图识别引擎** (IntentRecognizer)
 *    - 基于大模型的语义意图理解
 *    - 多意图识别和置信度评估
 *    - 上下文感知意图推断
 *    - 实体提取能力
 * 
 * 2. **智能参数提取器** (IntelligentParameterExtractor)
 *    - 支持多层参数提取（结构化、自然语言、混合、引用、多模态）
 *    - Few-shot学习能力
 *    - 上下文感知参数推断
 * 
 * 3. **对话状态机** (SkillConversationStateMachine)
 *    - 10个对话状态管理
 *    - 状态转换验证
 *    - 上下文持久化
 * 
 * 4. **长期记忆系统** (LongTermMemorySystem)
 *    - 四层记忆架构（工作记忆、短期记忆、中期记忆、长期记忆）
 *    - 语义检索
 *    - 自动记忆迁移和遗忘
 * 
 * 5. **错误恢复管理器** (ErrorRecoveryManager)
 *    - 智能错误分类
 *    - 多级恢复策略
 *    - 错误模式学习
 * 
 * 6. **交互管理器** (OptimizedSkillInteractionManager)
 *    - 统一入口
 *    - 多轮对话支持
 *    - 完整的错误恢复
 * 
 * @example
 * ```typescript
 * import { 
 *   OptimizedSkillInteractionManager,
 *   createOptimizedInteractionManager,
 *   createIntentRecognizer,
 *   LLMService
 * } from './interaction';
 * 
 * // 实现LLM服务接口
 * const llmService: LLMService = {
 *   complete: async (prompt, options) => {
 *     // 调用你的LLM API
 *     return response;
 *   },
 *   embed: async (text) => {
 *     // 调用embedding API
 *     return embedding;
 *   }
 * };
 * 
 * // 创建管理器
 * const manager = createOptimizedInteractionManager(registry, scheduler, {
 *   llm: llmService,
 *   enableMultiLayerExtraction: true,
 *   enableLongTermMemory: true
 * });
 * 
 * // 创建会话
 * const session = manager.createSession('user-123');
 * 
 * // 处理输入
 * const result = await manager.processInput(session.id, { text: '帮我搜索文件' });
 * ```
 */

// 导出意图识别引擎
export {
  IntentRecognizer,
  IntentRecognitionResult,
  IntentRecognizerConfig,
  DialogueContext,
  LLMService,
  createIntentRecognizer,
} from './intent-recognizer';

// 导出参数提取器
export {
  IntelligentParameterExtractor,
  ParameterDefinition,
  ExtractionContext,
  ExtractionResult,
  InputType,
  createParameterExtractor,
} from './parameter-extractor';

// 导出对话状态机
export {
  SkillConversationStateMachine,
  ConversationState,
  ConversationContext,
  StateHandler,
  StateTransitionResult,
  StateTransitionEvent,
  StateMachineConfig,
  createConversationStateMachine,
} from './conversation-state-machine';

// 导出长期记忆系统
export {
  LongTermMemorySystem,
  MemoryEntry,
  MemoryType,
  MemoryLayer,
  MemoryRetrieveOptions,
  MemoryRetrieveResult,
} from './long-term-memory';

// 导出错误恢复管理器
export {
  ErrorRecoveryManager,
  SkillError,
  RecoveryResult,
  RecoveryConfig,
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
  errorRecoveryManager,
} from './error-recovery';

// 导出交互管理器
export {
  OptimizedSkillInteractionManager,
  InteractionConfig,
  UserInput,
  InteractionResult,
  InteractionSession,
  createOptimizedInteractionManager,
} from './interaction-manager';

// 导出缓存管理器
export {
  CacheManager,
  CacheConfig,
  CacheStats,
  createCache,
} from './cache-manager';

// 导出高级缓存系统
export {
  AdvancedCache,
  AdvancedCacheConfig,
  AdvancedCacheStats,
  CacheLevel,
  createAdvancedCache,
} from './advanced-cache';

// 导出本地数据管理器
export {
  DataManager,
  DataManagerConfig,
  DataVersion,
  DataMigration,
  DataTransaction,
  DataOperation,
  DataMetadata,
  DataManagerStats,
  createDataManager,
} from './data-manager';

// 导出性能优化器
export {
  PerformanceOptimizer,
  BatchProcessor,
  RequestDeduplicator,
  ConnectionPool,
  RateLimiter,
  createPerformanceOptimizer,
  createBatchProcessor,
  createDeduplicator,
  createConnectionPool,
  createRateLimiter,
} from './performance-optimizer';
