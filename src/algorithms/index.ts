/**
 * 算法模块索引
 *
 * 导出所有高级算法实现
 */

// HNSW - 高性能近似最近邻搜索
export {
  HNSWIndex,
  createHNSWIndex,
} from './hnsw';

export type {
  HNSWConfig,
  HNSWNode,
  HNSWSearchResult,
} from './hnsw';

// MCTS - 蒙特卡洛树搜索
export {
  MCTSDecisionEngine,
  DefaultSimulationPolicy,
  HeuristicSimulationPolicy,
  NeuralNetworkEvaluator,
  MCTSFactory,
} from './mcts-decision-engine';

export type {
  MCTSConfig,
  DecisionState,
  Action,
  SimulationResult,
  DecisionResult,
  ActionStats,
  TreeStats,
  StateEvaluator,
  SimulationPolicy,
} from './mcts-decision-engine';

// Neural MCTS - 神经网络增强的蒙特卡洛树搜索
export {
  NeuralMCTS,
  SimpleNeuralNetwork,
  createNeuralMCTS,
  createDefaultNeuralMCTSConfig,
} from './neural-mcts';

export type {
  NeuralMCTSConfig,
  NeuralNetwork,
  NetworkOutput,
  TrainingExample,
  TrainingStats,
  SearchResult,
} from './neural-mcts';

// Tree of Thoughts - 多路径思维探索
export {
  TreeOfThoughts,
  DefaultThoughtGenerator,
  DefaultThoughtEvaluator,
  createTreeOfThoughts,
  createDefaultToTConfig,
} from './tree-of-thoughts';

export type {
  ToTConfig,
  Thought,
  ThoughtNode,
  SearchState,
  EvaluationResult,
  ToTResult,
  ThoughtGenerator,
  ThoughtEvaluator,
} from './tree-of-thoughts';

// 层次规划
export {
  HTNPlanner,
} from './hierarchical-planning';

export type {
  PlanningConfig as HTNConfig,
  Task,
  Plan,
} from './hierarchical-planning';

// MCTS 工具选择器
export {
  MCTSToolSelector,
} from './mcts-tool-selector';

export type {
  ToolSelectionState,
  ToolSelectionAction,
  ToolSelectionResult,
  Tool,
  ToolExecutionContext,
  ToolExecutionResult,
} from './mcts-tool-selector';

// 决策引擎 - 从 transformer-decision-engine 导出
export {
  TransformerDecisionEngine,
} from './transformer-decision-engine';

export type {
  TransformerEngineConfig,
  DecisionInput,
  DecisionOption,
  DecisionResult as TransformerDecisionResult,
} from './transformer-decision-engine';

// ScaNN - Google 的量化向量搜索算法
export {
  ScannIndex,
  createScannIndex,
} from './scann-index';

export type {
  ScannConfig,
} from './scann-index';

// Speculative Decoding - LLM 推理加速
export {
  SpeculativeDecoder,
  createSpeculativeDecoder,
  MockLanguageModel,
} from './speculative-decoding';

export type {
  SpeculativeDecodingConfig,
  DecodingResult,
  LanguageModel,
  TokenDistribution,
} from './speculative-decoding';
