---
name: list-skills
description: List all available skills in the registry. Use when users want to know what skills are available, need help finding a skill, or want to explore capabilities.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: meta
  tags: introspection meta skills list
---

# List Skills

Introspection skill that lists all available skills in the agent's registry. Helps users discover capabilities.

## When to Use

- User asks "what can you do?"
- User wants to see available skills
- Exploring agent capabilities
- Finding the right skill for a task
- Debugging skill registration

## Parameters

- `category` (string, optional): Filter skills by category
  - If not provided, lists all skills
  - Common categories: utility, meta, document-processing, data-analysis

## Examples

### List All Skills

```yaml
skill: list-skills
parameters: {}
```

**Output:**

```json
[
  {
    "name": "echo",
    "description": "Echo back the input message",
    "category": "utility",
    "tags": ["debug", "test"]
  },
  {
    "name": "math",
    "description": "Perform mathematical calculations",
    "category": "utility",
    "tags": ["math", "calculation"]
  }
]
```

### Filter by Category

```yaml
skill: list-skills
parameters:
  category: 'utility'
```

**Output:**

```json
[
  {
    "name": "echo",
    "description": "Echo back the input message",
    "category": "utility",
    "tags": ["debug", "test"]
  },
  {
    "name": "math",
    "description": "Perform mathematical calculations",
    "category": "utility",
    "tags": ["math", "calculation"]
  }
]
```

## Response Format

Returns an array of skill objects:

```typescript
interface SkillInfo {
  name: string; // Skill identifier
  description: string; // Human-readable description
  category?: string; // Skill category
  tags?: string[]; // Associated tags
}
```

## Notes

- Returns only registered skills
- Skills must be loaded before they appear in the list
- Does not include skill implementation details
- Safe to call - read-only operation
