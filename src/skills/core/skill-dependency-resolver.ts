/**
 * Skill Dependency Resolver
 *
 * 技能依赖解析器
 *
 * 核心功能：
 * 1. 解析技能依赖图
 * 2. 检测循环依赖
 * 3. 拓扑排序
 * 4. 版本兼容性检查
 * 5. 依赖注入
 *
 * @module SkillDependencyResolver
 * @version 1.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { Skill, Logger } from './types.js';
import { SkillDependency } from './skill-engine.js';

/**
 * 依赖图节点
 */
interface DependencyNode {
  name: string;
  skill?: Skill;
  dependencies: Set<string>;
  dependents: Set<string>;
  resolved: boolean;
  resolving: boolean;
}

/**
 * 依赖解析结果
 */
export interface DependencyResolutionResult {
  /** 是否成功 */
  success: boolean;
  /** 解析顺序 */
  order?: string[];
  /** 错误信息 */
  error?: string;
  /** 缺失的依赖 */
  missingDependencies?: string[];
  /** 循环依赖链 */
  circularDependencies?: string[][];
}

/**
 * 依赖解析器配置
 */
export interface DependencyResolverConfig {
  /** 日志器 */
  logger?: Logger;
  /** 允许循环依赖 */
  allowCircular?: boolean;
  /** 严格模式 */
  strict?: boolean;
}

/**
 * 技能依赖解析器
 */
export class SkillDependencyResolver extends EventEmitter {
  private config: Required<DependencyResolverConfig>;
  private logger: Logger;
  private nodes: Map<string, DependencyNode> = new Map();
  private skills: Map<string, Skill> = new Map();

  constructor(config: DependencyResolverConfig = {}) {
    super();
    this.config = {
      logger: this.createDefaultLogger(),
      allowCircular: false,
      strict: true,
      ...config,
    };
    this.logger = this.config.logger;
  }

  /**
   * 注册技能
   */
  registerSkill(skill: Skill, dependencies: SkillDependency[] = []): void {
    this.skills.set(skill.name, skill);

    // 创建或更新节点
    let node = this.nodes.get(skill.name);
    if (!node) {
      node = {
        name: skill.name,
        skill,
        dependencies: new Set(),
        dependents: new Set(),
        resolved: false,
        resolving: false,
      };
      this.nodes.set(skill.name, node);
    } else {
      node.skill = skill;
    }

    // 添加依赖关系
    for (const dep of dependencies) {
      node.dependencies.add(dep.name);

      // 创建依赖节点（如果不存在）
      let depNode = this.nodes.get(dep.name);
      if (!depNode) {
        depNode = {
          name: dep.name,
          dependencies: new Set(),
          dependents: new Set(),
          resolved: false,
          resolving: false,
        };
        this.nodes.set(dep.name, depNode);
      }

      depNode.dependents.add(skill.name);
    }

    this.logger.debug(`Registered skill: ${skill.name} with ${dependencies.length} dependencies`);
  }

  /**
   * 注销技能
   */
  unregisterSkill(name: string): boolean {
    const node = this.nodes.get(name);
    if (!node) return false;

    // 从依赖者的依赖列表中移除
    for (const depName of node.dependencies) {
      const depNode = this.nodes.get(depName);
      if (depNode) {
        depNode.dependents.delete(name);
      }
    }

    // 从被依赖者的依赖者列表中移除
    for (const dependentName of node.dependents) {
      const dependentNode = this.nodes.get(dependentName);
      if (dependentNode) {
        dependentNode.dependencies.delete(name);
      }
    }

    this.nodes.delete(name);
    this.skills.delete(name);

    this.logger.debug(`Unregistered skill: ${name}`);
    return true;
  }

  /**
   * 解析依赖
   */
  resolve(targetSkillName?: string): DependencyResolutionResult {
    this.logger.info(`Resolving dependencies${targetSkillName ? ` for ${targetSkillName}` : ''}`);

    // 重置状态
    for (const node of this.nodes.values()) {
      node.resolved = false;
      node.resolving = false;
    }

    const order: string[] = [];
    const missingDependencies: string[] = [];
    const circularDependencies: string[][] = [];

    // 如果指定了目标技能，只解析其依赖
    const targetNames = targetSkillName
      ? [targetSkillName]
      : Array.from(this.nodes.keys());

    for (const name of targetNames) {
      const node = this.nodes.get(name);
      if (!node) {
        missingDependencies.push(name);
        continue;
      }

      const result = this.resolveNode(node, order, [], circularDependencies);
      if (!result) {
        if (this.config.strict) {
          return {
            success: false,
            error: `Failed to resolve dependencies for ${name}`,
            circularDependencies,
          };
        }
      }
    }

    // 检查缺失的依赖
    for (const node of this.nodes.values()) {
      for (const depName of node.dependencies) {
        if (!this.nodes.has(depName) || !this.skills.has(depName)) {
          if (!missingDependencies.includes(depName)) {
            missingDependencies.push(depName);
          }
        }
      }
    }

    if (missingDependencies.length > 0) {
      return {
        success: false,
        error: `Missing dependencies: ${missingDependencies.join(', ')}`,
        missingDependencies,
      };
    }

    if (circularDependencies.length > 0 && !this.config.allowCircular) {
      return {
        success: false,
        error: `Circular dependencies detected`,
        circularDependencies,
      };
    }

    this.logger.info(`Dependencies resolved. Order: ${order.join(' -> ')}`);

    return {
      success: true,
      order,
    };
  }

  /**
   * 获取依赖图
   */
  getDependencyGraph(): Record<string, { dependencies: string[]; dependents: string[] }> {
    const graph: Record<string, { dependencies: string[]; dependents: string[] }> = {};

    for (const [name, node] of this.nodes) {
      graph[name] = {
        dependencies: Array.from(node.dependencies),
        dependents: Array.from(node.dependents),
      };
    }

    return graph;
  }

  /**
   * 检查是否存在循环依赖
   */
  hasCircularDependency(): boolean {
    // 重置状态
    for (const node of this.nodes.values()) {
      node.resolved = false;
      node.resolving = false;
    }

    const circularChains: string[][] = [];

    for (const node of this.nodes.values()) {
      if (!node.resolved) {
        this.detectCircular(node, [], circularChains);
      }
    }

    return circularChains.length > 0;
  }

  /**
   * 获取直接依赖
   */
  getDirectDependencies(skillName: string): string[] {
    const node = this.nodes.get(skillName);
    return node ? Array.from(node.dependencies) : [];
  }

  /**
   * 获取所有依赖（传递依赖）
   */
  getAllDependencies(skillName: string): string[] {
    const allDeps = new Set<string>();
    const visited = new Set<string>();

    const collect = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const node = this.nodes.get(name);
      if (!node) return;

      for (const dep of node.dependencies) {
        allDeps.add(dep);
        collect(dep);
      }
    };

    collect(skillName);
    return Array.from(allDeps);
  }

  /**
   * 获取依赖该技能的所有技能
   */
  getDependents(skillName: string): string[] {
    const node = this.nodes.get(skillName);
    return node ? Array.from(node.dependents) : [];
  }

  /**
   * 清空所有注册的技能
   */
  clear(): void {
    this.nodes.clear();
    this.skills.clear();
    this.logger.debug('Cleared all registered skills');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private resolveNode(
    node: DependencyNode,
    order: string[],
    path: string[],
    circularChains: string[][]
  ): boolean {
    // 如果已经解析，直接返回
    if (node.resolved) return true;

    // 如果正在解析中，发现循环依赖
    if (node.resolving) {
      const cycleStart = path.indexOf(node.name);
      const cycle = path.slice(cycleStart).concat(node.name);
      circularChains.push(cycle);
      return false;
    }

    node.resolving = true;
    path.push(node.name);

    // 先解析所有依赖
    for (const depName of node.dependencies) {
      const depNode = this.nodes.get(depName);
      if (!depNode) continue;

      const result = this.resolveNode(depNode, order, path, circularChains);
      if (!result && this.config.strict) {
        return false;
      }
    }

    path.pop();
    node.resolving = false;
    node.resolved = true;

    // 添加到解析顺序
    if (!order.includes(node.name)) {
      order.push(node.name);
    }

    return true;
  }

  private detectCircular(node: DependencyNode, path: string[], circularChains: string[][]): void {
    if (node.resolving) {
      // 发现循环
      const cycleStart = path.indexOf(node.name);
      const cycle = path.slice(cycleStart).concat(node.name);
      circularChains.push(cycle);
      return;
    }

    if (node.resolved) return;

    node.resolving = true;
    path.push(node.name);

    for (const depName of node.dependencies) {
      const depNode = this.nodes.get(depName);
      if (depNode) {
        this.detectCircular(depNode, path, circularChains);
      }
    }

    path.pop();
    node.resolving = false;
    node.resolved = true;
  }

  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建依赖解析器
 */
export function createDependencyResolver(
  config?: DependencyResolverConfig
): SkillDependencyResolver {
  return new SkillDependencyResolver(config);
}
