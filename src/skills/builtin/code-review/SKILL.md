---
name: code-review
description: Review code for bugs, security issues, performance problems, and best practices. Provides detailed feedback with severity levels and actionable suggestions.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: code
  tags: code review analysis security performance
---

# Code Review Skill

Analyzes code for potential issues and provides comprehensive review feedback.

## When to Use

- Before submitting code to version control
- When learning best practices
- For security vulnerability detection
- To improve code quality and performance

## Parameters

- `code` (string, required): The code to review
- `language` (string, optional): Programming language (default: auto-detect)
- `focus` (string, optional): Focus area - security, performance, style, bugs, or all

## Output Format

Returns a structured JSON review with:

- **severity**: critical | warning | info
- **category**: security | performance | style | bug | best-practice
- **line**: Line number (if applicable)
- **message**: Issue description
- **suggestion**: How to fix

## Examples

### Basic Usage

```yaml
skill: code-review
parameters:
  code: |
    function add(a, b) {
      return a + b;
    }
  language: javascript
```

**Output:**

```json
{
  "summary": {
    "total": 2,
    "critical": 0,
    "warning": 1,
    "info": 1
  },
  "issues": [
    {
      "severity": "warning",
      "category": "best-practice",
      "message": "Missing JSDoc documentation",
      "suggestion": "Add JSDoc comments to document the function"
    },
    {
      "severity": "info",
      "category": "style",
      "message": "Consider using arrow function syntax",
      "suggestion": "Use const add = (a, b) => a + b;"
    }
  ]
}
```

### Security Focus

```yaml
skill: code-review
parameters:
  code: |
    eval(userInput);
  language: javascript
  focus: security
```

**Output:**

```json
{
  "summary": {
    "total": 1,
    "critical": 1,
    "warning": 0,
    "info": 0
  },
  "issues": [
    {
      "severity": "critical",
      "category": "security",
      "message": "Dangerous use of eval()",
      "suggestion": "Avoid eval(). Use safer alternatives like JSON.parse() for JSON data.",
      "cwe": "CWE-95"
    }
  ]
}
```

## Notes

- Supports: JavaScript, TypeScript, Python, Java, Go, Rust, C++, and more
- Auto-detects language if not specified
- Prioritizes security issues above all other categories
- Provides CWE references for security issues
