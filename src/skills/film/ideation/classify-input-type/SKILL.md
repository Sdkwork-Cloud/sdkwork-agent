---
name: classify-input-type
description: Classify user input into predefined categories to determine appropriate processing pipeline. Use to route inputs to correct skill workflows.
license: Apache-2.0
compatibility: Works with any text input
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: ideation
  tags: classify categorize route workflow type
---

# Classify Input Type

## Purpose

Categorize user input to determine the appropriate processing pipeline and skill sequence.

## When to Use

- Initial input processing
- Determining workflow routing
- Identifying user intent category
- Selecting appropriate skill chain

## Inputs

- `input` (string, required): User input text
- `availableTypes` (array, optional): List of types to classify against

## Outputs

```json
{
  "classification": {
    "primaryType": "script_request",
    "confidence": 0.94,
    "secondaryTypes": ["story_idea", "creative_brief"]
  },
  "recommendedPipeline": ["parse-user-intent", "extract-genre-and-theme", "generate-full-script"],
  "priority": "high"
}
```

## Input Types

| Type                | Description             | Example                      |
| ------------------- | ----------------------- | ---------------------------- |
| `raw_idea`          | Vague creative concept  | "A story about love"         |
| `script_request`    | Request for full script | "Write me a 3-minute script" |
| `revision_request`  | Modify existing content | "Make it more emotional"     |
| `technical_request` | Production-focused      | "Generate storyboards"       |
| `query`             | Information seeking     | "What genres work best?"     |
| `feedback`          | Response to output      | "I don't like the ending"    |

## Instructions

1. Analyze input structure and content
2. Match against known type patterns
3. Calculate confidence scores
4. Determine primary and secondary types
5. Recommend appropriate skill pipeline
6. Assign priority level

## Examples

### Example 1: Raw Idea

**Input:** "I have an idea about a couple who meet at a coffee shop"

**Classification:**

```json
{
  "classification": {
    "primaryType": "raw_idea",
    "confidence": 0.91
  },
  "recommendedPipeline": ["parse-user-intent", "expand-story-idea", "extract-genre-and-theme"]
}
```

### Example 2: Script Request

**Input:** "Create a 5-minute romantic comedy script with 2 characters"

**Classification:**

```json
{
  "classification": {
    "primaryType": "script_request",
    "confidence": 0.96
  },
  "recommendedPipeline": ["parse-user-intent", "generate-full-script"],
  "priority": "high"
}
```
