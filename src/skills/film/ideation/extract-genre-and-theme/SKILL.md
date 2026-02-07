---
name: extract-genre-and-theme
description: Extract genre classification and thematic elements from user input or content. Use to identify the creative direction and style of short drama.
license: Apache-2.0
compatibility: Requires text analysis capabilities
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: ideation
  tags: genre theme style classification creative-direction
---

# Extract Genre and Theme

## Purpose

Identify and classify genre, sub-genre, and thematic elements from creative content or user descriptions.

## When to Use

- Analyzing story concepts
- Classifying existing scripts
- Understanding creative direction
- Matching content to genre conventions

## Inputs

- `content` (string, required): Text to analyze (user input, synopsis, or script excerpt)
- `suggestSubgenres` (boolean, optional): Whether to suggest specific sub-genres

## Outputs

```json
{
  "genre": {
    "primary": "romance",
    "confidence": 0.93,
    "secondary": ["drama", "comedy"]
  },
  "subGenre": "contemporary_romance",
  "themes": [
    {
      "name": "second_chance",
      "strength": 0.85,
      "description": "Characters reuniting after separation"
    },
    {
      "name": "misunderstanding",
      "strength": 0.72,
      "description": "Conflicts arising from miscommunication"
    }
  ],
  "style": {
    "tone": "heartwarming",
    "pacing": "moderate",
    "atmosphere": "realistic"
  },
  "conventions": ["meet_cute", "misunderstanding", "grand_gesture", "happy_ending"]
}
```

## Supported Genres

### Primary Genres

- `romance` - Love stories and relationships
- `thriller` - Suspense and tension
- `comedy` - Humor and entertainment
- `drama` - Emotional character studies
- `horror` - Fear and suspense
- `sci-fi` - Science fiction elements
- `fantasy` - Magical or supernatural
- `mystery` - Puzzle-solving narratives

### Sub-Genres

Each primary genre has multiple sub-genres for precise classification.

## Instructions

1. Analyze content for genre indicators
2. Identify thematic patterns and motifs
3. Determine emotional tone and style
4. Map to genre conventions and tropes
5. Calculate confidence scores
6. Suggest related genres if mixed elements detected

## Examples

### Example 1: Romance Drama

**Input:** "A story about two former lovers who meet at a funeral and must confront their past"

**Output:**

```json
{
  "genre": {
    "primary": "romance",
    "secondary": ["drama"]
  },
  "subGenre": "romantic_drama",
  "themes": [
    {
      "name": "unfinished_business",
      "strength": 0.88
    },
    {
      "name": "grief_and_healing",
      "strength": 0.75
    }
  ],
  "style": {
    "tone": "emotional_melancholic",
    "pacing": "slow_deliberate"
  }
}
```

### Example 2: Thriller

**Input:** "Someone keeps receiving mysterious packages with clues to a crime they didn't commit"

**Output:**

```json
{
  "genre": {
    "primary": "thriller",
    "confidence": 0.94
  },
  "subGenre": "psychological_thriller",
  "themes": [
    {
      "name": "false_accusation",
      "strength": 0.9
    },
    {
      "name": "paranoia",
      "strength": 0.82
    }
  ],
  "conventions": ["unreliable_narrator", "clues_and_red_herrings", "twist_ending"]
}
```
