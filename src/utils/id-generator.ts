/**
 * ID Generator - 统一的 ID 生成工具
 * 
 * 提供高性能、安全的唯一 ID 生成
 * 
 * @module Utils
 * @version 1.0.0
 */

let counter = 0;

/**
 * 生成唯一 ID
 * @param prefix ID 前缀
 * @returns 唯一 ID 字符串
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 11);
  counter = (counter + 1) % 1000000;
  return prefix ? `${prefix}_${timestamp}_${random}_${counter}` : `${timestamp}-${random}-${counter}`;
}

/**
 * 生成短 ID (9位随机字符)
 * @returns 短 ID 字符串
 */
export function generateShortId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * 生成执行 ID
 * @returns 执行 ID
 */
export function generateExecutionId(): string {
  return `exec-${Date.now()}-${generateShortId()}`;
}

/**
 * 生成会话 ID
 * @returns 会话 ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${generateShortId()}`;
}

/**
 * 生成 Agent ID
 * @returns Agent ID
 */
export function generateAgentId(): string {
  return `agent_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成事务 ID
 * @returns 事务 ID
 */
export function generateTransactionId(): string {
  return `txn_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成内存条目 ID
 * @returns 内存条目 ID
 */
export function generateMemoryId(): string {
  return `mem_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成步骤 ID
 * @returns 步骤 ID
 */
export function generateStepId(): string {
  return `step-${Date.now()}-${generateShortId()}`;
}

/**
 * 生成 Worker ID
 * @returns Worker ID
 */
export function generateWorkerId(): string {
  return `worker_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成 Actor ID
 * @returns Actor ID
 */
export function generateActorId(): string {
  return `actor-${Date.now()}-${generateShortId()}`;
}

/**
 * 生成配置 ID
 * @returns 配置 ID
 */
export function generateConfigId(): string {
  return `config_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成节点 ID
 * @returns 节点 ID
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成错误 ID
 * @returns 错误 ID
 */
export function generateErrorId(): string {
  return `err_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成冲突 ID
 * @returns 冲突 ID
 */
export function generateConflictId(): string {
  return `conflict_${Date.now()}_${generateShortId()}`;
}

/**
 * 生成反思 ID
 * @returns 反思 ID
 */
export function generateReflectionId(): string {
  return `refl-${Date.now()}-${generateShortId()}`;
}

/**
 * 生成带前缀的自定义 ID
 * @param prefix 前缀
 * @returns 自定义 ID
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${Date.now()}_${generateShortId()}`;
}

export default {
  generateId,
  generateShortId,
  generateExecutionId,
  generateSessionId,
  generateAgentId,
  generateTransactionId,
  generateMemoryId,
  generateStepId,
  generateWorkerId,
  generateActorId,
  generateConfigId,
  generateNodeId,
  generateErrorId,
  generateConflictId,
  generateReflectionId,
  generatePrefixedId,
};
