/**
 * Node.js 环境工具
 *
 * 专为 Node.js 服务端环境设计的工具函数
 * 移除所有浏览器兼容性代码，打造纯粹的后端架构
 *
 * @module Environment
 * @version 2.0.0
 * @architecture Node.js Native Only
 */

import * as os from 'os';
import * as process from 'process';

// ============================================
// 环境信息
// ============================================

/**
 * 获取当前环境模式
 */
export function getEnvironmentMode(): 'development' | 'production' | 'test' {
  const mode = process.env.NODE_ENV;
  if (mode === 'development' || mode === 'production' || mode === 'test') {
    return mode;
  }
  return 'production';
}

/**
 * 是否是开发环境
 */
export function isDevelopment(): boolean {
  return getEnvironmentMode() === 'development';
}

/**
 * 是否是生产环境
 */
export function isProduction(): boolean {
  return getEnvironmentMode() === 'production';
}

/**
 * 是否是测试环境
 */
export function isTest(): boolean {
  return getEnvironmentMode() === 'test';
}

// ============================================
// 环境变量处理
// ============================================

/**
 * 获取环境变量
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * 获取必需的环境变量
 * 如果不存在则抛出错误
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * 获取布尔类型的环境变量
 */
export function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 获取数字类型的环境变量
 */
export function getNumberEnv(key: string, defaultValue: number = 0): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// ============================================
// 系统信息
// ============================================

/**
 * 获取系统信息
 */
export function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    hostname: os.hostname(),
    pid: process.pid,
    ppid: process.ppid,
  };
}

/**
 * 获取内存使用情况
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

/**
 * 获取 CPU 使用情况
 */
export function getCPUUsage() {
  return process.cpuUsage();
}

// ============================================
// 工具函数
// ============================================

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 深拷贝对象
 * 使用 Node.js 原生方法
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Buffer) {
    return Buffer.from(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * 安全的 JSON 解析
 */
export function safeJSONParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 安全的 JSON 字符串化
 */
export function safeJSONStringify(obj: unknown, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}

// ============================================
// 性能监控
// ============================================

/**
 * 高精度计时器
 * 使用 process.hrtime.bigint()
 */
export class PerformanceTimer {
  private start: bigint;

  constructor() {
    this.start = process.hrtime.bigint();
  }

  /**
   * 结束计时 (返回毫秒)
   */
  end(): number {
    const end = process.hrtime.bigint();
    return Number(end - this.start) / 1_000_000; // 转换为毫秒
  }

  /**
   * 重置计时器
   */
  reset(): void {
    this.start = process.hrtime.bigint();
  }

  /**
   * 获取当前经过的时间 (毫秒)
   */
  elapsed(): number {
    return Number(process.hrtime.bigint() - this.start) / 1_000_000;
  }
}

// ============================================
// 进程管理
// ============================================

/**
 * 优雅关闭处理
 */
export function setupGracefulShutdown(
  cleanup: () => Promise<void> | void,
  options: { timeout?: number; signals?: NodeJS.Signals[] } = {}
): void {
  const { timeout = 30000, signals = ['SIGTERM', 'SIGINT'] } = options;

  let isShuttingDown = false;

  const handleShutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Received ${signal}, starting graceful shutdown...`);

    const timeoutId = setTimeout(() => {
      console.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, timeout);

    try {
      await cleanup();
      clearTimeout(timeoutId);
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  for (const signal of signals) {
    process.on(signal, () => handleShutdown(signal));
  }

  // 处理未捕获的错误
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    handleShutdown('SIGTERM');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    handleShutdown('SIGTERM');
  });
}

// ============================================
// 导出环境信息
// ============================================

/**
 * 环境信息类型
 */
export interface Environment {
  mode: ReturnType<typeof getEnvironmentMode>;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  system: ReturnType<typeof getSystemInfo>;
}

/**
 * 环境信息
 */
export const environment: Environment = {
  mode: getEnvironmentMode(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  isTest: isTest(),
  system: getSystemInfo(),
};

export default environment;
