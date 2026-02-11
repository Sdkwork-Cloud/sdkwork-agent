/**
 * Tree of Thoughts (ToT) 算法实现
 *
 * 参考: "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"
 * https://arxiv.org/abs/2305.10601
 *
 * 核心思想:
 * 1. 思维分解 - 将问题分解为多个思维步骤
 * 2. 思维生成 - 在每个节点生成多个候选思维
 * 3. 思维评估 - 评估每个思维的质量
 * 4. 搜索算法 - 使用 BFS/DFS/Beam Search 探索思维树
 */

import { EventEmitter } from '../utils/event-emitter.js';

// ============================================
// 类型定义
// ============================================

export interface ToTConfig {
  /** 搜索策略 */
  searchStrategy: 'bfs' | 'dfs' | 'beam';
  /** 每步生成的思维数量 */
  thoughtsPerStep: number;
  /** 最大搜索深度 */
  maxDepth: number;
  /** Beam Search 的宽度 */
  beamWidth: number;
  /** 评估阈值 */
  evaluationThreshold: number;
  /** 是否启用回溯 */
  enableBacktracking: boolean;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 温度参数 (思维生成的多样性) */
  temperature: number;
  /** 是否启用剪枝 */
  enablePruning: boolean;
  /** 剪枝阈值 */
  pruningThreshold: number;
}

export interface Thought {
  id: string;
  /** 思维内容 */
  content: string;
  /** 思维类型 */
  type: 'proposal' | 'evaluation' | 'decision' | 'reflection';
  /** 父思维ID */
  parentId: string | null;
  /** 子思维IDs */
  childrenIds: string[];
  /** 深度 */
  depth: number;
  /** 评估分数 (0-1) */
  score: number;
  /** 访问次数 */
  visitCount: number;
  /** 累积价值 */
  valueSum: number;
  /** 是否已评估 */
  isEvaluated: boolean;
  /** 是否有效 */
  isValid: boolean;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

export interface ThoughtNode {
  thought: Thought;
  /** 子节点 */
  children: ThoughtNode[];
  /** 父节点 */
  parent: ThoughtNode | null;
}

export interface SearchState {
  /** 当前问题 */
  problem: string;
  /** 当前步骤 */
  currentStep: number;
  /** 已完成的思维链 */
  thoughtChain: Thought[];
  /** 中间结果 */
  intermediateResults: Map<string, unknown>;
  /** 上下文信息 */
  context: Record<string, unknown>;
}

export interface EvaluationResult {
  /** 评估分数 (0-1) */
  score: number;
  /** 评估理由 */
  reasoning: string;
  /** 是否可行 */
  isFeasible: boolean;
  /** 改进建议 */
  suggestions?: string[];
}

export interface ToTResult {
  /** 最佳思维链 */
  bestThoughtChain: Thought[];
  /** 最终答案 */
  finalAnswer: string;
  /** 搜索树 */
  tree: ThoughtNode;
  /** 探索的思维数量 */
  exploredThoughts: number;
  /** 搜索深度 */
  searchDepth: number;
  /** 搜索时间 (ms) */
  searchTime: number;
  /** 所有有效的思维链 */
  allValidChains: Thought[][];
}

export interface ThoughtGenerator {
  /** 生成思维 */
  generate(state: SearchState, parentThought: Thought | null): Promise<string[]>;
}

export interface ThoughtEvaluator {
  /** 评估思维 */
  evaluate(thought: Thought, state: SearchState): Promise<EvaluationResult>;
}

// ============================================
// Tree of Thoughts 实现
// ============================================

export class TreeOfThoughts extends EventEmitter {
  private config: ToTConfig;
  private thoughtGenerator: ThoughtGenerator;
  private thoughtEvaluator: ThoughtEvaluator;

  // 思维存储
  private thoughts: Map<string, Thought> = new Map();
  private rootNode: ThoughtNode | null = null;

  constructor(
    thoughtGenerator: ThoughtGenerator,
    thoughtEvaluator: ThoughtEvaluator,
    config: Partial<ToTConfig> = {}
  ) {
    super();

    this.thoughtGenerator = thoughtGenerator;
    this.thoughtEvaluator = thoughtEvaluator;

    this.config = {
      searchStrategy: 'beam',
      thoughtsPerStep: 3,
      maxDepth: 5,
      beamWidth: 3,
      evaluationThreshold: 0.6,
      enableBacktracking: true,
      maxIterations: 100,
      temperature: 0.7,
      enablePruning: true,
      pruningThreshold: 0.3,
      ...config,
    };
  }

  /**
   * 解决问题
   */
  async solve(problem: string, context: Record<string, unknown> = {}): Promise<ToTResult> {
    const startTime = Date.now();

    // 初始化搜索状态
    const initialState: SearchState = {
      problem,
      currentStep: 0,
      thoughtChain: [],
      intermediateResults: new Map(),
      context,
    };

    // 创建根节点
    const rootThought = this.createThought(
      'root',
      `Problem: ${problem}`,
      'proposal',
      null,
      0
    );
    this.rootNode = this.createNode(rootThought, null);

    // 根据策略执行搜索
    let result: ToTResult;
    switch (this.config.searchStrategy) {
      case 'bfs':
        result = await this.bfsSearch(initialState);
        break;
      case 'dfs':
        result = await this.dfsSearch(initialState);
        break;
      case 'beam':
        result = await this.beamSearch(initialState);
        break;
      default:
        result = await this.beamSearch(initialState);
    }

    result.searchTime = Date.now() - startTime;

    this.emit('solved', result);
    return result;
  }

  /**
   * BFS 搜索
   */
  private async bfsSearch(initialState: SearchState): Promise<ToTResult> {
    const queue: { node: ThoughtNode; state: SearchState }[] = [
      { node: this.rootNode!, state: initialState },
    ];

    const validChains: Thought[][] = [];
    let exploredCount = 0;

    while (queue.length > 0 && exploredCount < this.config.maxIterations) {
      const { node, state } = queue.shift()!;
      exploredCount++;

      // 检查是否达到最大深度
      if (node.thought.depth >= this.config.maxDepth) {
        const chain = this.extractThoughtChain(node);
        if (this.isValidSolution(chain)) {
          validChains.push(chain);
        }
        continue;
      }

      // 生成子思维
      const childThoughts = await this.generateThoughts(node.thought, state);

      for (const thought of childThoughts) {
        // 评估思维
        const evaluation = await this.evaluateThought(thought, state);
        thought.score = evaluation.score;
        thought.isEvaluated = true;
        thought.isValid = evaluation.isFeasible;

        // 剪枝
        if (this.config.enablePruning && thought.score < this.config.pruningThreshold) {
          continue;
        }

        const childNode = this.createNode(thought, node);
        node.children.push(childNode);

        // 更新状态
        const newState: SearchState = {
          ...state,
          currentStep: state.currentStep + 1,
          thoughtChain: [...state.thoughtChain, thought],
        };

        queue.push({ node: childNode, state: newState });

        this.emit('thoughtGenerated', { thought, evaluation });
      }
    }

    // 选择最佳思维链
    const bestChain = this.selectBestChain(validChains);

    return {
      bestThoughtChain: bestChain,
      finalAnswer: this.generateAnswer(bestChain),
      tree: this.rootNode!,
      exploredThoughts: exploredCount,
      searchDepth: this.calculateTreeDepth(this.rootNode!),
      searchTime: 0,
      allValidChains: validChains,
    };
  }

  /**
   * DFS 搜索
   */
  private async dfsSearch(initialState: SearchState): Promise<ToTResult> {
    const validChains: Thought[][] = [];
    let exploredCount = 0;

    const dfs = async (node: ThoughtNode, state: SearchState): Promise<void> => {
      if (exploredCount >= this.config.maxIterations) return;
      exploredCount++;

      // 检查是否达到最大深度
      if (node.thought.depth >= this.config.maxDepth) {
        const chain = this.extractThoughtChain(node);
        if (this.isValidSolution(chain)) {
          validChains.push(chain);
        }
        return;
      }

      // 生成子思维
      const childThoughts = await this.generateThoughts(node.thought, state);

      // 按分数排序
      childThoughts.sort((a, b) => b.score - a.score);

      for (const thought of childThoughts) {
        // 评估思维
        if (!thought.isEvaluated) {
          const evaluation = await this.evaluateThought(thought, state);
          thought.score = evaluation.score;
          thought.isEvaluated = true;
          thought.isValid = evaluation.isFeasible;
        }

        // 剪枝
        if (this.config.enablePruning && thought.score < this.config.pruningThreshold) {
          continue;
        }

        const childNode = this.createNode(thought, node);
        node.children.push(childNode);

        // 更新状态
        const newState: SearchState = {
          ...state,
          currentStep: state.currentStep + 1,
          thoughtChain: [...state.thoughtChain, thought],
        };

        await dfs(childNode, newState);

        // 如果找到有效解且不需要回溯，提前终止
        if (validChains.length > 0 && !this.config.enableBacktracking) {
          return;
        }
      }
    };

    await dfs(this.rootNode!, initialState);

    const bestChain = this.selectBestChain(validChains);

    return {
      bestThoughtChain: bestChain,
      finalAnswer: this.generateAnswer(bestChain),
      tree: this.rootNode!,
      exploredThoughts: exploredCount,
      searchDepth: this.calculateTreeDepth(this.rootNode!),
      searchTime: 0,
      allValidChains: validChains,
    };
  }

  /**
   * Beam Search
   */
  private async beamSearch(initialState: SearchState): Promise<ToTResult> {
    // 初始化 beam
    let beam: { node: ThoughtNode; state: SearchState; score: number }[] = [
      { node: this.rootNode!, state: initialState, score: 1.0 },
    ];

    const validChains: Thought[][] = [];
    let exploredCount = 0;

    for (let step = 0; step < this.config.maxDepth; step++) {
      const candidates: { node: ThoughtNode; state: SearchState; score: number }[] = [];

      // 扩展 beam 中的每个节点
      for (const { node, state } of beam) {
        if (exploredCount >= this.config.maxIterations) break;

        // 生成子思维
        const childThoughts = await this.generateThoughts(node.thought, state);
        exploredCount += childThoughts.length;

        for (const thought of childThoughts) {
          // 评估思维
          const evaluation = await this.evaluateThought(thought, state);
          thought.score = evaluation.score;
          thought.isEvaluated = true;
          thought.isValid = evaluation.isFeasible;

          // 剪枝
          if (this.config.enablePruning && thought.score < this.config.pruningThreshold) {
            continue;
          }

          const childNode = this.createNode(thought, node);
          node.children.push(childNode);

          // 更新状态
          const newState: SearchState = {
            ...state,
            currentStep: state.currentStep + 1,
            thoughtChain: [...state.thoughtChain, thought],
          };

          candidates.push({
            node: childNode,
            state: newState,
            score: thought.score,
          });

          // 检查是否是有效解
          if (this.isValidSolution(this.extractThoughtChain(childNode))) {
            validChains.push(this.extractThoughtChain(childNode));
          }
        }
      }

      // 选择 top-k 作为新的 beam
      candidates.sort((a, b) => b.score - a.score);
      beam = candidates.slice(0, this.config.beamWidth);

      this.emit('beamUpdated', { step, beamSize: beam.length });

      if (beam.length === 0) break;
    }

    // 选择最佳思维链
    const bestChain = this.selectBestChain(validChains.length > 0 ? validChains : beam.map(b => this.extractThoughtChain(b.node)));

    return {
      bestThoughtChain: bestChain,
      finalAnswer: this.generateAnswer(bestChain),
      tree: this.rootNode!,
      exploredThoughts: exploredCount,
      searchDepth: this.calculateTreeDepth(this.rootNode!),
      searchTime: 0,
      allValidChains: validChains,
    };
  }

  /**
   * 生成思维
   */
  private async generateThoughts(
    parentThought: Thought,
    state: SearchState
  ): Promise<Thought[]> {
    const contents = await this.thoughtGenerator.generate(state, parentThought);

    return contents.slice(0, this.config.thoughtsPerStep).map((content, index) =>
      this.createThought(
        `${parentThought.id}-${index}`,
        content,
        'proposal',
        parentThought.id,
        parentThought.depth + 1
      )
    );
  }

  /**
   * 评估思维
   */
  private async evaluateThought(
    thought: Thought,
    state: SearchState
  ): Promise<EvaluationResult> {
    return await this.thoughtEvaluator.evaluate(thought, state);
  }

  /**
   * 创建思维
   */
  private createThought(
    id: string,
    content: string,
    type: Thought['type'],
    parentId: string | null,
    depth: number
  ): Thought {
    const thought: Thought = {
      id,
      content,
      type,
      parentId,
      childrenIds: [],
      depth,
      score: 0,
      visitCount: 0,
      valueSum: 0,
      isEvaluated: false,
      isValid: true,
    };

    this.thoughts.set(id, thought);
    return thought;
  }

  /**
   * 创建节点
   */
  private createNode(thought: Thought, parent: ThoughtNode | null): ThoughtNode {
    const node: ThoughtNode = {
      thought,
      children: [],
      parent,
    };

    if (parent) {
      parent.thought.childrenIds.push(thought.id);
    }

    return node;
  }

  /**
   * 提取思维链
   */
  private extractThoughtChain(node: ThoughtNode): Thought[] {
    const chain: Thought[] = [];
    let current: ThoughtNode | null = node;

    while (current) {
      chain.unshift(current.thought);
      current = current.parent;
    }

    return chain;
  }

  /**
   * 检查是否是有效解
   */
  private isValidSolution(chain: Thought[]): boolean {
    if (chain.length < 2) return false;

    // 检查最后几个思维的平均分数
    const recentThoughts = chain.slice(-3);
    const avgScore = recentThoughts.reduce((sum, t) => sum + t.score, 0) / recentThoughts.length;

    return avgScore >= this.config.evaluationThreshold;
  }

  /**
   * 选择最佳思维链
   */
  private selectBestChain(chains: Thought[][]): Thought[] {
    if (chains.length === 0) {
      // 如果没有有效链，返回最长链
      return this.findLongestChain();
    }

    // 按平均分数排序
    chains.sort((a, b) => {
      const avgScoreA = a.reduce((sum, t) => sum + t.score, 0) / a.length;
      const avgScoreB = b.reduce((sum, t) => sum + t.score, 0) / b.length;
      return avgScoreB - avgScoreA;
    });

    return chains[0];
  }

  /**
   * 查找最长链
   */
  private findLongestChain(): Thought[] {
    let longest: Thought[] = [];

    const dfs = (node: ThoughtNode, currentChain: Thought[]) => {
      const newChain = [...currentChain, node.thought];

      if (newChain.length > longest.length) {
        longest = newChain;
      }

      for (const child of node.children) {
        dfs(child, newChain);
      }
    };

    if (this.rootNode) {
      dfs(this.rootNode, []);
    }

    return longest;
  }

  /**
   * 生成最终答案
   */
  private generateAnswer(chain: Thought[]): string {
    if (chain.length === 0) return 'No solution found';

    // 组合思维链中的内容
    const relevantThoughts = chain.filter(t => t.type === 'proposal' && t.depth > 0);

    if (relevantThoughts.length === 0) {
      return chain[chain.length - 1]?.content || 'No solution found';
    }

    return relevantThoughts.map(t => t.content).join('\n\n');
  }

  /**
   * 计算树深度
   */
  private calculateTreeDepth(node: ThoughtNode): number {
    if (node.children.length === 0) return 0;

    let maxDepth = 0;
    for (const child of node.children) {
      maxDepth = Math.max(maxDepth, this.calculateTreeDepth(child));
    }

    return maxDepth + 1;
  }

  /**
   * 获取搜索树
   */
  getTree(): ThoughtNode | null {
    return this.rootNode;
  }

  /**
   * 获取所有思维
   */
  getAllThoughts(): Thought[] {
    return Array.from(this.thoughts.values());
  }

  /**
   * 清空
   */
  clear(): void {
    this.thoughts.clear();
    this.rootNode = null;
  }
}

// ============================================
// 默认实现
// ============================================

/**
 * 默认思维生成器
 */
export class DefaultThoughtGenerator implements ThoughtGenerator {
  async generate(state: SearchState, parentThought: Thought | null): Promise<string[]> {
    // 这里应该调用 LLM 生成思维
    // 简化版：返回几个候选思维模板

    const problem = state.problem;
    const step = state.currentStep;

    const templates = [
      `Step ${step + 1}: Analyze the key components of "${problem}"`,
      `Step ${step + 1}: Consider different approaches to solve "${problem}"`,
      `Step ${step + 1}: Break down "${problem}" into smaller sub-problems`,
      `Step ${step + 1}: Identify constraints and requirements for "${problem}"`,
      `Step ${step + 1}: Think about edge cases for "${problem}"`,
    ];

    // 根据父思维调整
    if (parentThought) {
      return templates.map(t => `${parentThought.content}\n${t}`);
    }

    return templates;
  }
}

/**
 * 默认思维评估器
 */
export class DefaultThoughtEvaluator implements ThoughtEvaluator {
  async evaluate(thought: Thought, _state: SearchState): Promise<EvaluationResult> {
    // 这里应该调用 LLM 评估思维质量
    // 简化版：基于启发式规则评估

    const content = thought.content.toLowerCase();
    let score = 0.5;
    let isFeasible = true;
    const suggestions: string[] = [];

    // 启发式评分规则
    if (content.includes('analyze') || content.includes('break down')) {
      score += 0.2;
    }
    if (content.includes('consider') || content.includes('approach')) {
      score += 0.15;
    }
    if (content.length > 50) {
      score += 0.1;
    }
    if (content.includes('error') || content.includes('wrong')) {
      score -= 0.3;
      isFeasible = false;
    }

    // 确保分数在 [0, 1] 范围内
    score = Math.max(0, Math.min(1, score));

    if (score < 0.5) {
      suggestions.push('Consider providing more specific details');
    }

    return {
      score,
      reasoning: `Evaluated based on content quality and relevance`,
      isFeasible,
      suggestions,
    };
  }
}

// ============================================
// 导出便捷函数
// ============================================

export function createTreeOfThoughts(
  generator?: ThoughtGenerator,
  evaluator?: ThoughtEvaluator,
  config?: Partial<ToTConfig>
): TreeOfThoughts {
  return new TreeOfThoughts(
    generator || new DefaultThoughtGenerator(),
    evaluator || new DefaultThoughtEvaluator(),
    config
  );
}

export function createDefaultToTConfig(): ToTConfig {
  return {
    searchStrategy: 'beam',
    thoughtsPerStep: 3,
    maxDepth: 5,
    beamWidth: 3,
    evaluationThreshold: 0.6,
    enableBacktracking: true,
    maxIterations: 100,
    temperature: 0.7,
    enablePruning: true,
    pruningThreshold: 0.3,
  };
}
