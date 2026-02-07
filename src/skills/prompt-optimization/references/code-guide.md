# Code Prompt Optimization Guide

## Principles

Good code prompts should specify:
1. **Language** - What programming language
2. **Task** - What to implement
3. **Requirements** - Constraints and features
4. **Style** - Code conventions to follow
5. **Output** - What to return/include

## Template

```
Write [language] code to [task].

Requirements:
- [requirement 1]
- [requirement 2]

Style:
- [style guideline]

Include:
- Error handling
- Input validation
- Comments explaining logic
- Example usage
```

## Examples

**Before:**
```
write a function to sort numbers
```

**After:**
```
Write a TypeScript function to sort an array of numbers in ascending order.

Requirements:
- Use the quicksort algorithm
- Handle empty arrays
- Don't modify the original array

Style:
- Use descriptive variable names
- Add JSDoc comments

Include:
- Error handling for invalid inputs
- Type definitions
- Example usage with test cases
```

## Common Additions

**Always consider adding:**
- Error handling requirements
- Input validation
- Type definitions / interfaces
- Time/space complexity constraints
- Edge cases to handle
- Testing requirements

**Style guides to reference:**
- Clean Code principles
- SOLID principles
- Language-specific conventions (PEP 8, Airbnb, etc.)
