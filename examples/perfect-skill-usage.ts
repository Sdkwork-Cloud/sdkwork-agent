/**
 * Perfect Skill System Usage Example
 *
 * 完美技能系统使用示例
 *
 * 展示如何使用完整的技能系统架构
 */

import { z } from 'zod';
import {
  // 基础类型
  Skill,
  SkillResult,
  ExecutionContext,
  SkillError,
  Logger,
  LLMService,
  MemoryService,
  ToolRegistry,
} from '../src/skills/core/types.js';

import {
  // 技能引擎
  SkillEngine,
  createSkillEngine,
  SkillLifecycleHooks,
  ExecuteOptions,
} from '../src/skills/core/skill-engine.js';

import {
  // 依赖解析器
  SkillDependencyResolver,
  createDependencyResolver,
  SkillDependency,
} from '../src/skills/core/skill-dependency-resolver.js';

import {
  // 增强版技能系统
  EnhancedSkillSystem,
  createEnhancedSkillSystem,
} from '../src/skills/core/enhanced-skill-system.js';

// ============================================================================
// 示例1: 基础技能定义
// ============================================================================

/**
 * 文件读取技能
 */
const fileReadSkill: Skill = {
  name: 'file-read',
  description: '读取文件内容',
  version: '1.0.0',
  inputSchema: z.object({
    path: z.string().describe('文件路径'),
    encoding: z.enum(['utf-8', 'base64']).default('utf-8').describe('文件编码'),
  }),
  metadata: {
    category: 'file',
    tags: ['io', 'read'],
    author: 'sdkwork',
  },
  async execute(input: unknown, context: ExecutionContext): Promise<SkillResult> {
    const { path, encoding } = input as { path: string; encoding: string };

    context.logger.info(`Reading file: ${path}`);

    try {
      // 模拟文件读取
      const content = `Content of ${path}`;

      return {
        success: true,
        data: { path, content, encoding },
      };
    } catch (error) {
      return {
        success: false,
        error: new SkillError(
          `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          'FILE_READ_ERROR',
          false
        ),
      };
    }
  },
};

/**
 * 数据分析技能（依赖 file-read）
 */
const dataAnalysisSkill: Skill = {
  name: 'data-analysis',
  description: '分析数据文件',
  version: '1.0.0',
  inputSchema: z.object({
    filePath: z.string().describe('数据文件路径'),
    analysisType: z.enum(['summary', 'detailed']).default('summary'),
  }),
  metadata: {
    category: 'analysis',
    tags: ['data', 'analytics'],
    author: 'sdkwork',
  },
  async execute(input: unknown, context: ExecutionContext): Promise<SkillResult> {
    const { filePath, analysisType } = input as { filePath: string; analysisType: string };

    context.logger.info(`Analyzing data: ${filePath}, type: ${analysisType}`);

    // 使用工具注册表调用 file-read 技能
    const fileContent = await context.tools.execute('file-read', { path: filePath });

    // 模拟分析
    const analysis = {
      filePath,
      analysisType,
      summary: {
        totalLines: 100,
        totalChars: 5000,
      },
      details: analysisType === 'detailed' ? { wordCount: 800, avgLineLength: 50 } : undefined,
    };

    return {
      success: true,
      data: analysis,
    };
  },
};

/**
 * 报告生成技能（依赖 data-analysis）
 */
const reportGenerationSkill: Skill = {
  name: 'report-generation',
  description: '生成分析报告',
  version: '1.0.0',
  inputSchema: z.object({
    dataFile: z.string().describe('数据文件路径'),
    format: z.enum(['json', 'markdown', 'html']).default('markdown'),
  }),
  metadata: {
    category: 'report',
    tags: ['output', 'formatting'],
    author: 'sdkwork',
  },
  async execute(input: unknown, context: ExecutionContext): Promise<SkillResult> {
    const { dataFile, format } = input as { dataFile: string; format: string };

    context.logger.info(`Generating report for: ${dataFile}, format: ${format}`);

    // 调用 data-analysis 技能
    const analysisResult = await context.tools.execute('data-analysis', {
      filePath: dataFile,
      analysisType: 'detailed',
    });

    // 生成报告
    const report = {
      title: `Analysis Report for ${dataFile}`,
      format,
      generatedAt: new Date().toISOString(),
      data: analysisResult,
    };

    return {
      success: true,
      data: report,
    };
  },
};

// ============================================================================
// 示例2: 使用技能引擎
// ============================================================================

async function exampleSkillEngine() {
  console.log('=== Example: Skill Engine ===\n');

  // 创建日志器
  const logger: Logger = {
    debug: (msg) => console.log(`[DEBUG] ${msg}`),
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.log(`[WARN] ${msg}`),
    error: (msg) => console.log(`[ERROR] ${msg}`),
  };

  // 创建工具注册表
  const tools: ToolRegistry = {
    get: (name) => undefined,
    execute: async (name, params) => {
      logger.info(`Tool called: ${name}`);
      return { tool: name, params };
    },
  };

  // 创建技能引擎
  const engine = createSkillEngine({
    defaultTimeout: 10000,
    enableCache: true,
    logger,
    tools,
  });

  // 设置生命周期钩子
  const hooks: SkillLifecycleHooks = {
    beforeExecute: (input, context) => {
      console.log(`[HOOK] Before execute: ${context.skillName}`);
    },
    afterExecute: (result, context) => {
      console.log(`[HOOK] After execute: ${context.skillName}, success: ${result.success}`);
    },
    onError: (error, context) => {
      console.log(`[HOOK] Error in ${context.skillName}: ${error.message}`);
    },
  };

  engine.setLifecycleHooks(hooks);

  // 执行技能
  const result = await engine.execute(fileReadSkill, {
    path: './data.txt',
    encoding: 'utf-8',
  });

  console.log('\nExecution result:', JSON.stringify(result, null, 2));

  // 获取缓存统计
  const cacheStats = engine.getCacheStats();
  console.log('\nCache stats:', cacheStats);
}

// ============================================================================
// 示例3: 使用依赖解析器
// ============================================================================

async function exampleDependencyResolver() {
  console.log('\n=== Example: Dependency Resolver ===\n');

  // 创建依赖解析器
  const resolver = createDependencyResolver({
    strict: true,
  });

  // 注册技能及其依赖
  resolver.registerSkill(fileReadSkill, []);
  resolver.registerSkill(dataAnalysisSkill, [
    { name: 'file-read', type: 'skill', required: true },
  ]);
  resolver.registerSkill(reportGenerationSkill, [
    { name: 'data-analysis', type: 'skill', required: true },
  ]);

  // 解析依赖
  const resolution = resolver.resolve();
  console.log('Dependency resolution:', resolution);

  // 获取依赖图
  const graph = resolver.getDependencyGraph();
  console.log('\nDependency graph:', JSON.stringify(graph, null, 2));

  // 获取传递依赖
  const allDeps = resolver.getAllDependencies('report-generation');
  console.log('\nAll dependencies of report-generation:', allDeps);
}

// ============================================================================
// 示例4: 批量执行
// ============================================================================

async function exampleBatchExecution() {
  console.log('\n=== Example: Batch Execution ===\n');

  const logger: Logger = {
    debug: () => {},
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: () => {},
    error: () => {},
  };

  const engine = createSkillEngine({ logger });

  // 批量执行任务
  const tasks = [
    { skill: fileReadSkill, input: { path: './file1.txt' } },
    { skill: fileReadSkill, input: { path: './file2.txt' } },
    { skill: fileReadSkill, input: { path: './file3.txt' } },
  ];

  const results = await engine.executeBatch(tasks, { concurrency: 2 });

  console.log('Batch execution results:');
  results.forEach((result, index) => {
    console.log(`  Task ${index + 1}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  });
}

// ============================================================================
// 示例5: 增强版技能系统
// ============================================================================

async function exampleEnhancedSkillSystem() {
  console.log('\n=== Example: Enhanced Skill System ===\n');

  // 创建增强版技能系统
  const skillSystem = createEnhancedSkillSystem({
    workspaceDir: './workspace',
    enableSemanticCache: true,
    enableABTesting: false,
  });

  // 初始化
  await skillSystem.initialize();

  // 查看配置
  const logLevel = skillSystem.getConfig('logging.level');
  console.log('Log level from config:', logLevel);

  // 智能技能选择
  const llm: LLMService = {
    async complete(prompt: string) {
      return 'LLM response';
    },
    async *completeStream(prompt: string) {
      yield 'Streaming...';
    },
  };

  const selection = await skillSystem.selectSkills({
    userInput: 'How do I analyze a CSV file?',
    history: [],
    llm,
  });

  console.log('Selected skills:', selection.selectedSkills);
  console.log('Confidence:', selection.confidence);
  console.log('Reasoning:', selection.reasoning);

  // 关闭
  await skillSystem.shutdown();
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  try {
    await exampleSkillEngine();
    await exampleDependencyResolver();
    await exampleBatchExecution();
    await exampleEnhancedSkillSystem();

    console.log('\n=== All examples completed successfully ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 运行
main();
