/**
 * Enhanced Skill System Usage Example
 *
 * 增强版技能系统使用示例
 *
 * 展示如何使用新的配置系统和兼容性层
 */

import {
  EnhancedSkillSystem,
  createEnhancedSkillSystem,
} from '../src/skills/core/enhanced-skill-system.js';
import { createConfigManager, initGlobalConfig } from '../src/config/agent-config.js';
import { createCompatibilityLayer } from '../src/compatibility/index.js';

/**
 * 示例1: 初始化全局配置
 */
async function example1InitGlobalConfig() {
  console.log('=== Example 1: Initialize Global Config ===');
  
  // 创建默认全局配置文件 ~/.sdkwork/agent.conf
  await initGlobalConfig();
}

/**
 * 示例2: 基础使用
 */
async function example2BasicUsage() {
  console.log('=== Example 2: Basic Usage ===');
  
  // 创建增强版技能系统
  const skillSystem = createEnhancedSkillSystem({
    workspaceDir: './workspace',
    projectDir: './my-project',
    enableSemanticCache: true,
    enableABTesting: true,
  });
  
  // 初始化
  await skillSystem.initialize();
  
  // 查看当前配置
  const logLevel = skillSystem.getConfig('logging.level');
  console.log('Log level:', logLevel);
  
  // 动态更新配置
  skillSystem.updateConfig('skills.selection.confidenceThreshold', 0.7);
  
  // 智能技能选择
  const result = await skillSystem.selectSkills({
    userInput: 'How do I analyze a CSV file?',
    history: [],
    llm: {
      async complete(prompt: string) {
        return 'Analysis complete';
      },
      async *completeStream(prompt: string) {
        yield 'Streaming...';
      },
    },
  });
  
  console.log('Selected skills:', result.selectedSkills);
  console.log('Confidence:', result.confidence);
  
  // 获取系统状态
  const state = skillSystem.getState();
  console.log('System state:', state);
  
  // 关闭
  await skillSystem.shutdown();
}

/**
 * 示例3: 启用兼容性模式
 */
async function example3CompatibilityMode() {
  console.log('=== Example 3: Compatibility Mode ===');
  
  // 首先设置环境变量启用兼容性模式
  process.env.SDKWORK_COMPAT_OPENCLAW = 'true';
  process.env.SDKWORK_COMPAT_CLAUDE = 'true';
  
  const skillSystem = createEnhancedSkillSystem({
    workspaceDir: './workspace',
  });
  
  await skillSystem.initialize();
  
  // 检查启用的兼容模式
  const state = skillSystem.getState();
  console.log('Enabled compatibility modes:', state.compatibility);
  
  await skillSystem.shutdown();
}

/**
 * 示例4: 使用语义缓存
 */
async function example4SemanticCache() {
  console.log('=== Example 4: Semantic Cache ===');
  
  const skillSystem = createEnhancedSkillSystem({
    workspaceDir: './workspace',
    enableSemanticCache: true,
  });
  
  await skillSystem.initialize();
  
  // 第一次查询（会缓存）
  const result1 = await skillSystem.selectSkills({
    userInput: 'How to parse JSON in Python?',
    history: [],
    llm: {
      async complete(prompt: string) {
        return 'Result 1';
      },
      async *completeStream(prompt: string) {
        yield 'Streaming...';
      },
    },
  });
  
  // 第二次查询相似问题（会命中缓存）
  const result2 = await skillSystem.selectSkills({
    userInput: 'Python JSON parsing methods',
    history: [],
    llm: {
      async complete(prompt: string) {
        return 'Result 2';
      },
      async *completeStream(prompt: string) {
        yield 'Streaming...';
      },
    },
  });
  
  console.log('Result 1:', result1.selectedSkills);
  console.log('Result 2:', result2.selectedSkills);
  
  // 查看缓存统计
  const state = skillSystem.getState();
  console.log('Cache stats:', state.semanticCache);
  
  await skillSystem.shutdown();
}

/**
 * 示例5: A/B 测试
 */
async function example5ABTesting() {
  console.log('=== Example 5: A/B Testing ===');
  
  const skillSystem = createEnhancedSkillSystem({
    workspaceDir: './workspace',
    enableABTesting: true,
  });
  
  await skillSystem.initialize();
  
  // 多次查询，自动使用不同算法变体
  for (let i = 0; i < 10; i++) {
    const result = await skillSystem.selectSkills({
      userInput: `Query ${i}: How to optimize database queries?`,
      history: [],
      llm: {
        async complete(prompt: string) {
          return `Result ${i}`;
        },
        async *completeStream(prompt: string) {
          yield 'Streaming...';
        },
      },
    }, {
      experimentId: `user-${i}`,
    });
    
    console.log(`Query ${i}:`, result.selectedSkills, '- Reasoning:', result.reasoning.slice(0, 50));
  }
  
  await skillSystem.shutdown();
}

/**
 * 主函数
 */
async function main() {
  try {
    // 运行示例
    await example1InitGlobalConfig();
    await example2BasicUsage();
    await example3CompatibilityMode();
    await example4SemanticCache();
    await example5ABTesting();
    
    console.log('\n=== All examples completed ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 运行
main();
