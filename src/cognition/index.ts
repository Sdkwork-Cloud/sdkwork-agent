/**
 * 认知模块索引
 *
 * 导出所有认知系统实现
 */

// 从核心算法模块重新导出认知相关类型
export type {
  // 世界模型相关类型
  MCTSDecisionEngine,
  MCTSConfig,
  DecisionState,
  SimulationResult,
  DecisionResult,
  ActionStats,
  TreeStats,
  StateEvaluator,
  SimulationPolicy,
} from '../algorithms/mcts-decision-engine';

export {
  // 神经MCTS相关类型
  NeuralMCTS,
  SimpleNeuralNetwork,
  createNeuralMCTS,
  createDefaultNeuralMCTSConfig,
} from '../algorithms/neural-mcts';

export type {
  NeuralMCTSConfig,
  NeuralNetwork,
  NetworkOutput,
  TrainingExample,
  TrainingStats,
  SearchResult,
} from '../algorithms/neural-mcts';

export {
  // 思维树相关类型
  TreeOfThoughts,
  DefaultThoughtGenerator,
  DefaultThoughtEvaluator,
  createTreeOfThoughts,
  createDefaultToTConfig,
} from '../algorithms/tree-of-thoughts';

export type {
  ToTConfig,
  Thought,
  ThoughtNode,
  SearchState,
  EvaluationResult,
  ToTResult,
  ThoughtGenerator,
  ThoughtEvaluator,
} from '../algorithms/tree-of-thoughts';

// 认知引擎占位符类型
export interface CognitionConfig {
  enabled: boolean;
  useWorldModel: boolean;
  useNeuroSymbolic: boolean;
  maxIterations: number;
}

export interface CognitionContext {
  state: unknown;
  goal: string;
  history: unknown[];
}

export interface CognitionResult {
  decision: unknown;
  confidence: number;
  reasoning: string;
}

export interface CognitionLayer {
  name: string;
  process(input: unknown): Promise<unknown>;
}

// 世界模型占位符类型
export interface WorldModelConfig {
  stateDim: number;
  actionDim: number;
  hiddenDim: number;
  learningRate: number;
}

export interface WorldModel {
  config: WorldModelConfig;
  predict(state: unknown, action: unknown): Promise<unknown>;
  imagine(initialState: unknown, actions: unknown[]): Promise<unknown[]>;
}

export type State = unknown;
export type Observation = unknown;
export type Action = unknown;
export type Transition = {
  from: State;
  action: Action;
  to: State;
  reward: number;
};
export type ImaginedTrajectory = {
  states: State[];
  actions: Action[];
  rewards: number[];
};

export interface RSSM {
  encode(observation: Observation): Promise<unknown>;
  predict(state: unknown, action: Action): Promise<unknown>;
  decode(state: unknown): Promise<Observation>;
}

export interface RewardPredictor {
  predict(state: unknown, action: Action): Promise<number>;
}

export interface ObservationDecoder {
  decode(state: unknown): Promise<Observation>;
}

export interface ObservationEncoder {
  encode(observation: Observation): Promise<unknown>;
}

// 世界模型训练占位符
export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
}

export interface TrainingLoss {
  total: number;
  prediction: number;
  reward: number;
  observation: number;
}

export interface TrainingResult {
  epochs: number;
  finalLoss: number;
  losses: TrainingLoss[];
}

export interface WorldModelTrainer {
  train(trajectories: unknown[]): Promise<TrainingResult>;
}

export function createDefaultTrainingConfig(): TrainingConfig {
  return {
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
  };
}

// 神经符号推理占位符
export interface NeuroSymbolicConfig {
  ruleConfidence: number;
  maxInferenceDepth: number;
}

export interface LogicalRule {
  id: string;
  premises: string[];
  conclusion: string;
  confidence: number;
}

export interface InferenceResult {
  conclusion: string;
  confidence: number;
  usedRules: LogicalRule[];
}

export interface KnowledgeGraph {
  entities: Map<string, unknown>;
  relations: Map<string, unknown[]>;
}

export interface NeuroSymbolicEngine {
  addRule(rule: LogicalRule): void;
  infer(facts: string[]): Promise<InferenceResult[]>;
}

// 统一认知引擎占位符
export interface UnifiedCognitionEngine {
  config: CognitionConfig;
  process(context: CognitionContext): Promise<CognitionResult>;
}

// 预测智能体占位符
export interface PredictiveConfig {
  horizon: number;
  numSimulations: number;
}

export interface Prediction {
  state: unknown;
  probability: number;
  expectedReward: number;
}

export interface PredictionResult {
  predictions: Prediction[];
  bestAction: Action;
  confidence: number;
}

export interface PredictiveAgent {
  config: PredictiveConfig;
  predict(context: unknown): Promise<PredictionResult>;
}
