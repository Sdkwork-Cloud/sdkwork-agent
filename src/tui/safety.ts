export type Maybe<T> = T | null | undefined;

export function isNil<T>(value: Maybe<T>): value is null | undefined {
  return value === null || value === undefined;
}

export function isNotNil<T>(value: Maybe<T>): value is T {
  return !isNil(value);
}

export function defaultTo<T>(value: Maybe<T>, defaultValue: T): T {
  return isNil(value) ? defaultValue : value;
}

export function defaultToLazy<T>(value: Maybe<T>, defaultFn: () => T): T {
  return isNil(value) ? defaultFn() : value;
}

export function firstNotNil<T>(...values: Maybe<T>[]): T | undefined {
  for (const value of values) {
    if (isNotNil(value)) return value;
  }
  return undefined;
}

export function coalesce<T>(...values: Maybe<T>[]): T | undefined {
  return firstNotNil(...values);
}

export function requireValue<T>(value: Maybe<T>, message?: string): T {
  if (isNil(value)) {
    throw new Error(message ?? 'Value is required');
  }
  return value;
}

export function requireValueAsync<T>(value: Maybe<T>, message?: string): Promise<T> {
  if (isNil(value)) {
    return Promise.reject(new Error(message ?? 'Value is required'));
  }
  return Promise.resolve(value);
}

export function isEmpty(value: Maybe<string | unknown[] | object>): boolean {
  if (isNil(value)) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function isNotEmpty(value: Maybe<string | unknown[] | object>): boolean {
  return !isEmpty(value);
}

export function safeString(value: Maybe<string>): string {
  return value ?? '';
}

export function safeNumber(value: Maybe<number>, defaultValue: number = 0): number {
  return value ?? defaultValue;
}

export function safeBoolean(value: Maybe<boolean>, defaultValue: boolean = false): boolean {
  return value ?? defaultValue;
}

export function safeArray<T>(value: Maybe<T[]>): T[] {
  return value ?? [];
}

export function safeObject<T extends object>(value: Maybe<T>): T {
  return value ?? ({} as T);
}

export function safeJson<T>(value: Maybe<string>, defaultValue: T): T {
  if (isNil(value)) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export function safeStringify(value: Maybe<unknown>, defaultValue: string = ''): string {
  if (isNil(value)) return defaultValue;
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

export function safeAccess<T, K extends keyof T>(obj: Maybe<T>, key: K): Maybe<T[K]> {
  return isNil(obj) ? undefined : obj[key];
}

export function safeAccessPath<T>(obj: Maybe<unknown>, path: string): Maybe<T> {
  if (isNil(obj)) return undefined;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (isNil(current) || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  
  return current as Maybe<T>;
}

export function safeAssign<T extends object>(target: Maybe<T>, source: Maybe<Partial<T>>): T {
  const result = safeObject(target);
  if (isNotNil(source)) {
    Object.assign(result, source);
  }
  return result;
}

export function safeMerge<T extends object>(...objects: Maybe<Partial<T>>[]): T {
  return objects.reduce<T>((acc, obj) => {
    return isNotNil(obj) ? { ...acc, ...obj } : acc;
  }, {} as T);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function ensureArray<T>(value: Maybe<T | T[]>): T[] {
  if (isNil(value)) return [];
  return Array.isArray(value) ? value : [value];
}

export function ensureString(value: Maybe<unknown>): string {
  if (isNil(value)) return '';
  return typeof value === 'string' ? value : String(value);
}

export function ensureNumber(value: Maybe<unknown>, defaultValue: number = 0): number {
  if (isNil(value)) return defaultValue;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function ensureBoolean(value: Maybe<unknown>, defaultValue: boolean = false): boolean {
  if (isNil(value)) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return Boolean(value);
}
