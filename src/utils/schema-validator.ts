export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ValidationRule<T = unknown> {
  name: string;
  validate: (value: T) => boolean | string;
  message?: string;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: unknown[];
  fields?: Record<string, SchemaField>;
  custom?: (value: unknown) => boolean | string;
}

export type Schema = Record<string, SchemaField>;

export class SchemaValidator {
  validate(data: Record<string, unknown>, schema: Schema): ValidationResult {
    const errors: string[] = [];

    for (const [key, field] of Object.entries(schema)) {
      const value = data[key];
      const error = this.validateField(key, value, field);
      if (error) errors.push(error);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private validateField(key: string, value: unknown, field: SchemaField): string | null {
    if (value === undefined || value === null) {
      if (field.required) {
        return `${key} is required`;
      }
      return null;
    }

    const typeError = this.validateType(key, value, field);
    if (typeError) return typeError;

    if (field.type === 'string' && typeof value === 'string') {
      if (field.minLength !== undefined && value.length < field.minLength) {
        return `${key} must be at least ${field.minLength} characters`;
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return `${key} must be at most ${field.maxLength} characters`;
      }
      if (field.pattern && !field.pattern.test(value)) {
        return `${key} does not match required pattern`;
      }
    }

    if (field.type === 'number' && typeof value === 'number') {
      if (field.min !== undefined && value < field.min) {
        return `${key} must be at least ${field.min}`;
      }
      if (field.max !== undefined && value > field.max) {
        return `${key} must be at most ${field.max}`;
      }
    }

    if (field.enum && !field.enum.includes(value)) {
      return `${key} must be one of: ${field.enum.join(', ')}`;
    }

    if (field.custom) {
      const result = field.custom(value);
      if (result !== true) {
        return typeof result === 'string' ? result : `${key} is invalid`;
      }
    }

    return null;
  }

  private validateType(key: string, value: unknown, field: SchemaField): string | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (actualType !== field.type) {
      if (field.type === 'array' && !Array.isArray(value)) {
        return `${key} must be an array`;
      }
      if (field.type !== 'array' && actualType !== field.type) {
        return `${key} must be of type ${field.type}`;
      }
    }
    
    return null;
  }
}

export function string(options: Partial<SchemaField> = {}): SchemaField {
  return { type: 'string', ...options };
}

export function number(options: Partial<SchemaField> = {}): SchemaField {
  return { type: 'number', ...options };
}

export function boolean(options: Partial<SchemaField> = {}): SchemaField {
  return { type: 'boolean', ...options };
}

export function array(options: Partial<SchemaField> = {}): SchemaField {
  return { type: 'array', ...options };
}

export function object(fields: Record<string, SchemaField>, options: Partial<SchemaField> = {}): SchemaField {
  return { type: 'object', fields, ...options };
}

export const validators = {
  email: (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  uuid: (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  alphanumeric: (value: string): boolean => /^[a-zA-Z0-9]+$/.test(value),
  numeric: (value: string): boolean => /^[0-9]+$/.test(value),
  notEmpty: (value: string): boolean => value.trim().length > 0,
  minLength: (min: number) => (value: string) => value.length >= min,
  maxLength: (max: number) => (value: string) => value.length <= max,
  min: (min: number) => (value: number) => value >= min,
  max: (max: number) => (value: number) => value <= max,
  range: (min: number, max: number) => (value: number) => value >= min && value <= max,
  oneOf: <T>(...values: T[]) => (value: T) => values.includes(value),
};

export function createValidator(): SchemaValidator {
  return new SchemaValidator();
}
