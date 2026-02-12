/**
 * Universal Skill Loader
 *
 * 通用技能加载器 - 支持多位置技能加载
 *
 * 加载位置（按优先级从低到高）：
 * 1. builtin - 内置技能 (src/skills/builtin)
 * 2. managed - 用户级技能 (~/.sdkwork/skills)
 * 3. workspace - 工作区技能 (./.sdkwork/skills)
 *
 * 技能格式：遵循 SKILL.md 规范
 *
 * @module Skills
 * @version 2.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';
import type { Skill as DomainSkill } from '../core/domain/skill.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ name: 'UniversalSkillLoader' });

/**
 * 技能来源类型
 */
export type SkillSource = 'builtin' | 'managed' | 'workspace';

/**
 * 技能加载结果
 */
export interface LoadedSkill {
  skill: DomainSkill;
  source: SkillSource;
  path: string;
}

/**
 * 技能加载统计
 */
export interface SkillLoadStats {
  total: number;
  bySource: Record<SkillSource, number>;
  errors: string[];
}

/**
 * SKILL.md frontmatter 解析结果
 */
interface SkillFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  category?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * 参数定义
 */
interface ParameterDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];
  examples?: string[];
}

/**
 * 解析 SKILL.md 文件的 frontmatter
 * 
 * 支持多种 YAML frontmatter 格式：
 * 
 * 格式1 - 嵌套 metadata:
 * ---
 * name: skill-name
 * description: Skill description
 * metadata:
 *   author: author-name
 *   version: '1.0.0'
 *   category: category-name
 *   tags: tag1 tag2 tag3
 * ---
 * 
 * 格式2 - 扁平结构:
 * ---
 * name: skill-name
 * description: Skill description
 * author: author-name
 * version: '1.0.0'
 * category: category-name
 * tags: ['tag1', 'tag2', 'tag3']
 * ---
 */
function parseSkillFrontmatter(content: string): SkillFrontmatter | null {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const yamlContent = match[1];
  const frontmatter: Partial<SkillFrontmatter> = {};
  const metadata: Record<string, unknown> = {};
  let inMetadata = false;
  let currentArray: unknown[] | null = null;
  let currentArrayKey = '';

  // 解析 YAML 内容
  const lines = yamlContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 跳过空行
    if (!trimmed) {
      // 如果正在解析数组，空行表示数组结束
      if (currentArray && currentArrayKey) {
        metadata[currentArrayKey] = currentArray;
        currentArray = null;
        currentArrayKey = '';
      }
      continue;
    }

    // 检查是否是 metadata 块开始
    if (trimmed === 'metadata:') {
      inMetadata = true;
      continue;
    }

    // 如果在 metadata 块内
    if (inMetadata) {
      // 检查是否退出 metadata 块（遇到非缩进的键）
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        // 保存当前数组
        if (currentArray && currentArrayKey) {
          metadata[currentArrayKey] = currentArray;
          currentArray = null;
          currentArrayKey = '';
        }
        inMetadata = false;
        i--; // 回退一行重新处理
        continue;
      }

      // 检查是否是数组项
      if (trimmed.startsWith('- ')) {
        if (currentArray) {
          const value = trimmed.slice(2).trim();
          currentArray.push(parseYamlValue(value));
        }
        continue;
      }

      // 保存之前的数组
      if (currentArray && currentArrayKey) {
        metadata[currentArrayKey] = currentArray;
        currentArray = null;
        currentArrayKey = '';
      }

      // 解析 metadata 内的键值对
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // 检查是否是数组开始（值部分为空，下一行是数组项）
      if (!value && i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
        currentArray = [];
        currentArrayKey = key;
        continue;
      }

      metadata[key] = parseYamlValue(value);
      continue;
    }

    // 解析顶层键值对
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // 检查是否是数组开始
    if (!value && i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
      currentArray = [];
      currentArrayKey = key;
      continue;
    }

    (frontmatter as Record<string, unknown>)[key] = parseYamlValue(value);
  }

  // 保存最后的数组
  if (currentArray && currentArrayKey) {
    metadata[currentArrayKey] = currentArray;
  }

  // 合并 metadata 到 frontmatter
  if (metadata.author) frontmatter.author = metadata.author as string;
  if (metadata.version) frontmatter.version = metadata.version as string;
  if (metadata.category) frontmatter.category = metadata.category as string;
  if (metadata.tags) {
    const tagsValue = metadata.tags;
    if (Array.isArray(tagsValue)) {
      frontmatter.tags = tagsValue as string[];
    } else if (typeof tagsValue === 'string') {
      // 可能是空格分隔或逗号分隔
      frontmatter.tags = tagsValue.split(/[\s,]+/).filter(t => t);
    }
  }

  // 验证必需字段
  if (!frontmatter.name || !frontmatter.description) {
    return null;
  }

  return frontmatter as SkillFrontmatter;
}

/**
 * 解析 YAML 值
 */
function parseYamlValue(value: string): unknown {
  value = value.trim();
  
  // 空值
  if (!value) return '';
  
  // 字符串引号
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // 数组格式 ['item1', 'item2']
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1);
    return inner.split(',').map(item => parseYamlValue(item.trim())).filter(item => item !== '');
  }
  
  // 数字
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  
  // 布尔值
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  
  // 默认返回字符串
  return value;
}

/**
 * 解析 SKILL.md 中的 Parameters 部分
 * 
 * 支持格式:
 * ## Parameters
 * 
 * - `paramName` (type, required): Description
 * - `paramName` (type, optional): Description (default: value)
 * - `paramName` (type): Description
 *   - Examples: "example1", "example2"
 *   - "option1" - Description
 *   - "option2" - Description
 */
function parseParametersSection(content: string): ParameterDef[] {
  const parameters: ParameterDef[] = [];
  
  // 查找 Parameters 部分
  const paramsMatch = content.match(/##\s*Parameters\s*\n([\s\S]*?)(?=\n##|$)/);
  if (!paramsMatch) return parameters;
  
  const paramsSection = paramsMatch[1];
  const lines = paramsSection.split('\n');
  
  let currentParam: ParameterDef | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 跳过空行
    if (!trimmed) continue;
    
    // 检查是否是参数定义行（以 - ` 开头）
    // 格式: - `paramName` (type, required): Description
    const paramMatch = trimmed.match(/^- `\s*(\w+)\s*`(?:\s*\(([^)]+)\))?\s*:\s*(.+)$/);
    
    if (paramMatch) {
      // 保存之前的参数
      if (currentParam) {
        parameters.push(currentParam);
      }
      
      const name = paramMatch[1];
      const typeInfo = paramMatch[2] || '';
      const description = paramMatch[3].trim();
      
      // 解析类型信息
      const typeParts = typeInfo.split(',').map(s => s.trim().toLowerCase());
      const type = typeParts.find(t => ['string', 'number', 'boolean', 'array', 'object', 'any'].includes(t)) || 'string';
      const required = typeParts.includes('required');
      
      // 检查默认值 (default: value)
      let defaultValue: unknown = undefined;
      const defaultMatch = description.match(/\(default:\s*([^)]+)\)/i);
      if (defaultMatch) {
        defaultValue = parseYamlValue(defaultMatch[1].trim());
      }
      
      currentParam = {
        name,
        type,
        required,
        description: description.replace(/\s*\(default:[^)]+\)/i, '').trim(),
        default: defaultValue,
        enum: [],
      };
      
      continue;
    }
    
    // 检查是否是子项（以 - 开头但不是参数定义）
    if (currentParam && trimmed.startsWith('- ') && !trimmed.startsWith('- `')) {
      // 检查是否是 Examples 行
      const examplesMatch = trimmed.match(/^- Examples:\s*(.+)$/);
      if (examplesMatch) {
        currentParam.examples = examplesMatch[1]
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''));
        continue;
      }
      
      // 检查是否是枚举值行: - "value" - Description
      const enumMatch = trimmed.match(/^- "([^"]+)"(?:\s*-\s*(.+))?$/);
      if (enumMatch) {
        if (!currentParam.enum) currentParam.enum = [];
        currentParam.enum.push(enumMatch[1]);
        continue;
      }
      
      // 其他子项可能是描述的一部分，跳过
    }
  }
  
  // 保存最后一个参数
  if (currentParam) {
    parameters.push(currentParam);
  }
  
  return parameters;
}

/**
 * 将参数定义转换为 JSON Schema
 */
function parametersToSchema(parameters: ParameterDef[]): import('../core/domain/skill.js').JSONSchema | null {
  if (parameters.length === 0) return null;
  
  const properties: Record<string, import('../core/domain/skill.js').JSONSchema> = {};
  const required: string[] = [];
  
  for (const param of parameters) {
    const propSchema: import('../core/domain/skill.js').JSONSchema = {
      type: param.type as 'string' | 'number' | 'boolean' | 'object' | 'array',
      description: param.description,
    };
    
    if (param.default !== undefined) {
      propSchema.default = param.default;
    }
    
    if (param.enum && param.enum.length > 0) {
      propSchema.enum = param.enum;
    }
    
    properties[param.name] = propSchema;
    
    if (param.required) {
      required.push(param.name);
    }
  }
  
  const schema: import('../core/domain/skill.js').JSONSchema = {
    type: 'object',
    properties,
  };
  
  if (required.length > 0) {
    schema.required = required;
  }
  
  return schema;
}

/**
 * 将 frontmatter 转换为 Domain Skill
 */
function convertToDomainSkill(frontmatter: SkillFrontmatter, skillPath: string, fullContent: string): DomainSkill {
  const parameters = parseParametersSection(fullContent);
  const inputSchema = parametersToSchema(parameters);
  
  const skillCode = generateSkillCode(frontmatter, fullContent);
  
  return {
    id: frontmatter.name,
    name: frontmatter.name,
    description: frontmatter.description,
    version: frontmatter.version || '1.0.0',
    script: {
      code: skillCode,
      lang: 'typescript',
    },
    
    input: inputSchema || undefined,
    
    meta: {
      category: frontmatter.category || 'utility',
      tags: frontmatter.tags || [],
      author: frontmatter.author || 'unknown',
      path: skillPath,
    },
  };
}

/**
 * 生成技能执行代码
 * 基于 SKILL.md 内容生成使用 LLM 的执行代码
 */
function generateSkillCode(frontmatter: SkillFrontmatter, fullContent: string): string {
  const examplesSection = extractSection(fullContent, 'Examples');
  const whenToUseSection = extractSection(fullContent, 'When to Use');
  const escapedDescription = frontmatter.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  
  let code = `// Auto-generated skill code for: ${frontmatter.name}\n`;
  code += `// Description: ${frontmatter.description}\n\n`;
  code += `async function execute() {\n`;
  code += `  const skillName = "${frontmatter.name}";\n`;
  code += `  const description = "${escapedDescription}";\n\n`;
  code += `  // Build prompt from skill context\n`;
  code += `  let prompt = "You are executing the \\"" + skillName + "\\" skill.\\n\\n";\n`;
  code += `  prompt += "Description: " + description + "\\n\\n";\n\n`;
  code += `  // Add input parameters\n`;
  code += `  if ($input && typeof $input === 'object') {\n`;
  code += `    prompt += "Input parameters:\\n";\n`;
  code += `    for (const [key, value] of Object.entries($input)) {\n`;
  code += `      prompt += "- " + key + ": " + JSON.stringify(value) + "\\n";\n`;
  code += `    }\n`;
  code += `    prompt += "\\n";\n`;
  code += `  }\n\n`;
  
  if (whenToUseSection) {
    const escapedWhenToUse = whenToUseSection.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    code += `  // Add usage context\n`;
    code += `  prompt += "When to use:\\n${escapedWhenToUse}\\n\\n";\n\n`;
  }
  
  if (examplesSection) {
    const escapedExamples = examplesSection.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    code += `  // Add examples\n`;
    code += `  prompt += "Examples:\\n${escapedExamples}\\n\\n";\n\n`;
  }
  
  code += `  prompt += "Please execute this skill and provide the result.";\n\n`;
  code += `  // Call LLM\n`;
  code += `  const result = await $llm(prompt);\n`;
  code += `  return result;\n`;
  code += `}\n\n`;
  code += `return execute();\n`;
  
  return code;
}

/**
 * 提取 Markdown 文档中的特定部分
 */
function extractSection(content: string, sectionName: string): string {
  const sectionRegex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const match = content.match(sectionRegex);
  return match ? match[1].trim() : '';
}

/**
 * 从目录加载技能
 */
async function loadSkillsFromDirectory(
  dir: string,
  source: SkillSource
): Promise<LoadedSkill[]> {
  const skills: LoadedSkill[] = [];

  if (!fs.existsSync(dir)) {
    logger.debug(`Directory does not exist: ${dir}`);
    return skills;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;
      const skillDir = path.join(dir, skillName);
      const skillFile = path.join(skillDir, 'SKILL.md');

      // 检查 SKILL.md 是否存在
      if (!fs.existsSync(skillFile)) {
        // 递归查找子目录
        const subSkills = await loadSkillsFromDirectory(skillDir, source);
        skills.push(...subSkills);
        continue;
      }

      // 读取并解析 SKILL.md
      try {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const frontmatter = parseSkillFrontmatter(content);

        if (!frontmatter) {
          logger.warn(`Invalid or missing frontmatter in ${skillFile}`);
          continue;
        }

        const skill = convertToDomainSkill(frontmatter, skillFile, content);
        skills.push({
          skill,
          source,
          path: skillFile,
        });

        logger.debug(`Loaded skill: ${skill.name} from ${source}`);
      } catch (error) {
        logger.error(`Failed to load skill from ${skillFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to read directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return skills;
}

/**
 * 获取内置技能目录路径
 * 
 * 兼容 ESM 和 CommonJS 环境
 */
function getBuiltinSkillsDir(): string {
  const possiblePaths: string[] = [];

  // 如果 __dirname 可用，优先使用（打包后的环境）
  if (typeof __dirname !== 'undefined') {
    possiblePaths.push(
      path.join(__dirname, '..', 'skills', 'builtin'),
      path.join(__dirname, 'skills', 'builtin'),
      path.join(__dirname, '..', '..', 'skills', 'builtin')
    );
  }

  // 开发环境：源码目录
  possiblePaths.push(
    path.join(process.cwd(), 'src', 'skills', 'builtin'),
    path.join(process.cwd(), '..', 'src', 'skills', 'builtin')
  );

  for (const dir of possiblePaths) {
    const normalizedPath = path.normalize(dir);
    if (fs.existsSync(normalizedPath)) {
      return normalizedPath;
    }
  }

  return path.join(process.cwd(), 'src', 'skills', 'builtin');
}

/**
 * 获取用户级技能目录路径
 */
function getManagedSkillsDir(): string {
  return path.join(homedir(), '.sdkwork', 'skills');
}

/**
 * 获取工作区技能目录路径
 */
function getWorkspaceSkillsDir(): string {
  return path.join(process.cwd(), '.sdkwork', 'skills');
}

/**
 * 加载所有位置的技能
 *
 * 优先级：workspace > managed > builtin
 * 后加载的会覆盖先加载的同名技能
 */
export async function loadAllSkills(): Promise<{ skills: DomainSkill[]; stats: SkillLoadStats }> {
  const stats: SkillLoadStats = {
    total: 0,
    bySource: { builtin: 0, managed: 0, workspace: 0 },
    errors: [],
  };

  logger.info('Starting universal skill loading...');

  // 1. 加载内置技能 (最低优先级)
  const builtinDir = getBuiltinSkillsDir();
  logger.info(`Loading builtin skills from: ${builtinDir}`);
  const builtinSkills = await loadSkillsFromDirectory(builtinDir, 'builtin');
  stats.bySource.builtin = builtinSkills.length;

  // 2. 加载用户级技能
  const managedDir = getManagedSkillsDir();
  logger.info(`Loading managed skills from: ${managedDir}`);
  const managedSkills = await loadSkillsFromDirectory(managedDir, 'managed');
  stats.bySource.managed = managedSkills.length;

  // 3. 加载工作区技能 (最高优先级)
  const workspaceDir = getWorkspaceSkillsDir();
  logger.info(`Loading workspace skills from: ${workspaceDir}`);
  const workspaceSkills = await loadSkillsFromDirectory(workspaceDir, 'workspace');
  stats.bySource.workspace = workspaceSkills.length;

  // 按优先级合并 (后加载的覆盖先加载的)
  const skillMap = new Map<string, LoadedSkill>();

  // 优先级从低到高
  for (const loaded of builtinSkills) {
    skillMap.set(loaded.skill.name, loaded);
  }
  for (const loaded of managedSkills) {
    skillMap.set(loaded.skill.name, loaded);
  }
  for (const loaded of workspaceSkills) {
    skillMap.set(loaded.skill.name, loaded);
  }

  const skills = Array.from(skillMap.values()).map(l => l.skill);
  stats.total = skills.length;

  logger.info(`Skill loading complete: ${stats.total} unique skills`);
  logger.info(`  - Builtin: ${stats.bySource.builtin}`);
  logger.info(`  - Managed: ${stats.bySource.managed}`);
  logger.info(`  - Workspace: ${stats.bySource.workspace}`);

  return { skills, stats };
}

/**
 * 获取技能统计信息
 */
export function getSkillStats(skills: DomainSkill[]): {
  byCategory: Record<string, number>;
  byTag: Record<string, number>;
  total: number;
} {
  const byCategory: Record<string, number> = {};
  const byTag: Record<string, number> = {};

  for (const skill of skills) {
    const category = skill.meta?.category as string || 'uncategorized';
    byCategory[category] = (byCategory[category] || 0) + 1;

    // 安全地获取 tags
    let tags: string[] = [];
    if (skill.meta?.tags) {
      if (Array.isArray(skill.meta.tags)) {
        tags = skill.meta.tags as string[];
      } else if (typeof skill.meta.tags === 'string') {
        tags = (skill.meta.tags as string).split(/\s+/).filter(t => t);
      }
    }
    for (const tag of tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  return { byCategory, byTag, total: skills.length };
}

/**
 * 格式化技能列表用于显示
 */
export function formatSkillsList(skills: DomainSkill[]): string {
  if (skills.length === 0) {
    return '\n🎯 Available Skills:\n\n  No skills registered\n';
  }

  const stats = getSkillStats(skills);

  // 按类别分组
  const byCategory: Record<string, DomainSkill[]> = {};
  for (const skill of skills) {
    const category = skill.meta?.category as string || 'uncategorized';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(skill);
  }

  let output = '\n🎯 Available Skills:\n';

  for (const [category, categorySkills] of Object.entries(byCategory).sort()) {
    output += `\n  [${category.toUpperCase()}] (${categorySkills.length})\n`;
    for (const skill of categorySkills.sort((a, b) => a.name.localeCompare(b.name))) {
      // 安全地获取 tags，确保是数组
      let tags: string[] = [];
      if (skill.meta?.tags) {
        if (Array.isArray(skill.meta.tags)) {
          tags = skill.meta.tags as string[];
        } else if (typeof skill.meta.tags === 'string') {
          tags = (skill.meta.tags as string).split(/\s+/).filter(t => t);
        }
      }
      const tagsStr = tags.slice(0, 3).join(', ');
      const tagStr = tagsStr ? ` [${tagsStr}]` : '';
      output += `    • ${skill.name}${tagStr}\n`;
      output += `      ${skill.description.slice(0, 80)}${skill.description.length > 80 ? '...' : ''}\n`;
    }
  }

  output += `\n📊 Total: ${stats.total} skills\n`;
  output += `📁 Categories: ${Object.keys(byCategory).sort().join(', ')}\n`;

  return output;
}

/**
 * 默认导出
 */
export default {
  loadAll: loadAllSkills,
  getStats: getSkillStats,
  formatList: formatSkillsList,
};
