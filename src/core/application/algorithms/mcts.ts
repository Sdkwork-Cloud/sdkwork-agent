/**
 * Monte Carlo Tree Search (MCTS) Algorithm
 * For decision making in complex state spaces
 * Reference: AlphaGo, MuZero
 */

import { EventEmitter } from '../../../utils/event-emitter.js';

// ============================================================================
// Core Types
// ============================================================================

export interface State {
  id: string;
  isTerminal: boolean;
  getAvailableActions(): Action[];
  applyAction(action: Action): State;
  getReward(): number;
  copy(): State;
}

export interface Action {
  id: string;
  description?: string;
}

export interface MCTSNode {
  state: State;
  action?: Action;
  parent?: MCTSNode;
  children: MCTSNode[];
  visits: number;
  value: number;
  untriedActions: Action[];
  isFullyExpanded: boolean;
}

export interface MCTSConfig {
  iterations: number;
  explorationConstant: number;  // UCT constant C
  maxDepth: number;
  simulationDepth: number;
  timeout?: number;
}

export interface MCTSResult {
  bestAction: Action;
  bestValue: number;
  rootValue: number;
  iterations: number;
  tree: MCTSNode;
  confidence: number;
  actionProbabilities: Map<string, number>;
}

// ============================================================================
// MCTS Implementation
// ============================================================================

export class MCTS extends EventEmitter {
  private config: MCTSConfig;

  constructor(config: Partial<MCTSConfig> = {}) {
    super();
    this.config = {
      iterations: 1000,
      explorationConstant: Math.sqrt(2),
      maxDepth: 50,
      simulationDepth: 20,
      ...config,
    };
  }

  /**
   * Run MCTS to find the best action
   */
  async search(initialState: State): Promise<MCTSResult> {
    const root = this._createNode(initialState);
    const startTime = Date.now();
    let iterations = 0;

    this.emit('search:started', { state: initialState.id });

    while (iterations < this.config.iterations) {
      // Check timeout
      if (this.config.timeout && Date.now() - startTime > this.config.timeout) {
        break;
      }

      // 1. Selection: Select promising node using UCT
      const node = this._select(root);

      // 2. Expansion: Expand if not terminal and not fully expanded
      let expandedNode = node;
      if (!node.state.isTerminal && !node.isFullyExpanded) {
        expandedNode = this._expand(node);
      }

      // 3. Simulation: Run random simulation from expanded node
      const reward = this._simulate(expandedNode);

      // 4. Backpropagation: Update statistics back to root
      this._backpropagate(expandedNode, reward);

      iterations++;

      if (iterations % 100 === 0) {
        this.emit('search:progress', { iterations, bestValue: root.value / root.visits });
      }
    }

    // Select best action
    const bestChild = this._getBestChild(root, 0); // No exploration
    const actionProbabilities = this._calculateActionProbabilities(root);

    const result: MCTSResult = {
      bestAction: bestChild.action!,
      bestValue: bestChild.value / bestChild.visits,
      rootValue: root.value / root.visits,
      iterations,
      tree: root,
      confidence: this._calculateConfidence(root, bestChild),
      actionProbabilities,
    };

    this.emit('search:completed', result);
    return result;
  }

  /**
   * UCT Selection - Select node with highest UCT value
   */
  private _select(node: MCTSNode): MCTSNode {
    let current = node;
    let depth = 0;

    while (!current.state.isTerminal && current.isFullyExpanded && depth < this.config.maxDepth) {
      current = this._getBestChild(current, this.config.explorationConstant);
      depth++;
    }

    return current;
  }

  /**
   * Expansion - Add a new child node
   */
  private _expand(node: MCTSNode): MCTSNode {
    const action = node.untriedActions.pop()!;
    const newState = node.state.applyAction(action);
    const child = this._createNode(newState, action, node);
    node.children.push(child);

    if (node.untriedActions.length === 0) {
      node.isFullyExpanded = true;
    }

    this.emit('node:expanded', { parent: node.state.id, action: action.id });
    return child;
  }

  /**
   * Simulation - Run random playout
   */
  private _simulate(node: MCTSNode): number {
    let state = node.state.copy();
    let depth = 0;

    while (!state.isTerminal && depth < this.config.simulationDepth) {
      const actions = state.getAvailableActions();
      if (actions.length === 0) break;

      // Random action selection (can be replaced with policy network)
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      state = state.applyAction(randomAction);
      depth++;
    }

    return state.getReward();
  }

  /**
   * Backpropagation - Update node statistics
   */
  private _backpropagate(node: MCTSNode, reward: number): void {
    let current: MCTSNode | undefined = node;

    while (current) {
      current.visits++;
      current.value += reward;
      current = current.parent;
    }
  }

  /**
   * UCT Formula - Upper Confidence Bound for Trees
   */
  private _uctValue(node: MCTSNode, parentVisits: number, c: number): number {
    if (node.visits === 0) {
      return Infinity;
    }

    const exploitation = node.value / node.visits;
    const exploration = c * Math.sqrt(Math.log(parentVisits) / node.visits);

    return exploitation + exploration;
  }

  /**
   * Get best child based on UCT value
   */
  private _getBestChild(node: MCTSNode, c: number): MCTSNode {
    let bestChild = node.children[0];
    let bestValue = this._uctValue(bestChild, node.visits, c);

    for (let i = 1; i < node.children.length; i++) {
      const child = node.children[i];
      const value = this._uctValue(child, node.visits, c);

      if (value > bestValue) {
        bestValue = value;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * Create new MCTS node
   */
  private _createNode(state: State, action?: Action, parent?: MCTSNode): MCTSNode {
    return {
      state,
      action,
      parent,
      children: [],
      visits: 0,
      value: 0,
      untriedActions: state.getAvailableActions(),
      isFullyExpanded: false,
    };
  }

  /**
   * Calculate action probabilities based on visit counts
   */
  private _calculateActionProbabilities(root: MCTSNode): Map<string, number> {
    const totalVisits = root.children.reduce((sum, child) => sum + child.visits, 0);
    const probabilities = new Map<string, number>();

    for (const child of root.children) {
      const probability = totalVisits > 0 ? child.visits / totalVisits : 0;
      probabilities.set(child.action!.id, probability);
    }

    return probabilities;
  }

  /**
   * Calculate confidence in the best action
   */
  private _calculateConfidence(root: MCTSNode, bestChild: MCTSNode): number {
    if (root.children.length === 0) return 0;

    const totalVisits = root.visits;
    const bestVisits = bestChild.visits;

    // Confidence based on visit ratio and number of alternatives
    const visitRatio = bestVisits / totalVisits;
    const alternatives = root.children.length - 1;

    return visitRatio * (1 - 1 / (alternatives + 1));
  }
}

// ============================================================================
// Async MCTS for LLM-based simulations
// ============================================================================

export interface AsyncState extends State {
  generateActions(llm: unknown): Promise<Action[]>;
  evaluate(llm: unknown): Promise<number>;
}

export class AsyncMCTS extends MCTS {
  private llm: unknown;
  private mctsConfig: MCTSConfig;

  constructor(llm: unknown, config?: Partial<MCTSConfig>) {
    super(config);
    this.llm = llm;
    this.mctsConfig = {
      iterations: 1000,
      explorationConstant: Math.sqrt(2),
      maxDepth: 50,
      simulationDepth: 20,
      ...config,
    };
  }

  /**
   * Async simulation using LLM for action generation and evaluation
   */
  protected async _simulateAsync(node: MCTSNode): Promise<number> {
    if (!this._isAsyncState(node.state)) {
      // Call parent _simulate via any to bypass private access
      return (this as any)._simulate(node);
    }

    const state = node.state as AsyncState;
    let currentState = state.copy() as AsyncState;
    let depth = 0;
    let totalReward = 0;

    while (!currentState.isTerminal && depth < this.mctsConfig.simulationDepth) {
      // Use LLM to generate and evaluate actions
      const actions = await currentState.generateActions(this.llm);
      if (actions.length === 0) break;

      // Select action based on LLM evaluation
      const actionScores = await Promise.all(
        actions.map(async (action) => {
          const nextState = currentState.applyAction(action) as AsyncState;
          const score = await nextState.evaluate(this.llm);
          return { action, score };
        })
      );

      // Select best action
      actionScores.sort((a, b) => b.score - a.score);
      const bestAction = actionScores[0].action;

      currentState = currentState.applyAction(bestAction) as AsyncState;
      totalReward += await currentState.evaluate(this.llm);
      depth++;
    }

    return totalReward / Math.max(depth, 1);
  }

  private _isAsyncState(state: State): state is AsyncState {
    return 'generateActions' in state && 'evaluate' in state;
  }
}

export default MCTS;
