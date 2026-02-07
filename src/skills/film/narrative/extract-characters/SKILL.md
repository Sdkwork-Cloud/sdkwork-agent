---
name: extract-characters
version: '1.0.0'
author: sdkwork.com
description: Extract character information from script including names, descriptions, traits, and relationships. Use to build character database for production planning.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: characters extraction traits relationships profile
---

# Extract Characters

## Purpose

Analyze script to identify and extract all characters with their descriptions, personality traits, and key characteristics for production planning.

## When to Use

- Building character database for production
- Casting planning and requirements
- Costume and makeup design
- Character relationship mapping
- Actor selection and briefings

## Inputs

- `script` (string, required): Full script content
- `includeMinor` (boolean, optional): Include minor/extra characters (default: false)
- `detailLevel` (string, optional): 'basic' | 'detailed' | 'comprehensive' (default: 'detailed')

## Outputs

```json
{
  "characters": [
    {
      "id": "char_001",
      "name": "ALEX CHEN",
      "aliases": ["Alex", "Alex Chen"],
      "type": "protagonist",
      "importance": "major",
      "description": "30s, ambitious tech executive with hidden vulnerability",
      "physicalTraits": {
        "age": "30s",
        "gender": "male",
        "build": "lean",
        "distinguishing": "wears glasses, nervous habit of adjusting tie"
      },
      "personalityTraits": ["ambitious", "insecure", "driven", "conflicted"],
      "motivations": ["career success", "proving worth to father"],
      "fears": ["failure", "abandonment"],
      "background": "Grew up poor, worked way through college",
      "firstAppearance": "Scene 1",
      "sceneCount": 12,
      "dialogueLines": 45,
      "speakingTime": "3.2_minutes"
    }
  ],
  "statistics": {
    "totalCharacters": 5,
    "majorCharacters": 2,
    "minorCharacters": 3,
    "extras": 0
  }
}
```

## Character Types

- **protagonist**: Main character driving the story
- **antagonist**: Character opposing the protagonist
- **supporting**: Important secondary characters
- **minor**: Characters with limited scenes
- **extra**: Background characters with no lines

## Instructions

1. Scan script for all character mentions
2. Identify character names and aliases
3. Extract physical descriptions from action lines
4. Infer personality traits from dialogue and actions
5. Determine character importance by scene/dialogue count
6. Map character relationships (if detailed level)
7. Calculate statistics and metrics
8. Return structured character profiles

## Examples

### Example 1: Romance Script

**Input:**

```
INT. COFFEE SHOP - DAY

EMMA (28, warm smile, worn leather jacket) enters,
scanning the room. She spots MARCUS (32, tailored suit,
reserved) in the corner.

EMMA
You always choose the darkest corner.

MARCUS
(adjusting glasses)
Old habits.
```

**Output:**

```json
{
  "characters": [
    {
      "id": "char_001",
      "name": "EMMA",
      "aliases": ["Emma"],
      "type": "protagonist",
      "importance": "major",
      "description": "28, warm personality, artistic style",
      "physicalTraits": {
        "age": "28",
        "gender": "female",
        "style": "worn leather jacket",
        "expression": "warm smile"
      },
      "personalityTraits": ["warm", "observant", "familiar"],
      "firstAppearance": "Scene 1",
      "sceneCount": 8,
      "dialogueLines": 32
    },
    {
      "id": "char_002",
      "name": "MARCUS",
      "aliases": ["Marcus"],
      "type": "protagonist",
      "importance": "major",
      "description": "32, professional, reserved demeanor",
      "physicalTraits": {
        "age": "32",
        "gender": "male",
        "style": "tailored suit",
        "accessories": "glasses"
      },
      "personalityTraits": ["reserved", "professional", "habitual"],
      "firstAppearance": "Scene 1",
      "sceneCount": 8,
      "dialogueLines": 28
    }
  ]
}
```

### Example 2: Thriller Script

**Input:**

```
INT. ABANDONED WAREHOUSE - NIGHT

DETECTIVE SARAH REYES (40s, weathered, sharp eyes)
cautiously enters, flashlight sweeping the darkness.

A FIGURE emerges from the shadows - THE STRANGER,
face obscured, voice distorted.

THE STRANGER
You're too late, Detective.

SARAH
(raising gun)
Show yourself!
```

**Output:**

```json
{
  "characters": [
    {
      "id": "char_001",
      "name": "DETECTIVE SARAH REYES",
      "aliases": ["Sarah", "Reyes", "Detective"],
      "type": "protagonist",
      "importance": "major",
      "description": "40s, experienced detective, sharp and cautious",
      "physicalTraits": {
        "age": "40s",
        "gender": "female",
        "appearance": "weathered",
        "eyes": "sharp"
      },
      "personalityTraits": ["cautious", "determined", "experienced"],
      "occupation": "Detective",
      "firstAppearance": "Scene 1",
      "sceneCount": 15,
      "dialogueLines": 67
    },
    {
      "id": "char_002",
      "name": "THE STRANGER",
      "aliases": ["Stranger", "Figure"],
      "type": "antagonist",
      "importance": "major",
      "description": "Mysterious figure, face obscured",
      "physicalTraits": {
        "gender": "unknown",
        "features": "face obscured"
      },
      "personalityTraits": ["mysterious", "threatening", "knowing"],
      "firstAppearance": "Scene 1",
      "sceneCount": 5,
      "dialogueLines": 12
    }
  ]
}
```

## Error Handling

- Returns empty array if no characters found
- Flags potential naming inconsistencies
- Warns about characters with no dialogue
- Identifies possible duplicate characters (similar names)
