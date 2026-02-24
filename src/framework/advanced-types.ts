/**
 * Advanced Type System - 高级类型系统
 *
 * 提供框架级别的类型增强
 * - 品牌类型
 * - 类型守卫
 * - 类型工具
 * - 泛型约束
 *
 * @module Framework/Types
 * @version 1.0.0
 */

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type LastElement<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L]
  ? L
  : never;

export type FirstElement<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]]
  ? F
  : never;

export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest]
  ? Rest
  : [];

export type Drop<T extends readonly unknown[], N extends number, Acc extends readonly unknown[] = []> =
  Acc['length'] extends N
    ? T
    : T extends readonly [unknown, ...infer Rest]
      ? Drop<Rest, N, [...Acc, unknown]>
      : [];

export type Take<T extends readonly unknown[], N extends number, Acc extends readonly unknown[] = []> =
  Acc['length'] extends N
    ? Acc
    : T extends readonly [infer F, ...infer Rest]
      ? Take<Rest, N, [...Acc, F]>
      : Acc;

export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type UnionToTuple<T, Last = LastOfUnion<T>> = [T] extends [never]
  ? []
  : [...UnionToTuple<Exclude<T, Last>>, Last];

type LastOfUnion<T> = UnionToIntersection<T extends unknown ? () => T : never> extends () => infer R
  ? R
  : never;

export type StringKey<T> = keyof T & string;

export type ValueOf<T> = T[keyof T];

export type Entries<T> = NonEmptyArray<[keyof T, T[keyof T]]>;

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type Writable<T> = Mutable<T>;

export type PickByValue<T, V> = {
  [P in keyof T as T[P] extends V ? P : never]: T[P];
};

export type OmitByValue<T, V> = {
  [P in keyof T as T[P] extends V ? never : P]: T[P];
};

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? K : never;
}[keyof T];

export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? never : K;
}[keyof T];

export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

export type Constructor<T = unknown> = new (...args: unknown[]) => T;

export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T;

export type AnyFunction<T = unknown> = (...args: unknown[]) => T;

export type AnyAsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

export type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export type AsyncReturnType<T extends AnyAsyncFunction> = Awaited<ReturnType<T>>;

export type Nullable<T> = T | null;

export type Undefinable<T> = T | undefined;

export type Nullish<T> = T | null | undefined;

export type Falsy = '' | 0 | false | null | undefined;

export type Truthy<T> = T extends Falsy ? never : T;

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type BuiltIn = Primitive | ((...args: unknown[]) => unknown) | Date | Error | RegExp | Map<unknown, unknown> | Set<unknown> | WeakMap<object, unknown> | WeakSet<object>;

export type DeepWritable<T> = T extends BuiltIn
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepWritable<K>, DeepWritable<V>>
    : T extends Set<infer U>
      ? Set<DeepWritable<U>>
      : T extends ReadonlyArray<infer U>
        ? Array<DeepWritable<U>>
        : T extends object
          ? { -readonly [P in keyof T]: DeepWritable<T[P]> }
          : T;

export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
  ? true
  : false;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsAny<T> = 0 extends (1 & T) ? true : false;

export type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;

export type IsFunction<T> = T extends (...args: unknown[]) => unknown ? true : false;

export type IsObject<T> = T extends object ? (T extends (...args: unknown[]) => unknown ? false : true) : false;

export type IsArray<T> = T extends readonly unknown[] ? true : false;

export type IsTuple<T> = T extends readonly [unknown, ...unknown[]]
  ? true
  : T extends readonly []
    ? true
    : false;

export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

export type TupleLength<T extends readonly unknown[]> = T['length'];

export type Reverse<T extends readonly unknown[]> = T extends readonly [infer F, ...infer Rest]
  ? [...Reverse<Rest>, F]
  : [];

export type Flatten<T extends readonly unknown[]> = T extends readonly [infer F, ...infer Rest]
  ? F extends readonly unknown[]
    ? [...Flatten<F>, ...Flatten<Rest>]
    : [F, ...Flatten<Rest>]
  : [];

export type Unique<T extends readonly unknown[]> = T extends readonly [infer F, ...infer Rest]
  ? F extends Rest[number]
    ? Unique<Rest>
    : [F, ...Unique<Rest>]
  : [];

export type Replace<T extends string, S extends string, R extends string> = T extends `${infer Before}${S}${infer After}`
  ? `${Before}${R}${Replace<After, S, R>}`
  : T;

export type Split<S extends string, D extends string> = S extends `${infer Head}${D}${infer Tail}`
  ? [Head, ...Split<Tail, D>]
  : S extends ''
    ? []
    : [S];

export type Join<T extends readonly string[], D extends string> = T extends readonly [infer F extends string]
  ? F
  : T extends readonly [infer F extends string, ...infer Rest extends string[]]
    ? `${F}${D}${Join<Rest, D>}`
    : '';

export type TrimLeft<S extends string> = S extends ` ${infer Rest}` | `\n${infer Rest}` | `\t${infer Rest}`
  ? TrimLeft<Rest>
  : S;

export type TrimRight<S extends string> = S extends `${infer Rest} ` | `${infer Rest}\n` | `${infer Rest}\t`
  ? TrimRight<Rest>
  : S;

export type Trim<S extends string> = TrimLeft<TrimRight<S>>;

export type StringUppercase<S extends string> = S extends Uppercase<S> ? S : Uppercase<S>;

export type StringLowercase<S extends string> = S extends Lowercase<S> ? S : Lowercase<S>;

export type StringCapitalize<S extends string> = S extends `${infer F}${infer Rest}`
  ? `${Uppercase<F>}${Rest}`
  : S;

export type StringUncapitalize<S extends string> = S extends `${infer F}${infer Rest}`
  ? `${Lowercase<F>}${Rest}`
  : S;

export type KebabCase<S extends string> = S extends `${infer F}${infer Rest}`
  ? F extends Uppercase<F>
    ? `-${Lowercase<F>}${KebabCase<Rest>}`
    : `${F}${KebabCase<Rest>}`
  : S;

export type CamelCase<S extends string> = S extends `${infer F}-${infer Rest}`
  ? `${Lowercase<F>}${Capitalize<CamelCase<Rest>>}`
  : S extends `${infer F}${infer Rest}`
    ? `${Lowercase<F>}${CamelCase<Rest>}`
    : S;

export type SnakeCase<S extends string> = S extends `${infer F}${infer Rest}`
  ? F extends Uppercase<F>
    ? `_${Lowercase<F>}${SnakeCase<Rest>}`
    : `${F}${SnakeCase<Rest>}`
  : S;

export type PascalCase<S extends string> = Capitalize<CamelCase<S>>;

export type ConstantCase<S extends string> = Uppercase<SnakeCase<S>>;

export type DotCase<S extends string> = S extends `${infer F}${infer Rest}`
  ? F extends Uppercase<F>
    ? `.${Lowercase<F>}${DotCase<Rest>}`
    : `${F}${DotCase<Rest>}`
  : S;

export type Path<T, K extends string = ''> = T extends object
  ? {
      [P in keyof T]: P extends string
        ? T[P] extends object
          ? Path<T[P], `${K}${K extends '' ? '' : '.'}${P}`>
          : `${K}${K extends '' ? '' : '.'}${P}`
        : never;
    }[keyof T]
  : never;

export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type TypeGuard<T> = (value: unknown) => value is T;

export type AssertionFunction<T> = (value: unknown) => asserts value is T;

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (isObject(value) && isFunction((value as Record<string, unknown>).then));
}

export function isIterable<T = unknown>(value: unknown): value is Iterable<T> {
  return isObject(value) && Symbol.iterator in value;
}

export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T> {
  return isObject(value) && Symbol.asyncIterator in value;
}

export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

export function hasMethod<K extends string>(
  value: unknown,
  key: K
): value is Record<K, (...args: unknown[]) => unknown> {
  return hasProperty(value, key) && isFunction(value[key]);
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

export function exhaustive(_: never): void {}

export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

export function typedFromEntries<K extends string, V>(entries: [K, V][]): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
