/**
 * 高级功能示例
 * 
 * 展示优化后架构的高级功能
 */

import {
  OptimizedSkillInteractionManager,
  IntelligentParameterExtractor,
  LongTermMemorySystem,
  ErrorRecoveryManager,
  createOptimizedInteractionManager
} from '../index.js';
import { SkillRegistry } from '../../core/skill-registry.js';
import { SkillScheduler } from '../../core/scheduler.js';

const registry = new SkillRegistry();
const scheduler = new SkillScheduler();

// ==================== 示例1: 智能参数提取 ====================

async function parameterExtractionExample() {
  console.log('=== 智能参数提取示例 ===\n');
  
  const extractor = new IntelligentParameterExtractor(true);
  
  // 定义参数
  const definitions = [
    { name: 'path', type: 'string', required: true },
    { name: 'recursive', type: 'boolean', required: false },
    { name: 'pattern', type: 'string', required: false }
  ];
  
  // 示例1: 结构化输入
  console.log('1. 结构化输入:');
  const result1 = await extractor.extract(
    '{"path": "/home/user", "recursive": true}',
    null as any,
    definitions,
    { conversationHistory: [] }
  );
  console.log('  提取结果:', result1.params);
  console.log('  置信度:', result1.confidence);
  
  // 示例2: 自然语言输入
  console.log('\n2. 自然语言输入:');
  const result2 = await extractor.extract(
    '搜索当前目录下的所有js文件，要递归查找',
    null as any,
    definitions,
    { 
      conversationHistory: [],
      skillContext: { name: 'file_search', description: '搜索文件' }
    }
  );
  console.log('  提取结果:', result2.params);
  console.log('  置信度:', result2.confidence);
  
  // 示例3: 混合输入
  console.log('\n3. 混合输入:');
  const result3 = await extractor.extract(
    'path: /home/user，递归查找，pattern是*.ts',
    null as any,
    definitions,
    { conversationHistory: [] }
  );
  console.log('  提取结果:', result3.params);
}

// ==================== 示例2: 长期记忆 ====================

async function longTermMemoryExample() {
  console.log('\n=== 长期记忆示例 ===\n');
  
  const memory = new LongTermMemorySystem();
  
  // 存储不同类型的记忆
  console.log('1. 存储记忆:');
  
  await memory.store(
    '用户喜欢使用TypeScript',
    'user_preference',
    'medium_term',
    { category: 'language' },
    0.8
  );
  
  await memory.store(
    '上次执行了文件搜索skill',
    'skill_execution',
    'short_term',
    { skillName: 'file_search', success: true },
    0.6
  );
  
  await memory.store(
    '项目目录在 /home/user/projects',
    'context_fact',
    'long_term',
    { source: 'user_input' },
    0.9
  );
  
  console.log('  已存储3条记忆');
  
  // 检索记忆
  console.log('\n2. 检索记忆:');
  const results = await memory.retrieve('用户喜欢什么编程语言？', {
    limit: 5,
    layers: ['short_term', 'medium_term', 'long_term']
  });
  
  results.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.entry.content} (相似度: ${result.similarity.toFixed(2)})`);
  });
  
  // 获取统计
  console.log('\n3. 记忆统计:');
  const stats = memory.getStats();
  console.log('  总记忆数:', stats.totalEntries);
  console.log('  各层分布:', stats.layerDistribution);
}

// ==================== 示例3: 错误恢复 ====================

async function errorRecoveryExample() {
  console.log('\n=== 错误恢复示例 ===\n');
  
  const recoveryManager = new ErrorRecoveryManager({
    maxRetries: 3,
    enableAutoFix: true,
    enableLearning: true
  });
  
  // 注册降级skill
  recoveryManager.registerFallbackSkill('complex_search', 'simple_search');
  
  // 示例1: 参数缺失错误
  console.log('1. 参数缺失错误:');
  const error1 = new Error('Missing required parameter: path');
  const skillError1 = recoveryManager.analyzeError(error1, {
    skillName: 'file_search',
    params: {}
  });
  console.log('  错误分类:', skillError1.category);
  console.log('  建议策略:', skillError1.suggestedStrategy);
  
  const recovery1 = await recoveryManager.recover(skillError1);
  console.log('  恢复结果:', recovery1.action);
  console.log('  需要澄清:', recovery1.clarificationNeeded);
  
  // 示例2: 超时错误
  console.log('\n2. 超时错误:');
  const error2 = new Error('Operation timeout after 30000ms');
  const skillError2 = recoveryManager.analyzeError(error2, {
    skillName: 'file_search',
    params: { path: '/home' }
  });
  console.log('  错误分类:', skillError2.category);
  console.log('  建议策略:', skillError2.suggestedStrategy);
  
  const recovery2 = await recoveryManager.recover(skillError2);
  console.log('  恢复结果:', recovery2.action);
  console.log('  下一步:', recovery2.nextStep);
  
  // 示例3: 权限错误
  console.log('\n3. 权限错误:');
  const error3 = new Error('Permission denied: cannot access /root');
  const skillError3 = recoveryManager.analyzeError(error3, {
    skillName: 'file_read',
    params: { path: '/root/secret.txt' }
  });
  console.log('  错误分类:', skillError3.category);
  console.log('  严重程度:', skillError3.severity);
  console.log('  是否可恢复:', skillError3.recoverable);
  
  // 获取统计
  console.log('\n4. 恢复统计:');
  const stats = recoveryManager.getRecoveryStats();
  console.log('  总错误数:', stats.totalErrors);
  console.log('  成功恢复:', stats.successfulRecoveries);
  console.log('  自动修复:', stats.autoFixes);
  console.log('  重试次数:', stats.retries);
}

// ==================== 示例4: 完整交互流程 ====================

async function completeInteractionExample() {
  console.log('\n=== 完整交互流程示例 ===\n');
  
  const manager = createOptimizedInteractionManager(registry, scheduler, {
    enableMultiLayerExtraction: true,
    enableLongTermMemory: true,
    recoveryConfig: {
      maxRetries: 3,
      enableAutoFix: true
    }
  });
  
  // 创建会话
  const session = manager.createSession('user-demo');
  console.log('创建会话:', session.id);
  
  // 模拟完整的多轮对话
  const conversation = [
    { text: '帮我分析代码', expectedState: 'GATHERING_PARAMS' },
    { text: '分析src目录下的所有TypeScript文件', expectedState: 'CONFIRMING' },
    { text: '是的，确认执行', expectedState: 'FOLLOW_UP' },
    { text: '新的', expectedState: 'GATHERING_PARAMS' },
    { text: '退出', expectedState: 'IDLE' }
  ];
  
  for (const turn of conversation) {
    console.log(`\n用户: ${turn.text}`);
    const result = await manager.processInput(session.id, { text: turn.text });
    console.log(`AI: ${result.response}`);
    console.log(`状态: ${result.state} (期望: ${turn.expectedState})`);
  }
  
  // 获取最终统计
  const stats = manager.getSessionStats();
  console.log('\n最终统计:', stats);
}

// 运行所有示例
async function runAllExamples() {
  await parameterExtractionExample();
  await longTermMemoryExample();
  await errorRecoveryExample();
  await completeInteractionExample();
}

runAllExamples().catch(console.error);
