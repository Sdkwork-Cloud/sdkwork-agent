/**
 * Data Validation System - 统一数据验证系统
 *
 * 提供全面的数据验证能力
 * - 类型验证
 * - 自定义验证规则
 * - 验证链式调用
 * - 错误消息国际化
 *
 * @module Framework/Validation
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type ValidationErrorType =
  | 'required'
  | 'type'
  | 'format'
  | 'range'
  | 'length'
  | 'pattern'
  | 'custom'
  | 'enum';

export interface ValidationError {
  path: string;
  type: ValidationErrorType;
  message: string;
  value?: unknown;
  constraint?: Record<string, unknown>;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  errors: ValidationError[];
}

export interface ValidationRule<T = unknown> {
  validate(value: unknown, context?: ValidationContext): boolean | Promise<boolean>;
  message?: string | ((value: unknown, context?: ValidationContext) => string);
  type?: ValidationErrorType;
}

export interface ValidationContext {
  path: string;
  parent?: unknown;
  root?: unknown;
  options?: ValidationOptions;
}

export interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  convert?: boolean;
  context?: Record<string, unknown>;
}

export interface ValidatorConfig {
  name?: string;
  logger?: ILogger;
}

export abstract class BaseValidator<T = unknown> {
  protected rules: ValidationRule[] = [];
  protected _optional = false;
  protected _default?: T | (() => T);
  protected _transform?: (value: unknown) => T;
  protected customMessages: Map<ValidationErrorType, string> = new Map();

  abstract validate(value: unknown, options?: ValidationOptions): ValidationResult<T>;

  optional(): this {
    this._optional = true;
    return this;
  }

  required(message?: string): this {
    this._optional = false;
    if (message) {
      this.customMessages.set('required', message);
    }
    return this;
  }

  default(value: T | (() => T)): this {
    this._default = value;
    return this;
  }

  transform(fn: (value: unknown) => T): this {
    this._transform = fn;
    return this;
  }

  custom(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  protected addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  protected getMessage(type: ValidationErrorType, value: unknown, context?: ValidationContext): string {
    if (this.customMessages.has(type)) {
      return this.customMessages.get(type)!;
    }

    const defaultMessages: Record<ValidationErrorType, string> = {
      required: 'Value is required',
      type: 'Invalid type',
      format: 'Invalid format',
      range: 'Value out of range',
      length: 'Invalid length',
      pattern: 'Value does not match pattern',
      custom: 'Validation failed',
      enum: 'Value must be one of allowed values',
    };

    return defaultMessages[type];
  }

  protected createError(
    type: ValidationErrorType,
    value: unknown,
    context?: ValidationContext,
    constraint?: Record<string, unknown>
  ): ValidationError {
    return {
      path: context?.path ?? '',
      type,
      message: this.getMessage(type, value, context),
      value,
      constraint,
    };
  }

  protected applyTransform(value: unknown): T {
    if (this._transform) {
      return this._transform(value);
    }
    return value as T;
  }

  protected getDefaultValue(): T | undefined {
    if (this._default === undefined) return undefined;
    return typeof this._default === 'function' ? (this._default as () => T)() : this._default;
  }
}

export class StringValidator extends BaseValidator<string> {
  private minLength?: number;
  private maxLength?: number;
  private pattern?: RegExp;
  private enumValues?: string[];
  private email = false;
  private url = false;
  private uuid = false;

  validate(value: unknown, options?: ValidationOptions): ValidationResult<string> {
    const errors: ValidationError[] = [];
    const context: ValidationContext = { path: '', options };

    if (value === undefined || value === null) {
      if (this._optional) {
        return { valid: true, value: this.getDefaultValue(), errors: [] };
      }
      return { valid: false, errors: [this.createError('required', value, context)] };
    }

    if (typeof value !== 'string') {
      if (options?.convert) {
        value = String(value);
      } else {
        return { valid: false, errors: [this.createError('type', value, context, { expected: 'string' })] };
      }
    }

    let strValue = value as string;

    if (this.minLength !== undefined && strValue.length < this.minLength) {
      errors.push(this.createError('length', strValue, context, { min: this.minLength }));
    }

    if (this.maxLength !== undefined && strValue.length > this.maxLength) {
      errors.push(this.createError('length', strValue, context, { max: this.maxLength }));
    }

    if (this.pattern && !this.pattern.test(strValue)) {
      errors.push(this.createError('pattern', strValue, context, { pattern: this.pattern.source }));
    }

    if (this.enumValues && !this.enumValues.includes(strValue)) {
      errors.push(this.createError('enum', strValue, context, { allowed: this.enumValues }));
    }

    if (this.email && !this.isValidEmail(strValue)) {
      errors.push(this.createError('format', strValue, context, { format: 'email' }));
    }

    if (this.url && !this.isValidUrl(strValue)) {
      errors.push(this.createError('format', strValue, context, { format: 'url' }));
    }

    if (this.uuid && !this.isValidUuid(strValue)) {
      errors.push(this.createError('format', strValue, context, { format: 'uuid' }));
    }

    for (const rule of this.rules) {
      if (!rule.validate(strValue, context)) {
        errors.push(this.createError(rule.type ?? 'custom', strValue, context));
      }
    }

    const transformed = this.applyTransform(strValue);
    return { valid: errors.length === 0, value: transformed, errors };
  }

  min(length: number, message?: string): this {
    this.minLength = length;
    if (message) this.customMessages.set('length', message);
    return this;
  }

  max(length: number, message?: string): this {
    this.maxLength = length;
    if (message) this.customMessages.set('length', message);
    return this;
  }

  regex(pattern: RegExp, message?: string): this {
    this.pattern = pattern;
    if (message) this.customMessages.set('pattern', message);
    return this;
  }

  enum(...values: string[]): this {
    this.enumValues = values;
    return this;
  }

  isEmail(message?: string): this {
    this.email = true;
    if (message) this.customMessages.set('format', message);
    return this;
  }

  isUrl(message?: string): this {
    this.url = true;
    if (message) this.customMessages.set('format', message);
    return this;
  }

  isUuid(message?: string): this {
    this.uuid = true;
    if (message) this.customMessages.set('format', message);
    return this;
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}

export class NumberValidator extends BaseValidator<number> {
  private minVal?: number;
  private maxVal?: number;
  private integer = false;
  private positive = false;
  private negative = false;

  validate(value: unknown, options?: ValidationOptions): ValidationResult<number> {
    const errors: ValidationError[] = [];
    const context: ValidationContext = { path: '', options };

    if (value === undefined || value === null) {
      if (this._optional) {
        return { valid: true, value: this.getDefaultValue(), errors: [] };
      }
      return { valid: false, errors: [this.createError('required', value, context)] };
    }

    if (typeof value !== 'number' || isNaN(value)) {
      if (options?.convert) {
        const converted = Number(value);
        if (isNaN(converted)) {
          return { valid: false, errors: [this.createError('type', value, context, { expected: 'number' })] };
        }
        value = converted;
      } else {
        return { valid: false, errors: [this.createError('type', value, context, { expected: 'number' })] };
      }
    }

    let numValue = value as number;

    if (this.minVal !== undefined && numValue < this.minVal) {
      errors.push(this.createError('range', numValue, context, { min: this.minVal }));
    }

    if (this.maxVal !== undefined && numValue > this.maxVal) {
      errors.push(this.createError('range', numValue, context, { max: this.maxVal }));
    }

    if (this.integer && !Number.isInteger(numValue)) {
      errors.push(this.createError('format', numValue, context, { format: 'integer' }));
    }

    if (this.positive && numValue <= 0) {
      errors.push(this.createError('range', numValue, context, { constraint: 'positive' }));
    }

    if (this.negative && numValue >= 0) {
      errors.push(this.createError('range', numValue, context, { constraint: 'negative' }));
    }

    for (const rule of this.rules) {
      if (!rule.validate(numValue, context)) {
        errors.push(this.createError(rule.type ?? 'custom', numValue, context));
      }
    }

    const transformed = this.applyTransform(numValue);
    return { valid: errors.length === 0, value: transformed, errors };
  }

  min(value: number, message?: string): this {
    this.minVal = value;
    if (message) this.customMessages.set('range', message);
    return this;
  }

  max(value: number, message?: string): this {
    this.maxVal = value;
    if (message) this.customMessages.set('range', message);
    return this;
  }

  isInteger(message?: string): this {
    this.integer = true;
    if (message) this.customMessages.set('format', message);
    return this;
  }

  isPositive(message?: string): this {
    this.positive = true;
    if (message) this.customMessages.set('range', message);
    return this;
  }

  isNegative(message?: string): this {
    this.negative = true;
    if (message) this.customMessages.set('range', message);
    return this;
  }
}

export class BooleanValidator extends BaseValidator<boolean> {
  validate(value: unknown, options?: ValidationOptions): ValidationResult<boolean> {
    const errors: ValidationError[] = [];
    const context: ValidationContext = { path: '', options };

    if (value === undefined || value === null) {
      if (this._optional) {
        return { valid: true, value: this.getDefaultValue(), errors: [] };
      }
      return { valid: false, errors: [this.createError('required', value, context)] };
    }

    if (typeof value !== 'boolean') {
      if (options?.convert) {
        if (value === 'true' || value === 1 || value === '1') {
          value = true;
        } else if (value === 'false' || value === 0 || value === '0') {
          value = false;
        } else {
          return { valid: false, errors: [this.createError('type', value, context, { expected: 'boolean' })] };
        }
      } else {
        return { valid: false, errors: [this.createError('type', value, context, { expected: 'boolean' })] };
      }
    }

    const transformed = this.applyTransform(value as boolean);
    return { valid: true, value: transformed, errors: [] };
  }
}

export class ArrayValidator<T = unknown> extends BaseValidator<T[]> {
  private itemValidator?: BaseValidator<T>;
  private minItems?: number;
  private maxItems?: number;
  private unique = false;

  validate(value: unknown, options?: ValidationOptions): ValidationResult<T[]> {
    const errors: ValidationError[] = [];
    const context: ValidationContext = { path: '', options };

    if (value === undefined || value === null) {
      if (this._optional) {
        return { valid: true, value: this.getDefaultValue(), errors: [] };
      }
      return { valid: false, errors: [this.createError('required', value, context)] };
    }

    if (!Array.isArray(value)) {
      return { valid: false, errors: [this.createError('type', value, context, { expected: 'array' })] };
    }

    let arrValue = value as T[];

    if (this.minItems !== undefined && arrValue.length < this.minItems) {
      errors.push(this.createError('length', arrValue, context, { min: this.minItems }));
    }

    if (this.maxItems !== undefined && arrValue.length > this.maxItems) {
      errors.push(this.createError('length', arrValue, context, { max: this.maxItems }));
    }

    if (this.unique && new Set(arrValue).size !== arrValue.length) {
      errors.push(this.createError('custom', arrValue, context, { constraint: 'unique' }));
    }

    if (this.itemValidator) {
      for (let i = 0; i < arrValue.length; i++) {
        const itemContext: ValidationContext = { ...context, path: `${context.path}[${i}]`, parent: arrValue };
        const itemResult = this.itemValidator.validate(arrValue[i], options);
        if (!itemResult.valid) {
          for (const error of itemResult.errors) {
            errors.push({ ...error, path: `${context.path}[${i}].${error.path}` });
          }
        }
      }
    }

    const transformed = this.applyTransform(arrValue);
    return { valid: errors.length === 0, value: transformed, errors };
  }

  items(validator: BaseValidator<T>): this {
    this.itemValidator = validator;
    return this;
  }

  min(length: number, message?: string): this {
    this.minItems = length;
    if (message) this.customMessages.set('length', message);
    return this;
  }

  max(length: number, message?: string): this {
    this.maxItems = length;
    if (message) this.customMessages.set('length', message);
    return this;
  }

  isUnique(message?: string): this {
    this.unique = true;
    if (message) this.customMessages.set('custom', message);
    return this;
  }
}

export class ObjectValidator<T extends Record<string, unknown> = Record<string, unknown>> extends BaseValidator<T> {
  private schema: Map<string, BaseValidator> = new Map();
  private allowUnknown = false;
  private stripUnknown = false;

  validate(value: unknown, options?: ValidationOptions): ValidationResult<T> {
    const errors: ValidationError[] = [];
    const context: ValidationContext = { path: '', options };

    if (value === undefined || value === null) {
      if (this._optional) {
        return { valid: true, value: this.getDefaultValue(), errors: [] };
      }
      return { valid: false, errors: [this.createError('required', value, context)] };
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return { valid: false, errors: [this.createError('type', value, context, { expected: 'object' })] };
    }

    const objValue = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, validator] of this.schema) {
      const itemContext: ValidationContext = { ...context, path: `${context.path}.${key}`, parent: objValue };
      const itemResult = validator.validate(objValue[key], options);

      if (!itemResult.valid) {
        for (const error of itemResult.errors) {
          errors.push({ ...error, path: `${context.path}.${key}${error.path ? '.' + error.path : ''}` });
        }
      } else if (itemResult.value !== undefined) {
        result[key] = itemResult.value;
      }
    }

    const allowUnknown = options?.allowUnknown ?? this.allowUnknown;
    const stripUnknown = options?.stripUnknown ?? this.stripUnknown;

    if (!allowUnknown && !stripUnknown) {
      for (const key of Object.keys(objValue)) {
        if (!this.schema.has(key)) {
          errors.push(this.createError('custom', objValue[key], { ...context, path: `${context.path}.${key}` }, { constraint: 'unknown' }));
        }
      }
    } else if (!stripUnknown) {
      for (const key of Object.keys(objValue)) {
        if (!this.schema.has(key)) {
          result[key] = objValue[key];
        }
      }
    }

    const transformed = this.applyTransform(result as T);
    return { valid: errors.length === 0, value: transformed, errors };
  }

  property<K extends string, V>(key: K, validator: BaseValidator<V>): ObjectValidator<T & Record<K, V>> {
    this.schema.set(key, validator);
    return this as unknown as ObjectValidator<T & Record<K, V>>;
  }

  allowUnknownKeys(): this {
    this.allowUnknown = true;
    return this;
  }

  stripUnknownKeys(): this {
    this.stripUnknown = true;
    return this;
  }
}

export class ValidatorFactory {
  string(): StringValidator {
    return new StringValidator();
  }

  number(): NumberValidator {
    return new NumberValidator();
  }

  boolean(): BooleanValidator {
    return new BooleanValidator();
  }

  array<T>(itemValidator?: BaseValidator<T>): ArrayValidator<T> {
    const validator = new ArrayValidator<T>();
    if (itemValidator) {
      validator.items(itemValidator);
    }
    return validator;
  }

  object<T extends Record<string, unknown> = Record<string, unknown>>(): ObjectValidator<T> {
    return new ObjectValidator<T>();
  }

  any(): BaseValidator<unknown> {
    return new (class extends BaseValidator<unknown> {
      validate(value: unknown, options?: ValidationOptions): ValidationResult<unknown> {
        if (value === undefined || value === null) {
          if (this._optional) {
            return { valid: true, value: this.getDefaultValue(), errors: [] };
          }
          return { valid: false, errors: [this.createError('required', value, { path: '', options })] };
        }
        return { valid: true, value, errors: [] };
      }
    })();
  }
}

export const v = new ValidatorFactory();

export function validate<T>(value: unknown, validator: BaseValidator<T>, options?: ValidationOptions): ValidationResult<T> {
  return validator.validate(value, options);
}

export function assertValid<T>(value: unknown, validator: BaseValidator<T>, options?: ValidationOptions): T {
  const result = validator.validate(value, options);
  if (!result.valid) {
    const messages = result.errors.map(e => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${messages}`);
  }
  return result.value!;
}

export function isValid<T>(value: unknown, validator: BaseValidator<T>, options?: ValidationOptions): boolean {
  return validator.validate(value, options).valid;
}
