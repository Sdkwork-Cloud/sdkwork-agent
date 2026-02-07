/**
 * Example: Smart Agent Usage
 *
 * This example demonstrates how to use the SmartAgent with automatic
 * skill selection, dynamic loading, and token optimization. It includes
 * comprehensive error handling and demonstrates various agent capabilities.
 *
 * Key features demonstrated:
 * - Agent initialization and configuration
 * - Direct skill execution
 * - Auto-process with intelligent decision making
 * - Chat with LLM
 * - Custom skill registration
 * - Execution history tracking
 * - Decision statistics analysis
 * - Error handling and fallback strategies
 * - Performance monitoring
 */

import { SmartAgent, OpenAIProvider, Skill, Tool, builtInSkills, builtInTools, Logger } from '../src';

const logger = new Logger({ level: 'info' }, 'SmartAgentExample');

async function main() {
  logger.info('=== Smart Agent Usage Example ===');
  
  let agent: SmartAgent | null = null;

  try {
    // Create a SmartAgent with OpenAI provider
    agent = new SmartAgent({
      name: 'my-smart-agent',
      description: 'An intelligent agent with auto skill selection',
      version: '1.0.0',
      llmProvider: new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
      }),
      systemPrompt: 'You are a helpful assistant with access to various skills.',
      skills: builtInSkills,
      tools: builtInTools,
      autoDecide: true,
      decisionEngine: {
        enableEmbeddings: true,
        enableCaching: true,
        threshold: 0.6,
      },
      tokenOptimizer: {
        enableCompression: true,
        maxSkillDescriptionLength: 200,
      },
      performanceMonitor: {
        enabled: true,
        samplingRate: 0.1,
      },
    });

    // Initialize the agent
    logger.info('Initializing agent...');
    await agent.initialize();

    logger.info('Agent initialized successfully!');
    logger.info('Available skills:', agent.getSkillNames());
    logger.info('Available tools:', agent.getToolNames());

    // Example 1: Simple skill execution
    logger.info('\n--- Example 1: Direct skill execution ---');
    try {
      const echoResult = await agent.executeSkill('echo', { message: 'Hello, World!' });
      logger.info('Echo result:', echoResult);
    } catch (error) {
      logger.error('Error executing echo skill:', {}, error as Error);
    }

    // Example 2: Auto-process with decision making
    logger.info('\n--- Example 2: Auto-process with decision ---');
    try {
      const result1 = await agent.process('Calculate 2 + 2');
      logger.info('Decision:', result1.decision);
      logger.info('Result:', result1.result);
      logger.info('Execution time:', result1.executionTime, 'ms');
    } catch (error) {
      logger.error('Error processing calculation:', {}, error as Error);
    }

    // Example 3: Another auto-process
    logger.info('\n--- Example 3: Another auto-process ---');
    try {
      const result2 = await agent.process('What is the weather today?');
      logger.info('Decision:', result2.decision);
      logger.info('Result:', result2.result);
    } catch (error) {
      logger.error('Error processing weather query:', {}, error as Error);
    }

    // Example 4: Chat with LLM
    logger.info('\n--- Example 4: Chat with LLM ---');
    try {
      const chatResult = await agent.chat([{ role: 'user', content: 'What is TypeScript?' }]);
      logger.info('Chat response:', chatResult.content);
    } catch (error) {
      logger.error('Error in chat:', {}, error as Error);
    }

    // Example 5: Register a custom skill
    logger.info('\n--- Example 5: Custom skill ---');
    try {
      const customSkill: Skill = {
        name: 'greet',
        description: 'Greet a user by name',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the person to greet',
            },
          },
          required: ['name'],
        },
        handler: async params => {
          if (!params.name) {
            return {
              success: false,
              error: 'Name parameter is required',
            };
          }
          return {
            success: true,
            data: `Hello, ${params.name}! Welcome!`,
          };
        },
        metadata: {
          category: 'greeting',
          tags: ['social', 'welcome'],
        },
      };

      agent.registerSkill(customSkill);
      logger.info('Custom skill registered successfully');

      const greetResult = await agent.process('Greet John');
      logger.info('Greet result:', greetResult.result);
    } catch (error) {
      logger.error('Error with custom skill:', {}, error as Error);
    }

    // Example 6: Get execution history
    logger.info('\n--- Example 6: Execution history ---');
    try {
      const history = agent.getExecutionHistory();
      logger.info('Number of executions:', history.length);
      if (history.length > 0) {
        const lastExecution = history[history.length - 1];
        logger.info('Last execution:', {
          action: lastExecution.action,
          success: lastExecution.success,
          timestamp: new Date(lastExecution.timestamp).toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error getting execution history:', {}, error as Error);
    }

    // Example 7: Get decision stats
    logger.info('\n--- Example 7: Decision stats ---');
    try {
      const stats = agent.getDecisionStats();
      logger.info('Stats:', stats);
    } catch (error) {
      logger.error('Error getting decision stats:', {}, error as Error);
    }

    // Example 8: Test error handling with invalid input
    logger.info('\n--- Example 8: Error handling test ---');
    try {
      const errorResult = await agent.process('This is a test of error handling');
      logger.info('Error handling test result:', errorResult.result);
    } catch (error) {
      logger.error('Expected error in test:', {}, error as Error);
    }

    // Example 9: Performance monitoring
    logger.info('\n--- Example 9: Performance monitoring ---');
    try {
      const performanceStats = agent.getPerformanceStats();
      logger.info('Performance stats:', performanceStats);
    } catch (error) {
      logger.error('Error getting performance stats:', {}, error as Error);
    }

  } catch (error) {
    logger.error('Agent initialization failed:', {}, error as Error);
  } finally {
    // Cleanup
    if (agent) {
      try {
        await agent.destroy();
        logger.info('\nAgent destroyed successfully.');
      } catch (error) {
        logger.error('Error during agent cleanup:', {}, error as Error);
      }
    }
  }
}

// Run the example
main().catch(error => {
  logger.error('Example failed:', {}, error as Error);
  process.exit(1);
});
