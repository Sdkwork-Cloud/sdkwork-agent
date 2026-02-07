/**
 * 高级算法示例
 *
 * 展示 Neural MCTS、MemGPT 记忆系统和 Tree of Thoughts 的使用
 */

import {
  // Neural MCTS
  createNeuralMCTS,
  NeuralMCTS,
  DecisionState,
  // MemGPT
  createMemGPTMemory,
  MemGPTMemory,
  // Tree of Thoughts
  createTreeOfThoughts,
  TreeOfThoughts,
  // HNSW
  createHNSWVectorDB,
  HNSWVectorDatabase,
} from '../src/index';

// ============================================
// 示例 1: Neural MCTS 决策
// ============================================

async function neuralMCTSExample() {
  console.log('\n=== Neural MCTS 示例 ===\n');

  // 创建 Neural MCTS 实例
  const mcts = createNeuralMCTS({
    numSimulations: 100,
    stateDimension: 128,
    actionSpace: 5,
    hiddenDimension: 256,
    learningRate: 0.001,
    cPuct: 1.5,
  });

  // 监听搜索进度
  mcts.on('searchProgress', ({ simulation, totalSimulations }) => {
    if (simulation % 20 === 0) {
      console.log(`搜索进度: ${simulation}/${totalSimulations}`);
    }
  });

  // 定义决策状态
  const state: DecisionState = {
    features: Array(128).fill(0).map(() => Math.random()),
    validActions: [true, true, true, false, true],
    currentPlayer: 0,
    step: 0,
    metadata: { scenario: 'resource_allocation' },
  };

  console.log('开始搜索...');
  const result = await mcts.search(state);

  console.log('\n搜索结果:');
  console.log(`  最佳动作: ${result.bestAction}`);
  console.log(`  动作概率分布: [${result.actionProbabilities.map(p => p.toFixed(3)).join(', ')}]`);
  console.log(`  根节点价值: ${result.rootValue.toFixed(4)}`);
  console.log(`  搜索树深度: ${result.treeDepth}`);
  console.log(`  搜索时间: ${result.searchTime}ms`);

  // 训练网络
  console.log('\n训练神经网络...');
  try {
    const stats = await mcts.train(5);
    console.log(`  训练损失: ${stats.loss.toFixed(4)}`);
    console.log(`  价值损失: ${stats.valueLoss.toFixed(4)}`);
    console.log(`  策略损失: ${stats.policyLoss.toFixed(4)}`);
    console.log(`  准确率: ${(stats.accuracy * 100).toFixed(2)}%`);
  } catch (error) {
    console.log('  训练需要更多样本数据');
  }

  return result;
}

// ============================================
// 示例 2: MemGPT 分层记忆系统
// ============================================

async function memGPTExample() {
  console.log('\n=== MemGPT 分层记忆示例 ===\n');

  // 创建 MemGPT 记忆系统
  const memory = createMemGPTMemory({
    coreMemoryLimit: 2000,
    recallMemoryLimit: 100,
    archivalMemoryLimit: 1000,
    enableAutoArchive: true,
    enableCompression: true,
  });

  await memory.initialize();

  // 设置核心记忆
  console.log('设置核心记忆...');
  memory.updateCoreMemory('persona', '我是一个专业的AI助手，擅长数据分析和问题解决。');
  memory.updateCoreMemory('human', '用户是一位软件工程师，喜欢简洁高效的解决方案。');
  memory.updateCoreMemory('system', '系统运行在浏览器环境中，需要优化性能。');

  // 添加回忆记忆
  console.log('\n添加回忆记忆...');
  const entry1 = await memory.addRecallEntry({
    role: 'user',
    content: '如何优化React应用的性能？',
    importance: 0.8,
    keywords: ['React', '性能优化', '前端'],
    relatedIds: [],
  });

  const entry2 = await memory.addRecallEntry({
    role: 'assistant',
    content: '可以使用useMemo、useCallback、React.memo等技术来优化。',
    importance: 0.9,
    keywords: ['React', 'useMemo', 'useCallback'],
    relatedIds: [entry1],
  });

  const entry3 = await memory.addRecallEntry({
    role: 'user',
    content: '什么是虚拟DOM？',
    importance: 0.6,
    keywords: ['React', '虚拟DOM'],
    relatedIds: [],
  });

  console.log(`  添加了 ${memory.getStats().recallMemoryCount} 条回忆记忆`);

  // 搜索记忆
  console.log('\n搜索记忆 (关键词: React)...');
  const searchResults = await memory.search('React');

  console.log(`  核心记忆匹配: ${searchResults.core.join(', ') || '无'}`);
  console.log(`  回忆记忆匹配: ${searchResults.recall.length} 条`);
  console.log(`  归档记忆匹配: ${searchResults.archival.length} 条`);

  // 添加任务
  console.log('\n添加任务...');
  const taskId = memory.addTask('实现虚拟DOM的diff算法', 'high');
  console.log(`  任务ID: ${taskId}`);

  // 记录操作
  memory.recordAction('search', '搜索React相关记忆', { results: searchResults.recall.length });
  memory.recordAction('add_task', '添加diff算法任务', { taskId });

  // 获取统计信息
  console.log('\n记忆统计:');
  const stats = memory.getStats();
  console.log(`  核心记忆大小: ${stats.coreMemorySize} 字符`);
  console.log(`  回忆记忆数量: ${stats.recallMemoryCount}`);
  console.log(`  归档记忆数量: ${stats.archivalMemoryCount}`);
  console.log(`  工作上下文大小: ${stats.workingContextSize} 字符`);

  // 获取最近操作
  console.log('\n最近操作:');
  const recentActions = memory.getRecentActions(5);
  recentActions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action.type}: ${action.description}`);
  });

  return memory;
}

// ============================================
// 示例 3: Tree of Thoughts 多路径思维
// ============================================

async function treeOfThoughtsExample() {
  console.log('\n=== Tree of Thoughts 示例 ===\n');

  // 创建 ToT 实例
  const tot = createTreeOfThoughts(undefined, undefined, {
    searchStrategy: 'beam',
    thoughtsPerStep: 3,
    maxDepth: 4,
    beamWidth: 2,
    evaluationThreshold: 0.5,
    enablePruning: true,
  });

  // 监听事件
  tot.on('thoughtGenerated', ({ thought, evaluation }) => {
    if (thought.depth <= 2) {
      console.log(`  生成思维 [深度${thought.depth}]: 分数=${evaluation.score.toFixed(2)}, 可行=${evaluation.isFeasible}`);
    }
  });

  tot.on('beamUpdated', ({ step, beamSize }) => {
    console.log(`  Beam Search - 步骤 ${step}, Beam大小: ${beamSize}`);
  });

  // 定义问题
  const problem = '设计一个高性能的缓存系统';
  console.log(`问题: ${problem}`);
  console.log('开始思维搜索...\n');

  const result = await tot.solve(problem, {
    constraints: ['低延迟', '高并发', '数据一致性'],
    technologies: ['Redis', 'Memcached', '本地缓存'],
  });

  console.log('\n搜索结果:');
  console.log(`  探索的思维数量: ${result.exploredThoughts}`);
  console.log(`  搜索深度: ${result.searchDepth}`);
  console.log(`  搜索时间: ${result.searchTime}ms`);
  console.log(`  有效思维链数量: ${result.allValidChains.length}`);

  console.log('\n最佳思维链:');
  result.bestThoughtChain.forEach((thought, i) => {
    if (thought.depth > 0) {
      console.log(`  ${i}. ${thought.content.substring(0, 80)}...`);
    }
  });

  console.log('\n最终答案:');
  console.log(result.finalAnswer.substring(0, 200) + '...');

  return result;
}

// ============================================
// 示例 4: HNSW 高性能向量搜索
// ============================================

async function hnswExample() {
  console.log('\n=== HNSW 高性能向量搜索示例 ===\n');

  // 创建 HNSW 向量数据库
  const db = createHNSWVectorDB(128, {
    metric: 'cosine',
    cacheEnabled: true,
  });

  await db.initialize();

  console.log('添加文档...');
  const startTime = Date.now();

  // 批量添加文档
  const documents = Array(1000).fill(null).map((_, i) => ({
    id: `doc-${i}`,
    vector: Array(128).fill(0).map(() => Math.random()),
    content: `Document ${i}: ${['React', 'Vue', 'Angular', 'Node.js', 'Python'][i % 5]} ${['tutorial', 'guide', 'reference', 'example'][i % 4]}`,
    metadata: {
      category: ['frontend', 'backend', 'database', 'devops'][i % 4],
      importance: Math.random(),
    },
  }));

  for (const doc of documents) {
    await db.insert(doc);
  }

  const insertTime = Date.now() - startTime;
  console.log(`  添加了 1000 个文档，耗时: ${insertTime}ms`);

  // 搜索
  console.log('\n向量搜索...');
  const queryVector = Array(128).fill(0).map(() => Math.random());

  const searchStart = Date.now();
  const results = await db.search(queryVector, { limit: 10 });
  const searchTime = Date.now() - searchStart;

  console.log(`  搜索耗时: ${searchTime}ms (O(log n) 复杂度)`);
  console.log(`  找到 ${results.length} 个结果:`);
  results.forEach((result, i) => {
    console.log(`    ${i + 1}. ${result.document.id} (相似度: ${result.score.toFixed(4)})`);
  });

  // 获取统计
  const stats = await db.getStats();
  console.log('\n数据库统计:');
  console.log(`  文档总数: ${stats.documentCount}`);
  console.log(`  HNSW 最大层级: ${stats.indexStats.maxLevel}`);
  console.log(`  平均连接数: ${stats.indexStats.avgConnections.toFixed(2)}`);

  return db;
}

// ============================================
// 示例 5: 综合示例 - 智能决策系统
// ============================================

async function integratedExample() {
  console.log('\n=== 综合示例: 智能决策系统 ===\n');

  // 初始化组件
  const memory = createMemGPTMemory();
  await memory.initialize();

  const mcts = createNeuralMCTS({
    numSimulations: 50,
    stateDimension: 64,
    actionSpace: 4,
  });

  const tot = createTreeOfThoughts(undefined, undefined, {
    searchStrategy: 'beam',
    maxDepth: 3,
    beamWidth: 2,
  });

  // 场景: 系统架构设计决策
  console.log('场景: 为电商平台设计推荐系统架构\n');

  // 1. 使用 ToT 生成候选方案
  console.log('1. 使用 Tree of Thoughts 生成候选方案...');
  const totResult = await tot.solve('设计电商推荐系统架构', {
    requirements: ['实时性', '准确性', '可扩展性'],
    constraints: ['预算限制', '开发时间'],
  });

  console.log(`   生成 ${totResult.allValidChains.length} 个候选方案\n`);

  // 2. 将方案存入记忆
  console.log('2. 将方案存入 MemGPT 记忆...');
  for (const chain of totResult.allValidChains.slice(0, 3)) {
    const solution = chain.map(t => t.content).join('\n');
    await memory.addRecallEntry({
      role: 'assistant',
      content: solution,
      importance: 0.8,
      keywords: ['推荐系统', '架构设计'],
      relatedIds: [],
    });
  }
  console.log('   方案已存储\n');

  // 3. 使用 Neural MCTS 评估和选择最佳方案
  console.log('3. 使用 Neural MCTS 评估方案...');
  const decisionState: DecisionState = {
    features: Array(64).fill(0).map(() => Math.random()),
    validActions: [true, true, true, true],
    currentPlayer: 0,
    step: 0,
    metadata: { scenario: 'architecture_selection' },
  };

  const mctsResult = await mcts.search(decisionState);
  console.log(`   推荐选择方案: ${mctsResult.bestAction}`);
  console.log(`   置信度: ${(mctsResult.rootValue * 100).toFixed(2)}%\n`);

  // 4. 记录决策过程
  console.log('4. 记录决策过程...');
  memory.recordAction('generate_options', '使用ToT生成候选方案', {
    count: totResult.allValidChains.length,
  });
  memory.recordAction('evaluate_options', '使用Neural MCTS评估方案', {
    selected: mctsResult.bestAction,
    confidence: mctsResult.rootValue,
  });

  console.log('   决策过程已记录');

  // 5. 检索相关记忆
  console.log('\n5. 检索相关历史决策...');
  const relevantMemories = await memory.search('推荐系统');
  console.log(`   找到 ${relevantMemories.recall.length} 条相关记忆`);

  return {
    totResult,
    mctsResult,
    memory,
  };
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SDKWork Browser Agent - 高级算法示例                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // 示例 1: Neural MCTS
    await neuralMCTSExample();

    // 示例 2: MemGPT
    await memGPTExample();

    // 示例 3: Tree of Thoughts
    await treeOfThoughtsExample();

    // 示例 4: HNSW
    await hnswExample();

    // 示例 5: 综合示例
    await integratedExample();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     所有示例运行完成!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export {
  neuralMCTSExample,
  memGPTExample,
  treeOfThoughtsExample,
  hnswExample,
  integratedExample,
  runAllExamples,
};
