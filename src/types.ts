/**
 * Global Types - 全局类型定义
 *
 * @module Types
 */

// ============================================
// JSON Schema Types
// ============================================

export type JSONSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

export interface JSONSchema {
  type?: JSONSchemaType | JSONSchemaType[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;

  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Number validation
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Array validation
  items?: JSONSchema | JSONSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object validation
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  propertyNames?: JSONSchema;
  minProperties?: number;
  maxProperties?: number;

  // Composition
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  // References
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
  definitions?: Record<string, JSONSchema>;
}

// ============================================
// Common Utility Types
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// ============================================
// Event Types
// ============================================

export interface EventMetadata {
  timestamp: number;
  source?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export type EventHandler<T = unknown> = (payload: T, metadata: EventMetadata) => void | Promise<void>;

// ============================================
// Result Types
// ============================================

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export interface FailureResult<E = Error> {
  success: false;
  error: E;
}

export type Result<T, E = Error> = SuccessResult<T> | FailureResult<E>;

// ============================================
// Async Types
// ============================================

export type AsyncGenerator<T> = {
  [Symbol.asyncIterator](): AsyncIterator<T>;
};

export type Awaitable<T> = T | Promise<T>;
