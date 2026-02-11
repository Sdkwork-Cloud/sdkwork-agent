/**
 * Skill Frontmatter Parser - YAML Frontmatter 解析器
 *
 * 解析 SKILL.md 文件的 YAML Frontmatter
 *
 * @module FrontmatterParser
 * @version 5.0.0
 */

import type {
  ParsedSkillFrontmatter,
  OpenClawSkillMetadata,
  SkillInvocationPolicy,
  SkillCommandDispatchSpec,
  SkillInstallSpec,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
const METADATA_KEY = 'openclaw';
const LEGACY_METADATA_KEYS = ['claw', 'skill'];

// ============================================================================
// Parser
// ============================================================================

export class FrontmatterParser {
  /**
   * 解析 SKILL.md 文件内容
   */
  parse(content: string): {
    frontmatter: ParsedSkillFrontmatter;
    body: string;
    metadata?: OpenClawSkillMetadata;
    invocation?: SkillInvocationPolicy;
    dispatch?: SkillCommandDispatchSpec;
  } {
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      throw new Error('Invalid SKILL.md format: missing YAML frontmatter');
    }

    const yamlContent = match[1];
    const body = match[2].trim();

    const frontmatter = this.parseYaml(yamlContent);
    const metadata = this.resolveOpenClawMetadata(frontmatter);
    const invocation = this.resolveInvocationPolicy(frontmatter);
    const dispatch = this.resolveDispatchConfig(frontmatter);

    return {
      frontmatter,
      body,
      metadata,
      invocation,
      dispatch,
    };
  }

  /**
   * 解析 YAML 内容
   */
  private parseYaml(yaml: string): ParsedSkillFrontmatter {
    const lines = yaml.split('\n');
    const result: Record<string, unknown> = {};
    let currentKey: string | null = null;
    let currentValue: string[] = [];
    let inMultiline = false;
    let multilineIndicator: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // 空行处理
      if (trimmed === '') {
        if (inMultiline && currentKey) {
          currentValue.push('');
        }
        continue;
      }

      // 多行值处理
      if (inMultiline) {
        if (trimmed === multilineIndicator) {
          // 结束多行
          result[currentKey!] = currentValue.join('\n');
          inMultiline = false;
          multilineIndicator = null;
          currentKey = null;
          currentValue = [];
        } else {
          currentValue.push(line);
        }
        continue;
      }

      // 键值对解析
      const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
      if (keyValueMatch) {
        // 保存之前的键值
        if (currentKey && !inMultiline) {
          result[currentKey] = this.parseValue(currentValue.join(' '));
        }

        currentKey = keyValueMatch[1];
        const value = keyValueMatch[2].trim();

        // 检查多行标记
        if (value === '|' || value === '>') {
          inMultiline = true;
          multilineIndicator = '';
          currentValue = [];
        } else if (value.startsWith('|-') || value.startsWith('>-')) {
          inMultiline = true;
          multilineIndicator = '';
          currentValue = [];
        } else if (value === '') {
          // 可能是嵌套对象或数组，继续解析
          currentValue = [];
        } else {
          currentValue = [value];
        }
      } else if (currentKey && line.startsWith('  ')) {
        // 缩进内容，属于当前键
        currentValue.push(trimmed);
      }
    }

    // 保存最后一个键值
    if (currentKey && !inMultiline) {
      result[currentKey] = this.parseValue(currentValue.join(' '));
    }

    return this.transformToFrontmatter(result);
  }

  /**
   * 解析单个值
   */
  private parseValue(value: string): unknown {
    const trimmed = value.trim();

    // 布尔值
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // null
    if (trimmed === 'null' || trimmed === '~') return null;

    // 数字
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);

    // 字符串（去除引号）
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // JSON5 对象
    if (trimmed.startsWith('{')) {
      try {
        return this.parseJSON5(trimmed);
      } catch {
        return trimmed;
      }
    }

    // 数组
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  /**
   * 转换为 Frontmatter 对象
   */
  private transformToFrontmatter(data: Record<string, unknown>): ParsedSkillFrontmatter {
    return {
      name: String(data.name || ''),
      description: String(data.description || ''),
      homepage: data.homepage ? String(data.homepage) : undefined,
      userInvocable: data.userInvocable !== false,
      disableModelInvocation: data.disableModelInvocation === true,
      commandDispatch: data.commandDispatch as 'tool' | undefined,
      commandTool: data.commandTool ? String(data.commandTool) : undefined,
      commandArgMode: data.commandArgMode as 'raw' | undefined,
      metadata: data.metadata ? String(data.metadata) : undefined,
    };
  }

  /**
   * 解析 OpenClaw 元数据
   */
  private resolveOpenClawMetadata(frontmatter: ParsedSkillFrontmatter): OpenClawSkillMetadata | undefined {
    const raw = frontmatter.metadata;
    if (!raw) return undefined;

    try {
      const parsed = this.parseJSON5(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return undefined;

      // 多键候选查找（向后兼容）
      const candidates = [METADATA_KEY, ...LEGACY_METADATA_KEYS];
      let metadataRaw: unknown;

      for (const key of candidates) {
        const value = parsed[key];
        if (value && typeof value === 'object') {
          metadataRaw = value;
          break;
        }
      }

      if (!metadataRaw) return undefined;

      const metadataObj = metadataRaw as Record<string, unknown>;

      return {
        always: metadataObj.always === true,
        skillKey: metadataObj.skillKey ? String(metadataObj.skillKey) : undefined,
        primaryEnv: metadataObj.primaryEnv ? String(metadataObj.primaryEnv) : undefined,
        emoji: metadataObj.emoji ? String(metadataObj.emoji) : undefined,
        homepage: metadataObj.homepage ? String(metadataObj.homepage) : undefined,
        os: this.normalizeStringList(metadataObj.os),
        requires: this.parseRequires(metadataObj.requires),
        install: this.parseInstallSpecs(metadataObj.install),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * 解析调用策略
   */
  private resolveInvocationPolicy(frontmatter: ParsedSkillFrontmatter): SkillInvocationPolicy {
    return {
      userInvocable: frontmatter.userInvocable,
      disableModelInvocation: frontmatter.disableModelInvocation,
    };
  }

  /**
   * 解析分发配置
   */
  private resolveDispatchConfig(frontmatter: ParsedSkillFrontmatter): SkillCommandDispatchSpec | undefined {
    if (frontmatter.commandDispatch !== 'tool' || !frontmatter.commandTool) {
      return undefined;
    }

    return {
      kind: 'tool',
      toolName: frontmatter.commandTool,
      argMode: frontmatter.commandArgMode,
    };
  }

  /**
   * 解析 requires
   */
  private parseRequires(raw: unknown): OpenClawSkillMetadata['requires'] {
    if (!raw || typeof raw !== 'object') return undefined;

    const r = raw as Record<string, unknown>;
    return {
      bins: this.normalizeStringList(r.bins),
      anyBins: this.normalizeStringList(r.anyBins),
      env: this.normalizeStringList(r.env),
      config: this.normalizeStringList(r.config),
    };
  }

  /**
   * 解析 install specs
   */
  private parseInstallSpecs(raw: unknown): SkillInstallSpec[] | undefined {
    if (!Array.isArray(raw)) return undefined;

    const specs: SkillInstallSpec[] = [];
    
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;

      const i = item as Record<string, unknown>;
      const kind = String(i.kind);
      if (!kind) continue;
      
      specs.push({
        id: i.id ? String(i.id) : undefined,
        kind: kind as 'brew' | 'node' | 'go' | 'uv' | 'download',
        label: i.label ? String(i.label) : undefined,
        bins: this.normalizeStringList(i.bins),
        os: this.normalizeStringList(i.os),
        formula: i.formula ? String(i.formula) : undefined,
        package: i.package ? String(i.package) : undefined,
        module: i.module ? String(i.module) : undefined,
        url: i.url ? String(i.url) : undefined,
        archive: i.archive as 'tar.gz' | 'tar.bz2' | 'tar.xz' | 'zip' | undefined,
        extract: i.extract === true,
        stripComponents: typeof i.stripComponents === 'number' ? i.stripComponents : undefined,
        targetDir: i.targetDir ? String(i.targetDir) : undefined,
      });
    }
    
    return specs.length > 0 ? specs : undefined;
  }

  /**
   * 规范化字符串列表
   */
  private normalizeStringList(raw: unknown): string[] | undefined {
    if (!raw) return undefined;

    if (typeof raw === 'string') {
      return [raw];
    }

    if (Array.isArray(raw)) {
      return raw.map(item => String(item));
    }

    return undefined;
  }

  /**
   * 简化的 JSON5 解析
   */
  private parseJSON5(str: string): unknown {
    // 移除注释
    let cleaned = str.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

    // 处理尾随逗号
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // 解析
    return JSON.parse(cleaned);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createFrontmatterParser(): FrontmatterParser {
  return new FrontmatterParser();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速解析 SKILL.md 内容
 */
export function parseSkillContent(content: string): {
  frontmatter: ParsedSkillFrontmatter;
  body: string;
  metadata?: OpenClawSkillMetadata;
  invocation?: SkillInvocationPolicy;
  dispatch?: SkillCommandDispatchSpec;
} {
  const parser = new FrontmatterParser();
  return parser.parse(content);
}

/**
 * 提取 Frontmatter 原始文本
 */
export function extractFrontmatterRaw(content: string): string | undefined {
  const match = content.match(FRONTMATTER_REGEX);
  return match ? match[1] : undefined;
}

/**
 * 提取 Body 内容
 */
export function extractBody(content: string): string {
  const match = content.match(FRONTMATTER_REGEX);
  return match ? match[2].trim() : content;
}

/**
 * 验证 Frontmatter 格式
 */
export function validateFrontmatter(content: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const parser = new FrontmatterParser();
    parser.parse(content);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: (error as Error).message,
    };
  }
}
