/**
 * Unified Skill Type System
 *
 * Single source of truth for all Skill-related types
 */

import type { z } from 'zod';

// ============================================================================
// Core Skill Interface
// ============================================================================

/**
 * Skill metadata for categorization and tagging
 */
export interface SkillMetadata {
  /** Skill category */
  category?: string;
  /** Skill tags */
  tags?: string[];
  /** Author information */
  author?: string;
}

/**
 * Base Skill interface - all skills must implement this
 */
export interface Skill {
  /** Unique identifier (1-64 chars, lowercase letters/numbers/hyphens) */
  readonly name: string;

  /** Human-readable description (1-1024 chars, must explain what and when) */
  readonly description: string;

  /** Semantic version */
  readonly version: string;

  /** Input parameter schema for runtime validation */
  readonly inputSchema: z.ZodType<unknown>;

  /** Optional metadata for categorization */
  readonly metadata?: SkillMetadata;

  /**
   * Execute the skill
   * @param input - Validated input data
   * @param context - Execution context
   * @returns Skill execution result
   */
  execute(input: unknown, context: ExecutionContext): Promise<SkillResult>;

  /**
   * Optional streaming execution
   * @param input - Validated input data
   * @param context - Execution context
   * @returns Async iterable of partial results
   */
  executeStream?(input: unknown, context: ExecutionContext): AsyncIterable<unknown>;
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Skill execution result
 */
export interface SkillResult<T = unknown> {
  /** Whether execution succeeded */
  readonly success: boolean;

  /** Output data (only present if success is true) */
  readonly data?: T;

  /** Error information (only present if success is false) */
  readonly error?: SkillError;

  /** Execution metadata */
  readonly metadata?: ExecutionMetadata;
}

/**
 * Execution context passed to skills
 */
export interface ExecutionContext {
  /** Unique execution identifier */
  readonly executionId: string;

  /** Session identifier */
  readonly sessionId: string;

  /** Name of the executing skill */
  readonly skillName: string;

  /** Abort signal for cancellation */
  readonly abortSignal?: AbortSignal;

  /** Logger instance */
  readonly logger: Logger;

  /** LLM service */
  readonly llm: LLMService;

  /** Memory service */
  readonly memory: MemoryService;

  /** Tool registry */
  readonly tools: ToolRegistry;
}

/**
 * Execution metadata
 */
export interface ExecutionMetadata {
  /** Execution start time */
  readonly startTime: Date;

  /** Execution end time */
  readonly endTime: Date;

  /** Duration in milliseconds */
  readonly duration: number;

  /** Token usage (if applicable) */
  readonly tokensUsed?: number;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Structured skill error
 */
export class SkillError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly recoverable: boolean = false,
    readonly cause?: Error
  ) {
    super(message);
    this.name = 'SkillError';
  }

  toJSON(): SkillErrorJSON {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

/**
 * Skill error JSON representation
 */
export interface SkillErrorJSON {
  name: string;
  code: string;
  message: string;
  recoverable: boolean;
  stack?: string;
  cause?: string;
}

// ============================================================================
// Skill Manifest (for SKILL.md)
// ============================================================================

/**
 * Skill manifest from SKILL.md frontmatter
 */
export interface SkillManifest {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Semantic version */
  version: string;

  /** License (optional) */
  license?: string;

  /** Compatibility requirements (optional) */
  compatibility?: string;

  /** Additional metadata */
  metadata?: {
    author?: string;
    category?: string;
    tags?: string[];
  };

  /** Lifecycle configuration */
  lifecycle?: {
    lazyLoad?: boolean;
    cacheable?: boolean;
    timeout?: number;
    retries?: number;
    dependencies?: string[];
  };
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Skill registry interface
 */
export interface ISkillRegistry {
  /** Register a skill */
  register(skill: Skill): void;

  /** Unregister a skill by name */
  unregister(name: string): boolean;

  /** Get a skill by name */
  get(name: string): Skill | undefined;

  /** Check if a skill exists */
  has(name: string): boolean;

  /** List all registered skills */
  list(): Skill[];

  /** Search skills by query */
  search(query: string): Skill[];

  /** Get skills by category */
  getByCategory(category: string): Skill[];

  /** Get skills by tag */
  getByTag(tag: string): Skill[];
}

/**
 * Skill index for fast searching
 */
export interface SkillIndex {
  byName: Map<string, string>;
  byCategory: Map<string, Set<string>>;
  byTag: Map<string, Set<string>>;
}

// ============================================================================
// Loader Types
// ============================================================================

/**
 * Disclosure level for progressive loading
 */
export type DisclosureLevel = 'metadata' | 'instructions' | 'full';

/**
 * Skill loader interface
 */
export interface ISkillLoader {
  /** Load only metadata (~100 tokens) */
  loadMetadata(path: string): Promise<SkillManifest>;

  /** Load instructions (< 5000 tokens) */
  loadInstructions(path: string): Promise<string>;

  /** Load full skill with all resources */
  loadFull(path: string): Promise<LoadedSkill>;
}

/**
 * Fully loaded skill
 */
export interface LoadedSkill {
  /** Skill manifest */
  manifest: SkillManifest;

  /** Skill instructions (markdown content) */
  instructions: string;

  /** Script files */
  scripts: Map<string, ScriptFile>;

  /** Reference files */
  references: Map<string, ReferenceFile>;

  /** Asset files */
  assets: Map<string, AssetFile>;

  /** Skill path */
  path: string;
}

/**
 * Script file
 */
export interface ScriptFile {
  name: string;
  path: string;
  language: 'javascript' | 'typescript' | 'python' | 'bash';
  content: string;
}

/**
 * Reference file
 */
export interface ReferenceFile {
  name: string;
  path: string;
  content: string;
}

/**
 * Asset file
 */
export interface AssetFile {
  name: string;
  path: string;
  type: 'data' | 'image' | 'template' | 'other';
  content: Buffer | string;
}

// ============================================================================
// Executor Types
// ============================================================================

/**
 * Skill executor interface
 */
export interface ISkillExecutor {
  /** Execute a skill */
  execute(skill: Skill, input: unknown, context: ExecutionContext): Promise<SkillResult>;

  /** Execute with timeout */
  executeWithTimeout(
    skill: Skill,
    input: unknown,
    context: ExecutionContext,
    timeoutMs: number
  ): Promise<SkillResult>;
}

// ============================================================================
// Service Interfaces (for DI)
// ============================================================================

/**
 * Logger interface - 使用 utils/logger 中的 ILogger
 */
export type Logger = import('../../utils/logger').ILogger;

/**
 * LLM service interface
 */
export interface LLMService {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  completeStream(prompt: string, options?: LLMOptions): AsyncIterable<string>;
}

/**
 * LLM options
 */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

/**
 * Memory service interface
 */
export interface MemoryService {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  search(query: string): Promise<unknown[]>;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  get(name: string): unknown | undefined;
  execute(name: string, params: unknown): Promise<unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Skill event types
 */
export type SkillEventType =
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:executing'
  | 'skill:completed'
  | 'skill:failed';

/**
 * Skill event
 */
export interface SkillEvent {
  type: SkillEventType;
  timestamp: Date;
  skillName: string;
  data?: Record<string, unknown>;
}

/**
 * Skill event listener
 */
export type SkillEventListener = (event: SkillEvent) => void;

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate skill name format
 */
export function isValidSkillName(name: string): boolean {
  // 1-64 characters
  if (name.length < 1 || name.length > 64) return false;

  // Only lowercase alphanumeric and hyphens
  if (!/^[a-z0-9-]+$/.test(name)) return false;

  // Cannot start or end with hyphen
  if (name.startsWith('-') || name.endsWith('-')) return false;

  // No consecutive hyphens
  if (name.includes('--')) return false;

  return true;
}

/**
 * Validate skill manifest
 */
export function validateSkillManifest(manifest: SkillManifest): void {
  if (!isValidSkillName(manifest.name)) {
    throw new Error(`Invalid skill name: ${manifest.name}`);
  }

  if (!manifest.description || manifest.description.length < 1 || manifest.description.length > 1024) {
    throw new Error('Description must be 1-1024 characters');
  }

  if (!manifest.version) {
    throw new Error('Version is required');
  }
}
