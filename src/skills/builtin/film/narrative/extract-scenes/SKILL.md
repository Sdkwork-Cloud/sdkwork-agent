---
name: extract-scenes
version: '1.0.0'
author: sdkwork.com
description: Extract detailed scene information including structure, content, and production requirements. Use for shot planning and production scheduling.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: scenes breakdown structure shots content
---

# Extract Scenes

## Purpose

Parse script to extract detailed information about each scene including structure, content, characters, and production requirements.

## When to Use

- Creating scene breakdowns
- Shot planning and storyboarding
- Production scheduling
- Budget estimation by scene
- Shooting order planning

## Inputs

- `script` (string, required): Full script content
- `includeDialogueSummary` (boolean, optional): Summarize dialogue content (default: true)
- `includeTechnicalNotes` (boolean, optional): Extract technical requirements (default: true)

## Outputs

```json
{
  "scenes": [
    {
      "number": 1,
      "heading": "INT. COFFEE SHOP - DAY",
      "location": "Coffee Shop",
      "type": "interior",
      "timeOfDay": "day",
      "duration": "45_seconds",
      "characters": ["EMMA", "MARCUS"],
      "summary": "Emma and Marcus reunite after years apart",
      "content": {
        "action": "Emma enters coffee shop, spots Marcus",
        "dialogue": "Awkward reunion conversation",
        "emotionalTone": "nostalgic_tension"
      },
      "technical": {
        "shots": ["wide_establishing", "two_shot", "close_ups"],
        "lighting": "natural_window_light",
        "sound": "ambient_cafe_noise",
        "effects": [],
        "props": ["coffee_cups", "newspaper"]
      },
      "requirements": {
        "cast": 2,
        "extras": 3,
        "locations": 1,
        "pages": 0.75
      },
      "notes": "Key emotional scene, needs intimate coverage"
    }
  ],
  "summary": {
    "totalScenes": 8,
    "interiorScenes": 5,
    "exteriorScenes": 3,
    "dayScenes": 4,
    "nightScenes": 4,
    "totalDuration": "4_minutes_30_seconds"
  }
}
```

## Scene Elements

- **Heading**: INT/EXT + Location + Time
- **Action**: Visual descriptions
- **Dialogue**: Character speech
- **Transitions**: CUT TO, FADE IN, etc.
- **Parentheticals**: Action during dialogue

## Instructions

1. Parse scene headings for structure
2. Extract location and time information
3. Identify all characters in scene
4. Summarize scene content and purpose
5. Extract technical requirements
6. Calculate estimated duration
7. Note special production needs
8. Build scene-by-scene breakdown

## Examples

### Example 1: Simple Scene

**Input:**

```
INT. COFFEE SHOP - DAY

Emma (28) enters the bustling cafe. She spots Marcus
(32) at a corner table and approaches.

EMMA
(hesitant)
Marcus?

Marcus looks up, surprised.

MARCUS
Emma... I wasn't expecting...

EMMA
Can I sit?

Marcus nods. Emma sits across from him.
```

**Output:**

```json
{
  "scenes": [
    {
      "number": 1,
      "heading": "INT. COFFEE SHOP - DAY",
      "location": "Coffee Shop",
      "type": "interior",
      "timeOfDay": "day",
      "duration": "45_seconds",
      "characters": ["EMMA", "MARCUS"],
      "summary": "Emma surprises Marcus at coffee shop, initiating reunion",
      "content": {
        "action": "Emma enters, spots Marcus, approaches",
        "dialogue": "Awkward reunion, Emma asks to sit",
        "emotionalTone": "hesitant_surprise"
      },
      "technical": {
        "shots": ["wide_entrance", "two_shot_table", "close_up_reactions"],
        "lighting": "natural_daylight_windows",
        "sound": "cafe_ambience",
        "props": ["coffee_cups", "table", "chairs"]
      },
      "requirements": {
        "cast": 2,
        "extras": 3,
        "pages": 0.5
      }
    }
  ]
}
```

## Error Handling

- Returns empty array if no scenes found
- Flags scenes with unclear headings
- Warns about scenes exceeding 2 minutes
- Identifies scenes with no dialogue
