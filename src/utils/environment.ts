/**
 * 环境检测与兼容性处理
 *
 * 提供浏览器和Node.js环境的检测与适配，确保代码在不同环境中都能正常运行
 */

// ============================================
// 类型定义
// ============================================

/** 浏览器环境全局变量类型 */
interface BrowserEnv {
  env?: Record<string, string>;
}

/** 扩展 Window 接口 */
declare global {
  interface Window extends BrowserEnv {}
}

// ============================================
// 环境检测
// ============================================

/**
 * 检测当前是否在浏览器环境
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * 检测当前是否在Node.js环境
 */
export function isNode(): boolean {
  // 如果在浏览器环境中，即使有process对象也返回false
  if (isBrowser()) {
    return false;
  }
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * 检测当前是否在Web Worker环境
 */
export function isWebWorker(): boolean {
  return typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope';
}

/**
 * 检测当前是否在Electron渲染进程
 */
export function isElectronRenderer(): boolean {
  return typeof window !== 'undefined' && 
    (window as unknown as { process?: { type?: string } }).process?.type === 'renderer';
}

/**
 * 获取当前环境类型
 */
export function getEnvironment(): 'browser' | 'node' | 'webworker' | 'electron' | 'unknown' {
  if (isBrowser()) {
    return 'browser';
  }
  if (isNode()) {
    return 'node';
  }
  if (isWebWorker()) {
    return 'webworker';
  }
  if (isElectronRenderer()) {
    return 'electron';
  }
  return 'unknown';
}

// ============================================
// 环境变量处理
// ============================================

/**
 * 获取环境变量
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  if (isNode()) {
    return process.env[key] || defaultValue;
  }
  if (isBrowser() && typeof window !== 'undefined' && window.env) {
    return window.env[key] || defaultValue;
  }
  return defaultValue;
}

/**
 * 获取当前环境模式
 */
export function getEnvironmentMode(): 'development' | 'production' | 'test' {
  const mode = getEnv('NODE_ENV');
  if (mode === 'development' || mode === 'production' || mode === 'test') {
    return mode;
  }
  
  // 自动检测
  if (typeof location !== 'undefined' && location.hostname === 'localhost') {
    return 'development';
  }
  
  return 'production';
}

// ============================================
// 兼容性API
// ============================================

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
}

/**
 * 安全的JSON解析
 */
export function safeJSONParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 安全的JSON字符串化
 */
export function safeJSONStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '{}';
  }
}

// ============================================
// 存储兼容性
// ============================================

/**
 * 存储接口
 */
export interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * 获取存储实例
 */
export function getStorage(): StorageInterface {
  if (isBrowser() && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  
  // Node.js环境或浏览器localStorage不可用
  return createMemoryStorage();
}

/**
 * 创建内存存储
 */
export function createMemoryStorage(): StorageInterface {
  const store: Record<string, string> = {};
  
  return {
    getItem(key: string): string | null {
      return store[key] || null;
    },
    setItem(key: string, value: string): void {
      store[key] = value;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
}

// ============================================
// 性能监控兼容性
// ============================================

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private start: number;
  private performance: Performance | null;

  constructor() {
    this.performance = typeof performance !== 'undefined' ? performance : null;
    this.start = this.performance ? this.performance.now() : Date.now();
  }

  /**
   * 结束计时
   */
  end(): number {
    const end = this.performance ? this.performance.now() : Date.now();
    return end - this.start;
  }

  /**
   * 重置计时器
   */
  reset(): void {
    this.start = this.performance ? this.performance.now() : Date.now();
  }
}

// ============================================
// 平台特定功能检测
// ============================================

/**
 * 检测是否支持Web Workers
 */
export function supportsWebWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * 检测是否支持Service Workers
 */
export function supportsServiceWorkers(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * 检测是否支持IndexedDB
 */
export function supportsIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * 检测是否支持Fetch API
 */
export function supportsFetch(): boolean {
  return typeof fetch !== 'undefined';
}

/**
 * 检测是否支持WebSocket
 */
export function supportsWebSocket(): boolean {
  return typeof WebSocket !== 'undefined';
}

// ============================================
// 导出环境信息
// ============================================

/**
 * 环境信息类型
 */
export interface Environment {
  type: ReturnType<typeof getEnvironment>;
  mode: ReturnType<typeof getEnvironmentMode>;
  isBrowser: boolean;
  isNode: boolean;
  isWebWorker: boolean;
  isElectron: boolean;
  supports: {
    webWorkers: boolean;
    serviceWorkers: boolean;
    indexedDB: boolean;
    fetch: boolean;
    webSocket: boolean;
  };
}

/**
 * 环境信息
 */
export const environment: Environment = {
  type: getEnvironment(),
  mode: getEnvironmentMode(),
  isBrowser: isBrowser(),
  isNode: isNode(),
  isWebWorker: isWebWorker(),
  isElectron: isElectronRenderer(),
  supports: {
    webWorkers: supportsWebWorkers(),
    serviceWorkers: supportsServiceWorkers(),
    indexedDB: supportsIndexedDB(),
    fetch: supportsFetch(),
    webSocket: supportsWebSocket(),
  },
};

export default environment;
