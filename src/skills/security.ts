/**
 * Skill Security Scanner - 安全扫描系统
 *
 * 扫描 Skill 代码中的危险模式
 *
 * @module SecurityScanner
 * @version 5.0.0
 */

import type { SecurityRule, SecurityWarning, SecurityScanResult } from './types.js';

// ============================================================================
// Security Rules
// ============================================================================

const DEFAULT_SECURITY_RULES: SecurityRule[] = [
  {
    ruleId: 'dangerous-exec',
    severity: 'critical',
    message: '检测到 shell 命令执行 (child_process)',
    pattern: /\b(exec|execSync|spawn|spawnSync|execFile|execFileSync)\s*\(/,
    requiresContext: /child_process/,
  },
  {
    ruleId: 'dynamic-code-execution',
    severity: 'critical',
    message: '检测到动态代码执行',
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
  },
  {
    ruleId: 'env-harvesting',
    severity: 'critical',
    message: '环境变量访问结合网络发送',
    pattern: /process\.env/,
    requiresContext: /\bfetch\b|\bpost\b|http\.request/i,
  },
  {
    ruleId: 'suspicious-network',
    severity: 'high',
    message: '检测到可疑网络请求',
    pattern: /\bfetch\s*\(\s*['"`][^'"`]*['"`]/,
  },
  {
    ruleId: 'file-system-access',
    severity: 'medium',
    message: '检测到文件系统访问',
    pattern: /\bfs\.[a-zA-Z]+\s*\(/,
  },
  {
    ruleId: 'shell-command',
    severity: 'high',
    message: '检测到 shell 命令执行',
    pattern: /\b(shell|exec|system|popen)\s*\(/i,
  },
  {
    ruleId: 'code-injection',
    severity: 'critical',
    message: '潜在的代码注入风险',
    pattern: /\b(eval|exec|Function|setTimeout|setInterval)\s*\(\s*[^)]*\+/,
  },
  {
    ruleId: 'path-traversal',
    severity: 'high',
    message: '潜在的路径遍历风险',
    pattern: /\b(fs\.readFile|fs\.writeFile|require)\s*\(\s*[^)]*\+/,
  },
];

// ============================================================================
// Security Scanner
// ============================================================================

export class SkillSecurityScanner {
  private rules: SecurityRule[];

  constructor(rules: SecurityRule[] = DEFAULT_SECURITY_RULES) {
    this.rules = rules;
  }

  /**
   * 扫描 Skill 内容
   */
  scan(content: string, filePath?: string): SecurityScanResult {
    const lines = content.split('\n');
    const warnings: SecurityWarning[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const rule of this.rules) {
        const match = this.checkRule(line, rule, lines, i);
        if (match) {
          warnings.push({
            ruleId: rule.ruleId,
            severity: rule.severity,
            message: rule.message,
            line: lineNumber,
            column: match.column,
          });
        }
      }
    }

    const criticalCount = warnings.filter(w => w.severity === 'critical').length;
    const highCount = warnings.filter(w => w.severity === 'high').length;
    const mediumCount = warnings.filter(w => w.severity === 'medium').length;
    const lowCount = warnings.filter(w => w.severity === 'low').length;

    // 有关键级别警告时视为未通过
    const passed = criticalCount === 0 && highCount === 0;

    return {
      passed,
      warnings,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    };
  }

  /**
   * 批量扫描多个文件
   */
  scanMany(files: Array<{ path: string; content: string }>): Map<string, SecurityScanResult> {
    const results = new Map<string, SecurityScanResult>();

    for (const file of files) {
      results.set(file.path, this.scan(file.content, file.path));
    }

    return results;
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: SecurityRule): void {
    this.rules.push(rule);
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.ruleId !== ruleId);
  }

  /**
   * 获取所有规则
   */
  getRules(): SecurityRule[] {
    return [...this.rules];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 检查单行是否匹配规则
   */
  private checkRule(
    line: string,
    rule: SecurityRule,
    allLines: string[],
    lineIndex: number
  ): { column: number } | null {
    const match = line.match(rule.pattern);
    if (!match) {
      return null;
    }

    // 如果需要上下文检查
    if (rule.requiresContext) {
      // 检查当前行和前后几行
      const contextStart = Math.max(0, lineIndex - 3);
      const contextEnd = Math.min(allLines.length, lineIndex + 4);
      const context = allLines.slice(contextStart, contextEnd).join('\n');

      if (!rule.requiresContext.test(context)) {
        return null;
      }
    }

    return { column: match.index || 0 };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSecurityScanner(rules?: SecurityRule[]): SkillSecurityScanner {
  return new SkillSecurityScanner(rules);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速扫描内容
 */
export function quickScan(content: string): SecurityScanResult {
  const scanner = new SkillSecurityScanner();
  return scanner.scan(content);
}

/**
 * 检查是否通过安全扫描
 */
export function isSafe(content: string): boolean {
  const result = quickScan(content);
  return result.passed;
}

/**
 * 格式化扫描结果
 */
export function formatScanResult(result: SecurityScanResult): string {
  const lines: string[] = [];

  if (result.passed) {
    lines.push('✅ Security scan passed');
  } else {
    lines.push('❌ Security scan failed');
  }

  if (result.criticalCount > 0) {
    lines.push(`  Critical: ${result.criticalCount}`);
  }
  if (result.highCount > 0) {
    lines.push(`  High: ${result.highCount}`);
  }
  if (result.mediumCount > 0) {
    lines.push(`  Medium: ${result.mediumCount}`);
  }
  if (result.lowCount > 0) {
    lines.push(`  Low: ${result.lowCount}`);
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    for (const warning of result.warnings) {
      const location = warning.line ? ` (line ${warning.line})` : '';
      lines.push(`  [${warning.severity.toUpperCase()}] ${warning.message}${location}`);
    }
  }

  return lines.join('\n');
}

/**
 * 获取默认安全规则
 */
export function getDefaultSecurityRules(): SecurityRule[] {
  return [...DEFAULT_SECURITY_RULES];
}
