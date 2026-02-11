---
name: compose-scene-video
version: '1.0.0'
author: sdkwork.com
description: Compose individual scene video from shots, audio, and effects. Use for scene assembly and editing.
category: post-production
license: Apache-2.0
compatibility: Works with video editing systems
metadata:
  tags: scene composition editing assembly cuts
---

# Compose Scene Video

## Purpose

Assemble individual scene video from multiple shots, audio tracks, and visual effects into a cohesive sequence.

## When to Use

- Scene assembly
- Rough cut creation
- Shot selection
- Timing adjustments
- Scene completion

## Inputs

- `shots` (array, required): Array of shot clips
- `audio` (object, required): Audio tracks
- `sceneInfo` (object, required): Scene metadata

## Outputs

```json
{
  "scene": {
    "number": 1,
    "duration": "45_seconds",
    "timeline": [
      {
        "track": "video",
        "clips": [
          {
            "id": "shot_01_wide",
            "in": "00:00:00:00",
            "out": "00:00:05:00",
            "duration": "5s",
            "transition": "cut"
          },
          {
            "id": "shot_02_two_shot",
            "in": "00:00:05:00",
            "out": "00:00:20:00",
            "duration": "15s",
            "transition": "cut"
          }
        ]
      },
      {
        "track": "dialogue",
        "clips": [
          {
            "id": "emma_line_01",
            "in": "00:00:06:00",
            "out": "00:00:09:00"
          }
        ]
      }
    ]
  },
  "editNotes": ["Hold on wide for 2 seconds before cutting", "Match action on door entry"]
}
```

## Edit Elements

- **Video tracks**: Shot layers
- **Audio tracks**: Dialogue, music, effects
- **Transitions**: Cuts, dissolves, wipes
- **Timing**: In/out points
- **Effects**: Color, filters

## Instructions

1. Organize shot footage
2. Plan edit structure
3. Sync audio elements
4. Add transitions
5. Time cuts to action
6. Layer audio tracks
7. Apply color correction
8. Review pacing

## Examples

### Example 1: Dialogue Scene Assembly

**Input:**

```
Shots: [wide, two_shot, CU_Emma, CU_Marcus]
Audio: [dialogue, ambience]
Scene: Coffee shop reunion
```

**Output:**

```json
{
  "sceneComposition": {
    "sceneNumber": 1,
    "totalDuration": "45_seconds",
    "videoTracks": [
      {
        "track": 1,
        "name": "main_picture",
        "clips": [
          {
            "shot": "wide_establishing",
            "in": "00:00:00:00",
            "out": "00:00:04:00",
            "duration": "4s",
            "notes": "Emma enters, hold on wide"
          },
          {
            "shot": "two_shot_master",
            "in": "00:00:04:00",
            "out": "00:00:18:00",
            "duration": "14s",
            "notes": "Main dialogue coverage"
          },
          {
            "shot": "CU_Emma_reaction",
            "in": "00:00:18:00",
            "out": "00:00:22:00",
            "duration": "4s",
            "notes": "Emotional reaction"
          },
          {
            "shot": "CU_Marcus_response",
            "in": "00:00:22:00",
            "out": "00:00:26:00",
            "duration": "4s"
          },
          {
            "shot": "two_shot_resolution",
            "in": "00:00:26:00",
            "out": "00:00:45:00",
            "duration": "19s",
            "notes": "Back to wide for resolution"
          }
        ]
      }
    ],
    "audioTracks": [
      {
        "track": 1,
        "name": "dialogue",
        "clips": [
          {
            "source": "emma_lines",
            "in": "00:00:06:00",
            "out": "00:00:09:00",
            "sync": "lip_sync_checked"
          },
          {
            "source": "marcus_lines",
            "in": "00:00:10:00",
            "out": "00:00:14:00"
          }
        ]
      },
      {
        "track": 2,
        "name": "ambience",
        "clips": [
          {
            "source": "coffee_shop_room_tone",
            "in": "00:00:00:00",
            "out": "00:00:45:00",
            "volume": "-20dB"
          }
        ]
      },
      {
        "track": 3,
        "name": "music",
        "clips": [
          {
            "source": "romantic_theme",
            "in": "00:00:02:00",
            "out": "00:00:45:00",
            "fadeIn": "2s",
            "volume": "-25dB"
          }
        ]
      }
    ]
  },
  "editDecisions": [
    {
      "time": "00:00:04:00",
      "decision": "Cut to two-shot as Emma approaches",
      "reason": "Maintain continuity, show both characters"
    },
    {
      "time": "00:00:18:00",
      "decision": "Cut to Emma CU on emotional line",
      "reason": "Emphasize emotional beat"
    }
  ],
  "technicalSpecs": {
    "resolution": "1920x1080",
    "frameRate": "24fps",
    "codec": "ProRes_422",
    "colorSpace": "Rec709"
  }
}
```

## Error Handling

- Returns basic assembly if shots unclear
- Flags sync issues
- Warns about missing coverage
- Suggests alternatives
