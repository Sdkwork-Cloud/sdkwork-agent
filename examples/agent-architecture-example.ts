/**
 * Example: Agent Architecture
 *
 * This example demonstrates the flexible agent architecture system,
 * including basic agents (direct execution) and reflective agents (self-thinking).
 *
 * Key features demonstrated:
 * - Basic Agent: Direct execution, minimal overhead
 * - Reflective Agent: Self-reflection, planning, and improvement
 * - Agent Factory: Create and manage agents
 * - Agent Builder: Fluent API for agent configuration
 * - Task execution with different strategies
 * - Performance comparison between agent types
 */

import {
  // Agent types
  BaseAgent,
  QuickAgent,
  ToolAgent,
  SkillAgent,
  ReflectiveAgent,
  DeepReflectiveAgent,
  AdaptiveReflectiveAgent,
  
  // Factory and Builder
  AgentFactory,
  AgentBuilder,
  createQuickAgent,
  createReflectiveAgent,
  createDeepReflectiveAgent,
  createAdaptiveReflectiveAgent,
  
  // Types
  AgentType,
  Task,
  TaskType,
  AgentStatus,
  ReflectionTrigger,
  PlanningStrategy,
} from '../src/agents';

import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'AgentArchitectureExample');

class AgentArchitectureExample {
  /**
   * Example 1: Basic Agent - Direct Execution
   * Demonstrates the simplest agent type that executes tasks directly
   */
  async demonstrateBasicAgent() {
    logger.info('\n========================================');
    logger.info('Example 1: Basic Agent - Direct Execution');
    logger.info('========================================\n');

    // Create a basic agent using factory
    const factory = AgentFactory.getInstance();
    const agent = factory.create('base', {
      name: 'basic-executor',
      description: 'A simple agent for direct task execution',
    });

    await agent.initialize();

    logger.info('Agent created and initialized');
    logger.info('Agent ID: ' + agent.id);
    logger.info('Agent Type: ' + agent.type);
    logger.info('Agent Capabilities: ' + JSON.stringify(agent.getCapabilities()));

    // Execute a simple task
    const task: Task = {
      id: 'task-001',
      description: 'Calculate the sum of 1 to 100',
      type: TaskType.SIMPLE,
    };

    logger.info('\nExecuting task: ' + task.description);
    const startTime = Date.now();
    const result = await agent.execute(task);
    const duration = Date.now() - startTime;

    logger.info('Task completed in ' + duration + 'ms');
    logger.info('Success: ' + result.success);
    logger.info('Steps executed: ' + result.statistics.totalSteps);

    await agent.destroy();
    logger.info('Agent destroyed');
  }

  /**
   * Example 2: Quick Agent - Fast Execution
   * Demonstrates the quick agent optimized for speed
   */
  async demonstrateQuickAgent() {
    logger.info('\n========================================');
    logger.info('Example 2: Quick Agent - Fast Execution');
    logger.info('========================================\n');

    // Create a quick agent using convenience function
    const agent = createQuickAgent('quick-executor', {
      description: 'Optimized for fast execution',
    });

    await agent.initialize();

    logger.info('Quick agent created');

    // Execute multiple tasks quickly
    const tasks: Task[] = [
      { id: 'q-1', description: 'Task 1', type: TaskType.SIMPLE },
      { id: 'q-2', description: 'Task 2', type: TaskType.SIMPLE },
      { id: 'q-3', description: 'Task 3', type: TaskType.SIMPLE },
    ];

    logger.info('Executing ' + tasks.length + ' tasks...');
    const startTime = Date.now();

    for (const task of tasks) {
      const result = await agent.execute(task);
      logger.info('Task ' + task.id + ': ' + (result.success ? '✓' : '✗'));
    }

    const duration = Date.now() - startTime;
    logger.info('All tasks completed in ' + duration + 'ms');
    logger.info('Average per task: ' + (duration / tasks.length).toFixed(2) + 'ms');

    await agent.destroy();
  }

  /**
   * Example 3: Reflective Agent - Self-Thinking
   * Demonstrates the reflective agent with self-reflection capabilities
   */
  async demonstrateReflectiveAgent() {
    logger.info('\n========================================');
    logger.info('Example 3: Reflective Agent - Self-Thinking');
    logger.info('========================================\n');

    // Create a reflective agent
    const agent = createReflectiveAgent('reflective-thinker', {
      description: 'An agent with self-reflection capabilities',
      reflectionConfig: {
        enabled: true,
        depth: 3,
        triggers: [
          ReflectionTrigger.BEFORE_TASK,
          ReflectionTrigger.AFTER_TASK,
          ReflectionTrigger.ON_ERROR,
        ],
      },
      planningConfig: {
        enabled: true,
        strategy: PlanningStrategy.ADAPTIVE,
        maxSteps: 5,
        allowDynamicAdjustment: true,
      },
    });

    await agent.initialize();

    logger.info('Reflective agent created');
    logger.info('Reflection enabled: true');
    logger.info('Planning enabled: true');

    // Execute a complex task
    const task: Task = {
      id: 'complex-001',
      description: 'Analyze and optimize the data processing pipeline',
      type: TaskType.COMPLEX,
      parameters: {
        data: [1, 2, 3, 4, 5],
        operation: 'analyze',
      },
    };

    logger.info('\nExecuting complex task: ' + task.description);
    const startTime = Date.now();
    const result = await agent.execute(task);
    const duration = Date.now() - startTime;

    logger.info('\nExecution Results:');
    logger.info('Duration: ' + duration + 'ms');
    logger.info('Success: ' + result.success);
    logger.info('Total Steps: ' + result.statistics.totalSteps);
    logger.info('Reflection Count: ' + result.statistics.reflectionCount);
    logger.info('Successful Steps: ' + result.statistics.successfulSteps);
    logger.info('Failed Steps: ' + result.statistics.failedSteps);

    // Show execution steps
    logger.info('\nExecution Steps:');
    result.steps.forEach((step, index) => {
      logger.info((index + 1) + '. [' + step.type + '] ' + step.description + ' - ' + step.status);
    });

    // Get reflection history
    if (agent instanceof ReflectiveAgent) {
      const reflections = agent.getReflectionHistory();
      logger.info('\nReflection History (' + reflections.length + '):');
      reflections.forEach((reflection, index) => {
        logger.info((index + 1) + '. [' + reflection.type + '] ' + reflection.conclusion);
      });
    }

    await agent.destroy();
  }

  /**
   * Example 4: Deep Reflective Agent
   * Demonstrates deep thinking capabilities
   */
  async demonstrateDeepReflectiveAgent() {
    logger.info('\n========================================');
    logger.info('Example 4: Deep Reflective Agent');
    logger.info('========================================\n');

    const agent = createDeepReflectiveAgent('deep-thinker', {
      description: 'An agent with deep reflection capabilities',
    });

    await agent.initialize();

    logger.info('Deep reflective agent created');
    logger.info('Reflection depth: 5 (maximum)');

    const task: Task = {
      id: 'deep-001',
      description: 'Design a comprehensive system architecture',
      type: TaskType.COMPLEX,
    };

    logger.info('\nExecuting deep thinking task: ' + task.description);
    const startTime = Date.now();
    const result = await agent.execute(task);
    const duration = Date.now() - startTime;

    logger.info('\nResults:');
    logger.info('Duration: ' + duration + 'ms');
    logger.info('Steps: ' + result.statistics.totalSteps);
    logger.info('Reflections: ' + result.statistics.reflectionCount);

    await agent.destroy();
  }

  /**
   * Example 5: Adaptive Reflective Agent
   * Demonstrates adaptive behavior based on task complexity
   */
  async demonstrateAdaptiveReflectiveAgent() {
    logger.info('\n========================================');
    logger.info('Example 5: Adaptive Reflective Agent');
    logger.info('========================================\n');

    const agent = createAdaptiveReflectiveAgent('adaptive-thinker', {
      description: 'An agent that adapts to task complexity',
    });

    await agent.initialize();

    logger.info('Adaptive reflective agent created');

    // Test with simple task
    const simpleTask: Task = {
      id: 'simple-001',
      description: '计算 2 + 2',
      type: TaskType.SIMPLE,
    };

    logger.info('\nExecuting simple task: ' + simpleTask.description);
    const result1 = await agent.execute(simpleTask);
    logger.info('Simple task - Steps: ' + result1.statistics.totalSteps + ', Reflections: ' + result1.statistics.reflectionCount);

    // Test with complex task
    const complexTask: Task = {
      id: 'complex-002',
      description: '分析和优化多步骤数据处理流程',
      type: TaskType.COMPLEX,
    };

    logger.info('\nExecuting complex task: ' + complexTask.description);
    const result2 = await agent.execute(complexTask);
    logger.info('Complex task - Steps: ' + result2.statistics.totalSteps + ', Reflections: ' + result2.statistics.reflectionCount);

    await agent.destroy();
  }

  /**
   * Example 6: Agent Builder - Fluent API
   * Demonstrates building agents with fluent API
   */
  async demonstrateAgentBuilder() {
    logger.info('\n========================================');
    logger.info('Example 6: Agent Builder - Fluent API');
    logger.info('========================================\n');

    // Build a custom agent
    const agent = new AgentBuilder()
      .setType('reflective')
      .setName('custom-built-agent')
      .setDescription('A custom agent built with fluent API')
      .setMaxIterations(15)
      .setCapabilities({
        canReflect: true,
        canPlan: true,
        canUseTools: true,
        hasMemory: true,
        canLearn: true,
        maxIterations: 15,
        reflectionDepth: 4,
      })
      .setReflectionConfig({
        enabled: true,
        depth: 4,
        triggers: Object.values(ReflectionTrigger),
      })
      .setPlanningConfig({
        enabled: true,
        strategy: PlanningStrategy.HIERARCHICAL,
        maxSteps: 10,
        allowDynamicAdjustment: true,
      })
      .build();

    await agent.initialize();

    logger.info('Custom agent built with AgentBuilder');
    logger.info('Agent capabilities: ' + JSON.stringify(agent.getCapabilities()));

    const task: Task = {
      id: 'custom-001',
      description: 'Execute custom task',
      type: TaskType.COMPLEX,
    };

    const result = await agent.execute(task);
    logger.info('Task completed with ' + result.statistics.totalSteps + ' steps');

    await agent.destroy();
  }

  /**
   * Example 7: Agent Factory Management
   * Demonstrates agent factory capabilities
   */
  async demonstrateAgentFactory() {
    logger.info('\n========================================');
    logger.info('Example 7: Agent Factory Management');
    logger.info('========================================\n');

    const factory = AgentFactory.getInstance();

    // Show available agent types
    logger.info('Available Agent Definitions:');
    const definitions = factory.getAllDefinitions();
    definitions.forEach(def => {
      logger.info('- ' + def.name + ' (' + def.type + '): ' + def.description);
    });

    // Create multiple agents
    logger.info('\nCreating multiple agents...');
    const agents = [
      factory.create('quick', { name: 'agent-1' }),
      factory.create('reflective', { name: 'agent-2' }),
      factory.create('base', { name: 'agent-3' }),
    ];

    logger.info('Created ' + agents.length + ' agents');

    // Show all instances
    const instances = factory.getAllInstances();
    logger.info('\nActive Agent Instances:');
    instances.forEach(info => {
      logger.info('- ' + info.name + ' (' + info.id + '): ' + info.status);
    });

    // Destroy all instances
    logger.info('\nDestroying all agents...');
    await factory.destroyAllInstances();
    logger.info('All agents destroyed');
  }

  /**
   * Example 8: Performance Comparison
   * Compares execution speed between different agent types
   */
  async demonstratePerformanceComparison() {
    logger.info('\n========================================');
    logger.info('Example 8: Performance Comparison');
    logger.info('========================================\n');

    const factory = AgentFactory.getInstance();
    const task: Task = {
      id: 'perf-test',
      description: 'Simple calculation task',
      type: TaskType.SIMPLE,
    };

    const results: Array<{ type: string; duration: number; steps: number }> = [];

    // Test Basic Agent
    {
      const agent = factory.create('base', { name: 'perf-basic' });
      await agent.initialize();
      const start = Date.now();
      const result = await agent.execute(task);
      const duration = Date.now() - start;
      results.push({ type: 'Basic', duration, steps: result.statistics.totalSteps });
      await agent.destroy();
    }

    // Test Quick Agent
    {
      const agent = factory.create('quick', { name: 'perf-quick' });
      await agent.initialize();
      const start = Date.now();
      const result = await agent.execute(task);
      const duration = Date.now() - start;
      results.push({ type: 'Quick', duration, steps: result.statistics.totalSteps });
      await agent.destroy();
    }

    // Test Reflective Agent
    {
      const agent = factory.create('reflective', { name: 'perf-reflective' });
      await agent.initialize();
      const start = Date.now();
      const result = await agent.execute(task);
      const duration = Date.now() - start;
      results.push({ type: 'Reflective', duration, steps: result.statistics.totalSteps });
      await agent.destroy();
    }

    // Display results
    logger.info('Performance Results:');
    logger.info('Agent Type | Duration (ms) | Steps');
    logger.info('-----------|---------------|------');
    results.forEach(r => {
      logger.info(r.type.padEnd(10) + ' | ' + r.duration.toString().padStart(13) + ' | ' + r.steps);
    });

    // Find fastest
    const fastest = results.reduce((min, r) => r.duration < min.duration ? r : min);
    logger.info('\nFastest: ' + fastest.type + ' (' + fastest.duration + 'ms)');
  }

  /**
   * Example 9: Task Type Handling
   * Demonstrates different handling for different task types
   */
  async demonstrateTaskTypeHandling() {
    logger.info('\n========================================');
    logger.info('Example 9: Task Type Handling');
    logger.info('========================================\n');

    const agent = createReflectiveAgent('task-handler');
    await agent.initialize();

    const tasks: Task[] = [
      { id: 'simple', description: 'Simple task', type: TaskType.SIMPLE },
      { id: 'complex', description: 'Complex task', type: TaskType.COMPLEX },
    ];

    for (const task of tasks) {
      logger.info('\nExecuting ' + task.type + ' task: ' + task.description);
      const result = await agent.execute(task);
      logger.info('Steps: ' + result.statistics.totalSteps);
      logger.info('Reflections: ' + result.statistics.reflectionCount);
    }

    await agent.destroy();
  }

  /**
   * Example 10: Error Handling and Recovery
   * Demonstrates error handling capabilities
   */
  async demonstrateErrorHandling() {
    logger.info('\n========================================');
    logger.info('Example 10: Error Handling and Recovery');
    logger.info('========================================\n');

    const agent = createReflectiveAgent('error-handler');
    await agent.initialize();

    // Test with a task that might fail
    const task: Task = {
      id: 'error-test',
      description: 'Task with potential error',
      type: TaskType.COMPLEX,
    };

    logger.info('Executing task with error handling...');
    const result = await agent.execute(task);

    logger.info('Result: ' + (result.success ? 'Success' : 'Failed'));
    if (!result.success) {
      logger.info('Error: ' + result.error);
    }
    logger.info('Total steps: ' + result.statistics.totalSteps);

    await agent.destroy();
  }
}

// Run the example
async function main() {
  const example = new AgentArchitectureExample();

  try {
    logger.info('╔════════════════════════════════════════════════════════════╗');
    logger.info('║     Agent Architecture - Comprehensive Examples             ║');
    logger.info('╚════════════════════════════════════════════════════════════╝');
    logger.info('\nThis example demonstrates the flexible agent architecture system.');
    logger.info('');

    await example.demonstrateBasicAgent();
    await example.demonstrateQuickAgent();
    await example.demonstrateReflectiveAgent();
    await example.demonstrateDeepReflectiveAgent();
    await example.demonstrateAdaptiveReflectiveAgent();
    await example.demonstrateAgentBuilder();
    await example.demonstrateAgentFactory();
    await example.demonstratePerformanceComparison();
    await example.demonstrateTaskTypeHandling();
    await example.demonstrateErrorHandling();

    logger.info('\n\n========================================');
    logger.info('All examples completed successfully!');
    logger.info('========================================\n');

    logger.info('Summary:');
    logger.info('✓ Basic Agent - Direct execution demonstrated');
    logger.info('✓ Quick Agent - Fast execution demonstrated');
    logger.info('✓ Reflective Agent - Self-thinking demonstrated');
    logger.info('✓ Deep Reflective Agent - Deep thinking demonstrated');
    logger.info('✓ Adaptive Reflective Agent - Adaptive behavior demonstrated');
    logger.info('✓ Agent Builder - Fluent API demonstrated');
    logger.info('✓ Agent Factory - Management demonstrated');
    logger.info('✓ Performance Comparison - Benchmarks demonstrated');
    logger.info('✓ Task Type Handling - Different strategies demonstrated');
    logger.info('✓ Error Handling - Recovery demonstrated');

  } catch (error) {
    logger.error('Example failed: ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { AgentArchitectureExample };
