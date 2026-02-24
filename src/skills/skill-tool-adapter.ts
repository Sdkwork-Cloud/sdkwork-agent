/**
 * Skill Tool Adapter - Skill 到 Tool 的适配器
 *
 * 将 Skill 转换为 LLM 可识别的 Tool Definition
 * 支持两种调用方式：
 * 1. 原生 Tool Calling (OpenAI Function Calling)
 * 2. XML 格式调用 (Claude Code / OpenCode 风格)
 *
 * @module Skills/SkillToolAdapter
 * @version 1.0.0
 */

import type { Skill } from '../agent/domain/types.js';
import type { JSONSchema } from '../core/domain/tool.js';
import type { ToolDefinition } from '../llm/provider.js';

export interface SkillToolAdapterConfig {
  prefix?: string;
  includeDescription?: boolean;
  includeParameters?: boolean;
}

export interface SkillToolDefinition extends ToolDefinition {
  _skillName: string;
  _skillRef?: Skill;
}

export class SkillToolAdapter {
  private config: Required<SkillToolAdapterConfig>;

  constructor(config: SkillToolAdapterConfig = {}) {
    this.config = {
      prefix: config.prefix ?? 'skill_',
      includeDescription: config.includeDescription ?? true,
      includeParameters: config.includeParameters ?? true,
    };
  }

  skillToToolDefinition(skill: Skill): SkillToolDefinition {
    const functionName = `${this.config.prefix}${skill.name}`;
    
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    // 尝试从 inputSchema 获取参数定义
    if (skill.inputSchema) {
      try {
        const schema = skill.inputSchema as unknown as { 
          _def?: { 
            shape?: () => Record<string, unknown>;
            checks?: Array<{ kind: string }>;
          };
          shape?: () => Record<string, unknown>;
        };
        
        const shape = schema._def?.shape?.() || schema.shape?.();
        if (shape) {
          for (const [key, value] of Object.entries(shape)) {
            const fieldSchema = value as { 
              _def?: { 
                typeName?: string;
                description?: string;
              };
              description?: string;
            };
            
            let typeName = 'string';
            if (fieldSchema._def?.typeName) {
              const zodType = fieldSchema._def.typeName.toLowerCase();
              if (zodType.includes('string')) typeName = 'string';
              else if (zodType.includes('number')) typeName = 'number';
              else if (zodType.includes('boolean')) typeName = 'boolean';
              else if (zodType.includes('array')) typeName = 'array';
              else if (zodType.includes('object')) typeName = 'object';
            }
            
            properties[key] = {
              type: typeName as JSONSchema['type'],
              description: fieldSchema._def?.description || fieldSchema.description,
            };
          }
        }
      } catch {
        // 无法解析 schema，使用默认
      }
    }

    if (Object.keys(properties).length === 0) {
      properties['input'] = {
        type: 'string',
        description: 'Input for the skill',
      };
    }

    return {
      type: 'function',
      function: {
        name: functionName,
        description: this.config.includeDescription 
          ? skill.description || `Execute the ${skill.name} skill`
          : `Execute ${skill.name}`,
        parameters: {
          type: 'object',
          properties: properties as Record<string, unknown>,
          required: required.length > 0 ? required : undefined,
        },
      },
      _skillName: skill.name,
      _skillRef: skill,
    } as SkillToolDefinition;
  }

  skillsToToolDefinitions(skills: Skill[]): SkillToolDefinition[] {
    return skills.map(skill => this.skillToToolDefinition(skill));
  }

  extractSkillName(toolName: string): string | null {
    if (toolName.startsWith(this.config.prefix)) {
      return toolName.slice(this.config.prefix.length);
    }
    return null;
  }

  isSkillTool(toolName: string): boolean {
    return toolName.startsWith(this.config.prefix);
  }

  buildXmlInvocation(skillName: string, params: Record<string, unknown>): string {
    const paramStr = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `${key}="${this.escapeXmlAttr(strValue)}"`;
      })
      .join(' ');

    return `<skill name="${skillName}"${paramStr ? ' ' + paramStr : ''} />`;
  }

  buildToolXmlInvocation(toolName: string, params: Record<string, unknown>): string {
    const paramStr = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `${key}="${this.escapeXmlAttr(strValue)}"`;
      })
      .join(' ');

    return `<tool name="${toolName}"${paramStr ? ' ' + paramStr : ''} />`;
  }

  buildFinishXmlInvocation(answer: string): string {
    return `<action type="finish" answer="${this.escapeXmlAttr(answer)}" />`;
  }

  buildThinkXmlInvocation(thought: string): string {
    return `<action type="think" thought="${this.escapeXmlAttr(thought)}" />`;
  }

  private escapeXmlAttr(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  buildSkillSystemPrompt(skills: Skill[]): string {
    const skillList = skills.map(skill => {
      const emoji = ((skill.metadata as Record<string, unknown>)?.emoji as string) || '🔧';
      return `${emoji} **${skill.name}**: ${skill.description}`;
    }).join('\n');

    return `You are an AI assistant with access to various skills. You can use these skills to help the user complete tasks.

When you need to use a skill, respond with a skill invocation in the following format:
<skill name="skill-name" param1="value1" param2="value2" />

Available skills:
${skillList}

Usage Guidelines:
1. Analyze the user's request to determine which skill(s) are needed
2. If multiple skills are needed, invoke them in the correct order
3. Use the exact skill name as shown above
4. Provide all required parameters
5. Wait for the skill execution result before proceeding

Response Format:
- To invoke a skill: <skill name="skill-name" param="value" />
- To invoke a tool: <tool name="tool-name" param="value" />
- To provide information: normal text response
- To ask for clarification: explain what information is needed
- To finish: <action type="finish" answer="your final answer" />`;
  }

  buildToolDefinitionsForLLM(skills: Skill[]): ToolDefinition[] {
    return this.skillsToToolDefinitions(skills).map(def => ({
      type: def.type,
      function: def.function,
    }));
  }
}

export const defaultAdapter = new SkillToolAdapter();

export function createSkillToolAdapter(config?: SkillToolAdapterConfig): SkillToolAdapter {
  return new SkillToolAdapter(config);
}

export function skillToToolDefinition(skill: Skill, config?: SkillToolAdapterConfig): SkillToolDefinition {
  const adapter = config ? new SkillToolAdapter(config) : defaultAdapter;
  return adapter.skillToToolDefinition(skill);
}

export function skillsToToolDefinitions(skills: Skill[], config?: SkillToolAdapterConfig): SkillToolDefinition[] {
  const adapter = config ? new SkillToolAdapter(config) : defaultAdapter;
  return adapter.skillsToToolDefinitions(skills);
}

export function buildXmlSkillInvocation(skillName: string, params: Record<string, unknown>): string {
  return defaultAdapter.buildXmlInvocation(skillName, params);
}

export function buildXmlToolInvocation(toolName: string, params: Record<string, unknown>): string {
  return defaultAdapter.buildToolXmlInvocation(toolName, params);
}
