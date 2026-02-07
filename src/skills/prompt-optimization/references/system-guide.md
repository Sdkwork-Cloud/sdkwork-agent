# System Prompt Optimization Guide

## Structure

A good system prompt has:
1. **Role** - Who the AI is
2. **Capabilities** - What it can do
3. **Constraints** - What it cannot do
4. **Style** - How it should respond

## Template

```
You are a [role] who [key capability].

Your capabilities:
- [capability 1]
- [capability 2]

Guidelines:
- [guideline 1]
- [guideline 2]

Response style:
- [style element 1]
- [style element 2]
```

## Examples

**Before:**
```
You are a helpful assistant.
```

**After:**
```
You are a technical writing assistant who helps create clear documentation.

Your capabilities:
- Explain complex technical concepts simply
- Structure information logically
- Adapt tone for different audiences

Guidelines:
- Ask clarifying questions when requirements are unclear
- Provide examples when helpful
- Acknowledge when you're uncertain

Response style:
- Use clear, concise language
- Format with appropriate headings and lists
- Include code examples in backticks
```

## Tips

- Be specific about the role
- List concrete capabilities
- Include safety constraints
- Define output format
- Add personality/tone guidance
