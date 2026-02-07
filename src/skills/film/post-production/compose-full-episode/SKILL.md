---
name: compose-full-episode
version: '1.0.0'
author: sdkwork.com
description: Compose full episode from individual scenes with transitions and pacing. Use for final assembly and episode completion.
category: post-production
license: Apache-2.0
compatibility: Works with video editing systems
metadata:
  tags: episode composition assembly full edit pacing
---

# Compose Full Episode

## Purpose

Assemble complete episode from individual scene videos, adding transitions, titles, and final pacing adjustments.

## When to Use

- Final episode assembly
- Rough cut completion
- Scene sequencing
- Pacing adjustments
- Episode finalization

## Inputs

- `scenes` (array, required): Array of scene videos
- `structure` (object, required): Episode structure
- `transitions` (object, optional): Transition preferences

## Outputs

```json
{
  "episode": {
    "title": "Episode 1: The Reunion",
    "totalDuration": "8_minutes_30_seconds",
    "scenes": [
      {
        "number": 1,
        "file": "scene_01_coffee_shop",
        "in": "00:00:00:00",
        "out": "00:00:45:00",
        "duration": "45s"
      },
      {
        "number": 2,
        "file": "scene_02_street",
        "in": "00:00:45:00",
        "out": "00:01:30:00",
        "duration": "45s",
        "transition": "fade"
      }
    ],
    "acts": [
      {
        "act": 1,
        "scenes": [1, 2, 3],
        "duration": "2_minutes_30_seconds"
      }
    ]
  }
}
```

## Episode Elements

- **Scenes**: Individual scene videos
- **Transitions**: Scene-to-scene connections
- **Titles**: Opening, credits
- **Music**: Score continuity
- **Pacing**: Rhythm and flow

## Instructions

1. Organize scene files
2. Plan episode structure
3. Sequence scenes
4. Add transitions
5. Insert titles
6. Balance audio
7. Check pacing
8. Final review

## Examples

### Example 1: Short Episode Assembly

**Input:**

```
Scenes: [scene_01, scene_02, scene_03, scene_04]
Total: 8 scenes
Target: 8 minutes
```

**Output:**

```json
{
  "episode": {
    "title": "The Reunion",
    "episodeNumber": 1,
    "totalDuration": "8_minutes_24_seconds",
    "structure": {
      "coldOpen": null,
      "openingCredits": {
        "duration": "15s",
        "style": "minimal_text"
      },
      "acts": [
        {
          "act": 1,
          "name": "Setup",
          "scenes": [1, 2],
          "duration": "1_minute_45_seconds",
          "purpose": "Establish characters and situation"
        },
        {
          "act": 2,
          "name": "Confrontation",
          "scenes": [3, 4, 5],
          "duration": "3_minutes_30_seconds",
          "purpose": "Conflict and revelation"
        },
        {
          "act": 3,
          "name": "Resolution",
          "scenes": [6, 7, 8],
          "duration": "2_minutes_54_seconds",
          "purpose": "Understanding and hope"
        }
      ],
      "closingCredits": {
        "duration": "30s",
        "style": "standard_roll"
      }
    },
    "sceneSequence": [
      {
        "scene": 1,
        "title": "Coffee Shop",
        "file": "scene_01_v02",
        "in": "00:00:15:00",
        "out": "00:01:00:00",
        "duration": "45s",
        "transition": "cut_from_black"
      },
      {
        "scene": 2,
        "title": "Flashback",
        "file": "scene_02_v01",
        "in": "00:01:00:00",
        "out": "00:01:45:00",
        "duration": "45s",
        "transition": "dissolve",
        "notes": "Indicate time shift"
      }
    ],
    "pacing": {
      "overallRhythm": "gentle_build_to_emotional_peak",
      "actBreaks": [
        {
          "after": "scene_2",
          "type": "natural_pause"
        },
        {
          "after": "scene_5",
          "type": "dramatic_moment"
        }
      ]
    }
  }
}
```

## Error Handling

- Returns basic structure if scenes unclear
- Flags pacing issues
- Warns about duration targets
- Suggests scene adjustments
