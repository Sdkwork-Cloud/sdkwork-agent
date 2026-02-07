/**
 * Dependency Injection Container
 *
 * Provides a lightweight DI container for managing dependencies
 * and enabling testability through dependency injection.
 */

// ============================================
// Types
// ============================================

export type Constructor<T> = new (...args: unknown[]) => T;
export type Factory<T> = (container: Container) => T;
export type Provider<T> = Constructor<T> | Factory<T> | T;

export interface Registration<T> {
  provider: Provider<T>;
  singleton: boolean;
  instance?: T;
}

export interface ContainerConfig {
  strict: boolean;
  allowOverride: boolean;
}

/** 可注入的构造函数类型 */
interface InjectableConstructor extends Constructor<unknown> {
  __injectableToken?: symbol | string;
}

/** 支持注入的目标类型 */
interface InjectTarget {
  __injectTokens?: (symbol | string)[];
}

// ============================================
// Container
// ============================================

export class Container {
  private registrations = new Map<symbol | string, Registration<unknown>>();
  private parent?: Container;
  private config: ContainerConfig;

  constructor(config: Partial<ContainerConfig> = {}, parent?: Container) {
    this.config = {
      strict: config.strict ?? true,
      allowOverride: config.allowOverride ?? false,
    };
    this.parent = parent;
  }

  /**
   * Register a dependency
   */
  register<T>(token: symbol | string, provider: Provider<T>, singleton = false): this {
    if (!this.config.allowOverride && this.registrations.has(token)) {
      throw new Error(`Dependency already registered: ${String(token)}`);
    }

    this.registrations.set(token, {
      provider,
      singleton,
    });

    return this;
  }

  /**
   * Register a singleton
   */
  singleton<T>(token: symbol | string, provider: Provider<T>): this {
    return this.register(token, provider, true);
  }

  /**
   * Register a factory
   */
  factory<T>(token: symbol | string, factory: Factory<T>): this {
    return this.register(token, factory, false);
  }

  /**
   * Register a class
   */
  class<T>(token: symbol | string, constructor: Constructor<T>, singleton = false): this {
    return this.register(token, constructor, singleton);
  }

  /**
   * Register a value
   */
  value<T>(token: symbol | string, value: T): this {
    return this.register(token, value, true);
  }

  /**
   * Resolve a dependency
   */
  resolve<T>(token: symbol | string): T {
    // Check current container
    const registration = this.registrations.get(token);

    if (registration) {
      return this.resolveRegistration<T>(registration);
    }

    // Check parent container
    if (this.parent) {
      return this.parent.resolve<T>(token);
    }

    // Strict mode: throw error if not found
    if (this.config.strict) {
      throw new Error(`Dependency not found: ${String(token)}`);
    }

    // Non-strict mode: return undefined
    return undefined as T;
  }

  /**
   * Try to resolve a dependency (returns undefined if not found)
   */
  tryResolve<T>(token: symbol | string): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a dependency is registered
   */
  has(token: symbol | string): boolean {
    return this.registrations.has(token) || (this.parent?.has(token) ?? false);
  }

  /**
   * Remove a registration
   */
  remove(token: symbol | string): boolean {
    return this.registrations.delete(token);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Create a child container
   */
  createChild(config?: Partial<ContainerConfig>): Container {
    return new Container(config ?? this.config, this);
  }

  /**
   * Resolve a registration
   */
  private resolveRegistration<T>(registration: Registration<unknown>): T {
    // Return cached singleton instance
    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance as T;
    }

    let instance: T;

    if (typeof registration.provider === 'function') {
      // Check if it's a constructor
      if (registration.provider.prototype && registration.provider.prototype.constructor) {
        instance = new (registration.provider as Constructor<T>)();
      } else {
        // It's a factory function
        instance = (registration.provider as Factory<T>)(this);
      }
    } else {
      // It's a value
      instance = registration.provider as T;
    }

    // Cache singleton instance
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance;
  }
}

// ============================================
// Decorators
// ============================================

export function Injectable(token?: symbol | string) {
  return function <T extends Constructor<unknown>>(constructor: T) {
    // Store injection token on the class
    const injectableConstructor = constructor as InjectableConstructor;
    injectableConstructor.__injectableToken = token ?? constructor.name;
    return constructor;
  };
}

export function Inject(token: symbol | string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function (target: unknown, _propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store injection metadata
    const injectTarget = target as InjectTarget;
    const existingTokens = injectTarget.__injectTokens || [];
    existingTokens[parameterIndex] = token;
    injectTarget.__injectTokens = existingTokens;
  };
}

// ============================================
// Service Locator (Anti-pattern, but useful for legacy code)
// ============================================

let globalContainer: Container | undefined;

export function setGlobalContainer(container: Container): void {
  globalContainer = container;
}

export function getGlobalContainer(): Container {
  if (!globalContainer) {
    globalContainer = new Container();
  }
  return globalContainer;
}

export function resolve<T>(token: symbol | string): T {
  return getGlobalContainer().resolve<T>(token);
}

// ============================================
// Token Factory
// ============================================

export function createToken<_T>(name: string): symbol {
  return Symbol(name);
}

// ============================================
// Common Tokens
// ============================================

export const TOKENS = {
  // Core
  Agent: createToken<unknown>('Agent'),
  SmartAgent: createToken<unknown>('SmartAgent'),
  
  // Decision
  DecisionEngine: createToken<unknown>('DecisionEngine'),
  AdvancedDecisionEngine: createToken<unknown>('AdvancedDecisionEngine'),
  
  // Skills
  SkillLoader: createToken<unknown>('SkillLoader'),
  SkillRegistry: createToken<unknown>('SkillRegistry'),
  
  // LLM
  LLMProvider: createToken<unknown>('LLMProvider'),
  
  // Optimization
  TokenOptimizer: createToken<unknown>('TokenOptimizer'),
  
  // Evaluation
  EvaluationEngine: createToken<unknown>('EvaluationEngine'),
  
  // Security
  ScriptValidator: createToken<unknown>('ScriptValidator'),
  SecureSandbox: createToken<unknown>('SecureSandbox'),
  
  // Validation
  ValidationService: createToken<unknown>('ValidationService'),
} as const;

// ============================================
// Module System
// ============================================

export interface Module {
  register(container: Container): void;
}

export class ModuleBuilder {
  private registrations: Array<(container: Container) => void> = [];

  register<T>(token: symbol | string, provider: Provider<T>, singleton = false): this {
    this.registrations.push((container) => container.register(token, provider, singleton));
    return this;
  }

  singleton<T>(token: symbol | string, provider: Provider<T>): this {
    return this.register(token, provider, true);
  }

  factory<T>(token: symbol | string, factory: Factory<T>): this {
    return this.register(token, factory, false);
  }

  build(): Module {
    return {
      register: (container: Container) => {
        for (const registration of this.registrations) {
          registration(container);
        }
      },
    };
  }
}

// ============================================
// Export singleton
// ============================================

export const defaultContainer = new Container();
