---
name: echo
description: Echo back the input message. Use for debugging, testing, or verifying message passing in the agent system.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: utility
  tags: debug test utility
---

# Echo Skill

A simple utility skill that echoes back the input message. Useful for debugging and testing the agent system.

## When to Use

- Testing message passing between components
- Debugging parameter extraction
- Verifying skill registration and execution
- Simple ping/pong functionality

## Parameters

- `message` (string, required): The message to echo back

## Examples

### Basic Usage

```yaml
skill: echo
parameters:
  message: 'Hello, World!'
```

**Output:**

```
Hello, World!
```

### Debugging

```yaml
skill: echo
parameters:
  message: 'Testing parameter extraction'
```

## Notes

- This skill is idempotent (safe to call multiple times)
- No side effects
- Fast execution (< 1ms)
- Always returns success unless parameters are invalid
