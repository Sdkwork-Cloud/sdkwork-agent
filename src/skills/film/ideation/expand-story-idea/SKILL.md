---
name: expand-story-idea
description: Expand a brief concept or seed idea into a fully developed story outline with plot points, character arcs, and narrative structure. Use to develop initial ideas into production-ready concepts.
license: Apache-2.0
compatibility: Requires creative writing capabilities
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: ideation
  tags: expand develop outline story concept plot structure
---

# Expand Story Idea

## Purpose

Transform brief concepts, loglines, or seed ideas into comprehensive story outlines with full narrative structure.

## When to Use

- Developing initial concepts
- Fleshing out vague ideas
- Creating story outlines from prompts
- Preparing for script writing

## Inputs

- `idea` (string, required): Brief concept or seed idea
- `genre` (string, optional): Target genre for the story
- `duration` (string, optional): Target duration (e.g., "3-5 minutes")
- `complexity` (string, optional): Story complexity level (simple/moderate/complex)

## Outputs

```json
{
  "expandedConcept": {
    "title": "The Coffee Shop Reunion",
    "logline": "Two former lovers meet by chance at a coffee shop, forcing them to confront unresolved feelings and past misunderstandings.",
    "synopsis": "Full paragraph synopsis..."
  },
  "structure": {
    "acts": 3,
    "scenes": 5,
    "plotPoints": [
      {
        "act": 1,
        "scene": 1,
        "description": "Opening - Character A enters coffee shop",
        "emotionalBeat": "neutral_curious"
      },
      {
        "act": 1,
        "scene": 2,
        "description": "Inciting Incident - Recognizes Character B",
        "emotionalBeat": "surprise_nostalgia"
      }
    ]
  },
  "characters": [
    {
      "name": "Alex",
      "role": "protagonist",
      "arc": "from_avoidance_to_confrontation",
      "traits": ["reserved", "successful", "emotionally_guarded"]
    },
    {
      "name": "Jordan",
      "role": "deuteragonist",
      "arc": "from_anger_to_understanding",
      "traits": ["passionate", "artistic", "direct"]
    }
  ],
  "themes": ["second_chances", "communication", "letting_go"],
  "emotionalArc": {
    "beginning": "neutral",
    "middle": "tension_emotional",
    "end": "resolution_hopeful"
  },
  "keyMoments": [
    "The awkward first exchange",
    "Revelation of why they separated",
    "Emotional climax and decision"
  ]
}
```

## Instructions

1. Analyze the core concept and identify key elements
2. Determine appropriate narrative structure (3-act, 5-act, etc.)
3. Develop protagonist and supporting characters
4. Create plot points that build emotional investment
5. Map emotional beats throughout the story
6. Ensure genre conventions are met
7. Balance pacing for target duration
8. Generate compelling title and logline

## Examples

### Example 1: Simple Romance

**Input:**

```
Idea: Two people who used to date meet again at a coffee shop
Genre: Romance
Duration: 3-4 minutes
```

**Output:**

```json
{
  "expandedConcept": {
    "title": "Bittersweet Brew",
    "logline": "When ambitious Alex runs into free-spirited Jordan at their old coffee shop, they must confront the different paths that pulled them apart—and whether those paths might converge again.",
    "synopsis": "Alex, now a successful corporate lawyer, enters their favorite college coffee shop and is stunned to see Jordan, their former partner, working as a barista..."
  },
  "structure": {
    "acts": 3,
    "scenes": 4,
    "plotPoints": [
      {
        "act": 1,
        "scene": 1,
        "description": "Alex enters, orders coffee, recognizes Jordan",
        "emotionalBeat": "shock_nostalgia"
      },
      {
        "act": 2,
        "scene": 2,
        "description": "Awkward conversation, catching up",
        "emotionalBeat": "tension_longing"
      },
      {
        "act": 2,
        "scene": 3,
        "description": "Discussion of why they broke up",
        "emotionalBeat": "sadness_regret"
      },
      {
        "act": 3,
        "scene": 4,
        "description": "Exchange numbers, hopeful ending",
        "emotionalBeat": "hope_possibility"
      }
    ]
  },
  "characters": [
    {
      "name": "Alex",
      "role": "protagonist",
      "arc": "realizing_success_isnt_everything",
      "traits": ["ambitious", "regretful", "guarded"]
    },
    {
      "name": "Jordan",
      "role": "deuteragonist",
      "arc": "showing_contentment_with_simpler_life",
      "traits": ["authentic", "warm", "forgiving"]
    }
  ]
}
```

### Example 2: Thriller Concept

**Input:**

```
Idea: Someone finds a phone that shows the future
Genre: Thriller
Duration: 5 minutes
Complexity: moderate
```

**Output:**

```json
{
  "expandedConcept": {
    "title": "Tomorrow's Call",
    "logline": "When Maya finds a mysterious phone that displays events 24 hours in advance, she must decide whether to prevent a tragedy or let fate run its course."
  },
  "structure": {
    "acts": 3,
    "scenes": 6,
    "plotPoints": [
      {
        "act": 1,
        "scene": 1,
        "description": "Maya finds phone, sees future news",
        "emotionalBeat": "curiosity_wonder"
      },
      {
        "act": 2,
        "scene": 3,
        "description": "Phone shows accident involving loved one",
        "emotionalBeat": "panic_desperation"
      },
      {
        "act": 3,
        "scene": 6,
        "description": "Twist - her intervention caused the accident",
        "emotionalBeat": "horror_realization"
      }
    ]
  }
}
```

## Complexity Levels

- **Simple**: Linear plot, 1-2 characters, clear emotional journey
- **Moderate**: Subplots, 2-3 characters, thematic depth
- **Complex**: Multiple threads, ensemble cast, layered themes
