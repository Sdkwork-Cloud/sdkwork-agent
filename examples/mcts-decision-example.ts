/**
 * Example: MCTS Decision Engine
 *
 * This example demonstrates how to use the MCTS (Monte Carlo Tree Search)
 * decision engine for complex multi-step decision making. It includes
 * multiple scenarios and custom policies to showcase the versatility
 * of the MCTS algorithm.
 *
 * Key features demonstrated:
 * - Basic MCTS decision making for game AI
 * - Custom simulation policies
 * - Configuration comparison (Fast/Balanced/Thorough)
 * - Multi-scenario decision making
 * - Resource allocation optimization
 * - Real-time strategy simulation
 * - Performance analysis
 */

import { MCTSDecisionEngine, MCTSFactory, DecisionState, Action } from '../src/algorithms/mcts-decision-engine';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'MCTSExample');

// Define multiple decision scenarios

// Scenario 1: Game AI (Tic-Tac-Toe)
interface GameState extends DecisionState {
  board: number[][];
  currentPlayer: number;
  score: number;
}

// Scenario 2: Resource Allocation
interface ResourceState extends DecisionState {
  resources: {
    money: number;
    time: number;
    materials: number;
  };
  projects: Array<{
    id: string;
    name: string;
    expectedReturn: number;
    resourceCost: {
      money: number;
      time: number;
      materials: number;
    };
  }>;
}

// Scenario 3: Real-time Strategy
interface RTSScenario extends DecisionState {
  units: number;
  buildings: number;
  resources: number;
  enemyStrength: number;
  timeRemaining: number;
}

class MCTSDecisionExample {
  async runGameAIScenario() {
    logger.info('=== Scenario 1: Game AI (Tic-Tac-Toe) ===');

    // Create MCTS with balanced configuration
    const mcts = MCTSFactory.createBalanced();

    // Define initial game state
    const initialState: GameState = {
      id: 'game-initial',
      features: [0, 0, 0, 0, 0, 0, 0, 0, 0], // 3x3 board flattened
      isTerminal: false,
      depth: 0,
      board: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      currentPlayer: 1,
      score: 0,
    };

    // Define available actions
    const actions: Action[] = [
      { id: 'move-0-0', name: 'Place at (0,0)', description: 'Top-left corner' },
      { id: 'move-0-1', name: 'Place at (0,1)', description: 'Top-center' },
      { id: 'move-0-2', name: 'Place at (0,2)', description: 'Top-right corner' },
      { id: 'move-1-0', name: 'Place at (1,0)', description: 'Middle-left' },
      { id: 'move-1-1', name: 'Place at (1,1)', description: 'Center', priorProbability: 0.3 }, // Center is usually best
      { id: 'move-1-2', name: 'Place at (1,2)', description: 'Middle-right' },
      { id: 'move-2-0', name: 'Place at (2,0)', description: 'Bottom-left corner' },
      { id: 'move-2-1', name: 'Place at (2,1)', description: 'Bottom-center' },
      { id: 'move-2-2', name: 'Place at (2,2)', description: 'Bottom-right corner' },
    ];

    logger.info('Starting MCTS decision process for game AI...');
    logger.info(`Available actions: ${actions.length}`);

    // Make decision
    const startTime = Date.now();
    const result = await mcts.decide(initialState, actions);
    const decisionTime = Date.now() - startTime;

    // Log results
    logger.info('\n=== Decision Results ===');
    logger.info(`Selected action: ${result.selectedAction.name}`);
    logger.info(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    logger.info(`Estimated value: ${result.estimatedValue.toFixed(4)}`);
    logger.info(`Visit count: ${result.visitCount}`);
    logger.info(`Decision time: ${decisionTime}ms`);

    logger.info('\n=== Action Statistics ===');
    result.actionStats.forEach((stat, index) => {
      logger.info(
        `${index + 1}. ${stat.action.name} - ` +
        `Visits: ${stat.visitCount}, ` +
        `Mean Reward: ${stat.meanReward.toFixed(4)}, ` +
        `UCB: ${stat.ucbScore.toFixed(4)}`
      );
    });

    logger.info('\n=== Tree Statistics ===');
    logger.info(`Total nodes: ${result.treeStats.totalNodes}`);
    logger.info(`Total visits: ${result.treeStats.totalVisits}`);
    logger.info(`Max depth: ${result.treeStats.maxDepth}`);
    logger.info(`Average depth: ${result.treeStats.averageDepth.toFixed(2)}`);
    logger.info(`Leaf nodes: ${result.treeStats.leafNodes}`);

    return result;
  }

  async runResourceAllocationScenario() {
    logger.info('\n=== Scenario 2: Resource Allocation ===');

    // Create custom simulation policy for resource allocation
    const resourcePolicy = {
      selectAction: async (state: DecisionState, availableActions: Action[]) => {
        // Heuristic: prefer actions with higher expected return
        const resourceState = state as ResourceState;
        const actionsWithValue = availableActions.map(action => {
          const project = resourceState.projects.find(p => p.id === action.id);
          return {
            action,
            value: project ? project.expectedReturn : 0,
          };
        });
        
        // Sort by expected return
        actionsWithValue.sort((a, b) => b.value - a.value);
        
        // Return best action with 70% probability, others randomly
        if (Math.random() < 0.7 && actionsWithValue.length > 0) {
          return actionsWithValue[0].action;
        }
        return availableActions[Math.floor(Math.random() * availableActions.length)];
      },
      evaluateTerminal: (state: DecisionState) => {
        const resourceState = state as ResourceState;
        // Simple evaluation: total expected return from selected projects
        return resourceState.projects.reduce((sum, project) => sum + project.expectedReturn, 0) / 100;
      },
    };

    // Create MCTS with custom policy
    const mcts = new MCTSDecisionEngine(resourcePolicy, {
      explorationConstant: 1.2,
      maxIterations: 800,
      parallelSimulations: 3,
    });

    // Define initial resource state
    const initialState: ResourceState = {
      id: 'resource-initial',
      features: [1000, 40, 50], // money, time, materials
      isTerminal: false,
      depth: 0,
      resources: {
        money: 1000,
        time: 40,
        materials: 50,
      },
      projects: [
        {
          id: 'project-1',
          name: 'Build Factory',
          expectedReturn: 500,
          resourceCost: {
            money: 300,
            time: 10,
            materials: 20,
          },
        },
        {
          id: 'project-2',
          name: 'Research Technology',
          expectedReturn: 300,
          resourceCost: {
            money: 200,
            time: 15,
            materials: 5,
          },
        },
        {
          id: 'project-3',
          name: 'Expand Warehouse',
          expectedReturn: 200,
          resourceCost: {
            money: 150,
            time: 8,
            materials: 15,
          },
        },
        {
          id: 'project-4',
          name: 'Hire Workers',
          expectedReturn: 150,
          resourceCost: {
            money: 100,
            time: 5,
            materials: 0,
          },
        },
      ],
    };

    // Define available actions
    const actions: Action[] = initialState.projects.map(project => ({
      id: project.id,
      name: project.name,
      description: `Expected return: ${project.expectedReturn}`,
      priorProbability: project.expectedReturn / 1150, // Normalized
    }));

    logger.info('Starting resource allocation decision process...');
    logger.info(`Available projects: ${actions.length}`);

    // Make decision
    const startTime = Date.now();
    const result = await mcts.decide(initialState, actions);
    const decisionTime = Date.now() - startTime;

    logger.info('\n=== Resource Allocation Results ===');
    logger.info(`Selected project: ${result.selectedAction.name}`);
    logger.info(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    logger.info(`Estimated value: ${result.estimatedValue.toFixed(4)}`);
    logger.info(`Decision time: ${decisionTime}ms`);

    return result;
  }

  async runRTSScenario() {
    logger.info('\n=== Scenario 3: Real-time Strategy ===');

    // Create MCTS with thorough configuration for RTS
    const mcts = MCTSFactory.createThorough();

    // Define initial RTS state
    const initialState: RTSScenario = {
      id: 'rts-initial',
      features: [10, 3, 500, 15, 180], // units, buildings, resources, enemy strength, time remaining
      isTerminal: false,
      depth: 0,
      units: 10,
      buildings: 3,
      resources: 500,
      enemyStrength: 15,
      timeRemaining: 180, // seconds
    };

    // Define available actions
    const actions: Action[] = [
      {
        id: 'build-units',
        name: 'Build Combat Units',
        description: 'Increase military strength',
        priorProbability: 0.4,
      },
      {
        id: 'build-buildings',
        name: 'Construct Buildings',
        description: 'Increase resource production',
        priorProbability: 0.3,
      },
      {
        id: 'research',
        name: 'Research Technology',
        description: 'Improve unit effectiveness',
        priorProbability: 0.2,
      },
      {
        id: 'scout',
        name: 'Scout Enemy',
        description: 'Gather intelligence',
        priorProbability: 0.1,
      },
    ];

    logger.info('Starting RTS decision process...');
    logger.info(`Available strategies: ${actions.length}`);

    // Make decision
    const startTime = Date.now();
    const result = await mcts.decide(initialState, actions);
    const decisionTime = Date.now() - startTime;

    logger.info('\n=== RTS Strategy Results ===');
    logger.info(`Selected strategy: ${result.selectedAction.name}`);
    logger.info(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    logger.info(`Estimated value: ${result.estimatedValue.toFixed(4)}`);
    logger.info(`Decision time: ${decisionTime}ms`);

    return result;
  }

  async compareConfigurations() {
    logger.info('\n=== Configuration Comparison ===');

    const configs = [
      { name: 'Fast', mcts: MCTSFactory.createFast() },
      { name: 'Balanced', mcts: MCTSFactory.createBalanced() },
      { name: 'Thorough', mcts: MCTSFactory.createThorough() },
    ];

    // Define test state
    const initialState: GameState = {
      id: 'game-compare',
      features: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      isTerminal: false,
      depth: 0,
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      currentPlayer: 1,
      score: 0,
    };

    const actions: Action[] = [
      { id: 'move-0-0', name: 'Place at (0,0)' },
      { id: 'move-1-1', name: 'Place at (1,1)', priorProbability: 0.3 },
      { id: 'move-2-2', name: 'Place at (2,2)' },
    ];

    logger.info('Comparing MCTS configurations...');

    for (const { name, mcts } of configs) {
      const startTime = Date.now();
      const result = await mcts.decide(initialState, actions);
      const duration = Date.now() - startTime;

      logger.info(
        `${name}: Selected ${result.selectedAction.name}, ` +
        `Time: ${duration}ms, ` +
        `Nodes: ${result.treeStats.totalNodes}, ` +
        `Visits: ${result.treeStats.totalVisits}, ` +
        `Confidence: ${(result.confidence * 100).toFixed(1)}%`
      );
    }
  }

  async analyzePerformance() {
    logger.info('\n=== Performance Analysis ===');

    const scenarios = [
      { name: 'Game AI', scenario: () => this.runGameAIScenario() },
      { name: 'Resource Allocation', scenario: () => this.runResourceAllocationScenario() },
      { name: 'RTS', scenario: () => this.runRTSScenario() },
    ];

    const performanceResults: Array<{
      scenario: string;
      time: number;
      nodes: number;
      visits: number;
    }> = [];

    for (const { name, scenario } of scenarios) {
      const startTime = Date.now();
      const result = await scenario();
      const duration = Date.now() - startTime;
      
      performanceResults.push({
        scenario: name,
        time: duration,
        nodes: result.treeStats.totalNodes,
        visits: result.treeStats.totalVisits,
      });
    }

    logger.info('\n=== Performance Summary ===');
    performanceResults.forEach(result => {
      logger.info(
        `${result.scenario}: ` +
        `Time: ${result.time}ms, ` +
        `Nodes: ${result.nodes}, ` +
        `Visits: ${result.visits}, ` +
        `Efficiency: ${(result.visits / result.time).toFixed(2)} visits/ms`
      );
    });
  }
}

// Run the example
async function main() {
  const example = new MCTSDecisionExample();

  try {
    await example.runGameAIScenario();
    await example.runResourceAllocationScenario();
    await example.runRTSScenario();
    await example.compareConfigurations();
    await example.analyzePerformance();

    logger.info('\n=== All MCTS scenarios completed successfully ===');
  } catch (error) {
    logger.error('Example failed:', {}, error as Error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { MCTSDecisionExample };
