/**
 * 错误恢复管理器
 * 
 * 设计目标：
 * 1. 智能错误分类和诊断
 * 2. 多级恢复策略（自动修复、参数重试、降级执行、人工介入）
 * 3. 错误模式学习和预防
 * 4. 优雅降级机制
 * 
 * 参考：
 * - OpenClaw的错误处理模式
 * - Claude Code的优雅降级策略
 * - LangChain的Retry机制
 */

import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger.js';

const logger = new Logger({}, 'ErrorRecoveryManager');

/** 错误严重程度 */
export type ErrorSeverity = 'warning' | 'error' | 'critical' | 'fatal';

/** 错误分类 */
export type ErrorCategory = 
  | 'PARAM_MISSING'      // 参数缺失
  | 'PARAM_INVALID'      // 参数无效
  | 'VALIDATION_FAILED'  // 验证失败
  | 'EXECUTION_FAILED'   // 执行失败
  | 'TIMEOUT'            // 超时
  | 'RESOURCE_ERROR'     // 资源错误
  | 'PERMISSION_DENIED'  // 权限不足
  | 'RATE_LIMITED'       // 限流
  | 'DEPENDENCY_ERROR'   // 依赖错误
  | 'NETWORK_ERROR'      // 网络错误
  | 'UNKNOWN';           // 未知错误

/** 恢复策略 */
export type RecoveryStrategy = 
  | 'AUTO_FIX'           // 自动修复
  | 'RETRY'              // 重试
  | 'FALLBACK'           // 降级执行
  | 'CLARIFY'            // 请求澄清
  | 'SKIP'               // 跳过
  | 'ESCALATE';          // 升级处理

/** 错误信息 */
export interface SkillError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context: {
    skillName?: string;
    params?: Record<string, any>;
    executionId?: string;
    timestamp: Date;
    [key: string]: any;
  };
  recoverable: boolean;
  suggestedStrategy: RecoveryStrategy;
  retryCount: number;
  maxRetries: number;
}

/** 恢复操作结果 */
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  action: string;
  resolved: boolean;
  newParams?: Record<string, any>;
  fallbackSkill?: string;
  clarificationNeeded?: boolean;
  clarificationPrompt?: string;
  error?: SkillError;
  nextStep: 'retry' | 'continue' | 'abort' | 'clarify';
}

/** 错误模式 */
interface ErrorPattern {
  id: string;
  category: ErrorCategory;
  pattern: RegExp;
  severity: ErrorSeverity;
  autoFixable: boolean;
  fixStrategy: RecoveryStrategy;
  fixAction?: (error: SkillError) => Promise<RecoveryResult>;
  learnable: boolean;
  occurrenceCount: number;
  lastOccurrence: Date;
}

/** 恢复配置 */
export interface RecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  enableAutoFix: boolean;
  enableLearning: boolean;
  fallbackSkills: Map<string, string>; // 原始skill -> 降级skill
  escalationThreshold: ErrorSeverity;
}

/** 默认恢复配置 */
const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  enableAutoFix: true,
  enableLearning: true,
  fallbackSkills: new Map(),
  escalationThreshold: 'critical'
};

/**
 * 错误恢复管理器
 * 
 * 核心功能：
 * 1. 智能错误分类
 * 2. 多级恢复策略
 * 3. 错误模式学习
 * 4. 优雅降级
 */
export class ErrorRecoveryManager extends EventEmitter {
  private config: RecoveryConfig;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private errorHistory: SkillError[] = [];
  private recoveryStats = {
    totalErrors: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    autoFixes: 0,
    retries: 0,
    fallbacks: 0,
    escalations: 0
  };

  constructor(config: Partial<RecoveryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RECOVERY_CONFIG, ...config };
    this.initializeErrorPatterns();
  }

  /**
   * 初始化错误模式库
   */
  private initializeErrorPatterns(): void {
    // 参数缺失模式
    this.registerErrorPattern({
      id: 'param_missing_required',
      category: 'PARAM_MISSING',
      pattern: /required|missing|undefined|null/i,
      severity: 'error',
      autoFixable: true,
      fixStrategy: 'CLARIFY',
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });

    // 参数验证失败模式
    this.registerErrorPattern({
      id: 'param_validation_failed',
      category: 'VALIDATION_FAILED',
      pattern: /invalid|validation|format|type/i,
      severity: 'error',
      autoFixable: true,
      fixStrategy: 'AUTO_FIX',
      fixAction: this.autoFixValidationError.bind(this),
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });

    // 超时模式
    this.registerErrorPattern({
      id: 'execution_timeout',
      category: 'TIMEOUT',
      pattern: /timeout|timed out|exceeded/i,
      severity: 'warning',
      autoFixable: true,
      fixStrategy: 'RETRY',
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });

    // 权限不足模式
    this.registerErrorPattern({
      id: 'permission_denied',
      category: 'PERMISSION_DENIED',
      pattern: /permission|denied|unauthorized|forbidden/i,
      severity: 'critical',
      autoFixable: false,
      fixStrategy: 'ESCALATE',
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });

    // 限流模式
    this.registerErrorPattern({
      id: 'rate_limited',
      category: 'RATE_LIMITED',
      pattern: /rate limit|too many requests|throttled/i,
      severity: 'warning',
      autoFixable: true,
      fixStrategy: 'RETRY',
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });

    // 网络错误模式
    this.registerErrorPattern({
      id: 'network_error',
      category: 'NETWORK_ERROR',
      pattern: /network|connection|econnrefused|timeout/i,
      severity: 'error',
      autoFixable: true,
      fixStrategy: 'RETRY',
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });

    // 资源错误模式
    this.registerErrorPattern({
      id: 'resource_not_found',
      category: 'RESOURCE_ERROR',
      pattern: /not found|enoent|does not exist/i,
      severity: 'error',
      autoFixable: false,
      fixStrategy: 'CLARIFY',
      learnable: true,
      occurrenceCount: 0,
      lastOccurrence: new Date()
    });
  }

  /**
   * 注册错误模式
   */
  registerErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.set(pattern.id, pattern);
    logger.debug(`Registered error pattern: ${pattern.id}`);
  }

  /**
   * 分析错误并分类
   */
  analyzeError(error: Error, context: Record<string, any> = {}): SkillError {
    const message = error.message || String(error);
    let category: ErrorCategory = 'UNKNOWN';
    let severity: ErrorSeverity = 'error';
    let recoverable = true;
    let suggestedStrategy: RecoveryStrategy = 'CLARIFY';
    let matchedPattern: ErrorPattern | null = null;

    // 匹配错误模式
    for (const pattern of this.errorPatterns.values()) {
      if (pattern.pattern.test(message)) {
        matchedPattern = pattern;
        category = pattern.category;
        severity = pattern.severity;
        recoverable = pattern.autoFixable || pattern.fixStrategy !== 'ESCALATE';
        suggestedStrategy = pattern.fixStrategy;
        
        // 更新模式统计
        pattern.occurrenceCount++;
        pattern.lastOccurrence = new Date();
        break;
      }
    }

    // 如果没有匹配到模式，使用启发式分析
    if (!matchedPattern) {
      const analysis = this.heuristicErrorAnalysis(message);
      category = analysis.category;
      severity = analysis.severity;
      recoverable = analysis.recoverable;
      suggestedStrategy = analysis.strategy;
    }

    const skillError: SkillError = {
      id: this.generateErrorId(),
      category,
      severity,
      message,
      originalError: error,
      context: {
        ...context,
        timestamp: new Date()
      },
      recoverable,
      suggestedStrategy,
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };

    // 记录错误历史
    this.errorHistory.push(skillError);
    this.recoveryStats.totalErrors++;

    // 触发错误事件
    this.emit('error', skillError);

    logger.warn(`Error analyzed: ${category} - ${message}`, {
      severity,
      recoverable,
      suggestedStrategy
    });

    return skillError;
  }

  /**
   * 启发式错误分析
   */
  private heuristicErrorAnalysis(message: string): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    recoverable: boolean;
    strategy: RecoveryStrategy;
  } {
    const lowerMessage = message.toLowerCase();

    // 参数相关
    if (lowerMessage.includes('param') || lowerMessage.includes('argument')) {
      return {
        category: 'PARAM_INVALID',
        severity: 'error',
        recoverable: true,
        strategy: 'CLARIFY'
      };
    }

    // 执行失败
    if (lowerMessage.includes('fail') || lowerMessage.includes('exception')) {
      return {
        category: 'EXECUTION_FAILED',
        severity: 'error',
        recoverable: true,
        strategy: 'RETRY'
      };
    }

    // 依赖错误
    if (lowerMessage.includes('dependency') || lowerMessage.includes('module')) {
      return {
        category: 'DEPENDENCY_ERROR',
        severity: 'critical',
        recoverable: false,
        strategy: 'ESCALATE'
      };
    }

    return {
      category: 'UNKNOWN',
      severity: 'error',
      recoverable: false,
      strategy: 'ESCALATE'
    };
  }

  /**
   * 执行恢复策略
   */
  async recover(error: SkillError): Promise<RecoveryResult> {
    logger.info(`Attempting recovery for error: ${error.category}`, {
      strategy: error.suggestedStrategy,
      retryCount: error.retryCount
    });

    // 检查是否需要升级
    if (this.shouldEscalate(error)) {
      return this.escalate(error);
    }

    // 执行对应的恢复策略
    switch (error.suggestedStrategy) {
      case 'AUTO_FIX':
        return this.executeAutoFix(error);
      case 'RETRY':
        return this.executeRetry(error);
      case 'FALLBACK':
        return this.executeFallback(error);
      case 'CLARIFY':
        return this.requestClarification(error);
      case 'SKIP':
        return this.skipOperation(error);
      default:
        return this.escalate(error);
    }
  }

  /**
   * 执行自动修复
   */
  private async executeAutoFix(error: SkillError): Promise<RecoveryResult> {
    this.recoveryStats.autoFixes++;

    // 查找对应的修复模式
    const pattern = Array.from(this.errorPatterns.values())
      .find(p => p.category === error.category && p.fixAction);

    if (pattern?.fixAction) {
      try {
        const result = await pattern.fixAction(error);
        if (result.success) {
          this.recoveryStats.successfulRecoveries++;
          this.emit('recovered', { error, strategy: 'AUTO_FIX' });
        }
        return result;
      } catch (fixError) {
        logger.error('Auto-fix failed', { error: String(fixError) });
      }
    }

    // 通用自动修复逻辑
    const genericResult = await this.genericAutoFix(error);
    
    if (genericResult.success) {
      this.recoveryStats.successfulRecoveries++;
      this.emit('recovered', { error, strategy: 'AUTO_FIX' });
    } else {
      // 自动修复失败，尝试降级
      return this.executeFallback(error);
    }

    return genericResult;
  }

  /**
   * 通用自动修复
   */
  private async genericAutoFix(error: SkillError): Promise<RecoveryResult> {
    const newParams = { ...error.context.params };
    let fixed = false;

    switch (error.category) {
      case 'PARAM_INVALID':
        // 尝试类型转换
        for (const [key, value] of Object.entries(newParams)) {
          if (typeof value === 'string') {
            // 尝试转换为数字
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              newParams[key] = numValue;
              fixed = true;
            }
            // 尝试转换为布尔值
            if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
              newParams[key] = value.toLowerCase() === 'true';
              fixed = true;
            }
          }
        }
        break;

      case 'VALIDATION_FAILED':
        // 尝试清理输入
        for (const [key, value] of Object.entries(newParams)) {
          if (typeof value === 'string') {
            const cleaned = value.trim().replace(/\s+/g, ' ');
            if (cleaned !== value) {
              newParams[key] = cleaned;
              fixed = true;
            }
          }
        }
        break;
    }

    return {
      success: fixed,
      strategy: 'AUTO_FIX',
      action: fixed ? 'Parameters auto-corrected' : 'Auto-fix failed',
      resolved: fixed,
      newParams: fixed ? newParams : undefined,
      nextStep: fixed ? 'retry' : 'abort'
    };
  }

  /**
   * 自动修复验证错误
   */
  private async autoFixValidationError(error: SkillError): Promise<RecoveryResult> {
    // 实现特定的验证错误修复逻辑
    return this.genericAutoFix(error);
  }

  /**
   * 执行重试
   */
  private async executeRetry(error: SkillError): Promise<RecoveryResult> {
    if (error.retryCount >= error.maxRetries) {
      logger.warn(`Max retries (${error.maxRetries}) exceeded for error`);
      return this.executeFallback(error);
    }

    this.recoveryStats.retries++;
    error.retryCount++;

    // 计算退避延迟
    const delay = this.config.retryDelay * 
      Math.pow(this.config.backoffMultiplier, error.retryCount - 1);

    logger.info(`Retrying operation after ${delay}ms (attempt ${error.retryCount}/${error.maxRetries})`);

    // 等待延迟
    await this.sleep(delay);

    return {
      success: true,
      strategy: 'RETRY',
      action: `Retry attempt ${error.retryCount}/${error.maxRetries}`,
      resolved: false, // 重试不代表解决，只是给了再次尝试的机会
      nextStep: 'retry'
    };
  }

  /**
   * 执行降级策略
   */
  private async executeFallback(error: SkillError): Promise<RecoveryResult> {
    this.recoveryStats.fallbacks++;

    const skillName = error.context.skillName;
    if (!skillName) {
      return {
        success: false,
        strategy: 'FALLBACK',
        action: 'No fallback available - missing skill name',
        resolved: false,
        nextStep: 'abort'
      };
    }

    // 查找降级skill
    const fallbackSkill = this.config.fallbackSkills.get(skillName);
    
    if (fallbackSkill) {
      logger.info(`Falling back from ${skillName} to ${fallbackSkill}`);
      
      return {
        success: true,
        strategy: 'FALLBACK',
        action: `Executing fallback skill: ${fallbackSkill}`,
        resolved: true,
        fallbackSkill,
        nextStep: 'continue'
      };
    }

    // 尝试使用简化版本
    const simplifiedResult = await this.trySimplifiedExecution(error);
    if (simplifiedResult.success) {
      this.recoveryStats.successfulRecoveries++;
      return simplifiedResult;
    }

    return {
      success: false,
      strategy: 'FALLBACK',
      action: 'No fallback strategy available',
      resolved: false,
      nextStep: 'abort'
    };
  }

  /**
   * 尝试简化执行
   */
  private async trySimplifiedExecution(error: SkillError): Promise<RecoveryResult> {
    // 根据错误类型尝试简化执行
    switch (error.category) {
      case 'PARAM_MISSING':
        // 使用默认值执行
        return {
          success: true,
          strategy: 'FALLBACK',
          action: 'Executing with default parameters',
          resolved: true,
          newParams: {}, // 使用空对象触发默认值
          nextStep: 'continue'
        };

      case 'RESOURCE_ERROR':
        // 返回模拟结果
        return {
          success: true,
          strategy: 'FALLBACK',
          action: 'Returning mock/simulated result',
          resolved: true,
          nextStep: 'continue'
        };

      default:
        return {
          success: false,
          strategy: 'FALLBACK',
          action: 'Cannot simplify execution',
          resolved: false,
          nextStep: 'abort'
        };
    }
  }

  /**
   * 请求澄清
   */
  private async requestClarification(error: SkillError): Promise<RecoveryResult> {
    let prompt = '';

    switch (error.category) {
      case 'PARAM_MISSING':
        prompt = `我需要更多信息来执行 ${error.context.skillName}。请提供缺失的参数。`;
        break;
      case 'PARAM_INVALID':
        prompt = `提供的参数格式不正确。请检查参数格式后重新提供。`;
        break;
      case 'RESOURCE_ERROR':
        prompt = `找不到指定的资源。请确认资源路径或名称是否正确。`;
        break;
      default:
        prompt = `执行过程中遇到问题：${error.message}。请提供更多信息或尝试其他方式。`;
    }

    return {
      success: false,
      strategy: 'CLARIFY',
      action: 'Requesting user clarification',
      resolved: false,
      clarificationNeeded: true,
      clarificationPrompt: prompt,
      nextStep: 'clarify'
    };
  }

  /**
   * 跳过操作
   */
  private async skipOperation(error: SkillError): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: 'SKIP',
      action: 'Operation skipped',
      resolved: true,
      nextStep: 'continue'
    };
  }

  /**
   * 升级处理
   */
  private async escalate(error: SkillError): Promise<RecoveryResult> {
    this.recoveryStats.escalations++;
    this.emit('escalated', error);

    return {
      success: false,
      strategy: 'ESCALATE',
      action: 'Error escalated for manual intervention',
      resolved: false,
      error,
      nextStep: 'abort'
    };
  }

  /**
   * 判断是否需要升级
   */
  private shouldEscalate(error: SkillError): boolean {
    // 严重程度检查
    const severityLevels: ErrorSeverity[] = ['warning', 'error', 'critical', 'fatal'];
    const configLevel = severityLevels.indexOf(this.config.escalationThreshold);
    const errorLevel = severityLevels.indexOf(error.severity);
    
    if (errorLevel >= configLevel) {
      return true;
    }

    // 重试次数检查
    if (error.retryCount >= error.maxRetries) {
      return true;
    }

    // 不可恢复错误
    if (!error.recoverable) {
      return true;
    }

    return false;
  }

  /**
   * 学习错误模式
   */
  learnFromError(error: SkillError, recoveryResult: RecoveryResult): void {
    if (!this.config.enableLearning) return;

    // 更新错误模式统计
    const pattern = Array.from(this.errorPatterns.values())
      .find(p => p.category === error.category);

    if (pattern) {
      pattern.occurrenceCount++;
      pattern.lastOccurrence = new Date();

      // 如果某种错误频繁发生且自动修复成功，考虑优化自动修复
      if (pattern.occurrenceCount > 5 && recoveryResult.success) {
        logger.info(`Pattern ${pattern.id} has high occurrence with successful recovery - consider optimization`);
      }
    }

    // 触发学习事件
    this.emit('learned', { error, recoveryResult });
  }

  /**
   * 获取恢复统计
   */
  getRecoveryStats() {
    return { ...this.recoveryStats };
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit: number = 100): SkillError[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * 获取常见错误模式
   */
  getCommonErrorPatterns(minOccurrences: number = 3): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .filter(p => p.occurrenceCount >= minOccurrences)
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }

  /**
   * 注册降级skill映射
   */
  registerFallbackSkill(originalSkill: string, fallbackSkill: string): void {
    this.config.fallbackSkills.set(originalSkill, fallbackSkill);
    logger.info(`Registered fallback: ${originalSkill} -> ${fallbackSkill}`);
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 延迟辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.recoveryStats = {
      totalErrors: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      autoFixes: 0,
      retries: 0,
      fallbacks: 0,
      escalations: 0
    };
    this.errorHistory = [];
  }
}

// 导出单例实例
export const errorRecoveryManager = new ErrorRecoveryManager();
