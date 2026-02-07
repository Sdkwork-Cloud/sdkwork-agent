/**
 * 高级智能体架构演示
 * 
 * 展示业界最顶尖的智能体能力：
 * 1. 世界模型预测性决策
 * 2. 神经符号推理
 * 3. 元认知监控
 * 4. 反事实学习
 * 
 * 本示例展示了智能体的核心认知能力，包括环境预测、逻辑推理和自我监控。
 * 每个模块都配备了详细的性能指标和运行时监控。
 */

import { UnifiedCognitionEngine } from '../src/cognition/unified-cognition';
import { WorldModel, Action, Observation } from '../src/cognition/world-model';
import { NeuroSymbolicEngine, SymbolicAtom, LogicalRule } from '../src/cognition/neuro-symbolic';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'AdvancedAgentDemo');

// ============================================
// 演示 1: 世界模型 - 预测性决策
// ============================================

/**
 * 演示世界模型的预测性决策能力
 * 
 * 世界模型是智能体的核心组件，负责：
 * 1. 学习环境动态
 * 2. 预测未来状态
 * 3. 评估不同动作序列的结果
 * 4. 进行反事实推理
 */
async function demoWorldModel() {
  logger.info('\n========================================');
  logger.info('演示 1: 世界模型 - 预测性决策');
  logger.info('========================================\n');

  const startTime = Date.now();
  
  // 初始化世界模型
  const worldModel = new WorldModel({
    stateDimension: 32,
    actionDimension: 16,
    hiddenDimension: 64,
    imaginationHorizon: 10,
    imaginationBatchSize: 5,
    discountFactor: 0.99,
    enablePerformanceMonitoring: true, // 启用性能监控
  });

  worldModel.initialize();
  
  logger.info('世界模型初始化完成，耗时:', Date.now() - startTime, 'ms');

  // 模拟智能体在环境中的交互
  logger.info('模拟智能体学习环境动态...\n');

  // 步骤 1: 观察环境并采取行动
  const action1: Action = {
    id: 'explore',
    type: 'explore',
    parameters: { direction: 'forward' },
  };

  const observation1: Observation = {
    raw: { position: [0, 0], objects: ['wall', 'door'] },
    features: [],
    timestamp: Date.now(),
  };

  const stepStartTime = Date.now();
  const state1 = worldModel.step(action1, observation1, 0.5, false);
  logger.info('步骤 1: 执行探索动作');
  logger.info('  奖励: 0.5');
  logger.info('  状态维度:', state1.stochastic.length);
  logger.info('  执行时间:', Date.now() - stepStartTime, 'ms');

  // 步骤 2: 采取另一个动作
  const action2: Action = {
    id: 'open_door',
    type: 'interact',
    parameters: { target: 'door' },
  };

  const observation2: Observation = {
    raw: { position: [1, 0], objects: ['open_door', 'room'], reward_signal: 1.0 },
    features: [],
    timestamp: Date.now(),
  };

  const stepStartTime2 = Date.now();
  const state2 = worldModel.step(action2, observation2, 1.0, false);
  logger.info('\n步骤 2: 执行开门动作');
  logger.info('  奖励: 1.0 (成功!)');
  logger.info('  执行时间:', Date.now() - stepStartTime2, 'ms');

  // 步骤 3: 想象未来
  logger.info('\n--- 想象未来场景 ---');
  const candidateActions: Action[][] = [
    [{ id: 'go_left', type: 'move', parameters: { direction: 'left' } }],
    [{ id: 'go_right', type: 'move', parameters: { direction: 'right' } }],
    [{ id: 'search', type: 'explore', parameters: { thorough: true } }],
  ];

  const imagineStartTime = Date.now();
  const { bestSequence, bestTrajectory, allTrajectories } = 
    worldModel.selectBestActionSequence(state2, candidateActions);
  
  logger.info('想象了', allTrajectories.length, '个可能的未来轨迹');
  logger.info('最佳动作序列:', bestSequence.map(a => a.id).join(' → '));
  logger.info('预期累积奖励:', bestTrajectory.cumulativeReturn.toFixed(2));
  logger.info('预测步数:', bestTrajectory.predictedStates.length);
  logger.info('想象过程耗时:', Date.now() - imagineStartTime, 'ms');

  // 步骤 4: 反事实推理
  logger.info('\n--- 反事实推理 ---');
  const history = worldModel['replayBuffer'].getAll();
  
  if (history.length > 0) {
    const alternativeAction: Action = {
      id: 'ignore_door',
      type: 'move',
      parameters: { direction: 'away' },
    };

    const counterfactualStartTime = Date.now();
    const counterfactual = worldModel.counterfactualReasoning(
      history,
      0,
      alternativeAction
    );
    
    logger.info('反事实场景: 如果在步骤1选择忽略门...');
    logger.info('  原始奖励:', counterfactual.comparison.originalReward.toFixed(2));
    logger.info('  反事实奖励:', counterfactual.comparison.counterfactualReward.toFixed(2));
    logger.info('  差异:', counterfactual.comparison.difference.toFixed(2));
    logger.info('  反事实推理耗时:', Date.now() - counterfactualStartTime, 'ms');
  }

  // 训练世界模型
  logger.info('\n--- 训练世界模型 ---');
  const trainingStartTime = Date.now();
  const trainingResult = await worldModel.train(50);
  
  logger.info('训练完成:');
  logger.info('  重建损失:', trainingResult.reconstructionLoss.toFixed(4));
  logger.info('  奖励损失:', trainingResult.rewardLoss.toFixed(4));
  logger.info('  KL损失:', trainingResult.klLoss.toFixed(4));
  logger.info('  训练耗时:', Date.now() - trainingStartTime, 'ms');

  // 获取性能统计
  logger.info('\n--- 世界模型性能统计 ---');
  const stats = worldModel.getStats();
  logger.info('统计信息:', stats);
  
  // 获取性能指标
  const performanceStats = worldModel.getPerformanceStats();
  logger.info('性能指标:', performanceStats);
  
  logger.info('世界模型演示完成，总耗时:', Date.now() - startTime, 'ms');
}

// ============================================
// 演示 2: 神经符号推理
// ============================================

/**
 * 演示神经符号推理引擎的能力
 * 
 * 神经符号推理是智能体的核心推理能力，结合了：
 * 1. 神经网络的模式识别能力
 * 2. 符号逻辑的精确推理能力
 * 3. 知识图谱的结构化表示
 * 4. 自动定理证明
 */
async function demoNeuroSymbolic() {
  logger.info('\n========================================');
  logger.info('演示 2: 神经符号推理');
  logger.info('========================================\n');

  const startTime = Date.now();

  // 初始化神经符号推理引擎
  const engine = new NeuroSymbolicEngine({
    embeddingDimension: 128,
    maxRules: 100,
    maxReasoningDepth: 5,
    confidenceThreshold: 0.6,
    enableNeuralTheoremProving: true,
    enableAbduction: true,
    enablePerformanceMonitoring: true, // 启用性能监控
  });
  
  logger.info('神经符号推理引擎初始化完成，耗时:', Date.now() - startTime, 'ms');

  // 添加事实
  logger.info('添加事实到知识库...');
  
  const facts: SymbolicAtom[] = [
    {
      predicate: 'human',
      arguments: ['socrates'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.95,
    },
    {
      predicate: 'human',
      arguments: ['plato'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.95,
    },
    {
      predicate: 'mortal',
      arguments: ['socrates'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.9,
    },
    {
      predicate: 'philosopher',
      arguments: ['socrates'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.98,
    },
    {
      predicate: 'philosopher',
      arguments: ['plato'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.98,
    },
  ];

  const factsStartTime = Date.now();
  facts.forEach(fact => engine.addFact(fact));
  logger.info('已添加', facts.length, '个事实，耗时:', Date.now() - factsStartTime, 'ms');

  // 添加规则
  logger.info('\n添加推理规则...');
  
  const rules: LogicalRule[] = [
    {
      id: 'rule1',
      name: 'All humans are mortal',
      premises: [
        { predicate: 'human', arguments: ['?X'], truthValue: 1, source: 'observation', confidence: 1 },
      ],
      conclusion: { predicate: 'mortal', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 0.9 },
      weight: 0.95,
      type: 'deductive',
    },
    {
      id: 'rule2',
      name: 'Philosophers are wise',
      premises: [
        { predicate: 'philosopher', arguments: ['?X'], truthValue: 1, source: 'observation', confidence: 1 },
      ],
      conclusion: { predicate: 'wise', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 0.8 },
      weight: 0.85,
      type: 'deductive',
    },
    {
      id: 'rule3',
      name: 'Wise beings contemplate',
      premises: [
        { predicate: 'wise', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 1 },
      ],
      conclusion: { predicate: 'contemplates', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 0.75 },
      weight: 0.8,
      type: 'deductive',
    },
  ];

  const rulesStartTime = Date.now();
  rules.forEach(rule => engine.addRule(rule));
  logger.info('已添加', rules.length, '个规则，耗时:', Date.now() - rulesStartTime, 'ms');

  // 进行推理查询
  logger.info('\n--- 推理查询 ---');

  const queries: SymbolicAtom[] = [
    { predicate: 'mortal', arguments: ['plato'], truthValue: 0, source: 'observation', confidence: 0 },
    { predicate: 'wise', arguments: ['socrates'], truthValue: 0, source: 'observation', confidence: 0 },
    { predicate: 'contemplates', arguments: ['plato'], truthValue: 0, source: 'observation', confidence: 0 },
    { predicate: 'immortal', arguments: ['socrates'], truthValue: 0, source: 'observation', confidence: 0 },
  ];

  for (const query of queries) {
    logger.info(`\n查询: ${query.predicate}(${query.arguments.join(', ')})`);
    const queryStartTime = Date.now();
    const result = engine.query(query);
    const queryTime = Date.now() - queryStartTime;
    
    logger.info('  结论:', result.conclusion.truthValue > 0 ? '成立' : '不成立');
    logger.info('  置信度:', (result.confidence * 100).toFixed(1) + '%');
    logger.info('  推理深度:', result.depth);
    logger.info('  应用的规则:', result.rulesApplied.join(', ') || '无');
    logger.info('  推理耗时:', queryTime, 'ms');
    
    if (result.proof.length > 0) {
      logger.info('  推理链:');
      result.proof.forEach((step, i) => {
        logger.info(`    ${i + 1}. ${step.rule.name} → ${step.conclusion.predicate}`);
      });
    }
  }

  // 知识图谱演示
  logger.info('\n--- 知识图谱推理 ---');
  const kgReasoner = engine.getKGReasoner();

  // 添加实体
  const kgStartTime = Date.now();
  
  kgReasoner.addEntity({
    id: 'socrates',
    type: 'philosopher',
    attributes: { era: 'ancient_greece', field: 'ethics' },
  });

  kgReasoner.addEntity({
    id: 'plato',
    type: 'philosopher',
    attributes: { era: 'ancient_greece', field: 'metaphysics', teacher: 'socrates' },
  });

  kgReasoner.addEntity({
    id: 'aristotle',
    type: 'philosopher',
    attributes: { era: 'ancient_greece', field: 'logic', teacher: 'plato' },
  });

  // 添加关系
  kgReasoner.addRelation({
    type: 'teacher_of',
    head: 'socrates',
    tail: 'plato',
    strength: 1.0,
    timestamp: Date.now(),
  });

  kgReasoner.addRelation({
    type: 'teacher_of',
    head: 'plato',
    tail: 'aristotle',
    strength: 1.0,
    timestamp: Date.now(),
  });
  
  logger.info('知识图谱构建完成，耗时:', Date.now() - kgStartTime, 'ms');

  // 查找相似实体
  logger.info('与 Socrates 相似的实体:');
  const similarStartTime = Date.now();
  const similar = kgReasoner.findSimilarEntities('socrates', 3);
  similar.forEach((entity, i) => {
    logger.info(`  ${i + 1}. ${entity.id} (${entity.type})`);
  });
  logger.info('相似实体查找耗时:', Date.now() - similarStartTime, 'ms');

  // 路径推理
  logger.info('\n从 Socrates 到 Aristotle 的路径:');
  const pathStartTime = Date.now();
  const paths = kgReasoner.findPath('socrates', 'aristotle', 3);
  paths.forEach((path, i) => {
    const pathStr = path.map(r => `${r.type}(${r.head}→${r.tail})`).join(' → ');
    logger.info(`  路径 ${i + 1}: ${pathStr}`);
  });
  logger.info('路径推理耗时:', Date.now() - pathStartTime, 'ms');

  // 获取性能统计
  logger.info('\n--- 神经符号推理性能统计 ---');
  const performanceStats = engine.getPerformanceStats();
  logger.info('性能指标:', performanceStats);
  
  logger.info('神经符号推理演示完成，总耗时:', Date.now() - startTime, 'ms');
}

// ============================================
// 演示 3: 统一认知架构
// ============================================

/**
 * 演示统一认知架构的完整能力
 * 
 * 统一认知架构是智能体的最高级形式，集成了：
 * 1. 世界模型的预测能力
 * 2. 神经符号引擎的推理能力
 * 3. 元认知的自我监控能力
 * 4. 多层次认知处理
 */
async function demoUnifiedCognition() {
  logger.info('\n========================================');
  logger.info('演示 3: 统一认知架构');
  logger.info('========================================\n');

  const startTime = Date.now();

  // 初始化统一认知引擎
  const engine = new UnifiedCognitionEngine({
    worldModel: {
      stateDimension: 32,
      actionDimension: 16,
      imaginationHorizon: 10,
      enablePerformanceMonitoring: true,
    },
    neuroSymbolic: {
      embeddingDimension: 128,
      maxReasoningDepth: 5,
      enablePerformanceMonitoring: true,
    },
    metacognition: {
      monitoringFrequency: 100,
      strategyThreshold: 0.7,
      resourceStrategy: 'balanced',
    },
    enablePerformanceMonitoring: true, // 启用整体性能监控
  });

  logger.info('初始化统一认知引擎...');
  logger.info('组件状态:');
  logger.info('  - 世界模型: 已初始化');
  logger.info('  - 神经符号引擎: 已初始化');
  logger.info('  - 元认知控制器: 已初始化');
  logger.info('统一认知引擎初始化完成，耗时:', Date.now() - startTime, 'ms');

  // 处理输入
  const testInputs = [
    'What is the best way to learn programming?',
    'Explain quantum computing to a 10-year-old',
    'Should I invest in stocks or bonds?',
  ];

  for (const input of testInputs) {
    logger.info(`\n--- 处理输入: "${input}" ---`);
    
    const inputStartTime = Date.now();
    const result = await engine.process(input, { userLevel: 'intermediate' });
    const processingTime = Date.now() - inputStartTime;

    logger.info('认知处理完成:');
    logger.info('  总处理时间:', processingTime, 'ms');
    logger.info('  使用的组件:', result.componentsUsed.join(', '));
    
    logger.info('\n  认知轨迹:');
    logger.info('    感知阶段:', result.cognitiveTrace.perception.end - result.cognitiveTrace.perception.start, 'ms');
    logger.info('    理解阶段:', result.cognitiveTrace.understanding.end - result.cognitiveTrace.understanding.start, 'ms');
    logger.info('    推理阶段:', result.cognitiveTrace.reasoning.end - result.cognitiveTrace.reasoning.start, 'ms');
    logger.info('    决策阶段:', result.cognitiveTrace.decision.end - result.cognitiveTrace.decision.start, 'ms');

    logger.info('\n  资源消耗:');
    logger.info('    计算成本:', result.resourceConsumption.computationCost, 'ms');
    logger.info('    内存使用:', result.resourceConsumption.memoryUsage, 'bytes');
    logger.info('    查询次数:', result.resourceConsumption.queryCount);

    // 显示认知状态
    const cognitiveState = engine.getCognitiveState();
    logger.info('\n  当前认知状态:');
    logger.info('    感知不确定性:', (cognitiveState.perception.uncertainty * 100).toFixed(1) + '%');
    logger.info('    理解置信度:', (cognitiveState.understanding.confidence * 100).toFixed(1) + '%');
    logger.info('    识别意图:', cognitiveState.understanding.recognizedIntent);
    logger.info('    工作记忆负载:', (cognitiveState.workingMemory.loadLevel * 100).toFixed(1) + '%');
    logger.info('    元认知状态:', cognitiveState.metacognition.monitoringStatus);
    logger.info('    当前策略:', cognitiveState.metacognition.currentStrategy);
  }

  // 显示处理历史统计
  logger.info('\n--- 处理历史统计 ---');
  const history = engine.getProcessingHistory();
  logger.info('总处理次数:', history.length);
  
  const avgTime = history.reduce((sum, h) => sum + h.processingTime, 0) / history.length;
  logger.info('平均处理时间:', avgTime.toFixed(2), 'ms');

  const componentUsage = new Map<string, number>();
  history.forEach(h => {
    h.componentsUsed.forEach(c => {
      componentUsage.set(c, (componentUsage.get(c) || 0) + 1);
    });
  });

  logger.info('组件使用频率:');
  componentUsage.forEach((count, component) => {
    logger.info(`  ${component}: ${count} 次`);
  });

  // 获取性能统计
  logger.info('\n--- 统一认知架构性能统计 ---');
  const performanceStats = engine.getPerformanceStats();
  logger.info('性能指标:', performanceStats);
  
  logger.info('统一认知架构演示完成，总耗时:', Date.now() - startTime, 'ms');
}

// ============================================
// 主函数
// ============================================

/**
 * 主函数 - 运行所有演示
 */
async function main() {
  logger.info('╔════════════════════════════════════════════════════════════╗');
  logger.info('║     高级智能体架构演示 - 业界最顶尖的认知系统               ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');
  logger.info('\n本演示展示以下核心能力:');
  logger.info('  1. 世界模型 - 预测性决策与反事实推理');
  logger.info('  2. 神经符号推理 - 可微分逻辑与定理证明');
  logger.info('  3. 统一认知架构 - 分层处理与元认知监控');
  logger.info('');

  const totalStartTime = Date.now();
  
  try {
    // 运行世界模型演示
    logger.info('\n开始运行世界模型演示...');
    await demoWorldModel();
    
    // 运行神经符号推理演示
    logger.info('\n开始运行神经符号推理演示...');
    await demoNeuroSymbolic();
    
    // 运行统一认知架构演示
    logger.info('\n开始运行统一认知架构演示...');
    await demoUnifiedCognition();

    logger.info('\n\n========================================');
    logger.info('所有演示完成!');
    logger.info('========================================\n');

    logger.info('架构亮点:');
    logger.info('✓ 世界模型实现"想象"能力，可在执行前预测结果');
    logger.info('✓ 神经符号推理结合神经网络与逻辑推理');
    logger.info('✓ 元认知监控实现自我监控和策略自适应');
    logger.info('✓ 分层认知处理模拟人类认知流程');
    logger.info('✓ 支持反事实学习和持续学习');
    logger.info('✓ 完整的性能监控和统计分析');

    logger.info('\n总运行时间:', Date.now() - totalStartTime, 'ms');

  } catch (error) {
    logger.error('演示出错:', {}, error as Error);
    process.exit(1);
  }
}

// 运行演示
main().catch(error => {
  logger.error('主函数出错:', {}, error as Error);
  process.exit(1);
});
