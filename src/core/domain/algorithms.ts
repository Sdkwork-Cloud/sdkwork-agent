import type { ExecutionPlan, ExecutionStep, ExecutionResult } from './execution';
import type { Skill } from './skill.js';
import type { Tool } from './tool.js';

/**
 * Algorithms Domain - 顶级算法领域模型
 *
 * 包含：
 * 1. MCTS (Monte Carlo Tree Search) - 蒙特卡洛树搜索
 * 2. HTN (Hierarchical Task Network) - 层次任务网络
 * 3. RAG (Retrieval-Augmented Generation) - 检索增强生成
 * 4. Reflection - 反思机制
 *
 * @domain Algorithms
 * @version 1.0.0
 * @standard Industry Leading
 */

// ============================================
// Common Types
// ============================================

/**
 * 算法配置
 */
export interface AlgorithmConfig {
  maxIterations: number;
  timeout: number;
  temperature?: number;
}

/**
 * 算法结果
 */
export interface AlgorithmResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  iterations: number;
  duration: number;
  confidence: number;
}

// ============================================
// MCTS - Monte Carlo Tree Search
// ============================================

/**
 * MCTS 节点
 */
export interface MCTSNode {
  id: string;
  state: MCTSState;
  parent?: MCTSNode;
  children: MCTSNode[];
  visits: number;
  value: number;
  untriedActions: MCTSAction[];
  action?: MCTSAction;
}

/**
 * MCTS 状态
 */
export interface MCTSState {
  plan: ExecutionPlan;
  completedSteps: string[];
  currentStep?: ExecutionStep;
  context: Record<string, unknown>;
}

/**
 * MCTS 动作
 */
export interface MCTSAction {
  id: string;
  type: 'select_skill' | 'select_tool' | 'reorder_steps' | 'add_step';
  target: string;
  params?: Record<string, unknown>;
  estimatedValue: number;
}

/**
 * MCTS 配置
 */
export interface MCTSConfig extends AlgorithmConfig {
  explorationConstant: number;  // UCB1 探索常数
  simulationDepth: number;
  rolloutCount: number;
}

/**
 * MCTS 结果
 */
export interface MCTSResult {
  bestPlan: ExecutionPlan;
  rootNode: MCTSNode;
  iterations: number;
  confidence: number;
}

/**
 * MCTS 算法接口
 */
export interface MCTSAlgorithm {
  search(
    initialState: MCTSState,
    availableSkills: Skill[],
    availableTools: Tool[],
    config: MCTSConfig
  ): Promise<AlgorithmResult<MCTSResult>>;
  select(node: MCTSNode): MCTSNode;
  expand(node: MCTSNode, actions: MCTSAction[]): MCTSNode;
  simulate(node: MCTSNode, depth: number): number;
  backpropagate(node: MCTSNode, value: number): void;
}

// ============================================
// HTN - Hierarchical Task Network
// ============================================

/**
 * HTN 任务
 */
export interface HTNTask {
  id: string;
  name: string;
  type: 'primitive' | 'compound';
  preconditions?: HTNCondition[];
  effects?: HTNEffect[];
  methods?: HTNMethod[];  // compound tasks only
  operator?: HTNOperator; // primitive tasks only
}

/**
 * HTN 条件
 */
export interface HTNCondition {
  type: 'has' | 'not' | 'eq' | 'gt' | 'lt' | 'and' | 'or';
  key?: string;
  value?: unknown;
  conditions?: HTNCondition[];
}

/**
 * HTN 效果
 */
export interface HTNEffect {
  type: 'add' | 'delete' | 'update';
  key: string;
  value?: unknown;
}

/**
 * HTN 方法
 */
export interface HTNMethod {
  id: string;
  name: string;
  preconditions: HTNCondition[];
  subtasks: string[];  // task IDs
  ordering: 'sequential' | 'parallel';
}

/**
 * HTN 操作符
 */
export interface HTNOperator {
  skillId?: string;
  toolId?: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}

/**
 * HTN 领域
 */
export interface HTNDomain {
  name: string;
  tasks: HTNTask[];
  initialState: Record<string, unknown>;
}

/**
 * HTN 计划
 */
export interface HTNPlan {
  tasks: HTNTask[];
  steps: ExecutionStep[];
  state: Record<string, unknown>;
}

/**
 * HTN 配置
 */
export interface HTNConfig extends AlgorithmConfig {
  maxDepth: number;
  allowPartialPlans: boolean;
}

/**
 * HTN 算法接口
 */
export interface HTNAlgorithm {
  plan(
    domain: HTNDomain,
    goalTask: HTNTask,
    config: HTNConfig
  ): Promise<AlgorithmResult<HTNPlan>>;
  decompose(task: HTNTask, state: Record<string, unknown>): HTNMethod | null;
  checkPreconditions(conditions: HTNCondition[], state: Record<string, unknown>): boolean;
  applyEffects(effects: HTNEffect[], state: Record<string, unknown>): Record<string, unknown>;
}

// ============================================
// RAG - Retrieval-Augmented Generation
// ============================================

/**
 * RAG 文档
 */
export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    source?: string;
    title?: string;
    timestamp?: number;
    [key: string]: unknown;
  };
  embedding?: number[];
}

/**
 * RAG 查询
 */
export interface RAGQuery {
  text: string;
  embedding?: number[];
  filters?: Record<string, unknown>;
  topK: number;
  threshold?: number;
}

/**
 * RAG 检索结果
 */
export interface RAGRetrievalResult {
  document: RAGDocument;
  score: number;
  highlights?: string[];
}

/**
 * RAG 上下文
 */
export interface RAGContext {
  query: RAGQuery;
  retrievedDocuments: RAGRetrievalResult[];
  augmentedPrompt: string;
  tokenCount: number;
}

/**
 * RAG 配置
 */
export interface RAGConfig extends AlgorithmConfig {
  embeddingModel: string;
  vectorStore: 'memory' | 'persistent';
  chunkSize: number;
  chunkOverlap: number;
  rerankEnabled: boolean;
  rerankModel?: string;
}

/**
 * RAG 结果
 */
export interface RAGResult {
  context: RAGContext;
  generatedText: string;
  sources: RAGDocument[];
  confidence: number;
}

/**
 * RAG 算法接口
 */
export interface RAGAlgorithm {
  index(documents: RAGDocument[]): Promise<void>;
  retrieve(query: RAGQuery): Promise<RAGRetrievalResult[]>;
  augment(query: string, retrievedDocs: RAGRetrievalResult[]): RAGContext;
  generate(context: RAGContext): Promise<string>;
  query(queryText: string, config: RAGConfig): Promise<AlgorithmResult<RAGResult>>;
}

// ============================================
// Reflection - 反思机制
// ============================================

/**
 * 反思类型
 */
export type ReflectionType =
  | 'self_critique'      // 自我批评
  | 'plan_evaluation'    // 计划评估
  | 'execution_review'   // 执行回顾
  | 'outcome_analysis'   // 结果分析
  | 'improvement_suggestion'; // 改进建议

/**
 * 反思输入
 */
export interface ReflectionInput {
  type: ReflectionType;
  plan?: ExecutionPlan;
  executionResult?: ExecutionResult;
  expectedOutcome?: unknown;
  actualOutcome?: unknown;
  context?: Record<string, unknown>;
}

/**
 * 反思发现
 */
export interface ReflectionFinding {
  id: string;
  type: 'issue' | 'strength' | 'opportunity';
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  suggestions?: string[];
}

/**
 * 反思建议
 */
export interface ReflectionSuggestion {
  id: string;
  type: 'plan_change' | 'parameter_adjust' | 'alternative_approach' | 'learning';
  description: string;
  priority: number;
  expectedImprovement: number;
  implementation?: unknown;
}

/**
 * 反思结果
 */
export interface ReflectionResult {
  type: ReflectionType;
  findings: ReflectionFinding[];
  suggestions: ReflectionSuggestion[];
  summary: string;
  confidence: number;
  learning?: Record<string, unknown>;
}

/**
 * 反思配置
 */
export interface ReflectionConfig extends AlgorithmConfig {
  reflectionDepth: number;  // 反思深度（递归次数）
  focusAreas: string[];
  includeMetrics: boolean;
}

/**
 * 反思算法接口
 */
export interface ReflectionAlgorithm {
  reflect(input: ReflectionInput, config: ReflectionConfig): Promise<AlgorithmResult<ReflectionResult>>;
  critique(plan: ExecutionPlan, executionResult: unknown): Promise<ReflectionFinding[]>;
  evaluate(plan: ExecutionPlan, outcome: unknown): Promise<number>;
  suggestImprovements(findings: ReflectionFinding[]): Promise<ReflectionSuggestion[]>;
  learn(reflection: ReflectionResult): Promise<void>;
}

// ============================================
// Algorithm Registry
// ============================================

/**
 * 算法类型
 */
export type AlgorithmType = 'mcts' | 'htn' | 'rag' | 'reflection';

/**
 * 算法注册表
 */
export interface AlgorithmRegistry {
  register<T>(type: AlgorithmType, algorithm: T): void;
  get<T>(type: AlgorithmType): T | undefined;
  has(type: AlgorithmType): boolean;
  list(): AlgorithmType[];
}

// ============================================
// Algorithm Factory
// ============================================

/**
 * 算法工厂
 */
export interface AlgorithmFactory {
  createMCTS(config: MCTSConfig): MCTSAlgorithm;
  createHTN(config: HTNConfig): HTNAlgorithm;
  createRAG(config: RAGConfig): RAGAlgorithm;
  createReflection(config: ReflectionConfig): ReflectionAlgorithm;
}
