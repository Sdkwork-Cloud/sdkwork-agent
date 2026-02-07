---
name: math
description: Perform mathematical calculations safely. Use when users ask for calculations, math problems, or numeric operations.
author: sdkwork-browser-agent
version: '2.0.0'
category: utility
tags: ['math', 'calculation', 'arithmetic', 'utility']
license: MIT
compatibility: Safe evaluation - only basic math operations allowed
parameters:
  type: object
  properties:
    expression:
      type: string
      description: Mathematical expression to evaluate
    precision:
      type: number
      description: Decimal precision for result
      default: 2
  required: [expression]
lifecycle:
  lazyLoad: true
  cacheable: true
  timeout: 5000
  retries: 0
---

# Math Skill

Performs mathematical calculations with safe evaluation. Only basic arithmetic operations are allowed for security.

## When to Use

- User asks for calculations ("what is 2+2?")
- Mathematical expressions need evaluation
- Quick arithmetic operations
- Converting units or percentages

## Parameters

### expression (required)
Mathematical expression to evaluate.

- **Type**: `string`
- **Allowed operators**: `+`, `-`, `*`, `/`, `()`, `.`
- **Allowed characters**: digits 0-9, whitespace
- **Security**: All other characters are stripped for safety
- **Max length**: 1000 characters

### precision (optional)
Decimal precision for the result.

- **Type**: `number`
- **Default**: 2
- **Range**: 0-10

## Examples

### Basic Arithmetic

```yaml
skill: math
parameters:
  expression: '2 + 2'
```

**Output:**

```
4
```

### Complex Expression

```yaml
skill: math
parameters:
  expression: '(10 + 5) * 2 / 3'
  precision: 2
```

**Output:**

```
10.00
```

### Decimal Operations

```yaml
skill: math
parameters:
  expression: '3.14159 * 2'
  precision: 4
```

**Output:**

```
6.2832
```

## Security Notes

- **Input Sanitization**: All non-math characters are removed
- **No Code Execution**: Only basic arithmetic is supported
- **Safe Evaluation**: Uses controlled evaluation environment
- **No External Calls**: No network or file system access

## Error Handling

Returns error for:

- Invalid expressions
- Division by zero
- Malformed numeric values
- Expressions exceeding max length

## Implementation

This skill uses a safe evaluation approach:

1. Input sanitization - removes dangerous characters
2. Tokenization - parses the expression
3. Safe evaluation - computes result in isolated context
4. Result formatting - applies precision settings

## Changelog

### v2.0.0
- Migrated to Knowledge-First architecture
- Added precision parameter
- Improved error handling

### v1.0.0
- Initial release
- Basic arithmetic support
