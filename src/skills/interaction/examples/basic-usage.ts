/**
 * 基础使用示例
 * 
 * 展示如何使用优化后的Skill交互管理器
 */

import {
  OptimizedSkillInteractionManager,
  createOptimizedInteractionManager,
  UserInput
} from '../index.js';
import { SkillRegistry } from '../../core/skill-registry.js';
import { SkillScheduler } from '../../core/scheduler.js';

// 模拟创建registry和scheduler
const registry = new SkillRegistry();
const scheduler = new SkillScheduler();

// 创建优化后的交互管理器
const manager = createOptimizedInteractionManager(registry, scheduler, {
  enableMultiLayerExtraction: true,
  enableFewShotLearning: true,
  enableLongTermMemory: true,
  maxConversationDepth: 10
});

// 监听事件
manager.on('sessionCreated', (session) => {
  console.log('会话创建:', session.id);
});

manager.on('errorRecovered', ({ error, strategy }) => {
  console.log('错误已恢复:', error.category, '使用策略:', strategy);
});

async function basicExample() {
  // 创建新会话
  const session = manager.createSession('user-123');
  
  console.log('=== 示例1: 单次交互 ===');
  
  // 简单输入 - 创建临时会话
  const result1 = await manager.processInput({ 
    text: '搜索包含"TODO"的文件' 
  });
  
  console.log('结果:', result1.response);
  console.log('状态:', result1.state);
  console.log('需要输入:', result1.requiresUserInput);
  
  console.log('\n=== 示例2: 多轮对话 ===');
  
  // 第一轮：意图识别
  const result2a = await manager.processInput(session.id, {
    text: '帮我创建一个文件'
  });
  console.log('AI:', result2a.response);
  
  // 第二轮：参数收集
  const result2b = await manager.processInput(session.id, {
    text: '文件名叫test.txt，放在当前目录'
  });
  console.log('AI:', result2b.response);
  
  // 第三轮：确认
  const result2c = await manager.processInput(session.id, {
    text: '是的，确认创建'
  });
  console.log('AI:', result2c.response);
  
  console.log('\n=== 示例3: 带附件的输入 ===');
  
  const result3 = await manager.processInput(session.id, {
    text: '分析这个文件',
    attachments: [{
      type: 'file',
      content: 'file content here...',
      name: 'data.json'
    }]
  });
  console.log('AI:', result3.response);
  
  // 关闭会话
  await manager.closeSession(session.id);
  
  // 获取统计
  const stats = manager.getSessionStats();
  console.log('\n会话统计:', stats);
}

// 运行示例
basicExample().catch(console.error);
