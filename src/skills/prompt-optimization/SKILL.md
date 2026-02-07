---
name: prompt-optimization
description: Optimize prompts for better results with LLMs and generative AI. Use when the user wants to improve a prompt, make it more effective, or adapt it for a specific purpose like image generation, coding, or creative writing.
license: MIT
metadata:
  author: SDKWork Team
  version: "2.0.0"
  category: cognition
---

# Prompt Optimization

This skill helps optimize prompts to get better results from AI models.

## When to use

- User asks to "optimize this prompt"
- User wants to "improve" or "make better" a prompt
- User has a basic idea and wants it refined for AI use
- Working with image/video generation prompts
- Creating system prompts or instructions

## How to use

1. Identify what the prompt is for (text, image, code, etc.)
2. Analyze the original prompt for issues
3. Apply appropriate optimizations
4. Return the improved prompt with explanation

## Optimization types

### Text prompts
- Add clarity and specificity
- Include context and examples
- Specify output format
- Add constraints

### Image prompts
- Add descriptive visual details
- Include style keywords
- Specify composition and lighting
- Add quality modifiers

### Code prompts
- Specify programming language
- Add requirements and constraints
- Include examples
- Request error handling

### System prompts
- Define clear role
- Add capabilities and constraints
- Include safety guidelines
- Specify output style

## Example

**Input:**
```
Write a story about a cat
```

**Output:**
```
Write an engaging short story (500-800 words) about a cat's adventure. 
Include vivid descriptions, character development, and a satisfying ending.
Target audience: children ages 8-12.
```

## Output format

Always return:
1. The optimized prompt
2. Brief explanation of changes made
3. Confidence score (0-1)
