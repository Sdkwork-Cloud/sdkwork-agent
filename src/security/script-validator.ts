/**
 * Secure Script Validator
 *
 * Uses AST-based analysis to detect and prevent code injection attacks.
 * Replaces simple regex-based validation which is easily bypassed.
 * Compatible with both browser and Node.js environments.
 */

import { parse } from '@babel/parser';
import type { Node, Function as BabelFunction } from '@babel/types';
import * as t from '@babel/types';

// ============================================
// Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'forbidden_identifier' | 'forbidden_pattern' | 'dynamic_code' | 'unsafe_import';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface ValidationWarning {
  type: 'suspicious_pattern' | 'potential_leak';
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationConfig {
  // Forbidden identifiers (functions, variables)
  forbiddenIdentifiers: string[];
  // Forbidden patterns (regex for dynamic code)
  forbiddenPatterns: RegExp[];
  // Allowed imports/modules
  allowedImports: string[];
  // Maximum code length
  maxCodeLength: number;
  // Maximum AST node count
  maxNodeCount: number;
  // Allow function declarations
  allowFunctionDeclarations: boolean;
  // Allow loops
  allowLoops: boolean;
  // Allow async/await
  allowAsync: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  forbiddenIdentifiers: [
    // Code execution
    'eval',
    'Function',
    'setTimeout',
    'setInterval',
    // Dynamic imports
    'import',
    'require',
    // Global object access
    'global',
    'globalThis',
    'window',
    'document',
    'process',
    // Console (for production)
    'console',
    // Prototype manipulation
    'constructor',
    'prototype',
    '__proto__',
    // Network
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    // Storage
    'localStorage',
    'sessionStorage',
    'indexedDB',
    // Navigation
    'location',
    'history',
    'open',
  ],
  forbiddenPatterns: [
    // Dynamic property access that could bypass validation
    /\[\s*['"]\s*eval\s*['"]\s*\]/i,
    /\[\s*['"]\s*Function\s*['"]\s*\]/i,
    // String concatenation that forms dangerous calls
    /eval\s*\+/i,
    /Function\s*\+/i,
    // Obfuscated code patterns
    /\\x[0-9a-f]{2}/i,  // Hex escape sequences
    /\\u[0-9a-f]{4}/i,  // Unicode escape sequences
    /String\.fromCharCode/i,
    /atob|btoa/i,  // Base64 encoding
    /unescape|escape/i,
  ],
  allowedImports: [
    // Only allow specific safe modules
    'math',
    'date-utils',
    'string-utils',
  ],
  maxCodeLength: 10000,
  maxNodeCount: 1000,
  allowFunctionDeclarations: true,
  allowLoops: true,
  allowAsync: false,
};

// ============================================
// Script Validator
// ============================================

export class ScriptValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validate JavaScript/TypeScript code
   */
  validate(code: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check code length
    if (code.length > this.config.maxCodeLength) {
      errors.push({
        type: 'forbidden_pattern',
        message: `Code exceeds maximum length of ${this.config.maxCodeLength} characters`,
      });
      return { valid: false, errors, warnings };
    }

    // Check forbidden patterns in raw code
    for (const pattern of this.config.forbiddenPatterns) {
      if (pattern.test(code)) {
        errors.push({
          type: 'forbidden_pattern',
          message: `Forbidden pattern detected: ${pattern.source}`,
          code: this.extractMatchingCode(code, pattern),
        });
      }
    }

    // Parse AST
    let ast: Node;
    try {
      ast = parse(code, {
        sourceType: 'script',
        allowReturnOutsideFunction: false,
        allowImportExportEverywhere: false,
        strictMode: true,
      }) as unknown as Node;
    } catch (parseError) {
      errors.push({
        type: 'forbidden_pattern',
        message: `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      });
      return { valid: false, errors, warnings };
    }

    // Check node count
    let nodeCount = 0;
    traverse(ast, {
      Identifier: () => { nodeCount++; },
    });

    if (nodeCount > this.config.maxNodeCount) {
      errors.push({
        type: 'forbidden_pattern',
        message: `Code exceeds maximum node count of ${this.config.maxNodeCount}`,
      });
      return { valid: false, errors, warnings };
    }

    // AST-based validation
    traverse(ast, {
      // Check identifiers
      Identifier: (path) => {
        const node = path.node as t.Identifier;
        const name = node.name;
        if (this.config.forbiddenIdentifiers.includes(name)) {
          errors.push({
            type: 'forbidden_identifier',
            message: `Forbidden identifier: ${name}`,
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },

      // Check member expressions (e.g., window['eval'])
      MemberExpression: (path) => {
        const node = path.node as t.MemberExpression;
        // Check for computed properties that could bypass validation
        if (node.computed && t.isStringLiteral(node.property)) {
          const propName = node.property.value;
          if (this.config.forbiddenIdentifiers.includes(propName)) {
            errors.push({
              type: 'dynamic_code',
              message: `Dynamic property access to forbidden identifier: ${propName}`,
              line: node.loc?.start.line,
              column: node.loc?.start.column,
            });
          }
        }
      },

      // Check call expressions
      CallExpression: (path) => {
        const node = path.node as t.CallExpression;
        // Check for indirect eval (e.g., (0, eval)('code'))
        if (t.isIdentifier(node.callee) && node.callee.name === 'eval') {
          errors.push({
            type: 'dynamic_code',
            message: 'Direct eval call detected',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }

        // Check for setTimeout/setInterval with string
        if (t.isIdentifier(node.callee)) {
          const name = node.callee.name;
          if ((name === 'setTimeout' || name === 'setInterval') &&
              node.arguments.length > 0 &&
              t.isStringLiteral(node.arguments[0])) {
            errors.push({
              type: 'dynamic_code',
              message: `${name} with string argument is forbidden`,
              line: node.loc?.start.line,
              column: node.loc?.start.column,
            });
          }
        }
      },

      // Check imports
      ImportDeclaration: (path) => {
        const node = path.node as t.ImportDeclaration;
        const source = node.source.value;
        if (!this.config.allowedImports.includes(source)) {
          errors.push({
            type: 'unsafe_import',
            message: `Import from '${source}' is not allowed`,
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },

      // Check for dynamic imports
      Import: (path) => {
        const node = path.node as t.Import;
        errors.push({
          type: 'unsafe_import',
          message: 'Dynamic imports are forbidden',
          line: node.loc?.start.line,
          column: node.loc?.start.column,
        });
      },

      // Check function declarations
      FunctionDeclaration: (path) => {
        if (!this.config.allowFunctionDeclarations) {
          const node = path.node as t.FunctionDeclaration;
          errors.push({
            type: 'forbidden_pattern',
            message: 'Function declarations are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },

      // Check loops
      ForStatement: (path) => {
        if (!this.config.allowLoops) {
          const node = path.node as t.ForStatement;
          errors.push({
            type: 'forbidden_pattern',
            message: 'For loops are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },
      WhileStatement: (path) => {
        if (!this.config.allowLoops) {
          const node = path.node as t.WhileStatement;
          errors.push({
            type: 'forbidden_pattern',
            message: 'While loops are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },
      DoWhileStatement: (path) => {
        if (!this.config.allowLoops) {
          const node = path.node as t.DoWhileStatement;
          errors.push({
            type: 'forbidden_pattern',
            message: 'Do-while loops are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },

      // Check async/await
      Function: (path) => {
        const node = path.node as BabelFunction;
        if (node.async && !this.config.allowAsync) {
          errors.push({
            type: 'forbidden_pattern',
            message: 'Async functions are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },
      AwaitExpression: (path) => {
        if (!this.config.allowAsync) {
          const node = path.node as t.AwaitExpression;
          errors.push({
            type: 'forbidden_pattern',
            message: 'Await expressions are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column,
          });
        }
      },

      // Check for potential data leaks
      AssignmentExpression: (path) => {
        const node = path.node as t.AssignmentExpression;
        // Check for assignments to global properties
        if (t.isMemberExpression(node.left)) {
          const object = node.left.object;
          if (t.isIdentifier(object) &&
              ['window', 'global', 'globalThis', 'document'].includes(object.name)) {
            warnings.push({
              type: 'potential_leak',
              message: `Potential data leak: assignment to ${object.name}`,
              line: node.loc?.start.line,
              column: node.loc?.start.column,
            });
          }
        }
      },
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate with custom config for specific use cases
   */
  validateWithConfig(code: string, config: Partial<ValidationConfig>): ValidationResult {
    const originalConfig = this.config;
    this.config = { ...this.config, ...config };
    const result = this.validate(code);
    this.config = originalConfig;
    return result;
  }

  /**
   * Quick validation - only checks forbidden patterns
   */
  quickValidate(code: string): boolean {
    // Check length
    if (code.length > this.config.maxCodeLength) {
      return false;
    }

    // Check patterns
    for (const pattern of this.config.forbiddenPatterns) {
      if (pattern.test(code)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract matching code snippet
   */
  private extractMatchingCode(code: string, pattern: RegExp): string | undefined {
    const match = code.match(pattern);
    if (match) {
      const start = Math.max(0, match.index! - 10);
      const end = Math.min(code.length, match.index! + match[0].length + 10);
      return code.slice(start, end);
    }
    return undefined;
  }
}

// ============================================
// Secure Sandbox
// ============================================

export interface SandboxContext {
  // Allowed global variables
  globals: Record<string, unknown>;
  // Timeout in milliseconds
  timeout: number;
  // Memory limit in MB
  memoryLimit: number;
}

export class SecureSandbox {
  private validator: ScriptValidator;

  constructor(validator?: ScriptValidator) {
    this.validator = validator || new ScriptValidator();
  }

  /**
   * Execute code in secure sandbox
   */
  async execute(code: string, context: SandboxContext): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
    logs: string[];
  }> {
    const logs: string[] = [];

    // Validate code
    const validation = this.validator.validate(code);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        logs,
      };
    }

    try {
      // Create sandboxed environment
      const sandbox = this.createSandbox(context, logs);

      // Execute with timeout
      const result = await this.runWithTimeout(code, sandbox, context.timeout);

      return {
        success: true,
        result,
        logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        logs,
      };
    }
  }

  /**
   * Create sandboxed environment
   */
  private createSandbox(context: SandboxContext, logs: string[]): Record<string, unknown> {
    return {
      // Provide allowed globals
      ...context.globals,

      // Safe console
      console: {
        log: (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' ')),
        error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(a => String(a)).join(' ')}`),
        warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(a => String(a)).join(' ')}`),
        info: (...args: unknown[]) => logs.push(`[INFO] ${args.map(a => String(a)).join(' ')}`),
      },

      // Safe Math
      Math,
      JSON,
      Date,
      RegExp,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      ReferenceError,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      escape: undefined,  // Disable unsafe functions
      unescape: undefined,
      eval: undefined,
      Function: undefined,
    };
  }

  /**
   * Run code with timeout
   */
  private runWithTimeout(
    code: string,
    sandbox: Record<string, unknown>,
    timeout: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // Create function with sandbox as context
        const func = new Function(
          'sandbox',
          `with(sandbox) { return (${code}); }`
        );
        const result = func(sandbox);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}

// ============================================
// Simple traverse function
// ============================================

type Visitor = {
  [key: string]: ((path: { node: Node }) => void) | undefined;
};

function traverse(ast: Node, visitor: Visitor): void {
  function visit(node: Node): void {
    const visitorFn = visitor[node.type];
    if (visitorFn) {
      visitorFn({ node });
    }
    
    // Traverse children
    for (const key of Object.keys(node)) {
      const child = (node as unknown as Record<string, unknown>)[key];
      if (child && typeof child === 'object' && child !== null) {
        const childNode = child as { type?: string };
        if (Array.isArray(child)) {
          child.forEach(c => c && (c as { type?: string }).type && visit(c as Node));
        } else if (childNode.type) {
          visit(child as Node);
        }
      }
    }
  }
  
  visit(ast);
}

// ============================================
// Export singleton instances
// ============================================

export const defaultValidator = new ScriptValidator();
export const defaultSandbox = new SecureSandbox(defaultValidator);
