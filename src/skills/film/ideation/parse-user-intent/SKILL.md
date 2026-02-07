---
name: parse-user-intent
description: Parse and understand user input to extract creative intent, requirements, and constraints for short drama production. Use when receiving initial user requests or ideas.
license: Apache-2.0
compatibility: Requires natural language understanding capabilities
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: ideation
  tags: parse intent understand input requirements
---

# Parse User Intent

## Purpose

Analyze user input to extract structured creative intent, requirements, and constraints for short drama production.

## When to Use

- Receiving initial user requests or story ideas
- Understanding vague or incomplete descriptions
- Extracting requirements from natural language input
- Identifying genre, theme, and target audience preferences

## Inputs

- `userInput` (string, required): Raw user input text describing their idea or requirements
- `context` (string, optional): Additional context about previous interactions or preferences

## Outputs

Returns structured intent object:

```json
{
  "intent": {
    "type": "creative_request",
    "confidence": 0.92
  },
  "extracted": {
    "genre": "romance",
    "theme": "second_chance_love",
    "targetAudience": "young_adults",
    "tone": "emotional",
    "duration": "3-5_minutes",
    "keyElements": ["reunion", "misunderstanding", "resolution"]
  },
  "requirements": {
    "mustHave": ["happy_ending", "dialogue_heavy"],
    "avoid": ["violence", "explicit_content"],
    "preferences": ["modern_setting", "urban_environment"]
  },
  "constraints": {
    "budget": "low",
    "actors": 2,
    "locations": ["cafe", "park"]
  }
}
```

## Instructions

1. Analyze the user input for key creative elements
2. Identify genre indicators (romance, thriller, comedy, etc.)
3. Extract emotional tone and atmosphere preferences
4. Determine target audience from language and content
5. Identify any explicit constraints (budget, actors, locations)
6. Parse implicit requirements from context and phrasing
7. Return structured data with confidence scores

## Examples

### Example 1: Romance Story

**Input:**

```
"I want a short story about two people who meet again after 10 years.
It should be emotional but end happily. Maybe 3-4 minutes long."
```

**Output:**

```json
{
  "intent": {
    "type": "creative_request",
    "confidence": 0.95
  },
  "extracted": {
    "genre": "romance",
    "theme": "reunion",
    "tone": "emotional",
    "duration": "3-4_minutes"
  },
  "requirements": {
    "mustHave": ["happy_ending"],
    "keyElements": ["time_gap", "reunion"]
  }
}
```

### Example 2: Thriller Concept

**Input:**

```
"Create a suspenseful short about someone discovering a secret in their
new apartment. Dark atmosphere, unexpected twist at the end."
```

**Output:**

```json
{
  "intent": {
    "type": "creative_request",
    "confidence": 0.88
  },
  "extracted": {
    "genre": "thriller",
    "theme": "mystery_discovery",
    "tone": "suspenseful_dark",
    "keyElements": ["secret", "twist_ending"]
  }
}
```

## Error Handling

- Returns `confidence: 0` if input is too vague
- Returns `error` field if input is incomprehensible
- Provides `suggestions` for missing required information
