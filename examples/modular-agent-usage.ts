/**
 * Modular Agent System Usage Example
 *
 * 模块化智能体系统使用示例
 *
 * 展示如何：
 * 1. 按功能创建不同类型的智能体
 * 2. 配置能力和算法
 * 3. 预估资源消耗
 * 4. 执行并监控
 */

import {
  ModularAgent,
  createExecutorAgent,
  createPlannerAgent,
  createReasonerAgent,
  createLearnerAgent,
  createChatAgent,
  createHybridAgent,
  globalAlgorithmRegistry,
  AlgorithmRegistry,
} from '../src/agent/modular-agent.js';

// 模拟 LLM 服务
const mockLLM = {
  async complete(prompt: string) {
    return `Response to: ${prompt.slice(0, 30)}...`;
  },
  async *completeStream(prompt: string) {
    yield 'Streaming response...';
  },
};

/**
 * 示例 1: 查看可用算法
 */
function example1ViewAlgorithms() {
  console.log('=== 示例 1: 查看可用算法 ===\n');
  
  // 获取所有算法
  const allAlgorithms = globalAlgorithmRegistry.getAll();
  console.log('所有可用算法:');
  allAlgorithms.forEach(alg => {
    console.log(`  - ${alg.name}: ${alg.description}`);
    console.log(`    资源消耗: ${alg.resourceEstimate.estimatedTokens} tokens, ${alg.resourceEstimate.estimatedTime}ms, 复杂度: ${alg.resourceEstimate.complexity}`);
  });
  
  // 按能力获取算法
  const planningAlgorithms = globalAlgorithmRegistry.getByCapability('planning');
  console.log('\n规划算法:');
  planningAlgorithms.forEach(alg => console.log(`  - ${alg.name}`));
  
  // 获取推荐算法（低资源消耗）
  const recommended = globalAlgorithmRegistry.getRecommended('reasoning', 'low');
  console.log('\n推荐的低资源推理算法:');
  recommended.forEach(alg => console.log(`  - ${alg.name}: ${alg.resourceEstimate.estimatedTokens} tokens`));
}

/**
 * 示例 2: 创建不同类型的智能体
 */
async function example2CreateAgents() {
  console.log('\n=== 示例 2: 创建不同类型的智能体 ===\n');
  
  // 1. 执行型智能体 - 适合工具调用
  const executor = createExecutorAgent(mockLLM);
  console.log('执行型智能体能力报告:');
  console.log(executor.getCapabilityReport());
  console.log('资源预估:', executor.getResourceEstimate());
  
  // 2. 规划型智能体 - 适合复杂任务分解
  const planner = createPlannerAgent(mockLLM);
  console.log('\n规划型智能体能力报告:');
  console.log(planner.getCapabilityReport());
  console.log('资源预估:', planner.getResourceEstimate());
  
  // 3. 推理型智能体 - 适合逻辑推理
  const reasoner = createReasonerAgent(mockLLM);
  console.log('\n推理型智能体能力报告:');
  console.log(reasoner.getCapabilityReport());
  console.log('资源预估:', reasoner.getResourceEstimate());
  
  // 4. 学习型智能体 - 适合自适应场景
  const learner = createLearnerAgent(mockLLM);
  console.log('\n学习型智能体能力报告:');
  console.log(learner.getCapabilityReport());
  console.log('资源预估:', learner.getResourceEstimate());
  
  // 5. 对话型智能体 - 适合聊天交互
  const chat = createChatAgent(mockLLM);
  console.log('\n对话型智能体能力报告:');
  console.log(chat.getCapabilityReport());
  console.log('资源预估:', chat.getResourceEstimate());
  
  // 6. 混合型智能体 - 全能力
  const hybrid = createHybridAgent(mockLLM);
  console.log('\n混合型智能体能力报告:');
  console.log(hybrid.getCapabilityReport());
  console.log('资源预估:', hybrid.getResourceEstimate());
}

/**
 * 示例 3: 自定义配置智能体
 */
async function example3CustomAgent() {
  console.log('\n=== 示例 3: 自定义配置智能体 ===\n');
  
  // 创建一个自定义配置的智能体
  const customAgent = new ModularAgent({
    name: 'CustomDataAnalyzer',
    type: 'hybrid',
    description: '自定义数据分析智能体',
    llm: mockLLM,
    capabilities: {
      // 启用规划能力，使用 ReAct 算法（中等资源消耗）
      planning: {
        enabled: true,
        level: 'advanced',
        algorithm: 'react',
      },
      // 启用推理能力，使用链式思维（低资源消耗）
      reasoning: {
        enabled: true,
        level: 'standard',
        algorithm: 'chain-of-thought',
      },
      // 启用工具使用
      toolUse: {
        enabled: true,
        level: 'advanced',
      },
      // 启用技能调用
      skillInvocation: {
        enabled: true,
        level: 'advanced',
      },
      // 禁用学习（节省资源）
      learning: {
        enabled: false,
        level: 'none',
      },
      // 禁用反思（节省资源）
      reflection: {
        enabled: false,
        level: 'none',
      },
    },
    limits: {
      maxTokens: 5000,        // 限制最大 Token 消耗
      maxExecutionTime: 30000, // 限制最大执行时间 30 秒
      maxIterations: 5,       // 限制最大迭代次数
    },
  });
  
  console.log('自定义智能体配置:');
  console.log(customAgent.getCapabilityReport());
  console.log('\n资源预估:', customAgent.getResourceEstimate());
  
  // 执行请求
  console.log('\n执行请求...');
  const result = await customAgent.execute('分析这个CSV文件的数据趋势');
  console.log('执行结果:', result);
}

/**
 * 示例 4: 资源敏感场景 - 选择低资源算法
 */
async function example4ResourceSensitive() {
  console.log('\n=== 示例 4: 资源敏感场景 ===\n');
  
  // 创建一个资源敏感型智能体（使用低资源算法）
  const resourceSensitiveAgent = new ModularAgent({
    name: 'ResourceSaver',
    type: 'executor',
    llm: mockLLM,
    capabilities: {
      // 使用基础规划
      planning: {
        enabled: true,
        level: 'basic',
        algorithm: 'react',  // ReAct 相对轻量
      },
      // 使用基础推理
      reasoning: {
        enabled: true,
        level: 'basic',
        algorithm: 'chain-of-thought',  // CoT 最轻量
      },
      toolUse: {
        enabled: true,
        level: 'basic',
      },
      // 禁用其他高资源消耗能力
      memory: { enabled: false, level: 'none' },
      learning: { enabled: false, level: 'none' },
      reflection: { enabled: false, level: 'none' },
      multiStep: { enabled: false, level: 'none' },
    },
    limits: {
      maxTokens: 2000,
      maxExecutionTime: 10000,
    },
  });
  
  console.log('资源敏感型智能体配置:');
  console.log(resourceSensitiveAgent.getCapabilityReport());
  console.log('\n资源预估（低）:', resourceSensitiveAgent.getResourceEstimate());
  
  const result = await resourceSensitiveAgent.execute('简单查询');
  console.log('\n执行结果:', {
    success: result.success,
    metrics: result.metrics,
  });
}

/**
 * 示例 5: 高性能场景 - 使用高级算法
 */
async function example5HighPerformance() {
  console.log('\n=== 示例 5: 高性能场景 ===\n');
  
  // 创建一个高性能智能体（使用高级算法）
  const highPerformanceAgent = new ModularAgent({
    name: 'HighPerformer',
    type: 'planner',
    llm: mockLLM,
    capabilities: {
      // 使用专家级规划
      planning: {
        enabled: true,
        level: 'expert',
        algorithm: 'mcts',  // MCTS 适合复杂决策
      },
      // 使用专家级推理
      reasoning: {
        enabled: true,
        level: 'expert',
        algorithm: 'tree-of-thoughts',  // ToT 适合深度推理
      },
      // 启用所有能力
      toolUse: { enabled: true, level: 'expert' },
      skillInvocation: { enabled: true, level: 'expert' },
      memory: { enabled: true, level: 'advanced' },
      learning: { enabled: true, level: 'standard', algorithm: 'self-reflection' },
      reflection: { enabled: true, level: 'advanced', algorithm: 'self-reflection' },
      multiStep: { enabled: true, level: 'expert' },
    },
    limits: {
      maxTokens: 20000,
      maxExecutionTime: 120000,
      maxIterations: 20,
    },
  });
  
  console.log('高性能智能体配置:');
  console.log(highPerformanceAgent.getCapabilityReport());
  console.log('\n资源预估（高）:', highPerformanceAgent.getResourceEstimate());
  
  const result = await highPerformanceAgent.execute('解决这个复杂的优化问题');
  console.log('\n执行结果:', {
    success: result.success,
    metrics: result.metrics,
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    example1ViewAlgorithms();
    await example2CreateAgents();
    await example3CustomAgent();
    await example4ResourceSensitive();
    await example5HighPerformance();
    
    console.log('\n=== 所有示例执行完成 ===');
  } catch (error) {
    console.error('错误:', error);
  }
}

// 运行
main();
