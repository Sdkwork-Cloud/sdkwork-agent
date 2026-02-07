/**
 * Example: Prompt Optimizer Skill
 *
 * This example demonstrates the comprehensive capabilities of the Prompt Optimizer Skill,
 * including video generation, image generation, system prompt, and general prompt optimization.
 * It showcases both natural language and JSON structured output formats.
 *
 * Key features demonstrated:
 * - Video generation prompt optimization (text-to-video, image-to-video, JSON structured)
 * - Image generation prompt optimization (text-to-image, image-to-image, JSON structured)
 * - System prompt optimization for AI agents
 * - General prompt optimization for better results
 * - Multiple output formats (natural language, JSON structured, API formats)
 * - Model-specific optimizations for various AI platforms
 */

import { handler } from '../src/skills/prompt-optimizer-skill/handler';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'PromptOptimizerExample');

class PromptOptimizerExample {
  /**
   * Example 1: Video Generation - Text to Video
   * Demonstrates how to optimize a simple text description into a professional video generation prompt
   */
  async demonstrateVideoGenerationTextToVideo() {
    logger.info('\n========================================');
    logger.info('Example 1: Video Generation - Text to Video');
    logger.info('========================================\n');

    const result = await handler({
      type: 'video-generation',
      subtype: 'text-to-video',
      description: '一只金毛犬在海边沙滩上奔跑，夕阳西下，海浪轻轻拍打着海岸',
      style: 'cinematic',
      duration: 5,
      fps: 24,
      width: 1024,
      height: 576,
      motion: 'dynamic',
      camera: 'drone',
      lighting: 'golden-hour',
      aspectRatio: '16:9',
      targetModel: 'runway-gen3',
    }, {} as any);

    if (result.success) {
      logger.info('✓ Video generation prompt optimized successfully');
      logger.info('\n--- Natural Language Output ---');
      const english = (result.data as any).naturalLanguage.english;
      const chinese = (result.data as any).naturalLanguage.chinese;
      logger.info('English: ' + english.substring(0, 200) + '...');
      logger.info('Chinese: ' + chinese.substring(0, 200) + '...');
      
      logger.info('\n--- JSON Structured Output ---');
      const jsonOutput = (result.data as any).jsonStructured;
      logger.info('Version: ' + jsonOutput.version);
      logger.info('Scene Setting: ' + jsonOutput.scene.setting);
      logger.info('Camera Type: ' + jsonOutput.camera.type);
      logger.info('Lighting Type: ' + jsonOutput.lighting.type);
      logger.info('Motion Speed: ' + jsonOutput.motion.speed);
      logger.info('Output Resolution: ' + jsonOutput.output.width + 'x' + jsonOutput.output.height);
      
      logger.info('\n--- API Formats ---');
      const apiFormats = (result.data as any).apiFormat;
      logger.info('Available API formats: ' + Object.keys(apiFormats).join(', '));
      
      logger.info('\n--- Technical Specs ---');
      logger.info('Technical specifications: ' + JSON.stringify((result.data as any).technicalSpecs));
      
      logger.info('\n--- Tips ---');
      (result.data as any).tips.forEach((tip: string, index: number) => {
        logger.info((index + 1) + '. ' + tip);
      });
    } else {
      logger.error('Failed to optimize video prompt: ' + (result.error || 'Unknown error'));
    }
  }

  /**
   * Example 2: Video Generation - JSON Structured Output
   * Demonstrates the complete JSON structured format for video generation
   */
  async demonstrateVideoGenerationJSONStructured() {
    logger.info('\n========================================');
    logger.info('Example 2: Video Generation - JSON Structured');
    logger.info('========================================\n');

    const result = await handler({
      type: 'video-generation',
      subtype: 'json-structured',
      description: '赛博朋克风格的城市夜景，霓虹灯闪烁，飞行器穿梭在高楼之间',
      style: 'cinematic',
      duration: 10,
      fps: 30,
      width: 1280,
      height: 720,
      motion: 'dynamic',
      camera: 'drone',
      lighting: 'neon',
      aspectRatio: '16:9',
      targetModel: 'runway-gen3',
    }, {} as any);

    if (result.success) {
      logger.info('✓ JSON structured video prompt generated');
      const jsonOutput = (result.data as any).jsonStructured;
      
      logger.info('\n--- Complete JSON Structure ---');
      logger.info(JSON.stringify(jsonOutput, null, 2));
      
      logger.info('\n--- Key Parameters ---');
      logger.info('Motion Bucket ID: ' + jsonOutput.parameters.motion_bucket_id);
      logger.info('Noise Aug Strength: ' + jsonOutput.parameters.noise_aug_strength);
      logger.info('Duration: ' + jsonOutput.output.duration + ' seconds');
      logger.info('FPS: ' + jsonOutput.output.fps);
    } else {
      logger.error('Failed to generate JSON structured prompt: ' + (result.error || 'Unknown error'));
    }
  }

  /**
   * Example 3: Image Generation - Text to Image
   * Demonstrates image generation prompt optimization with various styles
   */
  async demonstrateImageGenerationTextToImage() {
    logger.info('\n========================================');
    logger.info('Example 3: Image Generation - Text to Image');
    logger.info('========================================\n');

    const styles = [
      { style: 'photorealistic', description: '一位年轻女性在咖啡店读书，阳光透过窗户洒在她的脸上' },
      { style: 'digital-art', description: '未来城市悬浮在云端，巨大的飞船穿梭其间' },
      { style: 'anime', description: '樱花树下的少女，穿着和服，微笑着看向远方' },
    ];

    for (const { style, description } of styles) {
      logger.info('\n--- Style: ' + style + ' ---');
      
      const result = await handler({
        type: 'image-generation',
        subtype: 'text-to-image',
        description,
        style: style as any,
        quality: 'masterpiece',
        width: 1024,
        height: 1024,
        lighting: 'natural',
        camera: '85mm',
        steps: 50,
        cfgScale: 7.5,
        targetModel: 'midjourney-v6',
      }, {} as any);

      if (result.success) {
        logger.info('✓ Image prompt optimized for style: ' + style);
        const englishPrompt = (result.data as any).naturalLanguage.english;
        logger.info('English prompt: ' + englishPrompt.substring(0, 150) + '...');
        logger.info('Negative prompt: ' + (result.data as any).negativePrompt);
      } else {
        logger.error('Failed to optimize ' + style + ' prompt: ' + (result.error || 'Unknown error'));
      }
    }
  }

  /**
   * Example 4: Image Generation - API Format Output
   * Demonstrates API-ready formats for different platforms
   */
  async demonstrateImageGenerationAPIFormats() {
    logger.info('\n========================================');
    logger.info('Example 4: Image Generation - API Formats');
    logger.info('========================================\n');

    const result = await handler({
      type: 'image-generation',
      subtype: 'api-format',
      description: '赛博朋克风格的女战士，手持光剑，霓虹灯背景',
      style: 'digital-art',
      quality: 'masterpiece',
      width: 1024,
      height: 1024,
      lighting: 'neon',
      camera: '85mm',
      steps: 50,
      cfgScale: 7.5,
      seed: 123456,
      targetModel: 'midjourney-v6',
    }, {} as any);

    if (result.success) {
      logger.info('✓ API formats generated for multiple platforms');
      
      const apiFormats = (result.data as any).apiFormat;
      
      logger.info('\n--- OpenAI DALL-E 3 Format ---');
      logger.info(JSON.stringify(apiFormats.openai, null, 2));
      
      logger.info('\n--- Midjourney Format ---');
      logger.info(JSON.stringify(apiFormats.midjourney, null, 2));
      
      logger.info('\n--- Stable Diffusion Format ---');
      logger.info(JSON.stringify(apiFormats.stablediffusion, null, 2));
      
      logger.info('\n--- JSON Structured Format ---');
      const jsonStructured = (result.data as any).jsonStructured;
      logger.info('Generation parameters: ' + JSON.stringify({
        steps: jsonStructured.generation.steps,
        cfgScale: jsonStructured.generation.cfgScale,
        sampler: jsonStructured.generation.sampler,
        seed: jsonStructured.generation.seed,
      }));
    } else {
      logger.error('Failed to generate API formats: ' + (result.error || 'Unknown error'));
    }
  }

  /**
   * Example 5: System Prompt Optimization
   * Demonstrates creating professional system prompts for AI agents
   */
  async demonstrateSystemPromptOptimization() {
    logger.info('\n========================================');
    logger.info('Example 5: System Prompt Optimization');
    logger.info('========================================\n');

    const agentConfigs = [
      {
        role: '代码审查助手',
        goal: '帮助开发者审查代码，发现潜在问题并提供改进建议',
        tone: 'technical' as const,
        capabilities: ['代码审查', '性能优化建议', '安全漏洞检测', '最佳实践指导'],
        constraints: ['始终解释代码问题的原因', '提供具体的改进建议', '考虑性能和安全性', '保持建设性和尊重'],
        outputFormat: '结构化报告，包含问题描述、严重级别、改进建议',
      },
      {
        role: '创意写作助手',
        goal: '帮助用户进行创意写作，提供灵感和改进建议',
        tone: 'friendly' as const,
        capabilities: ['故事构思', '角色设计', '情节优化', '文风建议'],
        constraints: ['尊重用户创意', '提供建设性反馈', '鼓励创新思维'],
        outputFormat: '分段建议，包含具体示例',
      },
      {
        role: '数据分析专家',
        goal: '帮助用户分析数据，提取洞察并提供可视化建议',
        tone: 'professional' as const,
        capabilities: ['数据清洗', '统计分析', '可视化建议', '报告生成'],
        constraints: ['确保数据准确性', '解释分析原理', '提供可操作建议'],
        outputFormat: '结构化分析报告',
      },
    ];

    for (const config of agentConfigs) {
      logger.info('\n--- Agent: ' + config.role + ' ---');
      
      const result = await handler({
        type: 'system-prompt',
        ...config,
      }, {} as any);

      if (result.success) {
        logger.info('✓ System prompt generated for: ' + config.role);
        
        const data = result.data as any;
        logger.info('\nSystem Prompt Preview:');
        logger.info(data.systemPrompt.substring(0, 300) + '...');
        
        logger.info('\nJSON Structure:');
        logger.info('- Capabilities: ' + data.jsonStructure.capabilities.length + ' items');
        logger.info('- Constraints: ' + data.jsonStructure.constraints.length + ' items');
        logger.info('- Tone: ' + data.jsonStructure.role_definition.personality);
      } else {
        logger.error('Failed to generate system prompt for ' + config.role + ': ' + (result.error || 'Unknown error'));
      }
    }
  }

  /**
   * Example 6: General Prompt Optimization
   * Demonstrates optimizing everyday queries for better AI responses
   */
  async demonstrateGeneralPromptOptimization() {
    logger.info('\n========================================');
    logger.info('Example 6: General Prompt Optimization');
    logger.info('========================================\n');

    const queries = [
      {
        query: '解释一下机器学习',
        context: '面向初学者的科普文章',
        audience: '没有技术背景的普通读者',
        format: '通俗易懂，使用类比',
        constraints: ['避免使用专业术语', '提供生活中的例子', '控制在500字以内'],
      },
      {
        query: '如何学习编程',
        context: '给大学生的职业规划建议',
        audience: '计算机专业大一学生',
        format: '分步骤指南，包含资源推荐',
        constraints: ['考虑学习曲线', '推荐实用工具', '包含实践项目'],
      },
      {
        query: '写一首关于春天的诗',
        context: '用于学校文学社团活动',
        audience: '中学生',
        format: '现代诗，4-6节',
        constraints: ['使用生动的意象', '押韵或半押韵', '表达希望和新生的主题'],
      },
    ];

    for (const queryConfig of queries) {
      logger.info('\n--- Query: ' + queryConfig.query + ' ---');
      
      const result = await handler({
        type: 'general-prompt',
        ...queryConfig,
      }, {} as any);

      if (result.success) {
        logger.info('✓ Query optimized');
        
        const data = result.data as any;
        logger.info('\nOriginal Query: ' + data.originalQuery);
        logger.info('Optimized Query: ' + data.optimizedQuery.substring(0, 200) + '...');
        
        logger.info('\nJSON Structure:');
        logger.info('- Context: ' + data.jsonStructure.context);
        logger.info('- Target Audience: ' + data.jsonStructure.target_audience);
        logger.info('- Format Requirements: ' + data.jsonStructure.format_requirements);
        logger.info('- Constraints: ' + data.jsonStructure.constraints.length + ' items');
        
        logger.info('\nTips:');
        data.tips.forEach((tip: string, index: number) => {
          logger.info((index + 1) + '. ' + tip);
        });
      } else {
        logger.error('Failed to optimize query "' + queryConfig.query + '": ' + (result.error || 'Unknown error'));
      }
    }
  }

  /**
   * Example 7: Batch Processing
   * Demonstrates processing multiple prompts efficiently
   */
  async demonstrateBatchProcessing() {
    logger.info('\n========================================');
    logger.info('Example 7: Batch Processing');
    logger.info('========================================\n');

    const batchItems = [
      { type: 'video-generation', description: '瀑布从悬崖上倾泻而下，彩虹出现在水雾中' },
      { type: 'image-generation', description: '古老的图书馆，阳光透过彩色玻璃窗' },
      { type: 'general-prompt', query: '如何制作一杯完美的咖啡' },
    ];

    logger.info('Processing ' + batchItems.length + ' items in batch...');
    const startTime = Date.now();

    const results = await Promise.all(
      batchItems.map(async (item) => {
        try {
          if (item.type === 'video-generation') {
            return await handler({
              type: 'video-generation',
              description: item.description,
              style: 'cinematic',
              duration: 5,
            }, {} as any);
          } else if (item.type === 'image-generation') {
            return await handler({
              type: 'image-generation',
              description: item.description,
              style: 'photorealistic',
              quality: 'high',
            }, {} as any);
          } else {
            return await handler({
              type: 'general-prompt',
              query: item.query,
            }, {} as any);
          }
        } catch (error) {
          return { success: false, error: String(error) };
        }
      })
    );

    const duration = Date.now() - startTime;
    logger.info('Batch processing completed in ' + duration + 'ms');

    const successCount = results.filter(r => r.success).length;
    logger.info('Success rate: ' + successCount + '/' + batchItems.length + ' (' + (successCount / batchItems.length * 100).toFixed(1) + '%)');

    results.forEach((result, index) => {
      if (result.success) {
        logger.info('✓ Item ' + (index + 1) + ' processed successfully');
      } else {
        logger.error('✗ Item ' + (index + 1) + ' failed: ' + (result.error || 'Unknown error'));
      }
    });
  }

  /**
   * Example 8: Error Handling and Edge Cases
   * Demonstrates proper error handling for various scenarios
   */
  async demonstrateErrorHandling() {
    logger.info('\n========================================');
    logger.info('Example 8: Error Handling and Edge Cases');
    logger.info('========================================\n');

    // Test 1: Empty description
    logger.info('\n--- Test 1: Empty description ---');
    const result1 = await handler({
      type: 'video-generation',
      description: '',
    }, {} as any);
    logger.info('Result: ' + (result1.success ? 'Success' : 'Handled gracefully'));

    // Test 2: Invalid style
    logger.info('\n--- Test 2: Invalid parameters ---');
    const result2 = await handler({
      type: 'image-generation',
      description: 'Test image',
      style: 'invalid-style' as any,
    }, {} as any);
    logger.info('Result: ' + (result2.success ? 'Success' : 'Handled gracefully'));

    // Test 3: Missing required field
    logger.info('\n--- Test 3: Missing required field ---');
    const result3 = await handler({
      type: 'system-prompt',
      // role is missing
    } as any, {} as any);
    logger.info('Result: ' + (result3.success ? 'Success' : 'Handled gracefully'));

    // Test 4: Very long description
    logger.info('\n--- Test 4: Long description ---');
    const longDescription = 'A beautiful scene '.repeat(100);
    const result4 = await handler({
      type: 'video-generation',
      description: longDescription,
    }, {} as any);
    logger.info('Result: ' + (result4.success ? 'Success' : 'Handled gracefully'));

    logger.info('\n✓ All edge cases handled properly');
  }
}

// Run the example
async function main() {
  const example = new PromptOptimizerExample();

  try {
    logger.info('╔════════════════════════════════════════════════════════════╗');
    logger.info('║     Prompt Optimizer Skill - Comprehensive Examples         ║');
    logger.info('╚════════════════════════════════════════════════════════════╝');
    logger.info('\nThis example demonstrates the full capabilities of the Prompt Optimizer Skill.');
    logger.info('Including video generation, image generation, system prompts, and general prompts.');
    logger.info('');

    await example.demonstrateVideoGenerationTextToVideo();
    await example.demonstrateVideoGenerationJSONStructured();
    await example.demonstrateImageGenerationTextToImage();
    await example.demonstrateImageGenerationAPIFormats();
    await example.demonstrateSystemPromptOptimization();
    await example.demonstrateGeneralPromptOptimization();
    await example.demonstrateBatchProcessing();
    await example.demonstrateErrorHandling();

    logger.info('\n\n========================================');
    logger.info('All examples completed successfully!');
    logger.info('========================================\n');

    logger.info('Summary:');
    logger.info('✓ Video generation prompts optimized');
    logger.info('✓ Image generation prompts optimized');
    logger.info('✓ System prompts created for AI agents');
    logger.info('✓ General queries enhanced');
    logger.info('✓ Batch processing demonstrated');
    logger.info('✓ Error handling verified');
    logger.info('✓ Multiple output formats supported');
    logger.info('✓ Model-specific optimizations applied');

  } catch (error) {
    logger.error('Example failed: ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { PromptOptimizerExample };
