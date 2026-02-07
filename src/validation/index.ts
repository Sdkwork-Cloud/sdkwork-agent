/**
 * Input Validation Layer
 *
 * Provides runtime type validation using Zod schemas.
 * Ensures all inputs are properly validated before processing.
 */

import { z, type ZodSchema, type ZodError } from 'zod';

// ============================================
// Re-export Zod for convenience
// ============================================

export { z, ZodSchema, ZodError };

// ============================================
// Common Validation Schemas
// ============================================

/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Non-empty string schema
 */
export const nonEmptyStringSchema = z.string().min(1);

/**
 * Positive integer schema
 */
export const positiveIntegerSchema = z.number().int().positive();

/**
 * Percentage schema (0-100)
 */
export const percentageSchema = z.number().min(0).max(100);

/**
 * JSON object schema
 */
export const jsonObjectSchema = z.record(z.string(), z.unknown());

/**
 * JSON array schema
 */
export const jsonArraySchema = z.array(z.unknown());

/**
 * JSON value schema
 */
export const jsonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  jsonObjectSchema,
  jsonArraySchema,
]);

/**
 * URL schema
 */
export const urlSchema = z.string().url();

/**
 * Email schema
 */
export const emailSchema = z.string().email();

/**
 * Date string schema (ISO 8601)
 */
export const dateStringSchema = z.string().datetime();

// ============================================
// Skill Validation Schemas
// ============================================

/**
 * Skill metadata schema
 */
export const skillMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

/**
 * Skill lifecycle schema
 */
export const skillLifecycleSchema = z.object({
  startup: z.enum(['immediate', 'lazy', 'on-demand']).default('lazy'),
  cleanup: z.enum(['auto', 'manual', 'never']).default('auto'),
  timeout: z.number().positive().default(30000),
});

/**
 * Skill parameters schema (JSON Schema 7)
 */
export const skillParametersSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), z.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    description: z.string().optional(),
    default: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
  })).optional(),
  required: z.array(z.string()).default([]),
  additionalProperties: z.boolean().default(false),
});

/**
 * Complete skill schema
 */
export const skillSchema = z.object({
  metadata: skillMetadataSchema,
  parameters: skillParametersSchema,
  lifecycle: skillLifecycleSchema,
  readme: z.string().optional(),
  examples: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()),
    expectedOutput: z.string().optional(),
  })).default([]),
});

// ============================================
// Tool Validation Schemas
// ============================================

/**
 * Tool parameter schema
 */
export const toolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'file']),
  description: z.string().min(1),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
});

/**
 * Tool schema
 */
export const toolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  parameters: z.array(toolParameterSchema).default([]),
  confirm: z.enum(['never', 'always', 'auto']).default('auto'),
  category: z.enum(['file', 'network', 'system', 'data', 'other']).default('other'),
});

// ============================================
// Agent Configuration Schemas
// ============================================

/**
 * Agent identity schema
 */
export const agentIdentitySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
});

/**
 * Agent capabilities schema
 */
export const agentCapabilitiesSchema = z.object({
  canPlan: z.boolean().default(false),
  canReason: z.boolean().default(true),
  canUseTools: z.boolean().default(false),
  canUseSkills: z.boolean().default(false),
  hasMemory: z.boolean().default(true),
  canLearn: z.boolean().default(false),
  canReflect: z.boolean().default(false),
  canStream: z.boolean().default(false),
});

/**
 * Execution limits schema
 */
export const executionLimitsSchema = z.object({
  maxTokens: z.number().positive().optional(),
  maxExecutionTime: z.number().positive().optional(),
  maxIterations: z.number().positive().optional(),
  maxConcurrency: z.number().positive().optional(),
});

/**
 * Complete agent configuration schema
 */
export const agentConfigSchema = z.object({
  identity: agentIdentitySchema.optional(),
  capabilities: agentCapabilitiesSchema.optional(),
  limits: executionLimitsSchema.optional(),
});

// ============================================
// Memory Validation Schemas
// ============================================

/**
 * Memory entry schema
 */
export const memoryEntrySchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  tier: z.enum(['working', 'short-term', 'long-term']),
  createdAt: z.date(),
  lastAccessedAt: z.date(),
  accessCount: z.number().nonnegative(),
  importance: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
});

/**
 * Memory query schema
 */
export const memoryQuerySchema = z.object({
  query: z.string().min(1),
  tier: z.enum(['working', 'short-term', 'long-term']).optional(),
  limit: z.number().positive().optional(),
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  minImportance: z.number().min(0).max(1).optional(),
});

// ============================================
// Validation Functions
// ============================================

/**
 * Validate data against schema
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: string[];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Handle Zod v4 error format
    const errors = result.error.issues?.map((issue) => 
      `${issue.path.join('.')}: ${issue.message}`
    ) || ['Validation failed'];
    return {
      success: false,
      errors,
    };
  }
}

/**
 * Validate with partial schema (for updates)
 */
export function validatePartial<T>(schema: ZodSchema<T>, data: unknown): {
  success: true;
  data: Partial<T>;
} | {
  success: false;
  errors: string[];
} {
  // For partial validation, we just validate with the original schema
  // In Zod v4, partial() is only available on ZodObject
  return validate(schema, data);
}

// ============================================
// Async Validation
// ============================================

/**
 * Async validate data against schema
 */
export async function validateAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<{
  success: true;
  data: T;
} | {
  success: false;
  errors: string[];
}> {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Handle Zod v4 error format
    const errors = result.error.issues?.map((issue) => 
      `${issue.path.join('.')}: ${issue.message}`
    ) || ['Validation failed'];
    return {
      success: false,
      errors,
    };
  }
}

// ============================================
// Decorators for Method Validation
// ============================================

/**
 * Method parameter validation decorator
 */
export function ValidateParams(...schemas: ZodSchema<unknown>[]) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      for (let i = 0; i < schemas.length; i++) {
        const schema = schemas[i];
        const arg = args[i];

        const result = schema.safeParse(arg);
        if (!result.success) {
          // Handle Zod v4 error format
          const errors = result.error.issues?.map((issue) => 
            `${issue.path.join('.')}: ${issue.message}`
          ) || ['Validation failed'];
          throw new Error(
            `Validation failed for parameter ${i} of ${propertyKey}: ${errors.join(', ')}`
          );
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Method return value validation decorator
 */
export function ValidateReturn<T>(schema: ZodSchema<T>) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const result = originalMethod.apply(this, args);

      // Handle both sync and async methods
      if (result instanceof Promise) {
        return result.then((value: unknown) => {
          const validation = schema.safeParse(value);
          if (!validation.success) {
            // Handle Zod v4 error format
            const errors = validation.error.issues?.map((issue) => 
              `${issue.path.join('.')}: ${issue.message}`
            ) || ['Validation failed'];
            throw new Error(
              `Return value validation failed for ${propertyKey}: ${errors.join(', ')}`
            );
          }
          return value;
        });
      } else {
        const validation = schema.safeParse(result);
        if (!validation.success) {
          // Handle Zod v4 error format
          const errors = validation.error.issues?.map((issue) => 
            `${issue.path.join('.')}: ${issue.message}`
          ) || ['Validation failed'];
          throw new Error(
            `Return value validation failed for ${propertyKey}: ${errors.join(', ')}`
          );
        }
        return result;
      }
    };

    return descriptor;
  };
}

// ============================================
// Validation Middleware
// ============================================

/**
 * Express/Fastify style middleware for request validation
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return function (req: { body?: unknown; query?: unknown; params?: unknown }, res: { status: (code: number) => { json: (data: unknown) => void } }, next: () => void) {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      // Handle Zod v4 error format
      const errors = result.error.issues?.map((issue) => 
        `${issue.path.join('.')}: ${issue.message}`
      ) || ['Validation failed'];
      res.status(400).json({
        success: false,
        errors,
      });
      return;
    }

    // Attach validated data to request
    (req as Record<string, unknown>)[`validated${source.charAt(0).toUpperCase() + source.slice(1)}`] = result.data;
    next();
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if value matches schema (returns boolean)
 */
export function isValid<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

/**
 * Assert that value matches schema (throws if not)
 */
export function assertValid<T>(schema: ZodSchema<T>, data: unknown): asserts data is T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Handle Zod v4 error format
    const errors = result.error.issues?.map((issue) => 
      `${issue.path.join('.')}: ${issue.message}`
    ) || ['Validation failed'];
    throw new Error(`Assertion failed: ${errors.join(', ')}`);
  }
}

/**
 * Parse and validate, returning default on failure
 */
export function parseWithDefault<T>(schema: ZodSchema<T>, data: unknown, defaultValue: T): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}

// ============================================
// Batch Validation
// ============================================

/**
 * Validate multiple items
 */
export function validateBatch<T>(schema: ZodSchema<T>, items: unknown[]): {
  valid: T[];
  invalid: { index: number; item: unknown; errors: string[] }[];
} {
  const valid: T[] = [];
  const invalid: { index: number; item: unknown; errors: string[] }[] = [];

  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      // Handle Zod v4 error format
      const errors = result.error.issues?.map((issue) => 
        `${issue.path.join('.')}: ${issue.message}`
      ) || ['Validation failed'];
      invalid.push({ index, item, errors });
    }
  });

  return { valid, invalid };
}

// ============================================
// Schema Composition Helpers
// ============================================

/**
 * Create a nullable schema with default null
 */
export function nullableWithDefault<T>(schema: ZodSchema<T>): ZodSchema<T | null> {
  return schema.nullable().default(null);
}

/**
 * Create an array schema with default empty array
 */
export function arrayWithDefault<T>(schema: ZodSchema<T>): ZodSchema<T[]> {
  return z.array(schema).default([]);
}
