/**
 * Hierarchical Task Network (HTN) Planning
 * For complex task decomposition and planning
 * Reference: SHOP, HTN-PLAN
 */

import { EventEmitter } from '../../../utils/event-emitter.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Core Types
// ============================================================================

export type TaskType = 'primitive' | 'compound';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  parameters: Record<string, unknown>;
  preconditions?: Condition[];
  effects?: Effect[];
}

export interface PrimitiveTask extends Task {
  type: 'primitive';
  execute: (state: WorldState, parameters: Record<string, unknown>) => Promise<WorldState>;
  cost?: number;
}

export interface CompoundTask extends Task {
  type: 'compound';
  methods: Method[];
}

export interface Method {
  id: string;
  name: string;
  preconditions: Condition[];
  subtasks: Task[];
  cost?: number;
}

export interface Condition {
  type: 'equals' | 'exists' | 'not' | 'and' | 'or' | 'gt' | 'lt';
  field?: string;
  value?: unknown;
  conditions?: Condition[];
}

export interface Effect {
  type: 'set' | 'add' | 'remove' | 'increase' | 'decrease';
  field: string;
  value?: unknown;
  amount?: number;
}

export interface WorldState {
  [key: string]: unknown;
  copy(): WorldState;
  equals(other: WorldState): boolean;
}

export interface Plan {
  id: string;
  tasks: PrimitiveTask[];
  totalCost: number;
  depth: number;
  state: WorldState;
}

export interface HTNConfig {
  maxDepth: number;
  maxPlans: number;
  timeout?: number;
  allowPartialPlans: boolean;
}

export interface HTNResult {
  plans: Plan[];
  selectedPlan: Plan | null;
  decompositionTree: DecompositionNode;
  metrics: {
    nodesExplored: number;
    plansGenerated: number;
    timeMs: number;
  };
}

export interface DecompositionNode {
  task: Task;
  method?: Method;
  children: DecompositionNode[];
  state: WorldState;
}

// ============================================================================
// HTN Planner Implementation
// ============================================================================

export class HTNPlanner extends EventEmitter {
  private config: HTNConfig;
  private tasks = new Map<string, Task>();

  constructor(config: Partial<HTNConfig> = {}) {
    super();
    this.config = {
      maxDepth: 100,
      maxPlans: 10,
      allowPartialPlans: false,
      ...config,
    };
  }

  /**
   * Register a task (primitive or compound)
   */
  registerTask(task: Task): void {
    this.tasks.set(task.id, task);
    this.emit('task:registered', { taskId: task.id, type: task.type });
  }

  /**
   * Plan to achieve a goal from initial state
   */
  async plan(
    goal: CompoundTask,
    initialState: WorldState
  ): Promise<HTNResult> {
    const startTime = Date.now();
    const plans: Plan[] = [];
    const rootNode: DecompositionNode = {
      task: goal,
      children: [],
      state: initialState.copy(),
    };

    this.emit('planning:started', { goal: goal.name });

    let nodesExplored = 0;

    const search = async (
      task: Task,
      state: WorldState,
      currentPlan: PrimitiveTask[],
      depth: number,
      parentNode: DecompositionNode
    ): Promise<boolean> => {
      // Check constraints
      if (depth > this.config.maxDepth) {
        return false;
      }

      if (this.config.timeout && Date.now() - startTime > this.config.timeout) {
        return false;
      }

      if (plans.length >= this.config.maxPlans) {
        return false;
      }

      nodesExplored++;

      // Check preconditions
      if (task.preconditions && !this._checkConditions(task.preconditions, state)) {
        return false;
      }

      if (task.type === 'primitive') {
        const primitive = task as PrimitiveTask;

        // Execute primitive task
        try {
          const newState = await primitive.execute(state, task.parameters);

          // Apply effects
          const finalState = this._applyEffects(task.effects || [], newState);

          const newPlan = [...currentPlan, primitive];

          // Create leaf node
          const node: DecompositionNode = {
            task,
            children: [],
            state: finalState.copy(),
          };
          parentNode.children.push(node);

          // Check if this completes a plan
          if (this._isGoalSatisfied(goal, finalState)) {
            const plan: Plan = {
              id: uuidv4(),
              tasks: newPlan,
              totalCost: this._calculatePlanCost(newPlan),
              depth,
              state: finalState.copy(),
            };
            plans.push(plan);
            this.emit('plan:found', { planId: plan.id, cost: plan.totalCost });
          }

          return true;
        } catch (error) {
          this.emit('task:failed', { taskId: task.id, error });
          return false;
        }
      } else {
        // Compound task - try each method
        const compound = task as CompoundTask;
        let anySuccess = false;

        for (const method of compound.methods) {
          // Check method preconditions
          if (!this._checkConditions(method.preconditions, state)) {
            continue;
          }

          // Create method node
          const methodNode: DecompositionNode = {
            task,
            method,
            children: [],
            state: state.copy(),
          };
          parentNode.children.push(methodNode);

          // Try to execute all subtasks
          let currentState = state.copy();
          let allSucceeded = true;
          const subPlan: PrimitiveTask[] = [...currentPlan];

          for (const subtask of method.subtasks) {
            // Instantiate subtask with parameters
            const instantiatedSubtask = this._instantiateTask(subtask, task.parameters);

            const success = await search(
              instantiatedSubtask,
              currentState,
              subPlan,
              depth + 1,
              methodNode
            );

            if (!success) {
              allSucceeded = false;
              break;
            }

            // Update state for next subtask
            const lastTask = subPlan[subPlan.length - 1];
            if (lastTask) {
              currentState = this._applyEffects(
                lastTask.effects || [],
                currentState
              );
            }
          }

          if (allSucceeded) {
            anySuccess = true;
          }
        }

        return anySuccess;
      }
    };

    await search(goal, initialState, [], 0, rootNode);

    // Sort plans by cost
    plans.sort((a, b) => a.totalCost - b.totalCost);

    const result: HTNResult = {
      plans,
      selectedPlan: plans[0] || null,
      decompositionTree: rootNode,
      metrics: {
        nodesExplored,
        plansGenerated: plans.length,
        timeMs: Date.now() - startTime,
      },
    };

    this.emit('planning:completed', result);
    return result;
  }

  /**
   * Execute a plan
   */
  async executePlan(plan: Plan, initialState: WorldState): Promise<{
    success: boolean;
    finalState: WorldState;
    executedTasks: PrimitiveTask[];
    failedTask?: PrimitiveTask;
    error?: Error;
  }> {
    this.emit('execution:started', { planId: plan.id });

    let state = initialState.copy();
    const executedTasks: PrimitiveTask[] = [];

    for (const task of plan.tasks) {
      try {
        this.emit('task:executing', { taskId: task.id });

        state = await task.execute(state, task.parameters);
        executedTasks.push(task);

        this.emit('task:completed', { taskId: task.id });
      } catch (error) {
        this.emit('task:failed', { taskId: task.id, error });

        return {
          success: false,
          finalState: state,
          executedTasks,
          failedTask: task,
          error: error as Error,
        };
      }
    }

    this.emit('execution:completed', { planId: plan.id });

    return {
      success: true,
      finalState: state,
      executedTasks,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _checkConditions(conditions: Condition[], state: WorldState): boolean {
    return conditions.every(condition => this._checkCondition(condition, state));
  }

  private _checkCondition(condition: Condition, state: WorldState): boolean {
    switch (condition.type) {
      case 'equals':
        return state[condition.field!] === condition.value;

      case 'exists':
        return condition.field! in state;

      case 'not':
        return condition.conditions ?
          !this._checkConditions(condition.conditions, state) :
          true;

      case 'and':
        return condition.conditions ?
          this._checkConditions(condition.conditions, state) :
          true;

      case 'or':
        return condition.conditions ?
          condition.conditions.some(c => this._checkCondition(c, state)) :
          false;

      case 'gt':
        return (state[condition.field!] as number) > (condition.value as number);

      case 'lt':
        return (state[condition.field!] as number) < (condition.value as number);

      default:
        return false;
    }
  }

  private _applyEffects(effects: Effect[], state: WorldState): WorldState {
    const newState = state.copy();

    for (const effect of effects) {
      switch (effect.type) {
        case 'set':
          newState[effect.field] = effect.value;
          break;

        case 'add':
          if (Array.isArray(newState[effect.field])) {
            (newState[effect.field] as unknown[]).push(effect.value);
          }
          break;

        case 'remove':
          if (Array.isArray(newState[effect.field])) {
            const arr = newState[effect.field] as unknown[];
            const index = arr.indexOf(effect.value);
            if (index > -1) {
              arr.splice(index, 1);
            }
          }
          break;

        case 'increase':
          newState[effect.field] = (newState[effect.field] as number || 0) + (effect.amount || 1);
          break;

        case 'decrease':
          newState[effect.field] = (newState[effect.field] as number || 0) - (effect.amount || 1);
          break;
      }
    }

    return newState;
  }

  private _instantiateTask(task: Task, parameters: Record<string, unknown>): Task {
    // Replace parameter placeholders in task
    const instantiated: Task = {
      ...task,
      id: task.id,
      parameters: { ...task.parameters },
    };

    // Merge parent parameters
    for (const [key, value] of Object.entries(parameters)) {
      if (!(key in instantiated.parameters)) {
        instantiated.parameters[key] = value;
      }
    }

    return instantiated;
  }

  private _isGoalSatisfied(goal: CompoundTask, state: WorldState): boolean {
    // Simple check - goal is satisfied if it has no more methods to try
    // This can be customized based on specific goal requirements
    return goal.methods.every(method =>
      !this._checkConditions(method.preconditions, state)
    );
  }

  private _calculatePlanCost(plan: PrimitiveTask[]): number {
    return plan.reduce((sum, task) => sum + (task.cost || 1), 0);
  }
}

// ============================================================================
// HTN Domain Builder
// ============================================================================

export class HTNDomainBuilder {
  private tasks: Task[] = [];

  addPrimitiveTask(task: PrimitiveTask): this {
    this.tasks.push(task);
    return this;
  }

  addCompoundTask(task: CompoundTask): this {
    this.tasks.push(task);
    return this;
  }

  build(): Map<string, Task> {
    const map = new Map<string, Task>();
    for (const task of this.tasks) {
      map.set(task.id, task);
    }
    return map;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createPrimitiveTask(
  id: string,
  name: string,
  execute: (state: WorldState, params: Record<string, unknown>) => Promise<WorldState>,
  options: Partial<Omit<PrimitiveTask, 'id' | 'name' | 'type' | 'execute'>> = {}
): PrimitiveTask {
  return {
    id,
    name,
    type: 'primitive',
    parameters: {},
    execute,
    ...options,
  };
}

export function createCompoundTask(
  id: string,
  name: string,
  methods: Method[],
  options: Partial<Omit<CompoundTask, 'id' | 'name' | 'type' | 'methods'>> = {}
): CompoundTask {
  return {
    id,
    name,
    type: 'compound',
    parameters: {},
    methods,
    ...options,
  };
}

export function createMethod(
  id: string,
  name: string,
  preconditions: Condition[],
  subtasks: Task[],
  cost: number = 1
): Method {
  return {
    id,
    name,
    preconditions,
    subtasks,
    cost,
  };
}

export default HTNPlanner;
