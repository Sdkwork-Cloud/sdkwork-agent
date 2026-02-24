/**
 * Framework Types - 框架核心类型定义
 *
 * 统一的类型定义，确保整个框架类型一致性
 *
 * @module Framework/Types
 * @version 1.0.0
 */

// ============================================
// Result Types
// ============================================

export interface Success<T> {
  success: true;
  data: T;
  error?: never;
}

export interface Failure<E = Error> {
  success: false;
  data?: never;
  error: E;
}

export type Result<T, E = Error> = Success<T> | Failure<E>;

export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

// ============================================
// Option Types
// ============================================

export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

export interface None {
  readonly _tag: 'None';
}

export type Option<T> = Some<T> | None;

export function some<T>(value: T): Option<T> {
  return { _tag: 'Some', value };
}

export function none(): None {
  return { _tag: 'None' };
}

export function isSome<T>(option: Option<T>): option is Some<T> {
  return option._tag === 'Some';
}

export function isNone<T>(option: Option<T>): option is None {
  return option._tag === 'None';
}

export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value === null || value === undefined ? none() : some(value);
}

// ============================================
// Async Types
// ============================================

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export interface AsyncState<T, E = Error> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: E;
}

export function idle<T, E = Error>(): AsyncState<T, E> {
  return { status: 'idle' };
}

export function loading<T, E = Error>(): AsyncState<T, E> {
  return { status: 'loading' };
}

export function asyncSuccess<T, E = Error>(data: T): AsyncState<T, E> {
  return { status: 'success', data };
}

export function asyncError<T, E = Error>(error: E): AsyncState<T, E> {
  return { status: 'error', error };
}

// ============================================
// Callback Types
// ============================================

export type Callback<T = void> = (data: T) => void;
export type AsyncCallback<T = void> = (data: T) => Promise<void>;
export type Unsubscribe = () => void;

// ============================================
// Handler Types
// ============================================

export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void | Promise<void>;
export type CompletionHandler<T = unknown> = (result: T) => void | Promise<void>;

// ============================================
// Config Types
// ============================================

export interface ConfigValue<T = unknown> {
  value: T;
  defaultValue?: T;
  description?: string;
  validator?: (value: T) => boolean;
}

export interface ConfigSchema {
  [key: string]: ConfigValue;
}

// ============================================
// Entity Types
// ============================================

export interface Entity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NamedEntity extends Entity {
  name: string;
  description?: string;
}

export interface VersionedEntity extends NamedEntity {
  version: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

// ============================================
// Collection Types
// ============================================

export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

export interface Dictionary<T = unknown> {
  [key: string]: T;
}

// ============================================
// Time Types
// ============================================

export type Timestamp = number;
export type Duration = number;

export const Duration = {
  milliseconds: (ms: number): Duration => ms,
  seconds: (s: number): Duration => s * 1000,
  minutes: (m: number): Duration => m * 60 * 1000,
  hours: (h: number): Duration => h * 60 * 60 * 1000,
  days: (d: number): Duration => d * 24 * 60 * 60 * 1000,
};

export function now(): Timestamp {
  return Date.now();
}

// ============================================
// Brand Types
// ============================================

export type Brand<T, B> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type RequestId = Brand<string, 'RequestId'>;
export type TraceId = Brand<string, 'TraceId'>;

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type Exactly<T, S> = T & Record<Exclude<keyof T, keyof S>, never>;
